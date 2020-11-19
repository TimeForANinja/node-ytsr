const UTIL = require('./util.js');
const PATH = require('path');
const URL = require('url');
const FS = require('fs');

const BASE_VIDEO_URL = 'https://www.youtube.com/watch?v=';

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
      // YouTube advises another query
      return parseDidYouMeanRenderer(item[type]);
    case 'horizontalCardListRenderer':
      return parseHorizontalCardListRenderer(item[type]);

    // Message-Types
    case 'backgroundPromoRenderer':
      if (UTIL.parseText(item[type].title) === "No results found") return null;
      throw new Error("unknown message in backgroundPromoRenderer");
    case 'messageRenderer':
      if (UTIL.parseText(item[type].text) === "No more results") return null;
      throw new Error("unknown message in messageRenderer");

    // New type & file without json until now => save
    default:
      throw new Error('unknown type');

    // Ignore those - already have the .json
    case 'showingResultsForRenderer':
      // The results are for another query
      return null;
    case 'movieRenderer':
      return parseMovie(item[type]);
    case 'shelfRenderer':
      return parseShelf(item[type]);
    case 'showRenderer':
      return parseShow(item[type]);
    // Skip Adds for now
    case 'carouselAdRenderer':
    case 'searchPyvRenderer':
    case 'promotedSparklesTextSearchRenderer':
      return null;
    // Skip emergencyOneboxRenderer for now
    case 'emergencyOneboxRenderer':
      // emergency Notifications like: Thinking about suicide? Call xxxx
      return null;
  }
};

const catchAndLog_parseItem = item => {
  try {
    return parseItem(item);
  } catch (e) {
    const dir = PATH.resolve(__dirname, '../dumps/');
    const file = PATH.resolve(dir, `${Math.random().toString(36).substr(3)}-${Date.now()}.txt`);
    const cfg = PATH.resolve(__dirname, '../package.json');
    const bugsRef = require(cfg).bugs.url;

    if (!FS.existsSync(dir)) FS.mkdirSync(dir);
    FS.writeFileSync(file, JSON.stringify(item, null, 2));
    /* eslint-disable no-console */
    let ePrint = e.message;
    const knownErrors = ['unknown type', 'missing log for this type'];
    if (!knownErrors.includes(e.message)) ePrint = 'failed to parse Type: '+e.message;
    console.error(`\n/${'*'.repeat(200)}`);
    console.error(ePrint);
    console.error(`pls post the the files in ${dir} to ${bugsRef}`);
    console.error(`${'*'.repeat(200)}\\`);
    /* eslint-enable no-console */
    return null;
  }
};
module.exports = catchAndLog_parseItem;

// TYPES:
const parseVideo = obj => {
  const author = obj.ownerText.runs[0];
  const badges = Array.isArray(obj.badges) ? obj.badges.map(a => a.metadataBadgeRenderer.label) : [];
  const isLive = badges.some(b => b === 'LIVE NOW');
  const isUpcoming = obj.upcomingEventData ? Number(`${obj.upcomingEventData.startTime}000`) : false;

  return {
    type: 'video',
    title: UTIL.parseText(obj.title),
    id: obj.videoId,
    link: BASE_VIDEO_URL + obj.videoId,
    bestThumbnail: obj.thumbnail.thumbnails.sort((a, b) => b.width - a.width)[0],
    thumbnails: obj.thumbnail.thumbnails,
    isUpcoming,
    isLive,
    badges,

    author: {
      name: author.text,
      channelID: author.navigationEndpoint.browseEndpoint.browseId,
      ref: URL.resolve(BASE_VIDEO_URL, author.navigationEndpoint.browseEndpoint.canonicalBaseUrl || author.navigationEndpoint.commandMetadata.webCommandMetadata.url),
      bestAvatar: obj.channelThumbnailSupportedRenderers.channelThumbnailWithLinkRenderer.thumbnail.thumbnails.sort((a, b) => b.width - a.width)[0],
      avatars: obj.channelThumbnailSupportedRenderers.channelThumbnailWithLinkRenderer.thumbnail.thumbnails,
      ownerBadges: Array.isArray(obj.ownerBadges) ? obj.ownerBadges.map(a => a.metadataBadgeRenderer.tooltip) : [],
      verified: Array.isArray(obj.ownerBadges) && (JSON.stringify(obj.ownerBadges).includes('OFFICIAL') || JSON.stringify(obj.ownerBadges).includes('VERIFIED')),
    },

    description: obj.descriptionSnippet ? UTIL.parseText(obj.descriptionSnippet) : null,

    views: !obj.viewCountText ? null : UTIL.parseNumFromText(obj.viewCountText),
    duration: isLive || isUpcoming || !obj.lengthText ? null : UTIL.parseText(obj.lengthText),
    uploaded_at: isLive || isUpcoming || !obj.publishedTimeText ? null : UTIL.parseText(obj.publishedTimeText),

    // TODO: remove when done caring about compatibility
    live: isLive,
    thumbnail: obj.thumbnail.thumbnails.sort((a, b) => b.width - a.width)[0].url,
  };
};

const parseChannel = obj => ({
  type: 'channel',
  name: UTIL.parseText(obj.title),
  channel_id: obj.channelId,
  link: URL.resolve(BASE_VIDEO_URL, obj.navigationEndpoint.browseEndpoint.canonicalBaseUrl || obj.navigationEndpoint.commandMetadata.webCommandMetadata.url),
  bestAvatar: obj.thumbnail.thumbnails.sort((a, b) => b.width - a.width)[0],
  avatars: obj.thumbnail.thumbnails,
  verified: obj.ownerBadges &&
    (JSON.stringify(obj.ownerBadges).includes('OFFICIAL') || JSON.stringify(obj.ownerBadges).includes('VERIFIED')),

  subscribers: obj.subscriberCountText ? UTIL.parseNumFromText(obj.subscriberCountText) : null,
  // TODO: remove empty string when done caring about compatibility
  description_short: obj.descriptionSnippet ? UTIL.parseText(obj.descriptionSnippet) : '',
  // TODO: remove 0 when done caring about compatibility
  videos: obj.videoCountText ? UTIL.parseNumFromText(obj.videoCountText) : 0,

  // TODO: remove when done caring about compatibility
  avatar: obj.thumbnail.thumbnails.sort((a, b) => b.width - a.width)[0].url,
  followers: obj.subscriberCountText ? UTIL.parseNumFromText(obj.subscriberCountText) : 0,
});

const parsePlaylist = obj => {
  let owner = (obj.shortBylineText && obj.shortBylineText.runs[0]) || (obj.longBylineText && obj.longBylineText.runs[0]);

  return {
    type: 'playlist',
    title: UTIL.parseText(obj.title),
    playlist_id: obj.playlistId,
    link: `https://www.youtube.com/playlist?list=${obj.playlistId}`,
    firstVideo: {
      id: obj.navigationEndpoint.watchEndpoint.videoId,
      link: URL.parse(BASE_VIDEO_URL, obj.navigationEndpoint.commandMetadata.webCommandMetadata.url),
      text: UTIL.parseText(obj.videos[0].childVideoRenderer.title),
      length: UTIL.parseText(obj.videos[0].childVideoRenderer.lengthText),
      thumbnails: obj.thumbnails[0].thumbnails,
      bestThumbnail: obj.thumbnails[0].thumbnails.sort((a, b) => b.width - a.width)[0],
    },

    owner: {
      name: owner.text,
      channelId: owner.navigationEndpoint.browseEndpoint.browseId,
      link: URL.resolve(BASE_VIDEO_URL, owner.navigationEndpoint.browseEndpoint.canonicalBaseUrl || owner.navigationEndpoint.commandMetadata.webCommandMetadata.url),
      ownerBadges: Array.isArray(obj.ownerBadges) ? obj.ownerBadges.map(a => a.metadataBadgeRenderer.tooltip) : [],
      verified: obj.ownerBadges && (JSON.stringify(obj.ownerBadges).includes('OFFICIAL') || JSON.stringify(obj.ownerBadges).includes('VERIFIED')),
    },

    published_at: obj.publishedTimeText ? UTIL.parseText(obj.publishedTimeText) : null,
    // TODO: remove toString when done caring about compatibility
    length: Number(obj.videoCount).toString(),

    // TODO: remove when done caring about compatibility
    thumbnail: obj.thumbnails[0].thumbnails.sort((a, b) => b.width - a.width)[0].url,
    author: {
      name: owner.text,
      ref: URL.resolve(BASE_VIDEO_URL, owner.navigationEndpoint.browseEndpoint.canonicalBaseUrl || owner.navigationEndpoint.commandMetadata.webCommandMetadata.url),
      verified: obj.ownerBadges && (JSON.stringify(obj.ownerBadges).includes('OFFICIAL') || JSON.stringify(obj.ownerBadges).includes('VERIFIED')),
    },
  };
};

const parseMix = obj => ({
  type: 'mix',
  title: UTIL.parseText(obj.title),
  link: URL.parse(BASE_VIDEO_URL, obj.navigationEndpoint.commandMetadata.webCommandMetadata.url),

  firstVideo: {
    id: obj.navigationEndpoint.watchEndpoint.videoId,
    link: URL.parse(BASE_VIDEO_URL, obj.navigationEndpoint.commandMetadata.webCommandMetadata.url),
    text: UTIL.parseText(obj.videos[0].childVideoRenderer.title),
    length: UTIL.parseText(obj.videos[0].childVideoRenderer.lengthText),
    thumbnails: obj.thumbnail.thumbnails,
    bestThumbnail: obj.thumbnail.thumbnails.sort((a, b) => b.width - a.width)[0],
  },

  // TODO: remove when done caring about compatibility
  firstItem: URL.parse(BASE_VIDEO_URL, obj.navigationEndpoint.commandMetadata.webCommandMetadata.url),
  thumbnail: obj.thumbnail.thumbnails.sort((a, b) => b.width - a.width)[0].url,
  length: '50+',
});

const parseDidYouMeanRenderer = obj => ({
  type: 'search-refinements',
  entrys: [{
    q: UTIL.parseText(obj.correctedQuery),
    link: URL.resolve(BASE_VIDEO_URL, obj.correctedQueryEndpoint.commandMetadata.webCommandMetadata.url),
  }],
});

const parseHorizontalCardListRenderer = obj => ({
  type: 'search-refinements',
  entrys: obj.cards.map(c => ({
    q: UTIL.parseText(c.searchRefinementCardRenderer.query),
    link: URL.parse(BASE_VIDEO_URL, c.searchRefinementCardRenderer.searchEndpoint.commandMetadata.webCommandMetadata.url),
    bestThumbnail: c.searchRefinementCardRenderer.thumbnail.thumbnails.sort((a, b) => b.width - a.width)[0],
    thumbnails: c.searchRefinementCardRenderer.thumbnail.thumbnails,
  })),
});

const parseMovie = obj => {
  let owner = (obj.shortBylineText && obj.shortBylineText.runs[0]) || (obj.longBylineText && obj.longBylineText.runs[0]);

  return {
    type: 'movie',
    title: UTIL.parseText(obj.title),
    videoId: obj.videoId,
    link: URL.resolve(BASE_VIDEO_URL, obj.navigationEndpoint.commandMetadata.webCommandMetadata.url),
    thumbnail:  obj.thumbnail.thumbnails.sort((a, b) => b.width - a.width)[0].url,
    bestThumbnail: obj.thumbnail.thumbnails.sort((a, b) => b.width - a.width)[0],
    thumbnails: obj.thumbnail.thumbnails,
    author: {
      name: owner.text,
      channelId: owner.navigationEndpoint.browseEndpoint.browseId,
      link: URL.resolve(BASE_VIDEO_URL, owner.navigationEndpoint.browseEndpoint.canonicalBaseUrl || owner.navigationEndpoint.commandMetadata.webCommandMetadata.url),
      ownerBadges: Array.isArray(obj.ownerBadges) ? obj.ownerBadges.map(a => a.metadataBadgeRenderer.tooltip) : [],
      verified: obj.ownerBadges && (JSON.stringify(obj.ownerBadges).includes('OFFICIAL') || JSON.stringify(obj.ownerBadges).includes('VERIFIED')),
    },
    description: obj.descriptionSnippet ? UTIL.parseText(obj.descriptionSnippet) : null,
    meta: UTIL.parseText(obj.topMetadataItems[0]).split(' · '),
    actors: UTIL.parseText(obj.bottomMetadataItems[0]).split(':')[1].split(', '),
    director: UTIL.parseText(obj.bottomMetadataItems[1]).split(':')[1].split(', '),
    duration: UTIL.parseText(obj.lengthText),
  };
}

const parseShow = obj => {
  let owner = (obj.shortBylineText && obj.shortBylineText.runs[0]) || (obj.longBylineText && obj.longBylineText.runs[0]);

  return {
    type: 'show',
    title: UTIL.parseText(obj.title),
    bestThumbnail: obj.thumbnailRenderer.showCustomThumbnailRenderer.thumbnail.thumbnails.sort((a, b) => b.width - a.width)[0],
    thumbnauls: obj.thumbnailRenderer.showCustomThumbnailRenderer.thumbnail.thumbnails,
    link: URL.resolve(BASE_VIDEO_URL, obj.navigationEndpoint.commandMetadata.webCommandMetadata.url),
    videoId: obj.navigationEndpoint.watchEndpoint.videoId,
    playlistId: obj.navigationEndpoint.watchEndpoint.playlistId,
    episodes: UTIL.parseNumFromText(obj.thumbnailOverlays[0].thumbnailOverlayBottomPanelRenderer.text),

    owner: {
      name: owner.text,
      channelId: owner.navigationEndpoint.browseEndpoint.browseId,
      link: URL.resolve(BASE_VIDEO_URL, owner.navigationEndpoint.browseEndpoint.canonicalBaseUrl || owner.navigationEndpoint.commandMetadata.webCommandMetadata.url),
      ownerBadges: Array.isArray(obj.ownerBadges) ? obj.ownerBadges.map(a => a.metadataBadgeRenderer.tooltip) : [],
      verified: obj.ownerBadges && (JSON.stringify(obj.ownerBadges).includes('OFFICIAL') || JSON.stringify(obj.ownerBadges).includes('VERIFIED')),
    },
  }
}

const parseShelf = obj => ({
  type: 'shelf',
  title: UTIL.parseText(obj.title),
  items: obj.content.verticalListRenderer.items.map(i => parseItem(i)).filter(a => a),
});
