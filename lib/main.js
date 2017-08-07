"use strict";

var https = require('https');
var util = require('./util.js');

exports.search = function(search_string, options, callback) {
	// check wether options wether no options were provided
	if(typeof(options) == 'function') {
		callback = options;
		options = {limit: 100};
	}
	// return a promise when no callback is provided
	if(!callback) {
		return new Promise(function(resolve, reject) {
			exports.search(search_string, options, function(err, info) {
				if(err) return reject(err);
				resolve(info);
			});
		});
	}
	if(!options) options = {limit: 100};
	var afterfunc = function(resp) {
		if(resp.statusCode != 200) {
			callback(new Error('Status Code ' + resp.statusCode));
		}
		var resp_string = '';
		resp.on('data', function(d) {
			resp_string += d.toString();
		})
		resp.on('end', function() {
			var parsed;
			try {
				parsed = JSON.parse(resp_string);
			} catch(e) {
				return callback(e);
			}
			var content = parsed[parsed.length - 1].body.content;

			// get the table of items and parse it(remove null items where the parsing failed)
			var table = util.between(content, '<ol id="item-section-', '\n</ol>').split('</li>\n\n<li>');
			table = table.filter(function(t) {
				var condition_1 = !t.includes('<div class="pyv-afc-ads-container" style="visibility:visible">');
				var condition_2 = !t.includes('<span class="spell-correction-corrected">');
				var condition_3 = !t.includes('<div class="search-message">');
				var condition_4 = !t.includes('<li class="search-exploratory-line">');
				return condition_1 && condition_2 && condition_3 && condition_4;
			});
			table = table.map(function(t) { return util.parse_item(t, resp_string) }).filter(function(a) { return a });

			// get amount of results
			var results = util.between(util.between(content, '<p class="num-results', '</p>'), '>');

			// get informations about set filters
			var set_filters_holder = util.between(content, '<ul class="filter-crumb-list">', '</ul>').split('<li')
			var set_filters = set_filters_holder.splice(1).map(function(f) { return util.between(f, '<span class="filter-text filter-ghost">', '<') });

			// were already on the last page so we cant parse more
			var pages_container = util.between(content, '<div class="branded-page-box search-pager  spf-link ">', '</div>').split('<a');
			var last_page_ref = pages_container[pages_container.length - 1];
			if(last_page_ref.includes('data-redirect-url="/results?')) {
				return callback(null, {
					query: search_string,
					results: results ? results : 0,
					filters: set_filters,
					current_ref: current_ref ? current_ref : undefined,
					items: table
				});
			}
			var nextpage_ref = util.remove_html(util.between(last_page_ref, 'href="', '"'));

			// check wether we hit the set limit
			if(options.limit && options.limit <= table.length) {
				table = table.filter(function(item, index) { return index < options.limit });
				return callback(null, {
					query: search_string,
					items: table,
					nextpage_ref: nextpage_ref,
					results: results ? results : 0,
					filters: set_filters,
					current_ref: current_ref ? current_ref : undefined,
				});
			}
			if(nextpage_ref) {
				options.nextpage_ref = nextpage_ref;
				options.limit = options.limit ? options.limit - table.length : undefined;
				return exports.search(search_string, options, function(err, data) {
					if(err) {
						return callback(err);
					}
					data.items = table.concat(data.items);
					return callback(null, data);
				});
			}

			return callback(null, {
				query: search_string,
				items: table,
				results: results ? results : 0,
				filters: set_filters,
				current_ref: current_ref ? current_ref : undefined,
			});
		});
	}
	// save provided nextpage_ref and do the request
	var current_ref = options.nextpage_ref;
	var request;
	if(options.nextpage_ref) {
		request = https.get('https://www.youtube.com' + options.nextpage_ref + '&spf=navigate', afterfunc);
	} else {
		request = https.get(util.build_link(search_string), afterfunc);
	}
	request.on('error', callback);
}

exports.get_filters = function(search_string, callback) {
	// return a promise when no callback is provided
	if(!callback) {
		return new Promise(function(resolve, reject) {
			exports.get_filters(search_string, function(err, info) {
				if(err) return reject(err);
				resolve(info);
			});
		});
	}
	var afterfunc = function(resp) {
		if(resp.statusCode != 200) {
			callback(new Error('Status Code ' + resp.statusCode));
		}
		var resp_string = '';
		resp.on('data', function(d) {
			resp_string += d.toString();
		})
		resp.on('end', function() {
			var parsed;
			try {
				parsed = JSON.parse(resp_string);
			} catch(e) {
				return callback(e);
			}
			var content = parsed[parsed.length - 1].body.content;

			// get informations about set filters
			var set_filters_holder = util.between(content, '<ul class="filter-crumb-list">', '</ul>').split('<li');
			var set_filters = set_filters_holder.splice(1).map(function(f) { return util.between(f, '<span class="filter-text filter-ghost">', '<') });

			// get avabile filters, parse and return them
			var filters = util.between(content, '<div id="filter-dropdown"', '<ol id="item-section');
			var coloms = filters.split('<h4 class="filter-col-title">');
			coloms.splice(0, 1);
			var results = {};
			coloms.map(function(c) {
				var parts = c.split('<a');
				return parts.map(function(p, i) {
					if(i == 0) {
						return util.between(p, '', '<').toLowerCase();
					} else {
						return {
							ref: util.remove_html(util.between(p, 'href="', '"')),
							name: util.between(util.between(p, '>', '</span>'), '>'),
						}
					}
				});
			}).map(function(i) { results[i[0]] = i.splice(1) });
			results['already_set'] = set_filters;
			callback(null, results);
		})
	}
	var request = https.get(util.build_link(search_string), afterfunc);
	request.on('error', callback);
}
