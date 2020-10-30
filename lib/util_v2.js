/* eslint-disable max-len */
const URL = require('url');
const OLD_UTIL = require('./util.js');
const PATH = require('path');
const FS = require('fs');
const VIDEO_URL = 'https://www.youtube.com/watch?v=';
const API_URL = 'https://www.youtube.com/youtubei/v1/search?key=';

const DEFAULT_CONTEXT = {
  client: {
    utcOffsetMinutes: 0,
    gl: 'US',
    hl: 'en',
    clientName: 'WEB',
    clientVersion: '<important information>',
  },
  user: {},
  request: {},
};

const parseFilters = exports.parseFilters = ({json}) => {
  const wrapper = json.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer;
  const filterWrapper = wrapper.subMenu.searchSubMenuRenderer.groups;
  const parsedGroups = new Map();
  for (const filterGroup of filterWrapper) {
    const singleFilterGroup = []; // TODO: switch to Map when done caring about compatibility
    for (const filter of filterGroup.searchFilterGroupRenderer.filters) {
      const isSet = !filter.searchFilterRenderer.navigationEndpoint;
      const parsedFilter = {
        description: filter.searchFilterRenderer.tooltip,
        label: parseText(filter.searchFilterRenderer.label),
        query: isSet ? null : URL.resolve(VIDEO_URL, filter.searchFilterRenderer.navigationEndpoint.commandMetadata.webCommandMetadata.url),
        isSet: isSet,
        // TODO: remove when done caring about compatibility
        active: isSet,
        name: parseText(filter.searchFilterRenderer.label),
        ref: isSet ? null : URL.resolve(VIDEO_URL, filter.searchFilterRenderer.navigationEndpoint.commandMetadata.webCommandMetadata.url),
      };
      if (isSet) singleFilterGroup.active = parsedFilter;
      singleFilterGroup.push(parsedFilter);
    }
    parsedGroups.set(parseText(filterGroup.searchFilterGroupRenderer.title), singleFilterGroup);
  }
  return parsedGroups;
}

exports.parseBody = body => {
  const str = OLD_UTIL.between(body, 'var ytInitialData =', '; \n');
  const apiKey = OLD_UTIL.between(body, 'INNERTUBE_API_KEY":"', '"') || OLD_UTIL.between(body, 'innertubeApiKey":"', '"');
  const clientVersion = OLD_UTIL.between(body, 'INNERTUBE_CONTEXT_CLIENT_VERSION":"', '"') || OLD_UTIL.between(body, 'innertube_context_client_version":"', '"');
  return { json: JSON.parse(str), apiKey, clientVersion };
}

exports.mapJSON = async ({json, apiKey, clientVersion}) => {
  const wrapper = json.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer;
  // Parse token to do a follow-up request
  const continuation = wrapper.contents.find(x => Object.keys(x)[0] === 'continuationItemRenderer');
  const token = continuation ? continuation.continuationItemRenderer.continuationEndpoint.continuationCommand.token : null;
  // Parse filters
  const filters = parseFilters({json});
  const activeFilters = Array.from(filters).map(a => a[1].active).filter(a => a);
  // Parse items
  const rawItems = wrapper.contents.find(x => Object.keys(x)[0] === 'itemSectionRenderer').itemSectionRenderer.contents;
  const parsedItems = rawItems.map(catchAndLog_parseItem);
  // Prepand related searches
  if (Array.isArray(json.refinements)) parsedItems.unshift({
    type: 'search-refinements',
    entrys: json.refinements.map(refinement => ({
      q: refinement,
      link: OLD_UTIL.buildRef(null, refinement),
    })),
  });

  return {
    query: null,
    currentRef: null,
    items: parsedItems.filter(a => a),
    nextpageToken: token,
    results: Number(json.estimatedResults),
    filters: activeFilters,
    // TODO: remove when done caring about compatibility
    nextpageRef: null,
  };
};

exports.parsePage2 = async (apiKey, clientVersion, token) => {
  DEFAULT_CONTEXT.client.clientVersion = clientVersion;
  return continuationJSON(await doPost(API_URL + apiKey, { continuation: token, context: DEFAULT_CONTEXT }));
}

const continuationJSON = json => {
  const continuationItems = json.onResponseReceivedCommands[0].appendContinuationItemsAction.continuationItems;
  const items = continuationItems.find(x => Object.keys(x)[0] === 'itemSectionRenderer').itemSectionRenderer.contents;
  const continuation = continuationItems.find(x => Object.keys(x)[0] === 'continuationItemRenderer');
  let token = continuation ? continuation.continuationItemRenderer.continuationEndpoint.continuationCommand.token : '';

  return {
    items: items.map(parseItem).filter(a => a),
    nextpageToken: token,
  };
};

// Parsing utility
const parseText = txt => txt.simpleText || txt.runs.map(a => a.text).join('');
const parseNumFromText = txt => Number(parseText(txt).replace(/[^0-9.,]+/, ''));
const doPost = (url, payload) => new Promise((resolve) => {
  return JSON.stringify(require('miniget')(url, {method: 'POST'}).text());


  const req = require('https').request(url, { method: 'POST'});
  req.on('response', resp => {
    console.log('response', resp.statusCode);
    const body = [];
    resp.on('data', chunk => body.push(chunk));
    resp.on('end', () => {
      resolve(JSON.parse(Buffer.concat(body).toString()));
    });
  });
  req.write(JSON.stringify(payload));
  req.end();
});

const parseItem = item => {
  const type = Object.keys(item)[0];

  switch (type) {
    // Already written parsers
    case 'videoRenderer':
      return parseVideo(item[type]);
    case 'channelRenderer':
      return parseChannel(item[type]);
    case 'playlistRenderer':
      return parsePlaylist(item[type]);
    case 'radioRenderer':
      return parseMix(item[type]);
    case 'didYouMeanRenderer':
      return parseDidYouMeanRenderer(item[type]);
    case 'horizontalCardListRenderer':
      return parseHorizontalCardListRenderer(item[type]);
    // New type & file without json until now => save
    default:
      throw new Error('unknown type');
    case 'backgroundPromoRenderer':
      throw new Error('missing log for this type');
    // Ignore those - already have the .json
    case 'showingResultsForRenderer':
    case 'movieRenderer':
    case 'carouselAdRenderer':
    case 'shelfRenderer':
    case 'searchPyvRenderer':
    case 'promotedSparklesTextSearchRenderer':
      return null;
  }
};

const catchAndLog_parseItem = item => {
  try {
    return parseItem(item);
  } catch (e) {
    const dir = PATH.resolve(__dirname, '../dumps/');
    const file = PATH.resolve(dir, `${Math.random().toString(36).substr(3)}-${Date.now()}.dumb`);
    const cfg = PATH.resolve(__dirname, '../package.json');
    const bugsRef = require(cfg).bugs.url;

    if (!FS.existsSync(dir)) FS.mkdirSync(dir);
    FS.writeFileSync(file, JSON.stringify(item, null, 2));
    /* eslint-disable no-console */
    let ePrint = e.message;
    const knownErrors = ['unknown type', 'missing log for this type'];
    if (!knownErrors.includes(e.message)) ePrint = 'failed to parse Type';
    console.error(`\n/${'*'.repeat(200)}`);
    console.error(ePrint);
    console.error(`pls post the the files in ${dir} to ${bugsRef}`);
    console.error(`${'*'.repeat(200)}\\`);
    /* eslint-enable no-console */
    return null;
  }
};

// TYPES:
const parseVideo = obj => {
  const author = obj.ownerText.runs[0];
  const badges = Array.isArray(obj.badges) ? obj.badges.map(a => a.metadataBadgeRenderer.label) : [];
  const isLive = badges.some(b => b === 'LIVE NOW');
  const isUpcoming = obj.upcomingEventData ? Number(`${obj.upcomingEventData.startTime}000`) : false;

  return {
    type: 'video',
    title: parseText(obj.title),
    id: obj.videoId,
    link: VIDEO_URL + obj.videoId,
    bestThumbnail: obj.thumbnail.thumbnails.sort((a, b) => b.width - a.width)[0],
    thumbnails: obj.thumbnail.thumbnails,
    isUpcoming,
    isLive,
    badges,

    author: {
      name: author.text,
      channelID: author.navigationEndpoint.browseEndpoint.browseId,
      ref: URL.resolve(VIDEO_URL, author.navigationEndpoint.browseEndpoint.canonicalBaseUrl || author.navigationEndpoint.commandMetadata.webCommandMetadata.url),
      bestAvatar: obj.channelThumbnailSupportedRenderers.channelThumbnailWithLinkRenderer.thumbnail.thumbnails.sort((a, b) => b.width - a.width)[0],
      avatars: obj.channelThumbnailSupportedRenderers.channelThumbnailWithLinkRenderer.thumbnail.thumbnails,
      ownerBadges: Array.isArray(obj.ownerBadges) ? obj.ownerBadges.map(a => a.metadataBadgeRenderer.tooltip) : [],
      verified: Array.isArray(obj.ownerBadges) && (JSON.stringify(obj.ownerBadges).includes('OFFICIAL') || JSON.stringify(obj.ownerBadges).includes('VERIFIED')),
    },

    description: obj.descriptionSnippet ? parseText(obj.descriptionSnippet) : null,

    views: !obj.viewCountText ? null : parseNumFromText(obj.viewCountText),
    duration: isLive || isUpcoming || !obj.lengthText ? null : parseText(obj.lengthText),
    uploaded_at: isLive || isUpcoming || !obj.publishedTimeText ? null : parseText(obj.publishedTimeText),

    // TODO: remove when done caring about compatibility
    live: isLive,
    thumbnail: obj.thumbnail.thumbnails.sort((a, b) => b.width - a.width)[0].url,
  };
};

const parseChannel = obj => ({
  type: 'channel',
  name: parseText(obj.title),
  channel_id: obj.channelId,
  link: URL.resolve(VIDEO_URL, obj.navigationEndpoint.browseEndpoint.canonicalBaseUrl || obj.navigationEndpoint.commandMetadata.webCommandMetadata.url),
  bestAvatar: obj.thumbnail.thumbnails.sort((a, b) => b.width - a.width)[0],
  avatars: obj.thumbnail.thumbnails,
  verified: obj.ownerBadges &&
    (JSON.stringify(obj.ownerBadges).includes('OFFICIAL') || JSON.stringify(obj.ownerBadges).includes('VERIFIED')),

  subscribers: obj.subscriberCountText ? parseNumFromText(obj.subscriberCountText) : null,
  // TODO: remove empty string when done caring about compatibility
  description_short: obj.descriptionSnippet ? parseText(obj.descriptionSnippet) : '',
  // TODO: remove 0 when done caring about compatibility
  videos: obj.videoCountText ? parseNumFromText(obj.videoCountText) : 0,

  // TODO: remove when done caring about compatibility
  avatar: obj.thumbnail.thumbnails.sort((a, b) => b.width - a.width)[0].url,
  followers: obj.subscriberCountText ? parseNumFromText(obj.subscriberCountText) : 0,
});

const parsePlaylist = obj => {
  let owner = (obj.shortBylineText && obj.shortBylineText.runs[0]) || (obj.longBylineText && obj.longBylineText.runs[0]);

  return {
    type: 'playlist',
    title: parseText(obj.title),
    playlist_id: obj.playlistId,
    link: `https://www.youtube.com/playlist?list=${obj.playlistId}`,
    firstVideo: {
      id: obj.navigationEndpoint.watchEndpoint.videoId,
      link: URL.parse(VIDEO_URL, obj.navigationEndpoint.commandMetadata.webCommandMetadata.url),
      text: parseText(obj.videos[0].childVideoRenderer.title),
      length: parseText(obj.videos[0].childVideoRenderer.lengthText),
      thumbnails: obj.thumbnails[0].thumbnails,
      bestThumbnail: obj.thumbnails[0].thumbnails.sort((a, b) => b.width - a.width)[0],
    },

    owner: {
      name: owner.text,
      channelId: owner.navigationEndpoint.browseEndpoint.browseId,
      link: URL.resolve(VIDEO_URL, owner.navigationEndpoint.browseEndpoint.canonicalBaseUrl || owner.navigationEndpoint.commandMetadata.webCommandMetadata.url),
      ownerBadges: Array.isArray(obj.ownerBadges) ? obj.ownerBadges.map(a => a.metadataBadgeRenderer.tooltip) : [],
      verified: obj.ownerBadges && (JSON.stringify(obj.ownerBadges).includes('OFFICIAL') || JSON.stringify(obj.ownerBadges).includes('VERIFIED')),
    },

    published_at: obj.publishedTimeText ? parseText(obj.publishedTimeText) : null,
    // TODO: remove toString when done caring about compatibility
    length: Number(obj.videoCount).toString(),

    // TODO: remove when done caring about compatibility
    thumbnail: obj.thumbnails[0].thumbnails.sort((a, b) => b.width - a.width)[0].url,
    author: {
      name: owner.text,
      ref: URL.resolve(VIDEO_URL, owner.navigationEndpoint.browseEndpoint.canonicalBaseUrl || owner.navigationEndpoint.commandMetadata.webCommandMetadata.url),
      verified: obj.ownerBadges && (JSON.stringify(obj.ownerBadges).includes('OFFICIAL') || JSON.stringify(obj.ownerBadges).includes('VERIFIED')),
    },
  };
};

const parseMix = obj => ({
  type: 'mix',
  title: parseText(obj.title),
  link: URL.parse(VIDEO_URL, obj.navigationEndpoint.commandMetadata.webCommandMetadata.url),

  firstVideo: {
    id: obj.navigationEndpoint.watchEndpoint.videoId,
    link: URL.parse(VIDEO_URL, obj.navigationEndpoint.commandMetadata.webCommandMetadata.url),
    text: parseText(obj.videos[0].childVideoRenderer.title),
    length: parseText(obj.videos[0].childVideoRenderer.lengthText),
    thumbnails: obj.thumbnail.thumbnails,
    bestThumbnail: obj.thumbnail.thumbnails.sort((a, b) => b.width - a.width)[0],
  },

  // TODO: remove when done caring about compatibility
  firstItem: URL.parse(VIDEO_URL, obj.navigationEndpoint.commandMetadata.webCommandMetadata.url),
  thumbnail: obj.thumbnail.thumbnails.sort((a, b) => b.width - a.width)[0].url,
  length: '50+',
});

const parseDidYouMeanRenderer = obj => ({
  type: 'search-refinements',
  entrys: [{
    q: parseText(obj.correctedQuery),
    link: UTIL.resolve(VIDEO_URL, obj.correctedQueryEndpoint.commandMetadata.webCommandMetadata.url),
  }],
});

const parseHorizontalCardListRenderer = obj => ({
  type: 'search-refinements',
  entrys: obj.cards.map(c => ({
    q: parseText(c.searchRefinementCardRenderer.query),
    link: URL.parse(VIDEO_URL, c.searchRefinementCardRenderer.searchEndpoint.commandMetadata.webCommandMetadata.url),
    bestThumbnail: c.searchRefinementCardRenderer.thumbnail.thumbnails.sort((a, b) => b.width - a.width)[0],
    thumbnails: c.searchRefinementCardRenderer.thumbnail.thumbnails,
  })),
});
