"use strict";

var Entities = require('html-entities').AllHtmlEntities;
var url = require('url');
var base_url = 'https://www.youtube.com/results?';

exports.build_link = function(query) {
	return base_url + querystring.encode({
		search_query: query,
		spf: 'navigate',
		gl: 'US',
		hl: 'en'
	});
}

exports.parse_item = function(string) {
	var type = exports.between(string, '<div class="yt-lockup yt-lockup-tile yt-lockup-', ' ');
	if(type == 'playlist') {
		return exports.parse_playlist(string);
	} else if(type == 'channel') {
		return exports.parse_channel(string);
	} else if(type == 'video') {
		return exports.parse_video(string);
	} else {
		console.dir(string);
		throw new Error('unknown type |' + type + '|');
	}
}

exports.parse_playlist = function(string) {
	var owner_box = exports.between(string, '<div class="yt-lockup-byline ">', '</div>');
	var thumbnail = exports.between(string, 'data-thumb="', '"');
	thumbnail = thumbnail ? thumbnail : exports.between(string, 'src="', '"');
	return {
		type: 'playlist',
		title: exports.remove_html(exports.between(exports.between(string, '<h3 class="yt-lockup-title ">', '</a>'), '>')),
		link: 'https://www.youtube.com/playlist?list=' + exports.between(string, 'data-list-id="', '"'),
		thumbnail: url.resolve(base_url, thumbnail),

		author: {
			name: exports.remove_html(exports.between(owner_box, '>', '</a>')),
			id: exports.between(owner_box, 'data-ytid="', '"'),
			ref: url.resolve(base_url, exports.between(owner_box, '<a href="', '"')),
		},

		length: exports.remove_html(exports.between(string, '<span class="formatted-video-count-label">', '</span>')),
	}
}

exports.parse_channel = function(string) {
	var avatar = exports.between(string, 'data-thumb="', '"');
	avatar = avatar ? avatar : exports.between(string, 'src="', '"');
	return {
		type: 'channel',
		name: exports.remove_html(exports.between(exports.between(string, '<a href="', '</a>'), '>')),
		channel_id: exports.between(string, 'data-ytid="', '"'),
		link: url.resolve(base_url, exports.between(string, 'href="', '"')),
		avatar: url.resolve(base_url, avatar),

		followers: Number(exports.between(exports.between(string, 'yt-subscriber-count"', '</span>'), '>').replace(/\./g, '')),
		description_short: exports.remove_html(exports.between(exports.between(string, '<div class="yt-lockup-description', '</div>'), '>')),
		videos: exports.between(string, '<ul class="yt-lockup-meta-info"><li>', '</li>'),
	}
}

exports.parse_video = function(string) {
	var owner_box = exports.between(string, '<div class="yt-lockup-byline ">', '</div>');
	var meta_info = exports.between(string, '<ul class="yt-lockup-meta-info">', '</ul>').replace(/<\/li>/g, '').split('<li>');
	var thumbnail = exports.between(string, 'data-thumb="', '"');
	thumbnail = thumbnail ? thumbnail : exports.between(string, 'src="', '"');
	return {
		type: 'video',
		title: exports.remove_html(exports.between(exports.between(string, '<a href="', '</a>'), '>')),
		link: url.resolve(base_url, exports.between(string, 'href="', '"')),
		thumbnail: url.resolve(base_url, thumbnail),

		author: {
			name: exports.remove_html(exports.between(owner_box, '>', '</a>')),
			id: exports.between(owner_box, 'data-ytid="', '"'),
			ref: url.resolve(base_url, exports.between(owner_box, '<a href="', '"')),
		},

		description: exports.remove_html(exports.between(exports.between(string, '<div class="yt-lockup-description', '</div>'), '>')),
		views: Number(meta_info[2].replace('.', '').split(' ')[0]),
		duration: exports.between(string, '<span class="video-time" aria-hidden="true">', '</span>'),
		uploaded_at: meta_info[1],
	}
}

//taken from https://github.com/fent/node-ytdl-core/
exports.between = function(haystack, left, right) {
	var pos;
	pos = haystack.indexOf(left);
	if(pos === -1) { return ''; }
	haystack = haystack.slice(pos + left.length);
	if(!right) { return haystack; }
	pos = haystack.indexOf(right);
	if(pos === -1) { return ''; }
	haystack = haystack.slice(0, pos);
	return haystack;
};

exports.remove_html = function(string) {
	return new Entities().decode(
		string.replace(/\n/g, ' ')
		.replace(/\s*<\s*br\s*\/?\s*>\s*/gi, '\n')
		.replace(/<\s*\/\s*p\s*>\s*<\s*p[^>]*>/gi, '\n')
		.replace(/<.*?>/gi, '')
	).trim();
};
