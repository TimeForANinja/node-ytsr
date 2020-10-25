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

let log = 0;
const parseItem = (item) => {
  const type = Object.keys(item)[0];

  if (type === 'videoRenderer') {
    const author = item[type].ownerText.runs[0];
    const isLive = Array.isArray(item[type].badges) && item[type].badges.some(a => a.metadataBadgeRenderer.label === 'LIVE NOW');
    const upcoming = item[type].upcomingEventData ? Number(`${item[type].upcomingEventData.startTime}000`) : false;
    return {
      type: 'video',
      live: isLive,
      title: item[type].title.runs[0].text,
      link: VIDEO_URL + item[type].videoId,
      thumbnail: item[type].thumbnail.thumbnails.sort((a,b) => b.width - a.width)[0].url,

      author: {
        name: author.text,
        ref: URL.resolve(VIDEO_URL, author.navigationEndpoint.commandMetadata.webCommandMetadata.url),
        verified: Array.isArray(item[type].ownerBadges) && item[type].ownerBadges.some(a => a.metadataBadgeRenderer.tooltip === 'Verified'),
      },

      description: item[type].descriptionSnippet ? item[type].descriptionSnippet.runs.map(a => a.text).join('') : '',

      views: upcoming ? null : item[type].viewCountText.simpleText || item[type].viewCountText.runs.map(a => a.text).join(''),
      duration: isLive || upcoming ? null : item[type].lengthText.simpleText,
      uploaded_at: isLive || upcoming || !item[type].publishedTimeText ? null : item[type].publishedTimeText.simpleText,
    };
  } else if (type === 'shelfRenderer') {
    // console.log(item);
  } else if (type === 'horizontalCardListRenderer') {
    // console.log(item);
  } else {
    console.log('unknown type:', type);
  }
}
