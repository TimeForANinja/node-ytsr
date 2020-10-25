const URL = require('url');
const VIDEO_URL = 'https://www.youtube.com/watch?v=';

exports.mapJSON = (json) => {
  const wrapper = json.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer;
  const filters = wrapper.subMenu.searchSubMenuRenderer.groups;
  const items = wrapper.contents.find(x => Object.keys(x)[0] === 'itemSectionRenderer').itemSectionRenderer.contents;
  const continuation = wrapper.contents.find(x => Object.keys(x)[0] === 'continuationItemRenderer').continuationItemRenderer;

  return {
    query: null,
    items: [].concat([{
      type: 'search-refinements',
      entries: json.refinements,
    }], ...items.map(parseItem).filter(a => a)),
    nextpageRef: null, // continuation,
    results: json.estimatedResults,
    filters: filters,
    currentRef: null,
  }
}

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
      // console.log('unknown type:', type);
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
