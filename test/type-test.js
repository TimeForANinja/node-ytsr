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
