const OLD_UTIL = require('./util.js');
const URL = require('url');

const BASE_URL = 'https://www.youtube.com/';
const DEFAULT_OPTIONS = { limit: 100, safeSearch: false, nextpageRef: null };
const DEFAULT_QUERY = { gl: 'US', hl: 'en' };

exports.parseFilters = json => {
  const wrapper = json.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer;
  const filterWrapper = wrapper.subMenu.searchSubMenuRenderer.groups;
  const parsedGroups = new Map();
  for (const filterGroup of filterWrapper) {
    // TODO: switch to Map when done caring about compatibility
    const singleFilterGroup = [];
    for (const filter of filterGroup.searchFilterGroupRenderer.filters) {
      const isSet = !filter.searchFilterRenderer.navigationEndpoint;
      const parsedFilter = {
        description: filter.searchFilterRenderer.tooltip,
        label: parseText(filter.searchFilterRenderer.label),
        query: isSet ? null : URL.resolve(BASE_URL, filter.searchFilterRenderer.navigationEndpoint.commandMetadata.webCommandMetadata.url),
        isSet: isSet,
        // TODO: remove when done caring about compatibility
        active: isSet,
        name: parseText(filter.searchFilterRenderer.label),
        ref: isSet ? null : URL.resolve(BASE_URL, filter.searchFilterRenderer.navigationEndpoint.commandMetadata.webCommandMetadata.url),
      };
      if (isSet) singleFilterGroup.active = parsedFilter;
      singleFilterGroup.push(parsedFilter);
    }
    parsedGroups.set(parseText(filterGroup.searchFilterGroupRenderer.title), singleFilterGroup);
  }
  return parsedGroups;
};

exports.parseBody = body => {
  const str = between(body, 'var ytInitialData =', '; \n');
  const apiKey = between(body, 'INNERTUBE_API_KEY":"', '"') || OLD_UTIL.between(body, 'innertubeApiKey":"', '"');
  const clientVersion = between(body, 'INNERTUBE_CONTEXT_CLIENT_VERSION":"', '"') || OLD_UTIL.between(body, 'innertube_context_client_version":"', '"');
  return { json: JSON.parse(str || null), apiKey, clientVersion };
};

// Parsing utility
const parseText = exports.parseText = txt => txt.simpleText || txt.runs.map(a => a.text).join('');

exports.parseNumFromText = txt => Number(parseText(txt).replace(/[^0-9.,]+/, ''));

// Request Utility
exports.doPost = (url, reqOpts, payload) => new Promise(resolve => {
  // Enforce POST-Request
  reqOpts.method = 'POST';
  const req = require('https').request(url, reqOpts);
  req.on('response', resp => {
    const body = [];
    resp.on('data', chunk => body.push(chunk));
    resp.on('end', () => {
      resolve(JSON.parse(Buffer.concat(body).toString()));
    });
  });
  req.write(JSON.stringify(payload));
  req.end();
});

// Guarantee that all arguments are valid
exports.checkArgs = (searchString, options = {}) => {
  // Validation
  if (!searchString) {
    throw new Error('search string is mandatory');
  }
  if (searchString && typeof searchString !== 'string') {
    throw new Error('search string must be of type string');
  }

  // Normalisation
  let obj = Object.assign({}, DEFAULT_OPTIONS, options);
  if (isNaN(obj.limit) || obj.limit <= 0) obj.limit = DEFAULT_OPTIONS.limit;
  if (typeof obj.safeSearch !== 'boolean') obj.safeSearch = DEFAULT_OPTIONS.safeSearch;
  // Setting cookie in request headers to get safe search results
  if (obj.safeSearch) {
    if (!obj.headers) obj.headers = {};
    if (!obj.headers.Cookie) obj.headers.Cookie = [];
    obj.headers.Cookie.push('PREF=f2=8000000');
  }
  // Watch out for previous filter requests
  // in such a case searchString would be an url including `sp` & `search_query` querys
  obj.query = searchString.startsWith(BASE_URL) ? URL.parse(searchString, true).query : { search_query: searchString };
  obj.search = obj.query.search_query;

  obj.query = Object.assign({}, DEFAULT_QUERY, obj.query);
  if (options && options.gl) obj.query.gl = options.gl;
  if (options && options.hl) obj.query.hl = options.hl;
  return obj;
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
