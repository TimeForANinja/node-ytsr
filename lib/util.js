const URL = require('url');
const QS = require('querystring');
const ENTITIES = require('html-entities').AllHtmlEntities;

const BASE_URL = 'https://www.youtube.com/results?';
const DEFAULT_OPTIONS = { limit: 100, safeSearch: false, nextpageRef: null };
const DEFAULT_QUERY = { spf: 'navigate', gl: 'US', hl: 'en' };

// Guarantee that all arguments are valid
exports.checkArgs = (searchString, options = {}) => {
  // Validation
  if (!searchString && !options.nextpageRef) {
    throw new Error('search string or nextpageRef is mandatory');
  }
  if (searchString && typeof searchString !== 'string') {
    throw new Error('search string must be of type string');
  } else if (options.nextpageRef && typeof options.nextpageRef !== 'string') {
    throw new Error('nextpageRef must be of type string');
  }

  // Normalisation
  let obj = Object.assign({}, DEFAULT_OPTIONS, options);
  if (isNaN(obj.limit) || obj.limit <= 0) obj.limit = DEFAULT_OPTIONS.limit;
  if (typeof obj.safeSearch !== 'boolean') obj.safeSearch = DEFAULT_OPTIONS.safeSearch;
  // Setting cookie in request headers to get safe search results
  if (obj.safeSearch) Object.assign(obj, { headers: { Cookie: 'PREF=f2=8000000' } });
  obj.query = searchString || URL.parse(options.nextpageRef, true).query.search_query;
  return obj;
};

// Builds the search query url
exports.buildRef = (nextpageRef, searchString, options) => {
  const query = Object.assign({}, DEFAULT_QUERY, {
    search_query: searchString,
  });
  if (options && options.gl) query.gl = options.gl;
  if (options && options.hl) query.hl = options.hl;

  if (nextpageRef) {
    Object.assign(query, QS.decode(URL.parse(nextpageRef, true).search.substr(1)));
  }
  return BASE_URL + QS.encode(query);
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

const removeHtml = exports.removeHtml = string => new ENTITIES().decode(
  string.replace(/\n/g, ' ')
    .replace(/\s*<\s*br\s*\/?\s*>\s*/gi, '\n')
    .replace(/<\s*\/\s*p\s*>\s*<\s*p[^>]*>/gi, '\n')
    .replace(/<.*?>/gi, ''),
).trim();

// Parse the filters on top of a youtube search
exports.parseFilters = body => {
  const filterContainer = between(body, '<div id="filter-dropdown"', '<ol id="item-section');
  const columns = filterContainer.split('<h4 class="filter-col-title">').slice(1);
  const results = new Map();
  columns.forEach(c => {
    const items = c.trim().split('<li>').filter(a => a);
    const title = between(items.shift(), '', '</h4>');
    const array = results.set(title, []).get(title);
    array.active = null;
    items.forEach(i => {
      const isActive = between(i, 'class="', '"').includes('filter-selected');
      const parsedItem = {
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
