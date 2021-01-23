const UTIL = require('./utils.js');
const PATH = require('path');
const URL = require('url');
const FS = require('fs');

const BASE_VIDEO_URL = 'https://www.youtube.com/watch?v=';
const prepImg = UTIL.prepImg;

const parseItem = (item, resp) => {
  const type = Object.keys(item)[0];

  switch (type) {
    // Regular Content or Multi-Content
    case 'videoRenderer':
      return parseVideo(item[type]);
    case 'channelRenderer':
      return parseChannel(item[type]);
    case 'playlistRenderer':
      return parsePlaylist(item[type]);
    case 'radioRenderer':
      return parseMix(item[type]);
    case 'gridMovieRenderer':
      return parseGridMovie(item[type]);
    case 'gridVideoRenderer':
      return parseVideo(item[type]);
    case 'movieRenderer':
      return parseMovie(item[type]);
    case 'shelfRenderer':
      return parseShelf(item[type]);
    case 'showRenderer':
      return parseShow(item[type]);

    // Change resp#refinements or resp#resultsFor
    case 'didYouMeanRenderer':
      // YouTube advises another query
      return parseDidYouMeanRenderer(item[type], resp);
    case 'showingResultsForRenderer':
      // The results are for another query
      return parseShowingResultsFor(item, resp);
    case 'horizontalCardListRenderer':
      return parseHorizontalCardListRenderer(item[type], resp);

    // Message-Types
    case 'backgroundPromoRenderer':
      if (UTIL.parseText(item[type].title) === 'No results found') return null;
      throw new Error('unknown message in backgroundPromoRenderer');
    case 'messageRenderer':
      // Skip all messages, since "no more results" changes with the language
      return null;
    case 'clarificationRenderer':
      return parseClarification(item[type]);

    // Skip Adds for now
    case 'carouselAdRenderer':
    case 'searchPyvRenderer':
    case 'promotedSparklesTextSearchRenderer':
      return null;
    // Skip emergencyOneboxRenderer (for now?)
    case 'emergencyOneboxRenderer':
      // Emergency Notifications like: Thinking about suicide? Call xxxx
      return null;

    // For debugging purpose
    case 'debug#previewCardRenderer':
      return parseHorizontalChannelListItem(item[type]);

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
    console.error(e.stack);
    console.error(`\n/${'*'.repeat(200)}`);
    console.error(`failed at func ${func.name}: ${e.message}`);
    console.error(`pls post the the files in ${dir} to ${bugsRef}`);
    let info = `os: ${process.platform}-${process.arch}, `;
    info += `node.js: ${process.version}, `;
    info += `ytpl: ${require('../package.json').version}`;
    console.error(info);
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
  const authorImg = !author ? null : obj.channelThumbnailSupportedRenderers.channelThumbnailWithLinkRenderer;
  const isOfficial = !!(obj.ownerBadges && JSON.stringify(obj.ownerBadges).includes('OFFICIAL'));
  const isVerified = !!(obj.ownerBadges && JSON.stringify(obj.ownerBadges).includes('VERIFIED'));
  const lengthFallback = obj.thumbnailOverlays.find(x => Object.keys(x)[0] === 'thumbnailOverlayTimeStatusRenderer');
  const length = obj.lengthText || (lengthFallback && lengthFallback.thumbnailOverlayTimeStatusRenderer.text);

  return {
    type: 'video',
    title: UTIL.parseText(obj.title),
    id: obj.videoId,
    url: BASE_VIDEO_URL + obj.videoId,
    bestThumbnail: prepImg(obj.thumbnail.thumbnails)[0],
    thumbnails: prepImg(obj.thumbnail.thumbnails),
    isUpcoming: !!upcoming,
    upcoming,
    isLive,
    badges,

    // Author can be null for shows like whBqghP5Oow
    author: author ? {
      name: author.text,
      channelID: author.navigationEndpoint.browseEndpoint.browseId,
      url: URL.resolve(BASE_VIDEO_URL, authorUrl),
      bestAvatar: prepImg(authorImg.thumbnail.thumbnails)[0],
      avatars: prepImg(authorImg.thumbnail.thumbnails),
      ownerBadges: Array.isArray(obj.ownerBadges) ? obj.ownerBadges.map(a => a.metadataBadgeRenderer.tooltip) : [],
      verified: isOfficial || isVerified,
    } : null,

    description: obj.descriptionSnippet ? UTIL.parseText(obj.descriptionSnippet) : null,

    views: !obj.viewCountText ? null : UTIL.parseIntegerFromText(obj.viewCountText),
    // Duration not provided for live & sometimes with upcoming & sometimes randomly
    duration: !length ? null : UTIL.parseText(length),
    // UplaodedAt not provided for live & upcoming & sometimes randomly
    uploadedAt: !obj.publishedTimeText ? null : UTIL.parseText(obj.publishedTimeText),
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
    channelID: obj.channelId,
    url: URL.resolve(BASE_VIDEO_URL, targetUrl),
    bestAvatar: prepImg(obj.thumbnail.thumbnails)[0],
    avatars: prepImg(obj.thumbnail.thumbnails),
    verified: isOfficial || isVerified,

    subscribers: obj.subscriberCountText ? UTIL.parseText(obj.subscriberCountText) : null,
    descriptionShort: obj.descriptionSnippet ? UTIL.parseText(obj.descriptionSnippet) : null,
    videos: obj.videoCountText ? UTIL.parseIntegerFromText(obj.videoCountText) : null,
  };
};

const parsePlaylist = obj => ({
  type: 'playlist',
  title: UTIL.parseText(obj.title),
  playlistID: obj.playlistId,
  url: `https://www.youtube.com/playlist?list=${obj.playlistId}`,
  firstVideo: Array.isArray(obj.videos) && obj.videos.length > 0 ? {
    id: obj.navigationEndpoint.watchEndpoint.videoId,
    shortURL: BASE_VIDEO_URL + obj.navigationEndpoint.watchEndpoint.videoId,
    url: URL.resolve(BASE_VIDEO_URL, obj.navigationEndpoint.commandMetadata.webCommandMetadata.url),
    title: UTIL.parseText(obj.videos[0].childVideoRenderer.title),
    length: UTIL.parseText(obj.videos[0].childVideoRenderer.lengthText),
    thumbnails: prepImg(obj.thumbnails[0].thumbnails),
    bestThumbnail: prepImg(obj.thumbnails[0].thumbnails)[0],
  } : null,

  // Some Playlists starting with OL only provide a simple string
  owner: obj.shortBylineText.simpleText ? null : _parseOwner(obj),

  publishedAt: obj.publishedTimeText ? UTIL.parseText(obj.publishedTimeText) : null,
  length: Number(obj.videoCount),
});

const parseMix = obj => ({
  type: 'mix',
  title: UTIL.parseText(obj.title),
  url: URL.resolve(BASE_VIDEO_URL, obj.navigationEndpoint.commandMetadata.webCommandMetadata.url),

  firstVideo: {
    id: obj.navigationEndpoint.watchEndpoint.videoId,
    shortURL: BASE_VIDEO_URL + obj.navigationEndpoint.watchEndpoint.videoId,
    url: URL.resolve(BASE_VIDEO_URL, obj.navigationEndpoint.commandMetadata.webCommandMetadata.url),
    text: UTIL.parseText(obj.videos[0].childVideoRenderer.title),
    length: UTIL.parseText(obj.videos[0].childVideoRenderer.lengthText),
    thumbnails: prepImg(obj.thumbnail.thumbnails),
    bestThumbnail: prepImg(obj.thumbnail.thumbnails)[0],
  },
});

const parseDidYouMeanRenderer = (obj, resp) => {
  // Add as the first item in refinements
  if (resp && Array.isArray(resp.refinements)) {
    resp.refinements.unshift({
      q: UTIL.parseText(obj.correctedQuery),
      url: URL.resolve(BASE_VIDEO_URL, obj.correctedQueryEndpoint.commandMetadata.webCommandMetadata.url),
      bestThumbnail: null,
      thumbnails: null,
    });
  }
  return null;
};

const parseShowingResultsFor = (obj, resp) => {
  // Add as resultsFor
  const cor = obj.showingResultsForRenderer.correctedQuery || obj.correctedQuery;
  if (resp) resp.correctedQuery = UTIL.parseText(cor);
  return null;
};

const parseClarification = obj => ({
  type: 'clarification',
  title: UTIL.parseText(obj.contentTitle),
  text: UTIL.parseText(obj.text),
  sources: [
    {
      text: UTIL.parseText(obj.source),
      url: URL.resolve(BASE_VIDEO_URL, obj.endpoint.urlEndpoint.url),
    },
    !obj.secondarySource ? null : {
      text: UTIL.parseText(obj.secondarySource),
      url: URL.resolve(BASE_VIDEO_URL, obj.secondaryEndpoint.urlEndpoint.url),
    },
  ].filter(a => a),
});

const parseHorizontalCardListRenderer = (obj, resp) => {
  const subType = Object.keys(obj.cards[0])[0];

  switch (subType) {
    case 'searchRefinementCardRenderer':
      return parseHorizontalRefinements(obj, resp);
    case 'previewCardRenderer':
      return parseHorizontalChannelList(obj);
    default:
      throw new Error(`subType ${subType} of type horizontalCardListRenderer not known`);
  }
};

const parseHorizontalRefinements = (obj, resp) => {
  // Add to refinements
  if (resp && Array.isArray(resp.refinements)) {
    resp.refinements.push(...obj.cards.map(c => {
      const targetUrl = c.searchRefinementCardRenderer.searchEndpoint.commandMetadata.webCommandMetadata.url;
      return {
        q: UTIL.parseText(c.searchRefinementCardRenderer.query),
        url: URL.resolve(BASE_VIDEO_URL, targetUrl),
        bestThumbnail: prepImg(c.searchRefinementCardRenderer.thumbnail.thumbnails)[0],
        thumbnails: prepImg(c.searchRefinementCardRenderer.thumbnail.thumbnails),
      };
    }));
  }
  return null;
};

const parseHorizontalChannelList = obj => {
  if (!JSON.stringify(obj.style).includes('CHANNELS')) {
    // Not sure if this is always a channel + videos
    throw new Error(`unknown style in horizontalCardListRenderer`);
  }
  return {
    type: 'horizontalChannelList',
    title: UTIL.parseText(obj.header.richListHeaderRenderer.title),
    channels: obj.cards.map(i => parseHorizontalChannelListItem(i.previewCardRenderer)).filter(a => a),
  };
};

const parseHorizontalChannelListItem = obj => {
  const thumbnailRenderer = obj.header.richListHeaderRenderer.channelThumbnail.channelThumbnailWithLinkRenderer;
  return {
    type: 'channelPreview',
    name: UTIL.parseText(obj.header.richListHeaderRenderer.title),
    channelID: obj.header.richListHeaderRenderer.endpoint.browseEndpoint.browseId,
    url: URL.resolve(
      BASE_VIDEO_URL,
      obj.header.richListHeaderRenderer.endpoint.commandMetadata.webCommandMetadata.url,
    ),
    bestAvatar: prepImg(thumbnailRenderer.thumbnail.thumbnails)[0],
    avatars: prepImg(thumbnailRenderer.thumbnail.thumbnails),
    subscribers: UTIL.parseText(obj.header.richListHeaderRenderer.subtitle),
    // Type: gridVideoRenderer
    videos: obj.contents.map(i => parseVideo(i.gridVideoRenderer)).filter(a => a),
  };
};

const parseGridMovie = obj => ({
  // Movie which can be found in horizontalMovieListRenderer
  type: 'gridMovie',
  title: UTIL.parseText(obj.title),
  videoID: obj.videoId,
  url: URL.resolve(BASE_VIDEO_URL, obj.navigationEndpoint.commandMetadata.webCommandMetadata.url),
  bestThumbnail: prepImg(obj.thumbnail.thumbnails)[0],
  thumbnails: prepImg(obj.thumbnail.thumbnails),
  duration: UTIL.parseText(obj.lengthText),
});

const parseMovie = obj => {
  // Normalize
  obj.bottomMetadataItems = (obj.bottomMetadataItems || []).map(x => UTIL.parseText(x));
  const actorsString = obj.bottomMetadataItems.find(x => x.startsWith('Actors'));
  const directorsString = obj.bottomMetadataItems.find(x => x.startsWith('Director'));

  return {
    type: 'movie',
    title: UTIL.parseText(obj.title),
    videoID: obj.videoId,
    url: URL.resolve(BASE_VIDEO_URL, obj.navigationEndpoint.commandMetadata.webCommandMetadata.url),
    bestThumbnail: prepImg(obj.thumbnail.thumbnails)[0],
    thumbnails: prepImg(obj.thumbnail.thumbnails),

    owner: _parseOwner(obj),
    description: obj.descriptionSnippet ? UTIL.parseText(obj.descriptionSnippet) : null,
    meta: UTIL.parseText(obj.topMetadataItems[0]).split(' · '),
    actors: !actorsString ? [] : actorsString.split(': ')[1].split(', '),
    directors: !directorsString ? [] : directorsString.split(': ')[1].split(', '),
    duration: UTIL.parseText(obj.lengthText),
  };
};

const parseShow = obj => {
  const thumbnails = obj.thumbnailRenderer.showCustomThumbnailRenderer.thumbnail.thumbnails;
  const owner = _parseOwner(obj);
  delete owner.ownerBadges;
  delete owner.verified;

  return {
    type: 'show',
    title: UTIL.parseText(obj.title),
    bestThumbnail: prepImg(thumbnails)[0],
    thumbnails: prepImg(thumbnails),
    url: URL.resolve(BASE_VIDEO_URL, obj.navigationEndpoint.commandMetadata.webCommandMetadata.url),
    videoID: obj.navigationEndpoint.watchEndpoint.videoId,
    playlistID: obj.navigationEndpoint.watchEndpoint.playlistId,
    episodes: UTIL.parseIntegerFromText(obj.thumbnailOverlays[0].thumbnailOverlayBottomPanelRenderer.text),
    owner,
  };
};

const parseShelf = obj => {
  const rawItems = obj.content.verticalListRenderer || obj.content.horizontalMovieListRenderer;
  // Optional obj.thumbnail is ignored
  return {
    type: 'shelf',
    title: UTIL.parseText(obj.title),
    items: rawItems.items.map(i => parseItem(i)).filter(a => a),
  };
};

/**
 * Generalised Method
 *
 * used in Playlist, Movie and Show
 * show does never provide badges thou
 *
 * @param {Object} obj the full Renderer Object provided by YouTube
 * @returns {Object} the parsed owner
 */
const _parseOwner = obj => {
  const owner = (obj.shortBylineText && obj.shortBylineText.runs[0]) ||
    (obj.longBylineText && obj.longBylineText.runs[0]);
  const ownerUrl = owner.navigationEndpoint.browseEndpoint.canonicalBaseUrl ||
    owner.navigationEndpoint.commandMetadata.webCommandMetadata.url;
  const isOfficial = !!(obj.ownerBadges && JSON.stringify(obj.ownerBadges).includes('OFFICIAL'));
  const isVerified = !!(obj.ownerBadges && JSON.stringify(obj.ownerBadges).includes('VERIFIED'));
  const fallbackURL = owner.navigationEndpoint.commandMetadata.webCommandMetadata.url;

  return {
    name: owner.text,
    channelID: owner.navigationEndpoint.browseEndpoint.browseId,
    url: URL.resolve(BASE_VIDEO_URL, ownerUrl || fallbackURL),
    ownerBadges: Array.isArray(obj.ownerBadges) ? obj.ownerBadges.map(a => a.metadataBadgeRenderer.tooltip) : [],
    verified: isOfficial || isVerified,
  };
};
