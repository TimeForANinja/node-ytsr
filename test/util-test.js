/* global describe, it */
const FS = require('fs');
const PATH = require('path');
const UTIL = require('../lib/util');
const NOCK = require('./nock');
const ASSERT = require('assert-diff');

describe('util.parseItem()', () => {
  const parsed = JSON.parse(FS.readFileSync(PATH.resolve(__dirname, 'utilFiles/parsed.json')));
  it('parse channel', done => {
    FS.readFile(PATH.resolve(__dirname, 'utilFiles/dump-channel.html'), (err, data) => {
      ASSERT.ifError(err);
      let item = UTIL.parseItem(data.toString());
      ASSERT.deepEqual(item, parsed.channel);
      done();
    });
  });
  it('parse compact shelf', done => {
    FS.readFile(PATH.resolve(__dirname, 'utilFiles/dump-compact-shelf.html'), (err, data) => {
      ASSERT.ifError(err);
      let item = UTIL.parseItem(data.toString());
      ASSERT.deepEqual(item, parsed['compact-shelf']);
      done();
    });
  });
  it('parse movie vertical poster', done => {
    FS.readFile(PATH.resolve(__dirname, 'utilFiles/dump-movie-vertical-poster.html'), (err, data) => {
      ASSERT.ifError(err);
      let item = UTIL.parseItem(data.toString());
      ASSERT.deepEqual(item, parsed['movie-vertical-poster']);
      done();
    });
  });
  it('parse mix', done => {
    FS.readFile(PATH.resolve(__dirname, 'utilFiles/dump-mix.html'), (err, data) => {
      ASSERT.ifError(err);
      let item = UTIL.parseItem(data.toString());
      ASSERT.deepEqual(item, parsed.mix);
      done();
    });
  });
  it('parse playlist', done => {
    FS.readFile(PATH.resolve(__dirname, 'utilFiles/dump-playlist.html'), (err, data) => {
      ASSERT.ifError(err);
      let item = UTIL.parseItem(data.toString());
      ASSERT.deepEqual(item, parsed.playlist);
      done();
    });
  });
  it('parse search refinements', done => {
    FS.readFile(PATH.resolve(__dirname, 'utilFiles/dump-search-refinements.html'), (err, data) => {
      ASSERT.ifError(err);
      let item = UTIL.parseItem(data.toString());
      ASSERT.deepEqual(item, parsed['search-refinements']);
      done();
    });
  });
  it('parse vertical shelf', done => {
    FS.readFile(PATH.resolve(__dirname, 'utilFiles/dump-vertical-shelf.html'), (err, data) => {
      ASSERT.ifError(err);
      let item = UTIL.parseItem(data.toString());
      ASSERT.deepEqual(item, parsed['vertical-shelf']);
      done();
    });
  });
  it('parse video', done => {
    FS.readFile(PATH.resolve(__dirname, 'utilFiles/dump-video.html'), (err, data) => {
      ASSERT.ifError(err);
      let item = UTIL.parseItem(data.toString());
      ASSERT.deepEqual(item, parsed.video);
      done();
    });
  });
});

describe('util.parseChannel()', () => {
  it('parses a channel', done => {
    FS.readFile(PATH.resolve(__dirname, 'utilFiles/parsed.json'), (err, data) => {
      const parsed = JSON.parse(data).channel;
      ASSERT.ifError(err);
      FS.readFile(PATH.resolve(__dirname, 'utilFiles/dump-channel.html'), (errIn, dataIn) => {
        ASSERT.ifError(errIn);
        let item = UTIL.parseChannel(dataIn.toString());
        ASSERT.deepEqual(item, parsed);
        done();
      });
    });
  });
});

describe('util.parseShelfCompact()', () => {
  it('parses a compact shelf', done => {
    FS.readFile(PATH.resolve(__dirname, 'utilFiles/parsed.json'), (err, data) => {
      const parsed = JSON.parse(data)['compact-shelf'];
      ASSERT.ifError(err);
      FS.readFile(PATH.resolve(__dirname, 'utilFiles/dump-compact-shelf.html'), (errIn, dataIn) => {
        ASSERT.ifError(errIn);
        let item = UTIL.parseShelfCompact(dataIn.toString());
        ASSERT.deepEqual(item, parsed);
        done();
      });
    });
  });
});

describe('util.parseMovie()', () => {
  it('parses a movie', done => {
    FS.readFile(PATH.resolve(__dirname, 'utilFiles/parsed.json'), (err, data) => {
      const parsed = JSON.parse(data)['movie-vertical-poster'];
      ASSERT.ifError(err);
      FS.readFile(PATH.resolve(__dirname, 'utilFiles/dump-movie-vertical-poster.html'), (errIn, dataIn) => {
        ASSERT.ifError(errIn);
        let item = UTIL.parseMovie(dataIn.toString());
        ASSERT.deepEqual(item, parsed);
        done();
      });
    });
  });
});

describe('util.parseMix()', () => {
  it('parses a mix', done => {
    FS.readFile(PATH.resolve(__dirname, 'utilFiles/parsed.json'), (err, data) => {
      const parsed = JSON.parse(data).mix;
      ASSERT.ifError(err);
      FS.readFile(PATH.resolve(__dirname, 'utilFiles/dump-mix.html'), (errIn, dataIn) => {
        ASSERT.ifError(errIn);
        let item = UTIL.parseMix(dataIn.toString());
        ASSERT.deepEqual(item, parsed);
        done();
      });
    });
  });
});

describe('util.parsePlaylist()', () => {
  it('parses a playlist', done => {
    FS.readFile(PATH.resolve(__dirname, 'utilFiles/parsed.json'), (err, data) => {
      const parsed = JSON.parse(data).playlist;
      ASSERT.ifError(err);
      FS.readFile(PATH.resolve(__dirname, 'utilFiles/dump-playlist.html'), (errIn, dataIn) => {
        ASSERT.ifError(errIn);
        let item = UTIL.parsePlaylist(dataIn.toString());
        ASSERT.deepEqual(item, parsed);
        done();
      });
    });
  });
});

describe('util.parseRelatedSearches()', () => {
  it('parses a search refinement', done => {
    FS.readFile(PATH.resolve(__dirname, 'utilFiles/parsed.json'), (err, data) => {
      const parsed = JSON.parse(data)['search-refinements'];
      ASSERT.ifError(err);
      FS.readFile(PATH.resolve(__dirname, 'utilFiles/dump-search-refinements.html'), (errIn, dataIn) => {
        ASSERT.ifError(errIn);
        let item = UTIL.parseRelatedSearches(dataIn.toString());
        ASSERT.deepEqual(item, parsed);
        done();
      });
    });
  });
});

describe('util.parseShelfVertical()', () => {
  it('parses a vertical shelf', done => {
    FS.readFile(PATH.resolve(__dirname, 'utilFiles/parsed.json'), (err, data) => {
      const parsed = JSON.parse(data)['vertical-shelf'];
      ASSERT.ifError(err);
      FS.readFile(PATH.resolve(__dirname, 'utilFiles/dump-vertical-shelf.html'), (errIn, dataIn) => {
        ASSERT.ifError(errIn);
        let item = UTIL.parseShelfVertical(dataIn.toString());
        ASSERT.deepEqual(item, parsed);
        done();
      });
    });
  });
});

describe('util.parseVideo()', () => {
  it('parses a video', done => {
    FS.readFile(PATH.resolve(__dirname, 'utilFiles/parsed.json'), (err, data) => {
      const parsed = JSON.parse(data).video;
      ASSERT.ifError(err);
      FS.readFile(PATH.resolve(__dirname, 'utilFiles/dump-video.html'), (errIn, dataIn) => {
        ASSERT.ifError(errIn);
        let item = UTIL.parseVideo(dataIn.toString());
        ASSERT.deepEqual(item, parsed);
        done();
      });
    });
  });
});

describe('util.buildLink()', () => {
  it('build a query link', () => {
    const query = UTIL.buildLink('what &% up');
    const should = 'https://www.youtube.com/results?search_query=what%20%26%25%20up&spf=navigate&gl=US&hl=en';
    ASSERT.equal(query, should);
  });
});

describe('util.buildFromNextpage()', () => {
  it('builds a nextpage link', () => {
    const query = UTIL.buildFromNextpage('/results?sp=SGajsdkasj&search_query=youtube');
    const should = 'https://www.youtube.com/results?sp=SGajsdkasj&search_query=youtube&spf=navigate&gl=US&hl=en';
    ASSERT.equal(query, should);
  });
});

describe('util.between()', () => {
  it('`left` positioned at the start', () => {
    const rs = UTIL.between('<b>hello there friend</b>', '<b>', '</b>');
    ASSERT.equal(rs, 'hello there friend');
  });

  it('somewhere in the middle', () => {
    const rs = UTIL.between('something everything nothing', ' ', ' ');
    ASSERT.equal(rs, 'everything');
  });

  it('not found', () => {
    const rs = UTIL.between('oh oh _where_ is it', '<b>', '</b>');
    ASSERT.equal(rs, '');
  });

  it('`right` before `left`', () => {
    const rs = UTIL.between('>>> a <this> and that', '<', '>');
    ASSERT.equal(rs, 'this');
  });

  it('`right` not found', () => {
    const rs = UTIL.between('something [around[ somewhere', '[', ']');
    ASSERT.equal(rs, '');
  });
});

describe('util.removeHtml()', () => {
  it('remove html', () => {
    ASSERT.equal(
      UTIL.removeHtml('<a href="/someref">Artist1 - Nova (Official)</a><div class="pl-video-owner">'),
      'Artist1 - Nova (Official)',
    );
  });

  it('replace unknown characters', () => {
    ASSERT.equal(UTIL.removeHtml('Artist1 &amp; Artist2 - Nova (Official)'), 'Artist1 & Artist2 - Nova (Official)');
  });

  it('keeps newlines', () => {
    ASSERT.equal(UTIL.removeHtml('Artist1 &amp; Artist2 <br> Nova (Official)'), 'Artist1 & Artist2\nNova (Official)');
  });
});

describe('util.getPage()', () => {
  it('returns the body', done => {
    let shouldBody = '420 blaze it';
    let scope = NOCK('/somePath', {
      body: shouldBody,
    });
    UTIL.getPage('https://www.youtube.com/somePath', (err, body) => {
      scope.ifError(err);
      ASSERT.ifError(err);
      ASSERT.equal(body, shouldBody);
      scope.done();
      done();
    });
  });

  it('redirects invalid statusCode', done => {
    let scope = NOCK('/somePath', {
      error: true,
    });
    UTIL.getPage('https://www.youtube.com/somePath', err => {
      ASSERT.equal(err.message, 'Status Code 400');
      scope.done();
      done();
    });
  });
});

describe('util.parseFilters()', () => {
  it('parse the filters', done => {
    /* eslint-disable max-len */
    const should = new Map();
    should.set('Upload date', [
      { ref: 'https://www.youtube.com/results?sp=EgQIATgB&search_query=github', name: 'Last hour', active: false },
      { ref: 'https://www.youtube.com/results?sp=EgQIAjgB&search_query=github', name: 'Today', active: false },
      { ref: 'https://www.youtube.com/results?sp=EgQIAzgB&search_query=github', name: 'This week', active: false },
      { ref: 'https://www.youtube.com/results?sp=EgQIBDgB&search_query=github', name: 'This month', active: false },
      { ref: 'https://www.youtube.com/results?sp=EgQIBTgB&search_query=github', name: 'This year', active: false },
    ]);
    should.get('Upload date').active = null;
    should.set('Type', [
      { ref: 'https://www.youtube.com/results?sp=EgQQATgB&search_query=github', name: 'Video', active: false },
      { ref: 'https://www.youtube.com/results?', name: 'Channel', active: false },
      { ref: 'https://www.youtube.com/results?', name: 'Playlist', active: false },
      { ref: 'https://www.youtube.com/results?', name: 'Movie', active: false },
      { ref: 'https://www.youtube.com/results?', name: 'Show', active: false },
    ]);
    should.get('Type').active = null;
    should.set('Duration', [
      { ref: 'https://www.youtube.com/results?sp=EgQYATgB&search_query=github', name: 'Short (< 4 minutes)', active: false },
      { ref: 'https://www.youtube.com/results?sp=EgQYAjgB&search_query=github', name: 'Long (> 20 minutes)', active: false },
    ]);
    should.get('Duration').active = null;
    should.set('Features', [
      { ref: 'https://www.youtube.com/results?sp=EgQ4AXAB&search_query=github', name: '4K', active: false },
      { ref: 'https://www.youtube.com/results?sp=EgQgATgB&search_query=github', name: 'HD', active: false },
      { ref: 'https://www.youtube.com/results?sp=EgU4AcgBAQ%253D%253D&search_query=github', name: 'HDR', active: false },
      { ref: 'https://www.youtube.com/results?sp=EgQoATgB&search_query=github', name: 'Subtitles/CC', active: false },
      { ref: 'https://www.youtube.com/results?sp=EgQwATgB&search_query=github', name: 'Creative Commons', active: false },
      { ref: null, name: '3D', active: true },
      { ref: 'https://www.youtube.com/results?sp=EgQ4AUAB&search_query=github', name: 'Live', active: false },
      { ref: 'https://www.youtube.com/results?sp=EgQ4AUgB&search_query=github', name: 'Purchased', active: false },
      { ref: 'https://www.youtube.com/results?sp=EgQ4AXgB&search_query=github', name: '360°', active: false },
      { ref: 'https://www.youtube.com/results?sp=EgU4AbgBAQ%253D%253D&search_query=github', name: 'Location', active: false },
    ]);
    should.get('Features').active = { ref: null, name: '3D', active: true };
    should.set('Sort by', [
      { ref: null, name: 'Relevance', active: true },
      { ref: 'https://www.youtube.com/results?sp=CAISAjgB&search_query=github', name: 'Upload date', active: false },
      { ref: 'https://www.youtube.com/results?sp=CAMSAjgB&search_query=github', name: 'View count', active: false },
      { ref: 'https://www.youtube.com/results?sp=CAESAjgB&search_query=github', name: 'Rating', active: false },
    ]);
    should.get('Sort by').active = { ref: null, name: 'Relevance', active: true };
    /* eslint-enable max-len */
    FS.readFile(PATH.resolve(__dirname, 'utilFiles/filterContainer.html'), (err, data) => {
      ASSERT.ifError(err);
      ASSERT.deepEqual(UTIL.parseFilters(data.toString()), should);
      done();
    });
  });
});
