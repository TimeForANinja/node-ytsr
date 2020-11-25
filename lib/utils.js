const URL = require('url');
const MINIGET = require('miniget');

const BASE_URL = 'https://www.youtube.com/';
const DEFAULT_OPTIONS = { limit: 100, safeSearch: false };
const DEFAULT_QUERY = { gl: 'US', hl: 'en' };
const DEFAULT_CONTEXT = {
  client: {
    utcOffsetMinutes: 0,
    gl: 'US',
    hl: 'en',
    clientName: 'WEB',
    clientVersion: '<important information>',
  },
  user: {},
  request: {},
};

exports.parseFilters = json => {
  const wrapper = json.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer;
  const filterWrapper = wrapper.subMenu.searchSubMenuRenderer.groups;
  const parsedGroups = new Map();
  for (const filterGroup of filterWrapper) {
    // TODO: switch to Map when done caring about compatibility
    const singleFilterGroup = [];
    singleFilterGroup.active = null;
    for (const filter of filterGroup.searchFilterGroupRenderer.filters) {
      const isSet = !filter.searchFilterRenderer.navigationEndpoint;
      let targetURL = null;
      if (!isSet) targetURL = filter.searchFilterRenderer.navigationEndpoint.commandMetadata.webCommandMetadata.url;
      const parsedFilter = {
        description: filter.searchFilterRenderer.tooltip,
        label: parseText(filter.searchFilterRenderer.label),
        query: isSet ? null : URL.resolve(BASE_URL, targetURL),
        isSet: isSet,
        // TODO: remove when done caring about compatibility
        active: isSet,
        name: parseText(filter.searchFilterRenderer.label),
        ref: isSet ? null : URL.resolve(BASE_URL, targetURL),
      };
      if (isSet) singleFilterGroup.active = parsedFilter;
      singleFilterGroup.push(parsedFilter);
    }
    parsedGroups.set(parseText(filterGroup.searchFilterGroupRenderer.title), singleFilterGroup);
  }
  return parsedGroups;
};

exports.parseBody = (body, options = {}) => {
  let json = null;
  try {
    json = jsonAfter(body, 'var ytInitialData = ');
  } catch (e) {
    // Defaulting to null if failed to parse json => results in a retry in main
  }
  const apiKey = between(body, 'INNERTUBE_API_KEY":"', '"') || between(body, 'innertubeApiKey":"', '"');
  const clientVersion = between(body, 'INNERTUBE_CONTEXT_CLIENT_VERSION":"', '"') ||
    between(body, 'innertube_context_client_version":"', '"');
  // Make deep copy and set clientVersion
  const context = JSON.parse(JSON.stringify(DEFAULT_CONTEXT));
  context.client.clientVersion = clientVersion;
  // Add params to context
  if (options.gl) context.client.gl = options.gl;
  if (options.hl) context.client.hl = options.hl;
  if (options.utcOffsetMinutes) context.client.utcOffsetMinutes = options.utcOffsetMinutes;
  if (options.safeSearch) context.user.enableSafetyMode = true;
  // Return multiple values
  return { json, apiKey, context };
};

// Parsing utility
const parseText = exports.parseText = txt => txt.simpleText || txt.runs.map(a => a.text).join('');

exports.parseIntegerFromText = txt => Number(parseText(txt).replace(/\D+/g, ''));

// Request Utility
exports.doPost = async(url, reqOpts, payload) => {
  // Enforce POST-Request
  reqOpts.method = 'POST';
  const req = MINIGET(url, reqOpts);
  // Write request body
  req.once('request', r => r.write(JSON.stringify(payload)));
  // Await response-text and parse json
  return JSON.parse(await req.text());
};

// Guarantee that all arguments are valid
exports.checkArgs = (searchString, options = {}) => {
  // Validation
  if (!searchString) {
    throw new Error('search string is mandatory');
  }
  if (typeof searchString !== 'string') {
    throw new Error('search string must be of type string');
  }

  // Normalisation
  let obj = Object.assign({}, DEFAULT_OPTIONS, options);
  // Other optional params
  if (isNaN(obj.limit) || obj.limit <= 0) obj.limit = DEFAULT_OPTIONS.limit;
  if (typeof obj.safeSearch !== 'boolean') obj.safeSearch = DEFAULT_OPTIONS.safeSearch;
  // Setting cookie in request headers to get safe search results
  if (!obj.requestOptions) obj.requestOptions = {};
  if (obj.safeSearch) {
    if (!obj.requestOptions.headers) obj.requestOptions.headers = {};
    if (!obj.requestOptions.headers.Cookie) obj.requestOptions.headers.Cookie = [];
    obj.requestOptions.headers.Cookie.push('PREF=f2=8000000');
  }
  // Set required parameter: query
  if (searchString.startsWith(BASE_URL)) {
    // Watch out for requests with a set filter
    // in such a case searchString would be an url including `sp` & `search_query` querys
    obj.query = URL.parse(searchString, true).query;
  } else {
    obj.query = { search_query: searchString };
  }
  // Save the search term itself for potential later use
  obj.search = obj.query.search_query;

  // Add additional information
  obj.query = Object.assign({}, DEFAULT_QUERY, obj.query);
  if (options && options.gl) obj.query.gl = options.gl;
  if (options && options.hl) obj.query.hl = options.hl;
  return obj;
};

/**
 * Extract json after given string.
 * loosely based on utils#between
 *
 * @param {string} haystack
 * @param {string} left
 * @returns {Object|null} the parsed json or null
 */
const jsonAfter = (haystack, left) => {
  const pos = haystack.indexOf(left);
  if (pos === -1) { return null; }
  haystack = haystack.slice(pos + left.length);
  try {
    return JSON.parse(cutAfterJSON(haystack));
  } catch (e) {
    return null;
  }
};

/**
 * Extract string inbetween another.
 * Property of https://github.com/fent/node-ytdl-core/blob/master/lib/utils.js
 *
 * @param {string} haystack
 * @param {string} left
 * @param {string} right
 * @returns {string}
 */
const between = (haystack, left, right) => {
  let pos;
  pos = haystack.indexOf(left);
  if (pos === -1) { return ''; }
  pos += left.length;
  haystack = haystack.slice(pos);
  pos = haystack.indexOf(right);
  if (pos === -1) { return ''; }
  haystack = haystack.slice(0, pos);
  return haystack;
};

/**
 * Match begin and end braces of input JSON, return only json
 * Property of https://github.com/fent/node-ytdl-core/blob/master/lib/utils.js
 *
 * @param {string} mixedJson
 * @returns {string}
 * @throws {Error} no json or invalid json
*/
const cutAfterJSON = exports.cutAfterJSON = mixedJson => {
  let open, close;
  if (mixedJson[0] === '[') {
    open = '[';
    close = ']';
  } else if (mixedJson[0] === '{') {
    open = '{';
    close = '}';
  }

  if (!open) {
    throw new Error(`Can't cut unsupported JSON (need to begin with [ or { ) but got: ${mixedJson[0]}`);
  }

  // States if the loop is currently in a string
  let isString = false;

  // Current open brackets to be closed
  let counter = 0;

  let i;
  for (i = 0; i < mixedJson.length; i++) {
    // Toggle the isString boolean when leaving/entering string
    if (mixedJson[i] === '"' && mixedJson[i - 1] !== '\\') {
      isString = !isString;
      continue;
    }
    if (isString) continue;

    if (mixedJson[i] === open) {
      counter++;
    } else if (mixedJson[i] === close) {
      counter--;
    }

    // All brackets have been closed, thus end of JSON is reached
    if (counter === 0) {
      // Return the cut JSON
      return mixedJson.substr(0, i + 1);
    }
  }

  // We ran through the whole string and ended up with an unclosed bracket
  throw Error("Can't cut unsupported JSON (no matching closing bracket found)");
};

// Exports for testing
exports._hidden = {
  jsonAfter, between, cutAfterJSON,
};
