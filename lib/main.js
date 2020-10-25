const URL = require('url');
const UTIL = require('./util.js');
const MINIGET = require('miniget');
const SEARCH_V2 = require('./search_v2.js');

const main = module.exports = async(searchString, options) => {
  const resp = {};

  options = UTIL.checkArgs(searchString, options);
  resp.query = options.query;
  // Save provided nextpageRef and do the request
  resp.currentRef = options.nextpageRef;
  // Do request
  const body = await MINIGET(UTIL.buildRef(resp.currentRef, searchString, options), options).text();
  /**
   * TODO: Save API key and client version to avoid using v1 search completely
   */
  options.key = UTIL.between(body, 'INNERTUBE_API_KEY":"', '"') || UTIL.between(body, 'innertubeApiKey":"', '"');
  if (!options.key) {
    // V1 result
    let res = await main(searchString, options);
    return res;
  }
  options.clientVersion = UTIL.between(body, 'INNERTUBE_CONTEXT_CLIENT_VERSION":"', '"') ||
    UTIL.between(body, 'innertube_context_client_version":"', '"');
  return SEARCH_V2(searchString, options);
};

main.getFilters = async(searchString, options) => {
  if (!searchString || typeof searchString !== 'string') throw new Error('searchString is mandatory');

  // Watch out for previous filter requests
  // in such a case searchString would be an url including `sp` & `search_query` querys
  let prevQuery = URL.parse(searchString, true).query;
  const urlOptions = prevQuery ? Object.assign({}, options, prevQuery) : options;

  const ref = UTIL.buildRef(null, prevQuery.search_query || searchString, urlOptions);
  const body = await MINIGET(ref, options).text();
  const parsed = JSON.parse(body);
  const content = parsed[parsed.length - 1].body.content;
  return UTIL.parseFilters(content);
};
