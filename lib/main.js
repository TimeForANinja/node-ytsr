const HTTPS = require('https');
const UTIL = require('./util.js');

const main = module.exports = (searchString, options, callback) => { // eslint-disable-line consistent-return
  // Check wether options wether no options were provided
  if (typeof options === 'function') {
    callback = options;
    options = { limit: 100 };
  }
  // Return a promise when no callback is provided
  if (!callback) {
    return new Promise((resolve, reject) => {
      main(searchString, options, (err, info) => { // eslint-disable-line consistent-return
        if (err) return reject(err);
        resolve(info);
      });
    });
  }
  if (!options) options = { limit: 100 };
  const afterfunc = resp => { // eslint-disable-line consistent-return
    if (resp.statusCode !== 200) return callback(new Error(`Status Code ${resp.statusCode}`));
    const respBuffer = [];
    resp.on('data', d => respBuffer.push(d));
    resp.on('end', () => {
      let parsed;
      const respString = Buffer.concat(respBuffer).toString();
      try {
        parsed = JSON.parse(respString);
      } catch (e) {
        return callback(e);
      }
      const content = parsed[parsed.length - 1].body.content;

      // Get the table of items and parse it(remove null items where the parsing failed)
      const table = UTIL
        .between(content, '<ol id="item-section-', '\n</ol>')
        .split('</li>\n\n<li>')
        .filter(t => {
          let condition1 = !t.includes('<div class="pyv-afc-ads-container" style="visibility:visible">');
          let condition2 = !t.includes('<span class="spell-correction-corrected">');
          let condition3 = !t.includes('<div class="search-message">');
          let condition4 = !t.includes('<li class="search-exploratory-line">');
          return condition1 && condition2 && condition3 && condition4;
        })
        .map(t => UTIL.parseItem(t, respString, searchString))
        .filter(a => a);

      // Get amount of results
      const results = UTIL.between(UTIL.between(content, '<p class="num-results', '</p>'), '>');

      // Get informations about set filters
      const setFiltersHolder = UTIL.between(content, '<ul class="filter-crumb-list">', '</ul>').split('<li');
      const setFilters = setFiltersHolder
        .splice(1)
        .map(f => UTIL.between(f, '<span class="filter-text filter-ghost">', '<'));

      // Were already on the last page so we cant parse more
      const pagesContainer = UTIL
        .between(content, '<div class="branded-page-box search-pager  spf-link ">', '</div>')
        .split('<a');
      const lastPageRef = pagesContainer[pagesContainer.length - 1];
      if (lastPageRef.includes('data-redirect-url="/results?')) {
        return callback(null, {
          query: searchString,
          results: results ? results : 0,
          filters: setFilters,
          current_ref: currentRef || null,
          items: table,
        });
      }
      const nextpageRef = UTIL.removeHtml(UTIL.between(lastPageRef, 'href="', '"'));

      // Check wether we hit the set limit
      if (options.limit && options.limit <= table.length) {
        const respTable = table.filter((item, index) => index < options.limit);
        return callback(null, {
          query: searchString,
          items: respTable,
          nextpage_ref: nextpageRef,
          results: results ? results : 0,
          filters: setFilters,
          current_ref: currentRef || null,
        });
      }
      if (nextpageRef) {
        options.nextpage_ref = nextpageRef;
        options.limit = options.limit ? options.limit - table.length : undefined;
        return main(searchString, options, (err, data) => {
          if (err) {
            return callback(err);
          }
          data.items = table.concat(data.items);
          return callback(null, data);
        });
      }

      return callback(null, {
        query: searchString,
        items: table,
        results: results ? results : 0,
        filters: setFilters,
        current_ref: currentRef || null,
      });
    });
  };
  // Save provided nextpageRef and do the request
  const currentRef = options.nextpage_ref;
  let request;
  if (options.nextpage_ref) {
    request = HTTPS.get(`https://www.youtube.com${options.nextpage_ref}&spf=navigate`, afterfunc);
  } else {
    request = HTTPS.get(UTIL.buildLink(searchString), afterfunc);
  }
  request.on('error', callback);
};

const getFilters = main.get_filters = (searchString, callback) => { // eslint-disable-line consistent-return
  // Return a promise when no callback is provided
  if (!callback) {
    return new Promise((resolve, reject) => {
      getFilters(searchString, (err, info) => { // eslint-disable-line consistent-return
        if (err) return reject(err);
        resolve(info);
      });
    });
  }
  const request = HTTPS.get(UTIL.buildLink(searchString), resp => { // eslint-disable-line consistent-return
    if (resp.statusCode !== 200) return callback(new Error(`Status Code ${resp.statusCode}`));
    const respBuffer = [];
    resp.on('data', d => respBuffer.push(d));
    resp.on('end', () => { // eslint-disable-line consistent-return
      let parsed;
      try {
        parsed = JSON.parse(Buffer.concat(respBuffer).toString());
      } catch (e) {
        return callback(e);
      }
      const content = parsed[parsed.length - 1].body.content;

      // Get informations about set filters
      const setFiltersHolder = UTIL.between(content, '<ul class="filter-crumb-list">', '</ul>').split('<li');
      const setFilters = setFiltersHolder
        .splice(1)
        .map(f => UTIL.between(f, '<span class="filter-text filter-ghost">', '<'));

      // Get avabile filters, parse and return them
      const filters = UTIL.between(content, '<div id="filter-dropdown"', '<ol id="item-section');
      const coloms = filters.split('<h4 class="filter-col-title">');
      coloms.splice(0, 1);
      let results = {};
      coloms.map(c => c.split('<a')
        .map((p, i) => {
          if (i === 0) {
            return UTIL.between(p, '', '<').toLowerCase();
          } else {
            return {
              ref: UTIL.remove_html(UTIL.between(p, 'href="', '"')),
              name: UTIL.between(UTIL.between(p, '>', '</span>'), '>'),
            };
          }
        })).forEach(i => {
        results[i[0]] = i.splice(1);
      });
      results.already_set = setFilters;
      callback(null, results);
    });
  });
  request.on('error', callback);
};
