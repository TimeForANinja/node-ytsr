/* global describe, it */
const ASSERT = require('assert-diff');
ASSERT.options.strict = true;
const UTILS = require('../lib/utils.js')

describe('utils.jsonAfter()', () => {
  it('`left` positioned at the start', () => {
    ASSERT.deepEqual(UTILS._hidden.jsonAfter('{"a": 1, "b": 1}asdf', ''), {"a": 1, "b": 1});
  });

  it('somewhere in the middle', () => {
    ASSERT.deepEqual(UTILS._hidden.jsonAfter('test{"a": 1, "b": 1}test', 'test'), {"a": 1, "b": 1});
  });

  it('ending with string end', () => {
    ASSERT.deepEqual(UTILS._hidden.jsonAfter('test{"a": 1, "b": 1}', 'test'), {"a": 1, "b": 1});
  });

  it('invalid json', () => {
    ASSERT.throws(() => {
      UTILS._hidden.jsonAfter('test{"a": 1, [] "b": 1}test', 'test');
    }, /Unexpected token \[ in JSON at position [0-9]+/);
  });

  it('no json', () => {
    ASSERT.throws(() => {
      ASSERT.deepEqual(UTILS._hidden.jsonAfter('test', 'test'), null);
    }, /Can't cut unsupported JSON \(need to begin with \[ or { \) but got: ./);
  });
});

// Property of https://github.com/fent/node-ytdl-core/blob/master/test/utils-test.js
describe('utils.between()', () => {
  it('`left` positioned at the start', () => {
    const rs = UTILS._hidden.between('<b>hello there friend</b>', '<b>', '</b>');
    ASSERT.strictEqual(rs, 'hello there friend');
  });

  it('somewhere in the middle', () => {
    const rs = UTILS._hidden.between('something everything nothing', ' ', ' ');
    ASSERT.strictEqual(rs, 'everything');
  });

  it('not found', () => {
    const rs = UTILS._hidden.between('oh oh _where_ is it', '<b>', '</b>');
    ASSERT.strictEqual(rs, '');
  });

  it('`right` before `left`', () => {
    const rs = UTILS._hidden.between('>>> a <this> and that', '<', '>');
    ASSERT.strictEqual(rs, 'this');
  });

  it('`right` not found', () => {
    const rs = UTILS._hidden.between('something [around[ somewhere', '[', ']');
    ASSERT.strictEqual(rs, '');
  });
});

// Property of https://github.com/fent/node-ytdl-core/blob/master/test/utils-test.js
describe('utils.cutAfterJSON()', () => {
  it('Works with simple JSON', () => {
    ASSERT.strictEqual(UTILS._hidden.cutAfterJSON('{"a": 1, "b": 1}'), '{"a": 1, "b": 1}');
  });
  it('Cut extra characters after JSON', () => {
    ASSERT.strictEqual(UTILS._hidden.cutAfterJSON('{"a": 1, "b": 1}abcd'), '{"a": 1, "b": 1}');
  });
  it('Tolerant to string constants', () => {
    ASSERT.strictEqual(UTILS._hidden.cutAfterJSON('{"a": "}1", "b": 1}abcd'), '{"a": "}1", "b": 1}');
  });
  it('Tolerant to string with escaped quoting', () => {
    ASSERT.strictEqual(UTILS._hidden.cutAfterJSON('{"a": "\\"}1", "b": 1}abcd'), '{"a": "\\"}1", "b": 1}');
  });
  it('works with nested', () => {
    ASSERT.strictEqual(
      UTILS._hidden.cutAfterJSON('{"a": "\\"1", "b": 1, "c": {"test": 1}}abcd'),
      '{"a": "\\"1", "b": 1, "c": {"test": 1}}',
    );
  });
  it('Works with utf', () => {
    ASSERT.strictEqual(
      UTILS._hidden.cutAfterJSON('{"a": "\\"фыва", "b": 1, "c": {"test": 1}}abcd'),
      '{"a": "\\"фыва", "b": 1, "c": {"test": 1}}',
    );
  });
  it('Works with \\\\ in string', () => {
    ASSERT.strictEqual(
      UTILS._hidden.cutAfterJSON('{"a": "\\\\фыва", "b": 1, "c": {"test": 1}}abcd'),
      '{"a": "\\\\фыва", "b": 1, "c": {"test": 1}}',
    );
  });
  it('Works with [ as start', () => {
    ASSERT.strictEqual(
      UTILS._hidden.cutAfterJSON('[{"a": 1}, {"b": 2}]abcd'),
      '[{"a": 1}, {"b": 2}]',
    );
  });
  it('Returns an error when not beginning with [ or {', () => {
    ASSERT.throws(() => {
      UTILS._hidden.cutAfterJSON('abcd]}');
    }, /Can't cut unsupported JSON \(need to begin with \[ or { \) but got: ./);
  });
  it('Returns an error when missing closing bracket', () => {
    ASSERT.throws(() => {
      UTILS._hidden.cutAfterJSON('{"a": 1,{ "b": 1}');
    }, /Can't cut unsupported JSON \(no matching closing bracket found\)/);
  });
});
