/* global describe, it */
const YTSR = require('..');
const ASSERT = require('assert-diff');

describe('hey boy', () => {
  it('1', done => {
    YTSR('deadpol')
      .then(() => {
        ASSERT.ok(true);
        done();
      })
      .catch(err => ASSERT.ifError(err));
  });
  it('2', done => {
    YTSR('filme')
      .then(() => {
        ASSERT.ok(true);
        done();
      })
      .catch(err => ASSERT.ifError(err));
  });
  it('3', done => {
    YTSR('morgan freeman')
      .then(() => {
        ASSERT.ok(true);
        done();
      })
      .catch(err => ASSERT.ifError(err));
  });
  it('4', done => {
    YTSR('pietsmiet')
      .then(() => {
        ASSERT.ok(true);
        done();
      })
      .catch(err => ASSERT.ifError(err));
  });
});
