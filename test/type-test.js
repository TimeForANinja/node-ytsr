/* global describe, it */
const ASSERT = require('assert-diff');
ASSERT.options.strict = true;
const FS = require('fs');
const PATH = require('path');

const PARSE_ITEM = require('../lib/parseItem.js');
const FILE_DIR = 'test/typeFiles';

describe('parseItem.js', () => {
  const TYPES = FS.readdirSync('test/typeFiles').filter(a => a.endsWith('.json'));

  for (const type of TYPES) {
    const file = PATH.resolve(FILE_DIR, type);
    const data = JSON.parse(FS.readFileSync(file, 'utf8'));

    it(`parses type ${data.type} - "${data.specialities}" speciality`, () => {
      const parsed = PARSE_ITEM(data.raw);
      ASSERT.deepEqual(data.parsed, parsed);
    });
  }
});

describe('parseItem.js#catchAndLogFunc', () => {
  it(`calls the func & returns the value`, () => {
    const obj = { test: true };
    const val = PARSE_ITEM._hidden.catchAndLogFunc(() => obj, ['asdf']);
    // Compare by reference
    ASSERT.ok(obj === val);
  });

  it(`does not error for no params`, () => {
    const obj = { test: true };
    const val = PARSE_ITEM._hidden.catchAndLogFunc(() => obj);
    // Compare by reference
    ASSERT.ok(obj === val);
  });

  it(`errors for not-array params`, () => {
    ASSERT.throws(() => {
      PARSE_ITEM._hidden.catchAndLogFunc(() => null, 'asdf');
    }, /params has to be an \(optionally empty\) array/);
  });

  it(`passes parameters`, () => {
    const func = (a, b, c) => {
      ASSERT.equal(a, 1);
      ASSERT.equal(b, 2);
      ASSERT.equal(c, 3);
    };
    PARSE_ITEM._hidden.catchAndLogFunc(func, [1, 2, 3]);
  });

  it(`catches errors, returns null and creates dump file`, () => {
    const params = [{ test: true }, 'asdf'];
    const func = () => {
      throw new Error('nope');
    };
    const val = PARSE_ITEM._hidden.catchAndLogFunc(func, params);
    ASSERT.equal(val, null);

    const files = FS.readdirSync('dumps');
    ASSERT.ok(files.length !== 1, 'needs exactly 1 dump file to continue');
    if (files.length !== 1) return;

    const data = FS.readFileSync(`dumps/${files[0]}`);
    ASSERT.deepEqual(JSON.parse(data), params);
  });
});
