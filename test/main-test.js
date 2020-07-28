/* global describe, it */
const YTSR = require('..');
const ASSERT = require('assert-diff');
const FS = require('fs');
const PATH = require('path');
const NOCK = require('./nock'); // eslint-disable-line no-unused-vars

describe('ytsr#getFilters()', () => {
  it('no search string provided', done => {
    let resp = YTSR.getFilters().catch(err => {
      ASSERT.strictEqual(err.message, 'searchString, currentRef or nextpageRef is mandatory');
      ASSERT.ok(resp instanceof Promise);
      done();
    });
  });
});

describe('ytsr()', () => {
  const parsed = JSON.parse(FS.readFileSync(PATH.resolve(__dirname, 'mainFiles/parsedPages.json')));

  it('returns promise without cb', () => {
    let resp = YTSR().catch(err => {
      ASSERT.strictEqual(err.message, 'search string or nextpageRef is mandatory');
    });
    ASSERT.ok(resp instanceof Promise);
  });

  it('errors when no nextpageRef or query is provided', () => {
    YTSR(null).catch(err => {
      ASSERT.strictEqual(err.message, 'search string or nextpageRef is mandatory');
    });
  });

  it('check no options', done => {
    const query = 'someSearch';
    let scope = NOCK(query, {
      pages: [1, 2, 3, 4, 5],
    });
    YTSR(query).then(data => {
      ASSERT.strictEqual(data.items.length, 100);
      const should = [].concat(
        parsed.Page1, parsed.Page2,
        parsed.Page3, parsed.Page4,
        parsed.Page5).filter((item, index) => index < 100);
      ASSERT.deepEqual(data.items, should);
      scope.done();
      done();
    }).catch(err => {
      scope.ifError(err);
      ASSERT.ifError(err);
    });
  });

  it('check empty options', done => {
    const query = 'someSearch';
    let scope = NOCK(query, {
      pages: [1, 2, 3, 4, 5],
    });
    YTSR(query, {}).then(data => {
      ASSERT.strictEqual(data.items.length, 100);
      const should = [].concat(
        parsed.Page1, parsed.Page2,
        parsed.Page3, parsed.Page4,
        parsed.Page5).filter((item, index) => index < 100);
      ASSERT.deepEqual(data.items, should);
      scope.done();
      done();
    }).catch(err => {
      scope.ifError(err);
      ASSERT.ifError(err);
    });
  });

  it('check limit working', done => {
    const query = 'someSearch';
    const itemAmount = 39;
    let scope = NOCK(query, {
      pages: [1, 2],
    });
    YTSR(query, { limit: itemAmount }).then(data => {
      ASSERT.strictEqual(data.items.length, 39);
      const should = [].concat(parsed.Page1, parsed.Page2).filter((item, index) => index < 39);
      ASSERT.deepEqual(data.items, should);
      scope.done();
      done();
    }).catch(err => {
      scope.ifError(err);
      ASSERT.ifError(err);
    });
  });

  it('check wether it auto stops when parsed all items', done => {
    const query = 'someSearch';
    let scope = NOCK(query, {
      pages: [1, 2, 3, 4, 5, 6, 7],
    });
    YTSR(query, { limit: Infinity }).then(data => {
      ASSERT.strictEqual(data.items.length, 125);
      const should = [].concat(
        parsed.Page1, parsed.Page2,
        parsed.Page3, parsed.Page4,
        parsed.Page5, parsed.Page6,
        parsed.Page7);
      ASSERT.deepEqual(data.items, should);
      scope.done();
      done();
    }).catch(err => {
      scope.ifError(err);
      ASSERT.ifError(err);
    });
  });

  it('check wether it parses from query', done => {
    const query = 'github';
    let scope = NOCK(query, {
      pages: [1],
    });
    YTSR(query, { limit: 5 }).then(data => {
      ASSERT.strictEqual(data.items.length, 5);
      const should = parsed.Page1.filter((item, index) => index < 5);
      ASSERT.deepEqual(data.items, should);
      ASSERT.deepEqual(data.filters, [{
        active: true,
        name: 'Relevance',
        ref: null,
      }]);
      scope.done();
      done();
    }).catch(err => {
      scope.ifError(err);
      ASSERT.ifError(err);
    });
  });

  it('check wether it parses from nextpageRef', done => {
    let scope = NOCK({
      pages: [2, 3],
    });
    YTSR(null, {
      nextpageRef: '/results?sp=SBTqAwA%253D&search_query=github&spf=navigate&gl=US&hl=en',
      limit: 25,
    }).then(data => {
      ASSERT.strictEqual(data.items.length, 25);
      const should = [].concat(parsed.Page2, parsed.Page3).filter((item, index) => index < 25);
      ASSERT.deepEqual(data.items, should);
      ASSERT.deepEqual(data.filters, [{
        active: true,
        name: 'Relevance',
        ref: null,
      }]);
      scope.done();
      done();
    }).catch(err => {
      scope.ifError(err);
      ASSERT.ifError(err);
    });
  });

  it('check wether it exits when few items on first page', done => {
    let scope = NOCK({
      pages: [7],
    });
    YTSR(null, {
      nextpageRef: '/results?sp=SHjqAwA%253D&search_query=github&spf=navigate&gl=US&hl=en',
    }).then(data => {
      ASSERT.strictEqual(data.items.length, 4);
      ASSERT.deepEqual(data.items, parsed.Page7);
      ASSERT.deepEqual(data.filters, [{
        active: true,
        name: 'Relevance',
        ref: null,
      }]);
      scope.done();
      done();
    }).catch(err => {
      scope.ifError(err);
      ASSERT.ifError(err);
    });
  });
});
