const PARSE_ITEM = require('./parseItem.js');
const MINIGET = require('miniget');
const UTIL = require('./utils.js');
const QS = require('querystring');
const URL = require('url');

const BASE_SEARCH_URL = 'https://www.youtube.com/results?';
const BASE_API_URL = 'https://www.youtube.com/youtubei/v1/search?key=';

const main = module.exports = async(searchString, options, rt = 3) => {
  if (rt === 0) throw new Error('Unable to find JSON!');
  // Set default values
  const opts = UTIL.checkArgs(searchString, options);

  const ref = BASE_SEARCH_URL + QS.encode(opts.query);
  const body = await MINIGET(ref, opts).text();
  const parsed = UTIL.parseBody(body, opts);
  // TODO: remove when youtube is done with its rolling release
  // Retry if unable to find json => most likely old response
  if (!parsed.json) return main(searchString, options, rt - 1);

  const resp = {
    query: opts.search,
  };

  // General wrapper
  const wrapper = parsed.json.contents
    .twoColumnSearchResultsRenderer.primaryContents
    .sectionListRenderer;

  // Parse items
  const rawItems = wrapper.contents
    .find(x => Object.keys(x)[0] === 'itemSectionRenderer')
    .itemSectionRenderer.contents;
  resp.items = rawItems.map(PARSE_ITEM).filter(a => a).filter((_, index) => index < opts.limit);
  // Prepand related searches
  if (Array.isArray(parsed.json.refinements)) {
    resp.items.unshift({
      type: 'search-refinements',
      entrys: parsed.json.refinements.map(refinement => ({
        q: refinement,
        link: URL.resolve(BASE_SEARCH_URL, refinement),
      })),
    });
  }

  // Adjust tracker
  opts.limit -= resp.items.length;

  // Get amount of results
  resp.results = Number(parsed.json.estimatedResults) || 0;

  // Get information about set filters
  const filters = UTIL.parseFilters(parsed.json);
  resp.filters = Array.from(filters).map(a => a[1].active).filter(a => a);

  // Parse the nextpageToken
  const continuation = wrapper.contents.find(x => Object.keys(x)[0] === 'continuationItemRenderer');
  let token = null;
  if (continuation) token = continuation.continuationItemRenderer.continuationEndpoint.continuationCommand.token;

  // We're already on last page or hit the limit
  if (!token || opts.limit < 1) return resp;

  // Recursively fetch more items
  const nestedResp = await parsePage2(parsed.apiKey, token, parsed.context, opts);

  // Merge the responses
  resp.items.push(...nestedResp);
  return resp;
};

const parsePage2 = async(apiKey, token, context, opts) => {
  const json = await UTIL.doPost(BASE_API_URL + apiKey, opts, { context, continuation: token });

  const wrapper = json.onResponseReceivedCommands[0].appendContinuationItemsAction.continuationItems;

  // Parse items
  const rawItems = wrapper.find(x => Object.keys(x)[0] === 'itemSectionRenderer').itemSectionRenderer.contents;
  const parsedItems = rawItems.map(PARSE_ITEM).filter(a => a).filter((_, index) => index < opts.limit);

  // Adjust tracker
  opts.limit -= parsedItems.length;

  // Parse the nextpageToken
  const continuation = wrapper.find(x => Object.keys(x)[0] === 'continuationItemRenderer');
  let nextToken = null;
  if (continuation) nextToken = continuation.continuationItemRenderer.continuationEndpoint.continuationCommand.token;

  // We're already on last page or hit the limit
  if (!nextToken || opts.limit < 1) return parsedItems;

  // Recursively fetch more items
  const nestedResp = await parsePage2(apiKey, nextToken, context, opts);
  parsedItems.push(...nestedResp);
  return parsedItems;
};

main.getFilters = async(searchString, options) => {
  const opts = UTIL.checkArgs(searchString, options);

  const ref = BASE_SEARCH_URL + QS.encode(opts.query);
  const body = await MINIGET(ref, opts).text();
  const parsed = UTIL.parseBody(body);
  // Retry if old response
  if (!parsed.json) return main.getFilters(searchString, options);
  return UTIL.parseFilters(parsed.json);
};
