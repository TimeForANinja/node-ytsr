/* eslint-disable max-len */
const URL = require('url');
const PATH = require('path');
const FS = require('fs');
const VIDEO_URL = 'https://www.youtube.com/watch?v=';

exports.mapJSON = json => {
  const wrapper = json.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer;
  // Parse token to do a follow-up request
  const continuation = wrapper.contents.find(x => Object.keys(x)[0] === 'continuationItemRenderer');
  const token = continuation ? continuation.continuationItemRenderer.continuationEndpoint.continuationCommand.token : null;
  // Parse filters
  const filterWrapper = wrapper.subMenu.searchSubMenuRenderer.groups;
  const parsedGroups = new Map();
  for (const filterGroup of filterWrapper) {
    const singleFilterGroup = new Map();
    for (const filter of filterGroup.searchFilterGroupRenderer.filters) {
      const isSet = !filter.searchFilterRenderer.navigationEndpoint;
      singleFilterGroup.set(parseText(filter.searchFilterRenderer.label), {
        description: filter.searchFilterRenderer.tooltip,
        label: parseText(filter.searchFilterRenderer.label),
        query: isSet ? null : filter.searchFilterRenderer.navigationEndpoint.commandMetadata.webCommandMetadata.url,
        isSet: isSet,
        // TODO: remove when done caring about compatibility
        active: isSet,
        name: parseText(filter.searchFilterRenderer.label),
        ref: '',
      });
    }
    parsedGroups.set(parseText(filterGroup.searchFilterGroupRenderer.title), singleFilterGroup);
  }
  // Parse items
  const rawItems = wrapper.contents.find(x => Object.keys(x)[0] === 'itemSectionRenderer').itemSectionRenderer.contents;
  const parsedItems = rawItems.map(catchAndLog_parseItem);
  // Prepand related searches
  parsedItems.unshift({
    type: 'search-refinements',
    entries: json.refinements,
  });

  return {
    query: null,
    currentRef: null,
    items: parsedItems.filter(a => a),
    nextpageRefToken: token,
    results: Number(json.estimatedResults),
    filters: parsedGroups,
    // TODO: remove when done caring about compatibility
    nextpageRef: null,
  };
};

// Parsing utility
const parseText = txt => txt.simpleText || txt.runs.map(a => a.text).join('');
const parseNumFromText = txt => Number(parseText(txt).replace(/[^0-9.,]+/, ''));

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
    case 'promotedSparklesTextSearchRenderer':
    case 'didYouMeanRenderer':
    case 'searchPyvRenderer':
    case 'horizontalCardListRenderer':
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
