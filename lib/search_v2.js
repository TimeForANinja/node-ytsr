const AXIOS = require('axios');
const QS = require('querystring');
const UTIL_V2 = require('./util_v2.js');
const BASE_URL = 'https://www.youtube.com/results?';
const API_URL = 'https://www.youtube.com/youtubei/v1/search?key=';

const searchV2 = module.exports = async(searchString, options) => {
  // Post request headers
  const refererUrl = BASE_URL + QS.encode({ search_query: searchString });
  const headers = { Origin: 'https://www.youtube.com', Referer: refererUrl, 'Content-Type': 'application/json' };

  /** TODO:
   * options = UTIL_V2.checkArgs(searchString, options);
  */
  if (!options.limit) options.limit = 100;

  // Post request
  options.query = searchString;
  const { data } = await AXIOS.post(API_URL + options.key, UTIL_V2.buildRequestBody(options), { headers });
  // Parse response
  let resp = options.nextpageRef ? UTIL_V2.continuationJSON(data) : UTIL_V2.mapJSON(data);
  resp.items = resp.items.filter((_, index) => index < options.limit);
  options.limit -= resp.items.length;

  // We're already on last page or hit the limit
  if (!resp.nextpageRef || options.limit < 1) return resp;

  // Recursively fetch more items
  options.nextpageRef = resp.nextpageRef;
  // Merge the responses
  const nestedResp = await searchV2(searchString, options);
  resp.items.push(...nestedResp.items);
  resp.nextpageRef = nestedResp.nextpageRef;
  return resp;
};

/** TODO:
 * getFilters()
*/
