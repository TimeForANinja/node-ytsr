const UTIL = require('./utils.js');
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
      if (UTIL.parseText(item[type].title) === 'No results found') return null;
      throw new Error('unknown message in backgroundPromoRenderer');
    case 'messageRenderer':
      if (UTIL.parseText(item[type].text) === 'No more results') return null;
      throw new Error('unknown message in messageRenderer');

    // Ignore those - already have the .json
    case 'showingResultsForRenderer':
      // The results are for another query
      return null;
    case 'gridMovieRenderer':
      return parseGridMovie(item[type]);
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
      // Emergency Notifications like: Thinking about suicide? Call xxxx
      return null;

    // New type & file without json until now => save
    default:
      throw new Error(`type ${type} is not known`);
  }
};

const catchAndLogFunc = (func, params = []) => {
  if (!Array.isArray(params)) throw new Error('params has to be an (optionally empty) array');
  try {
    return func(...params);
  } catch (e) {
    const dir = PATH.resolve(__dirname, '../dumps/');
    const file = PATH.resolve(dir, `${Math.random().toString(36).substr(3)}-${Date.now()}.txt`);
    const cfg = PATH.resolve(__dirname, '../package.json');
    const bugsRef = require(cfg).bugs.url;

    if (!FS.existsSync(dir)) FS.mkdirSync(dir);
    FS.writeFileSync(file, JSON.stringify(params, null, 2));
    /* eslint-disable no-console */
    const ePrint = `failed at func ${func.name}: ${e.message}`;
    console.error(e.stack);
    console.error(`\n/${'*'.repeat(200)}`);
    console.error(ePrint);
    console.error(`pls post the the files in ${dir} to ${bugsRef}`);
    console.error(`${'*'.repeat(200)}\\`);
    /* eslint-enable no-console */
    return null;
  }
};
const main = module.exports = (...params) => catchAndLogFunc(parseItem, params);
main._hidden = { catchAndLogFunc, parseItem };

// TYPES:
const parseVideo = obj => {
  const author = obj.ownerText && obj.ownerText.runs[0];
  let authorUrl = null;
  if (author) {
    authorUrl = author.navigationEndpoint.browseEndpoint.canonicalBaseUrl ||
      author.navigationEndpoint.commandMetadata.webCommandMetadata.url;
  }
  const badges = Array.isArray(obj.badges) ? obj.badges.map(a => a.metadataBadgeRenderer.label) : [];
  const isLive = badges.some(b => b === 'LIVE NOW');
  const upcoming = obj.upcomingEventData ? Number(`${obj.upcomingEventData.startTime}000`) : null;
  const authorThumbnails = obj.channelThumbnailSupportedRenderers.channelThumbnailWithLinkRenderer.thumbnail.thumbnails;
  const isOfficial = !!(obj.ownerBadges && JSON.stringify(obj.ownerBadges).includes('OFFICIAL'));
  const isVerified = !!(obj.ownerBadges && JSON.stringify(obj.ownerBadges).includes('VERIFIED'));

  return {
    type: 'video',
    title: UTIL.parseText(obj.title),
    id: obj.videoId,
    link: BASE_VIDEO_URL + obj.videoId,
    bestThumbnail: obj.thumbnail.thumbnails.sort((a, b) => b.width - a.width)[0],
    thumbnails: obj.thumbnail.thumbnails.sort((a, b) => b.width - a.width),
    isUpcoming: !!upcoming,
    upcoming,
    isLive,
    badges,

    // Author can be null for shows like whBqghP5Oow
    author: author ? {
      name: author.text,
      channelID: author.navigationEndpoint.browseEndpoint.browseId,
      ref: URL.resolve(BASE_VIDEO_URL, authorUrl),
      bestAvatar: authorThumbnails.sort((a, b) => b.width - a.width)[0],
      avatars: authorThumbnails.sort((a, b) => b.width - a.width),
      ownerBadges: Array.isArray(obj.ownerBadges) ? obj.ownerBadges.map(a => a.metadataBadgeRenderer.tooltip) : [],
      verified: isOfficial || isVerified,
    } : null,

    description: obj.descriptionSnippet ? UTIL.parseText(obj.descriptionSnippet) : '',

    views: !obj.viewCountText ? null : UTIL.parseIntegerFromText(obj.viewCountText),
    // Duration not provided for live & sometimes with upcoming & sometimes randomly
    duration: !obj.lengthText ? null : UTIL.parseText(obj.lengthText),
    // UplaodedAt not provided for live & upcoming & sometimes randomly
    uploaded_at: !obj.publishedTimeText ? null : UTIL.parseText(obj.publishedTimeText),

    // TODO: remove when done caring about compatibility
    live: isLive,
    thumbnail: obj.thumbnail.thumbnails.sort((a, b) => b.width - a.width)[0].url,
  };
};

const parseChannel = obj => {
  const targetUrl = obj.navigationEndpoint.browseEndpoint.canonicalBaseUrl ||
    obj.navigationEndpoint.commandMetadata.webCommandMetadata.url;
  const isOfficial = !!(obj.ownerBadges && JSON.stringify(obj.ownerBadges).includes('OFFICIAL'));
  const isVerified = !!(obj.ownerBadges && JSON.stringify(obj.ownerBadges).includes('VERIFIED'));

  return {
    type: 'channel',
    name: UTIL.parseText(obj.title),
    channel_id: obj.channelId,
    link: URL.resolve(BASE_VIDEO_URL, targetUrl),
    bestAvatar: obj.thumbnail.thumbnails.sort((a, b) => b.width - a.width)[0],
    avatars: obj.thumbnail.thumbnails.sort((a, b) => b.width - a.width),
    verified: isOfficial || isVerified,

    subscribers: obj.subscriberCountText ? UTIL.parseIntegerFromText(obj.subscriberCountText) : null,
    // TODO: remove empty string when done caring about compatibility
    description_short: obj.descriptionSnippet ? UTIL.parseText(obj.descriptionSnippet) : '',
    // TODO: remove 0 when done caring about compatibility
    videos: obj.videoCountText ? UTIL.parseIntegerFromText(obj.videoCountText) : 0,

    // TODO: remove when done caring about compatibility
    avatar: obj.thumbnail.thumbnails.sort((a, b) => b.width - a.width)[0].url,
    followers: obj.subscriberCountText ? UTIL.parseIntegerFromText(obj.subscriberCountText) : 0,
  };
};

const parsePlaylist = obj => {
  let owner = (obj.shortBylineText && obj.shortBylineText.runs[0]) ||
    (obj.longBylineText && obj.longBylineText.runs[0]);
  const ownerUrl = owner.navigationEndpoint.browseEndpoint.canonicalBaseUrl ||
    owner.navigationEndpoint.commandMetadata.webCommandMetadata.url;
  const isOfficial = !!(obj.ownerBadges && JSON.stringify(obj.ownerBadges).includes('OFFICIAL'));
  const isVerified = !!(obj.ownerBadges && JSON.stringify(obj.ownerBadges).includes('VERIFIED'));

  return {
    type: 'playlist',
    title: UTIL.parseText(obj.title),
    playlistID: obj.playlistId,
    link: `https://www.youtube.com/playlist?list=${obj.playlistId}`,
    firstVideo: Array.isArray(obj.videos) && obj.videos.length > 0 ? {
      id: obj.navigationEndpoint.watchEndpoint.videoId,
      shortLink: BASE_VIDEO_URL + obj.navigationEndpoint.watchEndpoint.videoId,
      link: URL.resolve(BASE_VIDEO_URL, obj.navigationEndpoint.commandMetadata.webCommandMetadata.url),
      text: UTIL.parseText(obj.videos[0].childVideoRenderer.title),
      length: UTIL.parseText(obj.videos[0].childVideoRenderer.lengthText),
      thumbnails: obj.thumbnails[0].thumbnails.sort((a, b) => b.width - a.width),
      bestThumbnail: obj.thumbnails[0].thumbnails.sort((a, b) => b.width - a.width)[0],
    } : null,

    owner: {
      name: owner.text,
      channelID: owner.navigationEndpoint.browseEndpoint.browseId,
      link: URL.resolve(BASE_VIDEO_URL, ownerUrl),
      ownerBadges: Array.isArray(obj.ownerBadges) ? obj.ownerBadges.map(a => a.metadataBadgeRenderer.tooltip) : [],
      verified: isOfficial || isVerified,
    },

    published_at: obj.publishedTimeText ? UTIL.parseText(obj.publishedTimeText) : null,
    // TODO: remove toString when done caring about compatibility
    length: Number(obj.videoCount).toString(),

    // TODO: remove when done caring about compatibility
    playlist_id: obj.playlistId,
    thumbnail: obj.thumbnails[0].thumbnails.sort((a, b) => b.width - a.width)[0].url,
    author: {
      name: owner.text,
      ref: URL.resolve(BASE_VIDEO_URL, ownerUrl),
      verified: isOfficial || isVerified,
    },
  };
};

const parseMix = obj => ({
  type: 'mix',
  title: UTIL.parseText(obj.title),
  link: URL.resolve(BASE_VIDEO_URL, obj.navigationEndpoint.commandMetadata.webCommandMetadata.url),

  firstVideo: {
    id: obj.navigationEndpoint.watchEndpoint.videoId,
    shortLink: BASE_VIDEO_URL + obj.navigationEndpoint.watchEndpoint.videoId,
    link: URL.resolve(BASE_VIDEO_URL, obj.navigationEndpoint.commandMetadata.webCommandMetadata.url),
    text: UTIL.parseText(obj.videos[0].childVideoRenderer.title),
    length: UTIL.parseText(obj.videos[0].childVideoRenderer.lengthText),
    thumbnails: obj.thumbnail.thumbnails.sort((a, b) => b.width - a.width),
    bestThumbnail: obj.thumbnail.thumbnails.sort((a, b) => b.width - a.width)[0],
  },

  // TODO: remove when done caring about compatibility
  firstItem: URL.resolve(BASE_VIDEO_URL, obj.navigationEndpoint.commandMetadata.webCommandMetadata.url),
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
  entrys: obj.cards.map(c => {
    const targetUrl = c.searchRefinementCardRenderer.searchEndpoint.commandMetadata.webCommandMetadata.url;
    return {
      q: UTIL.parseText(c.searchRefinementCardRenderer.query),
      link: URL.resolve(BASE_VIDEO_URL, targetUrl),
      bestThumbnail: c.searchRefinementCardRenderer.thumbnail.thumbnails.sort((a, b) => b.width - a.width)[0],
      thumbnails: c.searchRefinementCardRenderer.thumbnail.thumbnails.sort((a, b) => b.width - a.width),
    };
  }),
});

const parseGridMovie = obj => ({
  // Movie which can be found in horizontalMovieListRenderer
  type: 'gridMovie',
  title: UTIL.parseText(obj.title),
  videoID: obj.videoId,
  url: URL.resolve(BASE_VIDEO_URL, obj.navigationEndpoint.commandMetadata.webCommandMetadata.url),
  bestThumbnail: obj.thumbnail.thumbnails.sort((a, b) => b.width - a.width)[0],
  thumbnails: obj.thumbnail.thumbnails.sort((a, b) => b.width - a.width),
  duration: UTIL.parseText(obj.lengthText),
});

const parseMovie = obj => {
  let owner = (obj.shortBylineText && obj.shortBylineText.runs[0]) ||
    (obj.longBylineText && obj.longBylineText.runs[0]);
  const isOfficial = !!(obj.ownerBadges && JSON.stringify(obj.ownerBadges).includes('OFFICIAL'));
  const isVerified = !!(obj.ownerBadges && JSON.stringify(obj.ownerBadges).includes('VERIFIED'));
  const targetUrl = owner.navigationEndpoint.commandMetadata.webCommandMetadata.url;

  return {
    type: 'movie',
    title: UTIL.parseText(obj.title),
    videoID: obj.videoId,
    url: URL.resolve(BASE_VIDEO_URL, obj.navigationEndpoint.commandMetadata.webCommandMetadata.url),
    bestThumbnail: obj.thumbnail.thumbnails.sort((a, b) => b.width - a.width)[0],
    thumbnails: obj.thumbnail.thumbnails.sort((a, b) => b.width - a.width),
    author: {
      name: owner.text,
      channelID: owner.navigationEndpoint.browseEndpoint.browseId,
      url: URL.resolve(BASE_VIDEO_URL, owner.navigationEndpoint.browseEndpoint.canonicalBaseUrl || targetUrl),
      ownerBadges: (obj.ownerBadges || []).map(a => a.metadataBadgeRenderer.tooltip),
      verified: isOfficial || isVerified,
    },
    description: obj.descriptionSnippet ? UTIL.parseText(obj.descriptionSnippet) : null,
    meta: UTIL.parseText(obj.topMetadataItems[0]).split(' · '),
    actors: UTIL.parseText(obj.bottomMetadataItems[0]).split(':')[1].split(', '),
    director: UTIL.parseText(obj.bottomMetadataItems[1]).split(':')[1].split(', '),
    duration: UTIL.parseText(obj.lengthText),
  };
};

const parseShow = obj => {
  const owner = (obj.shortBylineText && obj.shortBylineText.runs[0]) ||
    (obj.longBylineText && obj.longBylineText.runs[0]);
  const isOfficial = !!(obj.ownerBadges && JSON.stringify(obj.ownerBadges).includes('OFFICIAL'));
  const isVerified = !!(obj.ownerBadges && JSON.stringify(obj.ownerBadges).includes('VERIFIED'));
  const targetUrl = owner.navigationEndpoint.commandMetadata.webCommandMetadata.url;
  const thumbnails = obj.thumbnailRenderer.showCustomThumbnailRenderer.thumbnail.thumbnails;

  return {
    type: 'show',
    title: UTIL.parseText(obj.title),
    bestThumbnail: thumbnails.sort((a, b) => b.width - a.width)[0],
    thumbnails: thumbnails.sort((a, b) => b.width - a.width),
    url: URL.resolve(BASE_VIDEO_URL, obj.navigationEndpoint.commandMetadata.webCommandMetadata.url),
    videoID: obj.navigationEndpoint.watchEndpoint.videoId,
    playlistID: obj.navigationEndpoint.watchEndpoint.playlistId,
    episodes: UTIL.parseIntegerFromText(obj.thumbnailOverlays[0].thumbnailOverlayBottomPanelRenderer.text),

    owner: {
      name: owner.text,
      channelID: owner.navigationEndpoint.browseEndpoint.browseId,
      url: URL.resolve(BASE_VIDEO_URL, owner.navigationEndpoint.browseEndpoint.canonicalBaseUrl || targetUrl),
      ownerBadges: (obj.ownerBadges || []).map(a => a.metadataBadgeRenderer.tooltip),
      verified: isOfficial || isVerified,
    },
  };
};

const parseShelf = obj => {
  const rawItems = obj.content.verticalListRenderer || obj.content.horizontalMovieListRenderer;
  return {
    type: 'shelf',
    title: UTIL.parseText(obj.title),
    items: rawItems.items.map(i => parseItem(i)).filter(a => a),
  };
};
