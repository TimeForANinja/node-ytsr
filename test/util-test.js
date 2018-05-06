/* global describe, it */
const UTIL = require('../lib/util');
const ASSERT = require('assert-diff');

/* TODO:
parseItem
parsePlaylist
parseChannel
parseVideo
parseMovie
parseRelatedSearches
parseShelfCompact
parseShelfVertical
*/

describe('util.buildLink()', () => {
  it('build a query link', () => {
    const query = UTIL.buildLink('what &% up');
    const should = 'https://www.youtube.com/results?search_query=what%20%26%25%20up&spf=navigate&gl=US&hl=en';
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
      'Artist1 - Nova (Official)'
    );
  });

  it('replace unknown characters', () => {
    ASSERT.equal(UTIL.removeHtml('Artist1 &amp; Artist2 - Nova (Official)'), 'Artist1 & Artist2 - Nova (Official)');
  });

  it('keeps newlines', () => {
    ASSERT.equal(UTIL.removeHtml('Artist1 &amp; Artist2 <br> Nova (Official)'), 'Artist1 & Artist2\nNova (Official)');
  });
});
