const URL = require('url');
const UTIL = require('./util.js');
const PARSE_ITEM = require('./parseItem.js');
const MINIGET = require('miniget');

// eslint-disable-next-line no-useless-escape, max-len
const nextpagRegex = /<div class="(([^"]*branded\-page\-box[^"]*search\-pager)|([^"]*search\-pager[^"]*branded\-page\-box))/;

const main = module.exports = async(searchString, options) => {
  const resp = {};

  options = UTIL.checkArgs(searchString, options);
  resp.query = options.query;
  // Save provided nextpageRef and do the request
  resp.currentRef = options.nextpageRef;
  // Do request
  const body = await MINIGET(UTIL.buildRef(resp.currentRef, searchString, options), options).text();
  const parsed = JSON.parse(body);
  const content = parsed[parsed.length - 1].body.content;

  // Get the table of items and parse it (remove null items where the parsing failed)
  resp.items = UTIL
    .between(content, '<ol id="item-section-', '\n</ol>')
    .split('</li>\n\n<li>')
    .filter(t => {
      let condition1 = !t.includes('<div class="pyv-afc-ads-container" style="visibility:visible">');
      let condition2 = !t.includes('<span class="spell-correction-corrected">');
      let condition3 = !t.includes('<div class="search-message">');
      let condition4 = !t.includes('<li class="search-exploratory-line">');
      return condition1 && condition2 && condition3 && condition4;
    })
    .map(t => PARSE_ITEM(t, body, searchString))
    .filter(a => a)
    .filter((_, index) => index < options.limit);
  // Adjust tracker
  options.limit -= resp.items.length;

  // Get amount of results
  resp.results = UTIL.between(UTIL.between(content, '<p class="num-results', '</p>'), '>') || '0';

  // Get information about set filters
  const filters = UTIL.parseFilters(content);
  resp.filters = Array.from(filters).map(a => a[1].active).filter(a => a);

  // Parse the nextpageRef
  const pagesMatch = content.match(nextpagRegex);
  if (pagesMatch) {
    const pagesContainer = UTIL.between(content, pagesMatch[0], '</div>').split('<a');
    const lastPageRef = pagesContainer[pagesContainer.length - 1];
    resp.nextpageRef = UTIL.removeHtml(UTIL.between(lastPageRef, 'href="', '"')) || null;
  }

  // We're already on last page or hit the limit
  if (!resp.nextpageRef || options.limit < 1) return resp;

  // Recursively fetch more items
  options.nextpageRef = resp.nextpageRef;
  const nestedResp = await main(searchString, options);
  // Merge the responses
  resp.items.push(...nestedResp.items);
  resp.currentRef = nestedResp.currentRef;
  resp.nextpageRef = nestedResp.nextpageRef;
  return resp;
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
