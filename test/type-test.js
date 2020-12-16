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
      if (data.throws) {
        ASSERT.throws(
          () => PARSE_ITEM._hidden.parseItem(data.raw),
          e => e.message === data.throws,
        );
      } else {
        const parsed = PARSE_ITEM._hidden.parseItem(data.raw);
        ASSERT.deepEqual(data.parsed, parsed);
      }
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
    // Variables
    const params = [{ test: true }, 'asdf'];
    const func = () => {
      throw new Error('nope');
    };
    // Prepare
    if (FS.existsSync('dumps')) {
      FS.readdirSync('dumps').map(x => `dumps/${x}`).map(x => FS.unlinkSync(x));
      FS.rmdirSync('dumps');
    }
    // Run
    const val = PARSE_ITEM._hidden.catchAndLogFunc(func, params);
    ASSERT.equal(val, null);

    const files = FS.readdirSync('dumps');
    ASSERT.ok(files.length === 1, 'needs exactly 1 dump file to continue');
    if (files.length !== 1) return;

    const data = FS.readFileSync(`dumps/${files[0]}`);
    ASSERT.deepEqual(JSON.parse(data), params);
  });
});

describe('parseItem.js#parseDidYouMeanRenderer', () => {
  const data = JSON.parse(FS.readFileSync('test/typeFiles/didYouMeanRenderer_01.json', 'utf8'));

  it('does not error when no resp is provided', () => {
    ASSERT.doesNotThrow(() => PARSE_ITEM._hidden.parseItem(data.raw));
  });

  it('does not error when refinements is not an array', () => {
    ASSERT.doesNotThrow(() => PARSE_ITEM._hidden.parseItem(data.raw, { refinements: 'test' }));
  });

  it('returns null', () => {
    ASSERT.equal(PARSE_ITEM._hidden.parseItem(data.raw, {}), null);
  });

  it('pushes into resp#refinements on first position', () => {
    const resp = { refinements: [{ other: 'refinement' }] };
    PARSE_ITEM._hidden.parseItem(data.raw, resp);
    ASSERT.deepEqual(resp.refinements[0], {
      q: 'Masa Mainds Dada-Didi audio',
      url: 'https://www.youtube.com/results?search_query=Masa+Mainds+Dada-Didi+audio',
      thumbnails: null,
      bestThumbnail: null,
    });
  });
});

describe('parseItem.js#parseHorizontalCardListRenderer', () => {
  const data = JSON.parse(FS.readFileSync('test/typeFiles/horizontalCardListRenderer_01.json', 'utf8'));

  it('does not error when no resp is provided', () => {
    ASSERT.doesNotThrow(() => PARSE_ITEM._hidden.parseItem(data.raw));
  });

  it('does not error when refinements is not an array', () => {
    ASSERT.doesNotThrow(() => PARSE_ITEM._hidden.parseItem(data.raw, { refinements: 'test' }));
  });

  it('returns null', () => {
    ASSERT.equal(PARSE_ITEM._hidden.parseItem(data.raw, {}), null);
  });

  it('appends to end of resp#refinements', () => {
    const resp = { refinements: [{ other: 'refinement' }] };
    PARSE_ITEM._hidden.parseItem(data.raw, resp);
    ASSERT.deepEqual(resp.refinements[1], {
      q: 'jlv feel again remix',
      url: 'https://www.youtube.com/results?search_query=jlv+feel+again+remix&sp=eAE%253D',
      bestThumbnail: {
        url: 'https://i.ytimg.com/vi/UjgRAj-Ns20/mqdefault.jpg',
        width: 320,
        height: 180,
      },
      thumbnails: [{
        url: 'https://i.ytimg.com/vi/UjgRAj-Ns20/mqdefault.jpg',
        width: 320,
        height: 180,
      }],
    });
  });
});

describe('parseItem.js#parseShowingResultsForRenderer', () => {
  const data = JSON.parse(FS.readFileSync('test/typeFiles/showingResultsForRenderer_01.json', 'utf8'));
  const data_v2 = JSON.parse(FS.readFileSync('test/typeFiles/showingResultsForRenderer_02.json', 'utf8'));

  it('does not error when no resp is provided', () => {
    ASSERT.doesNotThrow(() => PARSE_ITEM._hidden.parseItem(data.raw));
  });

  it('returns null', () => {
    ASSERT.equal(PARSE_ITEM._hidden.parseItem(data.raw, {}), null);
  });

  it('overwrites resp#resultsFor (v1)', () => {
    const resp = { correctedQuery: 'testing' };
    PARSE_ITEM._hidden.parseItem(data.raw, resp);
    ASSERT.equal(resp.correctedQuery, 'vorwerk');
  });

  it('overwrites resp#resultsFor (v2)', () => {
    const resp = { correctedQuery: 'Pietsmiet' };
    PARSE_ITEM._hidden.parseItem(data_v2.raw, resp);
    ASSERT.equal(resp.correctedQuery, 'Pietsmiet');
  });
});
