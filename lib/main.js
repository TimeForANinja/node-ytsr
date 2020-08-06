const URL = require('url');
const UTIL = require('./util.js');
const QS = require('querystring');

const nextpagRegex = /<div class="(([^"]*branded\-page\-box[^"]*search\-pager)|([^"]*search\-pager[^"]*branded\-page\-box))/; // eslint-disable-line no-useless-escape, max-len

const main = module.exports = (searchString, options, callback, noWarn = false) => { // eslint-disable-line consistent-return, max-len
  // Check wether options wether no options were provided
  if (typeof options === 'function') {
    callback = options;
    options = { limit: 100 };
  }
  // TODO: remove when done
  if (callback && main.do_warn_deprecate && !noWarn) {
    console.warn(
      `/*********************************************************************
 * support for callbacks in ytsr will be removed in the next release *
 *   set \`ytsr.do_warn_deprecate = false;\` to disable this message   *
 *********************************************************************/`);
  }
  // Return a promise when no callback is provided
  if (!callback) {
    return new Promise((resolve, reject) => {
      main(searchString, options, (err, info) => { // eslint-disable-line consistent-return
        if (err) return reject(err);
        resolve(info);
      }, true);
    });
  }
  if (!options) options = { limit: 100, safeSearch: false };
  if (!searchString && !options.nextpageRef) return callback(new Error('search string or nextpageRef is mandatory'));
  if (isNaN(options.limit)) options.limit = 100;
  if (!UTIL.isBoolean(options.safeSearch)) options.safeSearch = false;
  // Save provided nextpageRef and do the request
  const currentRef = options.nextpageRef;
  // Setting cookie in request headers to get safe search results
  const requestOptions = options.safeSearch ? { headers: { Cookie: 'PREF=f2=8000000' } } : {};
  UTIL.getPage(currentRef ? UTIL.buildFromNextpage(currentRef) : UTIL.buildLink(searchString), requestOptions, (err, body) => { // eslint-disable-line consistent-return, max-len
    if (err) return callback(err);
    let content;
    try {
      const parsed = JSON.parse(body);
      content = parsed[parsed.length - 1].body.content;
    } catch (e) {
      return callback(e);
    }

    // Get the table of items and parse it(remove null items where the parsing failed)
    const items = UTIL
      .between(content, '<ol id="item-section-', '\n</ol>')
      .split('</li>\n\n<li>')
      .filter(t => {
        let condition1 = !t.includes('<div class="pyv-afc-ads-container" style="visibility:visible">');
        let condition2 = !t.includes('<span class="spell-correction-corrected">');
        let condition3 = !t.includes('<div class="search-message">');
        let condition4 = !t.includes('<li class="search-exploratory-line">');
        return condition1 && condition2 && condition3 && condition4;
      })
      .map(t => UTIL.parseItem(t, body, searchString))
      .filter(a => a)
      .filter((item, index) => !isNaN(options.limit) ? index < options.limit : true);
    if (!isNaN(options.limit)) options.limit -= items.length;

    // Get amount of results
    const results = UTIL.between(UTIL.between(content, '<p class="num-results', '</p>'), '>') || 0;

    // Get informations about set filters
    const filters = UTIL.parseFilters(content);
    const activeFilters = Array.from(filters).map(a => a[1].active).filter(a => a);

    const pagesMatch = content.match(nextpagRegex);
    let nextpageRef = null;
    if (pagesMatch) {
      const pagesContainerHaystack = content.slice(pagesMatch.index + pagesMatch[0].length);
      const pagesContainer = pagesContainerHaystack.slice(0, pagesContainerHaystack.indexOf('</div>')).split('<a');
      const lastPageRef = pagesContainer[pagesContainer.length - 1];
      nextpageRef = UTIL.removeHtml(UTIL.between(lastPageRef, 'href="', '"')) || null;
    }

    // Were already on last page or hit the limit
    if (!nextpageRef ||
      (!isNaN(options.limit) && options.limit < 1)) {
      return callback(null, {
        query: searchString || QS.unescape(URL.parse(currentRef, true).query.search_query),
        items,
        nextpageRef,
        results,
        filters: activeFilters,
        currentRef: currentRef || null,
      });
    }

    options.nextpageRef = nextpageRef;
    main(searchString, options, (e, data) => { // eslint-disable-line consistent-return, max-len
      if (e) return callback(e);
      items.push(...data.items);
      callback(null, {
        query: searchString || QS.unescape(URL.parse(currentRef, true).query.search_query),
        items,
        nextpageRef: data.nextpageRef,
        results,
        filters: activeFilters,
        currentRef: data.currentRef,
      });
    }, true);
  });
};

const getFilters = main.getFilters = (searchString, callback, noWarn = false) => { // eslint-disable-line consistent-return, max-len
  // TODO: remove when done
  if (callback && main.do_warn_deprecate && !noWarn) {
    console.warn(
      `/*********************************************************************
 * support for callbacks in ytsr will be removed in the next release *
 *   set \`ytsr.do_warn_deprecate = false;\` to disable this message   *
 *********************************************************************/`);
  }
  // Return a promise when no callback is provided
  if (!callback) {
    return new Promise((resolve, reject) => {
      getFilters(searchString, (err, info) => { // eslint-disable-line consistent-return
        if (err) return reject(err);
        resolve(info);
      }, true);
    });
  }
  if (!searchString) return callback(new Error('search string is mandatory'));

  let queryString;
  let parsedQuery = URL.parse(searchString, true);
  if (parsedQuery.query.sp && parsedQuery.query.search_query) queryString = UTIL.buildFromNextpage(searchString);
  else queryString = UTIL.buildLink(searchString);

  UTIL.getPage(queryString, {}, (err, body) => { // eslint-disable-line consistent-return
    if (err) return callback(err);
    let content;
    try {
      const parsed = JSON.parse(body);
      content = parsed[parsed.length - 1].body.content;
      callback(null, UTIL.parseFilters(content)); // eslint-disable-line callback-return
    } catch (e) {
      return callback(e);
    }
  });
};

// Option to disable deprecation messages
main.do_warn_deprecate = true;
