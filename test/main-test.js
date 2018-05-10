/* global describe, it */
const YTSR = require('..');
const ASSERT = require('assert-diff');
const NOCK = require('./nock'); // eslint-disable-line no-unused-vars

describe('ytsr#getFilters()', () => {
  it('no search string provided', done => {
    // TODO: check no options
    // TODO: check empty options
    // TODO: check limit working
    // TODO: check stopping if no more results
    // TODO: from query
    // TODO: from nextpageRef
    // TODO: with filters
    // TODO: return after first page
    // TODO: return after multiple pages
    YTSR.getFilters(null, err => {
      ASSERT.equal(err.message, 'search string is mandatory');
      done();
    });
  });

  it('returns a promise when no cb is provided', done => {
    let resp = YTSR.getFilters().catch(err => {
      ASSERT.equal(err.message, 'search string is mandatory');
      ASSERT.ok(resp instanceof Promise);
      done();
    });
  });
});

describe('ytsr()', () => {
  let scope = NOCK({ error: true });
  it('isn\'t tested atm', () => {
    scope.ifError(new Error('some error'));
    ASSERT.ok(false);
  });

  it('returns promise without cb', () => {
    let resp = YTSR().catch(err => {
      ASSERT.equal(err.message, 'search string or nextpageRef is mandatory');
      ASSERT.ok(resp instanceof Promise);
    });
  });

  it('errors when no nextpageRef or query is provided', () => {
    YTSR(null, err => {
      ASSERT.equal(err.message, 'search string or nextpageRef is mandatory');
    });
  });
});
