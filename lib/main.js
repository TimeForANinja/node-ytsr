const PARSE_ITEM = require('./parseItem.js');
const MINIGET = require('miniget');
const UTIL = require('./utils.js');
const QS = require('querystring');

const BASE_SEARCH_URL = 'https://www.youtube.com/results?';
const BASE_API_URL = 'https://www.youtube.com/youtubei/v1/search?key=';

const main = module.exports = async(searchString, options, rt = 3) => {
  if (rt === 0) throw new Error('Unable to find JSON!');
  // Set default values
  const opts = UTIL.checkArgs(searchString, options);

  const ref = BASE_SEARCH_URL + QS.encode(opts.query);
  const body = await MINIGET(ref, opts.requestOptions).text();
  const parsed = UTIL.parseBody(body, opts);
  // Retry if unable to find json => most likely old response
  if (!parsed.json) return main(searchString, options, rt - 1);

  // Pass Errors from the API
  if (parsed.json.alerts && !parsed.json.contents) {
    let error = parsed.json.alerts.find(a => a.alertRenderer && a.alertRenderer.type === 'ERROR');
    if (error) throw new Error(`API-Error: ${UTIL.parseText(error.alertRenderer.text, '* no message *')}`);
  }

  const resp = {
    // Query that was searched
    originalQuery: opts.search,
    // Query that youtube shows results for
    correctedQuery: opts.search,
    results: Number(parsed.json.estimatedResults) || 0,
    activeFilters: [],
    refinements: [],
    items: [],
    continuation: null,
  };
  // Add refinements
  if (Array.isArray(parsed.json.refinements)) {
    parsed.json.refinements.map(r => ({
      q: r,
      url: new URL(r, BASE_SEARCH_URL).toString(),
      bestThumbnail: null,
      thumbnails: null,
    }));
  }

  // General wrapper
  const { rawItems, continuation } = UTIL.parseWrapper(
    parsed.json.contents.twoColumnSearchResultsRenderer.primaryContents,
  );

  // Parse items
  resp.items = rawItems.map(a => PARSE_ITEM(a, resp)).filter(a => a).filter((_, index) => index < opts.limit);

  // Adjust tracker
  opts.limit -= resp.items.length;
  opts.pages -= 1;

  // Get information about set filters
  const filters = UTIL.parseFilters(parsed.json);
  resp.activeFilters = Array.from(filters).map(a => a[1].active).filter(a => a);

  // Parse the nextpageToken
  let token = null;
  if (continuation) token = continuation.continuationItemRenderer.continuationEndpoint.continuationCommand.token;
  // Only provide continuation if we're pulling all items or using paging
  if (token && opts.limit === Infinity) resp.continuation = [parsed.apiKey, token, parsed.context, opts];

  // We're already on last page or hit the limit
  if (!token || opts.limit < 1 || opts.pages < 1) return resp;

  // Recursively fetch more items
  const nestedResp = await parsePage2(parsed.apiKey, token, parsed.context, opts);

  // Merge the responses
  resp.items.push(...nestedResp.items);
  resp.continuation = nestedResp.continuation;
  return resp;
};
main.version = require('../package.json').version;

const parsePage2 = async(apiKey, token, context, opts) => {
  const json = await UTIL.doPost(BASE_API_URL + apiKey, { context, continuation: token }, opts.requestOptions);

  if (!Array.isArray(json.onResponseReceivedCommands)) {
    // No more content
    return { continuation: null, items: [] };
  }

  const { rawItems, continuation } = UTIL.parsePage2Wrapper(
    json.onResponseReceivedCommands[0].appendContinuationItemsAction.continuationItems,
  );

  // Parse items
  const parsedItems = rawItems.map(a => PARSE_ITEM(a)).filter(a => a).filter((_, index) => index < opts.limit);

  // Adjust tracker
  opts.limit -= parsedItems.length;
  opts.pages -= 1;

  // Parse the nextpageToken
  let nextToken = null;
  if (continuation) nextToken = continuation.continuationItemRenderer.continuationEndpoint.continuationCommand.token;

  // We're already on last page or hit the limit
  if (!nextToken || opts.limit < 1 || opts.pages < 1) {
    return {
      continuation: nextToken && opts.limit === Infinity ? [apiKey, nextToken, context, opts] : null,
      items: parsedItems,
    };
  }

  // Recursively fetch more items
  const nestedResp = await parsePage2(apiKey, nextToken, context, opts);
  nestedResp.items.unshift(...parsedItems);
  return nestedResp;
};
// eslint-disable-next-line require-await
main.continueReq = async args => {
  // Check params
  if (!Array.isArray(args) || args.length !== 4) throw new Error('invalid continuation array');
  if (!args[0] || typeof args[0] !== 'string') throw new Error('invalid apiKey');
  if (!args[1] || typeof args[1] !== 'string') throw new Error('invalid token');
  if (!args[2] || typeof args[2] !== 'object') throw new Error('invalid context');
  if (!args[3] || typeof args[3] !== 'object') throw new Error('invalid opts');
  if (args[3].limit !== null && !isNaN(args[3].limit) && isFinite(args[3].limit)) {
    throw new Error('continueReq only allowed for paged requests');
  }
  // Enforce pagination information
  args[3].pages = 1;
  args[3].limit = Infinity;
  return parsePage2(...args);
};

main.getFilters = async(searchString, options) => {
  const opts = UTIL.checkArgs(searchString, options);

  const ref = BASE_SEARCH_URL + QS.encode(opts.query);
  const body = await MINIGET(ref, opts.requestOptions).text();
  const parsed = UTIL.parseBody(body);
  // Retry if old response
  if (!parsed.json) return main.getFilters(searchString, options);
  return UTIL.parseFilters(parsed.json);
};
