const URL = require('url');
const VIDEO_URL = 'https://www.youtube.com/watch?v=';
const DEFAULT_CONTEXT = {
  client: {
    utcOffsetMinutes: 0,
    gl: 'US',
    hl: 'en',
    clientName: 'WEB',
    clientVersion: '2.20201023.02.00',
  },
  user: {},
  request: {},
};

exports.buildRequestBody = options => {
  let body = { context: DEFAULT_CONTEXT };
  // Should change utcOffsetMinutes too, idk .-.
  // if (options && options.gl) body.context.client.gl = options.gl;
  // if (options && options.hl) body.context.client.hl = options.hl;
  if (options && options.clientVersion) body.context.client.clientVersion = options.clientVersion;
  // Search query or continuation token
  if (!options.nextpageRef) body.query = options.query;
  else body.continuation = options.nextpageRef;
  return body;
};

exports.mapJSON = json => {
  const wrapper = json.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer;
  const filters = wrapper.subMenu.searchSubMenuRenderer.groups;
  const items = wrapper.contents.find(x => Object.keys(x)[0] === 'itemSectionRenderer').itemSectionRenderer.contents;
  const continuation = wrapper.contents.find(x => Object.keys(x)[0] === 'continuationItemRenderer');
  let token = continuation ? continuation.continuationItemRenderer.continuationEndpoint.continuationCommand.token : '';

  return {
    query: null,
    items: [].concat([{
      type: 'search-refinements',
      entries: json.refinements,
    }], ...items.map(parseItem).filter(a => a)),
    nextpageRef: token,
    results: json.estimatedResults,
    filters: filters,
    currentRef: null,
  };
};

exports.continuationJSON = json => {
  const continuationItems = json.onResponseReceivedCommands[0].appendContinuationItemsAction.continuationItems;
  const items = continuationItems.find(x => Object.keys(x)[0] === 'itemSectionRenderer').itemSectionRenderer.contents;
  const continuation = continuationItems.find(x => Object.keys(x)[0] === 'continuationItemRenderer');
  let token = continuation ? continuation.continuationItemRenderer.continuationEndpoint.continuationCommand.token : '';

  return {
    query: null,
    items: items.map(parseItem).filter(a => a),
    nextpageRef: token,
    currentRef: null,
  };
};

const parseItem = item => {
  const type = Object.keys(item)[0];

  switch (type) {
    case 'videoRenderer':
      return parseVideo(item[type]);
    case 'channelRenderer':
      return parseChannel(item[type]);
    case 'playlistRenderer':
      return parsePlaylist(item[type]);
    case 'radioRenderer':
      return parseMix(item[type]);
    case 'showingResultsForRenderer':
    case 'backgroundPromoRenderer':
    case 'shelfRenderer':
    case 'horizontalCardListRenderer':
      break;
    default:
      console.log('unknown type:', type);
      break;
  }
};

const parseVideo = obj => {
  const author = obj.ownerText.runs[0];
  const isLive = Array.isArray(obj.badges) && obj.badges.some(a => a.metadataBadgeRenderer.label === 'LIVE NOW');
  const upcoming = obj.upcomingEventData ? Number(`${obj.upcomingEventData.startTime}000`) : false;
  return {
    type: 'video',
    live: isLive,
    title: obj.title.runs[0].text,
    link: VIDEO_URL + obj.videoId,
    thumbnail: obj.thumbnail.thumbnails.sort((a, b) => b.width - a.width)[0].url,
    upcoming,

    author: {
      name: author.text,
      ref: URL.resolve(VIDEO_URL, author.navigationEndpoint.commandMetadata.webCommandMetadata.url),
      verified: obj.ownerBadges &&
        (JSON.stringify(obj.ownerBadges).includes('OFFICIAL') || JSON.stringify(obj.ownerBadges).includes('VERIFIED')),
    },

    description: obj.descriptionSnippet ? obj.descriptionSnippet.runs.map(a => a.text).join('') : null,

    views: !obj.viewCountText ? null : obj.viewCountText.simpleText || obj.viewCountText.runs.map(a => a.text).join(''),
    duration: isLive || upcoming || !obj.lengthText ? null : obj.lengthText.simpleText,
    uploaded_at: isLive || upcoming || !obj.publishedTimeText ? null : obj.publishedTimeText.simpleText,
  };
};

const parseChannel = obj => ({
  type: 'channel',
  name: obj.title.simpleText,
  channel_id: obj.channelId,
  link: `https://www.youtube.com/channel/${obj.channelId}`,
  avatar: obj.thumbnail.thumbnails.sort((a, b) => b.width - a.width)[0].url,
  verified: obj.ownerBadges &&
    (JSON.stringify(obj.ownerBadges).includes('OFFICIAL') || JSON.stringify(obj.ownerBadges).includes('VERIFIED')),

  followers: obj.subscriberCountText ? obj.subscriberCountText.simpleText : null,
  description_short: obj.descriptionSnippet ? obj.descriptionSnippet.runs.map(a => a.text).join('') : null,
  videos: Number(obj.videoCountText ? obj.videoCountText.runs[0].text.replace(/[.,]/g, '') : 0),
});

const parsePlaylist = obj => {
  let author = obj.shortBylineText ? obj.shortBylineText.runs[0] : obj.longBylineText ? obj.longBylineText.runs[0] : {};
  return {
    type: 'playlist',
    title: obj.title.simpleText,
    link: `https://www.youtube.com/playlist?list=${obj.playlistId}`,
    thumbnail: obj.thumbnailRenderer,

    author: {
      name: author.text,
      ref: `https://www.youtube.com/channel/${author.navigationEndpoint.browseEndpoint.browseId}`,
      verified: obj.ownerBadges &&
        (JSON.stringify(obj.ownerBadges).includes('OFFICIAL') || JSON.stringify(obj.ownerBadges).includes('VERIFIED')),
    },

    length: Number(obj.videoCount),
  };
};

const parseMix = obj => ({
  type: 'mix',
  title: obj.title.simpleText,
  firstItem: `https://www.youtube.com/watch?v=${obj.videos[0].childVideoRenderer.videoId}&list=${obj.playlistId}`,
  thumbnail: obj.thumbnail.thumbnails.sort((a, b) => b.width - a.width)[0].url,
  length: obj.videoCountText.runs[0].text,
});
