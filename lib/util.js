const ENTITIES = require('html-entities').AllHtmlEntities;
const PATH = require('path');
const URL = require('url');
const HTTPS = require('https');
const FS = require('fs');
const QUERYSTRING = require('querystring');
const BASE_URL = 'https://www.youtube.com/results?';

// Builds the search query url
exports.buildLink = query => BASE_URL + QUERYSTRING
  .encode({
    search_query: query,
    spf: 'navigate',
    gl: 'US',
    hl: 'en',
  });

exports.buildFromNextpage = nextpageRef => {
  let parsed = URL.parse(nextpageRef, true);
  let overwrites = QUERYSTRING.decode(parsed.search.substr(1));
  return BASE_URL + QUERYSTRING.encode(Object.assign({}, overwrites, {
    spf: 'navigate',
    gl: 'US',
    hl: 'en',
  }));
};

// Start of parsing an item
exports.parseItem = (string, respString, searchString) => {
  const titles = exports.between(string, '<div class="', '"');
  const type = exports.between(titles, 'yt-lockup yt-lockup-tile yt-lockup-', ' ');
  if (type === 'playlist') {
    if (string.includes('yt-pl-icon-mix')) return exports.parseMix(string);
    return exports.parsePlaylist(string);
  } else if (type === 'channel') {
    return exports.parseChannel(string);
  } else if (type === 'video') {
    return exports.parseVideo(string);
  } else if (type === 'movie-vertical-poster') {
    return exports.parseMovie(string);
  } else if (titles === 'search-refinements') {
    return exports.parseRelatedSearches(string);
  } else if (titles.includes('shelf') && string.includes('<div class="compact-shelf')) {
    return exports.parseShelfCompact(string);
  } else if (titles.includes('shelf') && string.includes('<div class="vertical-shelf">')) {
    return exports.parseShelfVertical(string);
  } else if (string.includes('<div class="display-message">No more results</div>')) {
    return null;
  } else if (string.includes('<div class="emergency-onebox">')) {
    return null;
  } else if (string.includes('<div class="yt-alert-message"')) {
    return null;
  } else if (titles.includes('yt-lockup-clarification')) {
    return null;
  } else {
    const dir = PATH.resolve(__dirname, '../dumps/');
    const file = PATH.resolve(dir, `${Math.random().toString(36).substr(3)}-${Date.now()}.dumb`);
    const cfg = PATH.resolve(__dirname, '../package.json');
    const bugsRef = require(cfg).bugs.url;
    if (!FS.existsSync(dir)) FS.mkdirSync(dir);
    FS.writeFileSync(file, JSON.stringify({ type, searchString, itemString: string, htmlBody: respString }));
    /* eslint-disable no-console */
    console.error(`\n/${'*'.repeat(200)}`);
    console.error(`found an unknwon type |${type}|${titles}|`);
    console.error(`pls post the the files in ${dir} to ${bugsRef}`);
    console.error(`${'*'.repeat(200)}\\`);
    /* eslint-enable no-console */
    return null;
  }
};

exports.parseMix = string => {
  const thumbnailRaw = exports.between(string, 'data-thumb="', '"');
  const thumbnail = thumbnailRaw ? thumbnailRaw : exports.between(string, 'src="', '"');
  const plistID = exports.removeHtml(exports.between(string, 'data-list-id="', '"'));
  const videoID = exports.removeHtml(exports.between(string, 'data-video-ids="', '"'));
  return {
    type: 'mix',
    title: exports.removeHtml(exports.between(exports.between(string, '<h3 class="yt-lockup-title ">', '</a>'), '>')),
    firstItem: `https://www.youtube.com/watch?v=${videoID}&list=${plistID}`,
    thumbnail: URL.resolve(BASE_URL, exports.removeHtml(thumbnail)),
    length: exports.removeHtml(exports.between(string, '<span class="formatted-video-count-label">', '</span>')),
  };
};

// Parse an item of type playlist
exports.parsePlaylist = string => {
  const ownerBox = exports.between(string, '<div class="yt-lockup-byline ">', '</div>');
  const thumbnailRaw = exports.between(string, 'data-thumb="', '"');
  const thumbnail = thumbnailRaw ? thumbnailRaw : exports.between(string, 'src="', '"');
  const cleanID = exports.removeHtml(exports.between(string, 'href="/playlist?list=', '"'));
  return {
    type: 'playlist',
    title: exports.removeHtml(exports.between(exports.between(string, '<h3 class="yt-lockup-title ">', '</a>'), '>')),
    link: `https://www.youtube.com/playlist?list=${cleanID}`,
    thumbnail: URL.resolve(BASE_URL, exports.removeHtml(thumbnail)),

    author: {
      name: exports.removeHtml(exports.between(ownerBox, '>', '</a>')),
      ref: URL.resolve(BASE_URL, exports.removeHtml(exports.between(ownerBox, '<a href="', '"'))),
      verified: string.includes('title="Verified"'),
    },

    length: exports.removeHtml(exports.between(string, '<span class="formatted-video-count-label">', '</span>')),
  };
};

// Parse an item of type channel
exports.parseChannel = string => {
  const avatarRaw = exports.between(string, 'data-thumb="', '"');
  const avatar = avatarRaw ? avatarRaw : exports.between(string, 'src="', '"');
  const rawDesc = exports.between(exports.between(string, '<div class="yt-lockup-description', '</div>'), '>');
  const rawFollows = exports.between(exports.between(string, 'yt-subscriber-count"', '</span>'), '>');
  return {
    type: 'channel',
    name: exports.removeHtml(exports.between(exports.between(string, '<a href="', '</a>'), '>')),
    channel_id: exports.between(string, 'data-channel-external-id="', '"'),
    link: URL.resolve(BASE_URL, exports.removeHtml(exports.between(string, 'href="', '"'))),
    avatar: URL.resolve(BASE_URL, exports.removeHtml(avatar)),
    verified: string.includes('title="Verified"') || string.includes('yt-channel-title-autogenerated'),

    followers: Number(rawFollows.replace(/\.|,/g, '')),
    description_short: exports.removeHtml(rawDesc) || null,
    videos: Number(exports.between(string, '<ul class="yt-lockup-meta-info"><li>', '</li>')
      .split(' ')
      .splice(0, 1)[0]
      .replace(/\.|,/g, ''),
    ),
  };
};

// Parse an item of type video
exports.parseVideo = string => {
  const ownerBox = exports.between(string, '<div class="yt-lockup-byline ">', '</div>');
  const metaInfo = exports.between(string, '<div class="yt-lockup-meta ">', '</ul>')
    .replace(/<\/li>/g, '')
    .split('<li>')
    .splice(1);
  if (metaInfo.length === 1) metaInfo.unshift(null);
  const live = string.includes('yt-badge-live" >Live now</span>');
  const live_views = metaInfo[0] ? parseInt(metaInfo[0].replace(/\.|,/g, '')) : 0;
  const thumbnailRaw = exports.between(string, 'data-thumb="', '"');
  const thumbnail = thumbnailRaw ? thumbnailRaw : exports.between(string, 'src="', '"');
  const rawDesc = exports.between(exports.between(string, '<div class="yt-lockup-description', '</div>'), '>');
  return {
    type: 'video',
    live: live,
    title: exports.removeHtml(exports.between(exports.between(string, '<a href="', '</a>'), '>')),
    link: URL.resolve(BASE_URL, exports.removeHtml(exports.between(string, 'href="', '"'))),
    thumbnail: URL.resolve(BASE_URL, exports.removeHtml(thumbnail)),

    author: {
      name: exports.removeHtml(exports.between(ownerBox, '>', '</a>')),
      ref: URL.resolve(BASE_URL, exports.removeHtml(exports.between(ownerBox, '<a href="', '"'))),
      verified: ownerBox.includes('title="Verified"'),
    },

    description: exports.removeHtml(rawDesc) || null,
    views: live ?
      live_views :
      metaInfo[1] ? Number(metaInfo[1].split(' ')[0].replace(/\.|,/g, '')) : null,
    duration: live ? null : exports.between(string, '<span class="video-time" aria-hidden="true">', '</span>'),
    uploaded_at: live ? null : metaInfo[0] || null,
  };
};

// Parse am item of type movie
exports.parseMovie = string => {
  const haystack = string.substr(string.lastIndexOf('<div class="yt-lockup-meta"><ul>') + 32);
  const filmMeta = haystack.substr(0, haystack.indexOf('</ul></div>')).split('<li>');
  const authorInfo = `${string.substr(string.lastIndexOf('<a'), string.lastIndexOf('</a>'))}</a>`;
  const rawDesc = exports.between(string, 'yt-lockup-description', '</div>').replace(/[^>]+>/, '');
  const rawMeta = exports.between(string, '<div class="yt-lockup-meta"><ul><li>', '</li></ul>');
  return {
    type: 'movie',
    title: exports.removeHtml(exports.between(string, 'dir="ltr">', '</a>')),
    link: URL.resolve(BASE_URL, exports.removeHtml(exports.between(string, 'href="', '"'))),
    thumbnail: URL.resolve(BASE_URL, exports.removeHtml(exports.between(string, 'src="', '"'))),

    author: {
      name: exports.removeHtml(exports.between(authorInfo, '>', '<')),
      ref: URL.resolve(BASE_URL, exports.removeHtml(exports.between(authorInfo, '<a href="', '"'))),
      verified: string.includes('title="Verified"'),
    },

    description: exports.removeHtml(rawDesc) || null,
    meta: exports.removeHtml(rawMeta).split(' · '),
    actors: filmMeta[1].replace(/<[^>]+>|^[^:]+: /g, '').split(', ').map(a => exports.removeHtml(a)),
    director: filmMeta.length > 2 ? exports.removeHtml(filmMeta[2].replace(/<[^>]+>|^[^:]+: /g, '')) : null,
    duration: exports.between(string, '<span class="video-time" aria-hidden="true">', '</span>'),
  };
};

// Parse an item of type related searches
exports.parseRelatedSearches = string => {
  const related = string.split('search-refinement').splice(2);
  return {
    type: 'search-refinements',
    entrys: related.map(item => ({
      link: URL.resolve(BASE_URL, exports.removeHtml(exports.between(item, 'href="', '"'))),
      q: QUERYSTRING.parse(exports.removeHtml(exports.between(item, '/results?', '"'))).search_query || null,
    })),
  };
};

// Horizontal shelf of youtube movie proposals
exports.parseShelfCompact = string => {
  const itemsRaw = string.split('<li class="yt-uix-shelfslider-item').splice(1);
  const items = itemsRaw.map(item => ({
    type: `${exports.between(item, ' ', '-')}-short`,
    name: exports.removeHtml(exports.between(exports.between(item, '><a href="', '</a>'), '>', '')),
    ref: URL.resolve(BASE_URL, exports.removeHtml(exports.between(item, 'href="', '"'))),
    thumbnail: URL.resolve(BASE_URL, exports.removeHtml(exports.between(item, 'src="', '"'))),
    duration: exports.between(item, '"video-time"', '<').replace(/^[^>]+>/, ''),
    price: exports.between(item, '<span class="button-label">', '</span>').replace(/^[^ ]+ /, '') || null,
  }));
  return {
    type: 'shelf-compact',
    title: exports.removeHtml(exports.between(string, '<span class="branded-page-module-title-text">', '</span>')),
    items,
  };
};

// Vertical shelf of youtube video proposals
exports.parseShelfVertical = string => {
  const itemsRaw = string.split('<a aria-hidden="').splice(1);
  return {
    type: 'shelf-vertical',
    title: exports.removeHtml(exports.between(string, '<span class="branded-page-module-title-text">', '</span>')),
    items: itemsRaw.map(item => exports.parseVideo(item)),
  };
};

// Taken from https://github.com/fent/node-ytdl-core/
const between = exports.between = (haystack, left, right) => {
  let pos;
  pos = haystack.indexOf(left);
  if (pos === -1) { return ''; }
  haystack = haystack.slice(pos + left.length);
  if (!right) { return haystack; }
  pos = haystack.indexOf(right);
  if (pos === -1) { return ''; }
  haystack = haystack.slice(0, pos);
  return haystack;
};

// Cleans up html text
const removeHtml = exports.removeHtml = string => new ENTITIES().decode(
  string.replace(/\n/g, ' ')
    .replace(/\s*<\s*br\s*\/?\s*>\s*/gi, '\n')
    .replace(/<\s*\/\s*p\s*>\s*<\s*p[^>]*>/gi, '\n')
    .replace(/<.*?>/gi, ''),
).trim();

exports.getPage = (ref, options, cb) => {
  const request = HTTPS.get(ref, options, resp => { // eslint-disable-line consistent-return
    if (resp.statusCode !== 200) return cb(new Error(`Status Code ${resp.statusCode}`));
    const respBuffer = [];
    resp.on('data', d => respBuffer.push(d));
    resp.on('end', () => {
      cb(null, Buffer.concat(respBuffer).toString());
    });
  });
  request.on('error', cb);
};

exports.parseFilters = body => {
  const filterContainer = between(body, '<div id="filter-dropdown"', '<ol id="item-section');
  const coloms = filterContainer.split('<h4 class="filter-col-title">').splice(1);
  const results = new Map();
  coloms.forEach(c => {
    const items = c.trim().split('<li>').filter(a => a);
    const title = between(items.shift(), '', '</h4>');
    const array = results.set(title, []).get(title);
    array.active = null;
    items.forEach(i => {
      let isActive = between(i, 'class="', '"').includes('filter-selected');
      let parsedItem = {
        ref: isActive ? null : URL.resolve(BASE_URL, removeHtml(between(i, 'href="', '"'))),
        name: removeHtml(between(between(i, '>', '</span>'), '>')),
        active: isActive,
      };
      if (isActive) array.active = parsedItem;
      array.push(parsedItem);
    });
  });
  return results;
};

exports.isBoolean = variable => typeof variable === 'boolean';
