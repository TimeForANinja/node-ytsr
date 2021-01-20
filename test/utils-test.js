/* global describe, it, before, after */
const ASSERT = require('assert-diff');
ASSERT.options.strict = true;
const UTILS = require('../lib/utils.js');
const FS = require('fs');
const NOCK = require('nock');

describe('utils.parseFilters()', () => {
  const data = JSON.parse(FS.readFileSync('test/pages/firstpage_payload.json', 'utf8'));

  it('returns a map of maps', () => {
    const resp = UTILS.parseFilters(data);
    ASSERT.ok(resp instanceof Map);
    ASSERT.ok(Array.from(resp.values()).every(x => x instanceof Map));
  });

  it('map-keys are always strings', () => {
    const resp = UTILS.parseFilters(data);
    ASSERT.ok(Array.from(resp.keys()).every(x => typeof x === 'string'));
    ASSERT.ok(
      // For all inner maps
      Array.from(resp.values())
        .every(x =>
          // All keys
          Array.from(x.keys())
            // Are type string
            .every(y => typeof y === 'string'),
        ),
    );
  });

  it('set\'s active property', () => {
    const resp = UTILS.parseFilters(data);
    ASSERT.equal(resp.get('Duration').active, null);
    ASSERT.equal(resp.get('Sort by').active, resp.get('Sort by').get('Relevance'));
    ASSERT.deepEqual(resp.get('Sort by').active, {
      name: 'Relevance',
      description: 'Sort by relevance',
      url: null,
      active: true,
    });
  });
});

describe('utils.parseBody()', () => {
  const data = FS.readFileSync('test/pages/firstpage_nodata.html', 'utf8');

  it('json is the parsed data', () => {
    const resp = UTILS.parseBody(data);
    ASSERT.deepEqual(resp.json, { data: 'data' });
  });

  it('json is null if unable to parse', () => {
    const resp = UTILS.parseBody('just some not compatible string');
    ASSERT.equal(resp.json, null);
  });

  it('provides a default context object', () => {
    const resp = UTILS.parseBody(data);
    ASSERT.deepEqual(resp.context, {
      client: {
        utcOffsetMinutes: 0,
        gl: 'US',
        hl: 'en',
        clientName: 'WEB',
        clientVersion: '<client_version>',
      },
      user: {},
      request: {},
    });
  });

  it('provides a valid apiKey', () => {
    const resp = UTILS.parseBody(data);
    ASSERT.equal(resp.apiKey, '<apikey>');
  });

  it('overwrites hl & gl in context', () => {
    const resp = UTILS.parseBody(data, { hl: 'AA', gl: 'BB' });
    ASSERT.deepEqual(resp.context.client, {
      utcOffsetMinutes: 0,
      gl: 'BB',
      hl: 'AA',
      clientName: 'WEB',
      clientVersion: '<client_version>',
    });
  });
});

describe('utils.parseText()', () => {
  it('parses from simpleText', () => {
    ASSERT.equal(
      UTILS.parseText({ simpleText: 'simpleText' }),
      'simpleText',
    );
  });

  it('parges from runs', () => {
    ASSERT.equal(
      UTILS.parseText({ runs: [{ text: 'a ' }, { text: 'b' }, { text: ' c' }] }),
      'a b c',
    );
  });

  it('prefers simpleText over runs', () => {
    ASSERT.equal(
      UTILS.parseText({ simpleText: 'simpleText', runs: [{ text: 'a' }] }),
      'simpleText',
    );
  });
});

describe('utils.parseIntegerFromText()', () => {
  it('parse from simpleText', () => {
    ASSERT.equal(
      UTILS.parseIntegerFromText({ simpleText: '4' }),
      4,
    );
  });

  it('parse from runs', () => {
    ASSERT.equal(
      UTILS.parseIntegerFromText({ runs: [{ text: '4' }] }),
      4,
    );
  });

  it('parses american-formatted numbers', () => {
    ASSERT.equal(UTILS.parseIntegerFromText({ simpleText: '4,000,123' }), 4000123);
  });

  it('parses european-formatted numbers', () => {
    ASSERT.equal(UTILS.parseIntegerFromText({ simpleText: '4.000.123' }), 4000123);
  });

  it('ignores leading strings', () => {
    ASSERT.equal(UTILS.parseIntegerFromText({ simpleText: 'views: 420' }), 420);
  });

  it('ignores following strings', () => {
    ASSERT.equal(UTILS.parseIntegerFromText({ simpleText: '420 viewers' }), 420);
  });

  it('parses encased strings', () => {
    ASSERT.equal(UTILS.parseIntegerFromText({ simpleText: 'viewed 420 times' }), 420);
  });
});

describe('utils.checkArgs()', () => {
  it('errors without parameter', () => {
    ASSERT.throws(() => {
      UTILS.checkArgs();
    }, /search string is mandatory/);
  });

  it('errors when parameter is an empty string', () => {
    ASSERT.throws(() => {
      UTILS.checkArgs('');
    }, /search string is mandatory/);
  });

  it('errors when parameter is not a string', () => {
    ASSERT.throws(() => {
      UTILS.checkArgs(1337);
    }, /search string must be of type string/);
  });

  it('errors for filter-links without search_query', () => {
    ASSERT.throws(() => {
      UTILS.checkArgs('https://www.youtube.com/results?sp=00000000000');
    }, /filter links have to include a "search_string" query/);
  });

  it('does not error for non-results link sp & without search_query', () => {
    ASSERT.doesNotThrow(() => {
      UTILS.checkArgs('https://www.youtube.com/watch?sp=00000000000');
    }, /filter links have to include a "search_string" query/);
  });

  it('accepts literal youtube links', () => {
    const opts = UTILS.checkArgs('https://www.youtube.com/watch?v=00000000000');
    ASSERT.deepEqual(opts.query, {
      search_query: 'https://www.youtube.com/watch?v=00000000000',
      gl: 'US',
      hl: 'en',
    });
  });

  it('returns default options', () => {
    ASSERT.deepEqual(
      UTILS.checkArgs('searchString'),
      {
        search: 'searchString',
        query: {
          search_query: 'searchString',
          hl: 'en',
          gl: 'US',
        },
        requestOptions: {},
        limit: 100,
        safeSearch: false,
      },
    );
  });

  it('overwrites gl & hl options', () => {
    const options = { gl: 'DE', hl: 'de' };
    ASSERT.deepEqual(
      UTILS.checkArgs('searchString', options).query,
      {
        search_query: 'searchString',
        hl: 'de',
        gl: 'DE',
      },
    );
  });

  it('parses from previous link', () => {
    const opts = UTILS.checkArgs('https://www.youtube.com/results?search_query=NoCopyrightSounds&sp=EgIIAg%253D%253D');
    ASSERT.equal(opts.search, 'NoCopyrightSounds');
    ASSERT.deepEqual(opts.query, {
      search_query: 'NoCopyrightSounds',
      hl: 'en',
      gl: 'US',
      sp: 'EgIIAg%3D%3D',
    });
  });

  it('adds safe search parameters', () => {
    const opts = UTILS.checkArgs('searchString', { safeSearch: true });
    ASSERT.ok(opts.requestOptions.headers.Cookie.includes('PREF=f2=8000000'));
  });

  it('does not delete other headers', () => {
    const options = { requestOptions: { headers: { Cookie: ['cookie1'] } }, safeSearch: true };
    const opts = UTILS.checkArgs('searchString', options);
    ASSERT.deepEqual(opts.requestOptions.headers.Cookie, ['cookie1', 'PREF=f2=8000000']);
  });

  it('uses default limit if limit < 0', () => {
    const opts = UTILS.checkArgs('searchString', { limit: -3 });
    ASSERT.equal(opts.limit, 100);
  });

  it('uses default limit if limit is exactly 0', () => {
    const opts = UTILS.checkArgs('searchString', { limit: 0 });
    ASSERT.equal(opts.limit, 100);
  });

  it('keeps custom limits', () => {
    const opts = UTILS.checkArgs('searchString', { limit: 25 });
    ASSERT.equal(opts.limit, 25);
  });

  it('accepts Infinity as limit', () => {
    const opts = UTILS.checkArgs('searchString', { limit: Infinity });
    ASSERT.equal(opts.limit, Infinity);
  });

  it('does not alter request Options', () => {
    const opts = { safeSearch: true, hl: 'hl', gl: 'gl', limit: 123, requestOptions: { test: 'test' } };
    UTILS.checkArgs('searchString', opts);
    ASSERT.deepEqual(opts.requestOptions, { test: 'test' });
  });

  it('unlinks requestOptions#headers', () => {
    const options = { requestOptions: { headers: { Cookie: ['cookie1'] } }, safeSearch: true };
    UTILS.checkArgs('searchString', options);
    ASSERT.deepEqual(options.requestOptions.headers.Cookie, ['cookie1']);
  });

  it('keeps agent object', () => {
    // Check that not everything is unlinked
    class test {}
    const opts = {
      safeSearch: true,
      hl: 'hl',
      gl: 'gl',
      limit: 123,
      requestOptions: { agent: new test(), test: 'test' },
    };
    UTILS.checkArgs('searchString', opts);
    ASSERT.ok(opts.requestOptions.agent instanceof test);
  });

  it('removes limit if pages are provided', () => {
    const opts = { hl: 'hl', gl: 'gl', limit: 123, pages: 2, requestOptions: { test: 'test' } };
    const r = UTILS.checkArgs('searchString', opts);
    ASSERT.equal(r.limit, Infinity);
    ASSERT.equal(r.pages, 2);
  });
});

describe('utils.prepImg()', () => {
  it('sorts in descending order', () => {
    const images = [{ width: 10 }, { width: 20 }, { width: 30 }];
    const preped = UTILS.prepImg(images);
    ASSERT.deepEqual(preped.map(x => x.width), [30, 20, 10]);
  });

  it('does not crash for empty arrays', () => {
    const images = [];
    const preped = UTILS.prepImg(images);
    ASSERT.deepEqual(preped, []);
  });

  it('defaults urls to null', () => {
    const images = [{}];
    const preped = UTILS.prepImg(images);
    ASSERT.deepEqual(preped[0].url, null);
  });

  it('normalizes links', () => {
    const images = [{ url: '//test.com' }];
    const preped = UTILS.prepImg(images);
    ASSERT.equal(preped[0].url, 'https://test.com/');
  });
});

describe('utils.jsonAfter()', () => {
  it('`left` positioned at the start', () => {
    ASSERT.deepEqual(UTILS._hidden.jsonAfter('{"a": 1, "b": 1}asdf', ''), { a: 1, b: 1 });
  });

  it('somewhere in the middle', () => {
    ASSERT.deepEqual(UTILS._hidden.jsonAfter('test{"a": 1, "b": 1}test', 'test'), { a: 1, b: 1 });
  });

  it('ending with string end', () => {
    ASSERT.deepEqual(UTILS._hidden.jsonAfter('test{"a": 1, "b": 1}', 'test'), { a: 1, b: 1 });
  });

  it('invalid json', () => {
    ASSERT.equal(UTILS._hidden.jsonAfter('test{"a": 1, [] "b": 1}test', 'test'), null);
  });

  it('null if no json', () => {
    ASSERT.equal(UTILS._hidden.jsonAfter('test', 'test'), null);
  });
});

// Property of https://github.com/fent/node-ytdl-core/blob/master/test/utils-test.js
describe('utils.between()', () => {
  it('`left` positioned at the start', () => {
    const rs = UTILS._hidden.between('<b>hello there friend</b>', '<b>', '</b>');
    ASSERT.deepEqual(rs, 'hello there friend');
  });

  it('somewhere in the middle', () => {
    const rs = UTILS._hidden.between('something everything nothing', ' ', ' ');
    ASSERT.deepEqual(rs, 'everything');
  });

  it('not found', () => {
    const rs = UTILS._hidden.between('oh oh _where_ is it', '<b>', '</b>');
    ASSERT.deepEqual(rs, '');
  });

  it('`right` before `left`', () => {
    const rs = UTILS._hidden.between('>>> a <this> and that', '<', '>');
    ASSERT.deepEqual(rs, 'this');
  });

  it('`right` not found', () => {
    const rs = UTILS._hidden.between('something [around[ somewhere', '[', ']');
    ASSERT.deepEqual(rs, '');
  });
});

// Property of https://github.com/fent/node-ytdl-core/blob/master/test/utils-test.js
describe('utils.cutAfterJSON()', () => {
  it('Works with simple JSON', () => {
    ASSERT.deepEqual(UTILS._hidden.cutAfterJSON('{"a": 1, "b": 1}'), '{"a": 1, "b": 1}');
  });
  it('Cut extra characters after JSON', () => {
    ASSERT.deepEqual(UTILS._hidden.cutAfterJSON('{"a": 1, "b": 1}abcd'), '{"a": 1, "b": 1}');
  });
  it('Tolerant to string constants', () => {
    ASSERT.deepEqual(UTILS._hidden.cutAfterJSON('{"a": "}1", "b": 1}abcd'), '{"a": "}1", "b": 1}');
  });
  it('Tolerant to string with escaped quoting', () => {
    ASSERT.deepEqual(UTILS._hidden.cutAfterJSON('{"a": "\\"}1", "b": 1}abcd'), '{"a": "\\"}1", "b": 1}');
  });
  it('works with nested', () => {
    ASSERT.deepEqual(
      UTILS._hidden.cutAfterJSON('{"a": "\\"1", "b": 1, "c": {"test": 1}}abcd'),
      '{"a": "\\"1", "b": 1, "c": {"test": 1}}',
    );
  });
  it('Works with utf', () => {
    ASSERT.deepEqual(
      UTILS._hidden.cutAfterJSON('{"a": "\\"фыва", "b": 1, "c": {"test": 1}}abcd'),
      '{"a": "\\"фыва", "b": 1, "c": {"test": 1}}',
    );
  });
  it('Works with \\\\ in string', () => {
    ASSERT.deepEqual(
      UTILS._hidden.cutAfterJSON('{"a": "\\\\фыва", "b": 1, "c": {"test": 1}}abcd'),
      '{"a": "\\\\фыва", "b": 1, "c": {"test": 1}}',
    );
  });
  it('Works with \\\\ towards the end of a string', () => {
    ASSERT.strictEqual(
      UTILS.cutAfterJSON('{"text": "\\\\"};'),
      '{"text": "\\\\"}',
    );
  });
  it('Works with [ as start', () => {
    ASSERT.deepEqual(
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

describe('utils.doPost()', () => {
  before(() => {
    NOCK.disableNetConnect();
  });

  after(() => {
    NOCK.enableNetConnect();
  });

  it('uses default parameters', async() => {
    const receive = { success: true };
    const scope = NOCK('https://test.com')
      .post('/api')
      .reply(200, receive);
    const resp = await UTILS.doPost('https://test.com/api');
    ASSERT.deepEqual(resp, receive);
    scope.done();
  });

  it('uses method post & passes payloads', async() => {
    const send = { test: true };
    const receive = { success: true };
    const scope = NOCK('https://test.com')
      .post('/api', JSON.stringify(send))
      .reply(200, receive);
    const resp = await UTILS.doPost('https://test.com/api', send);
    ASSERT.deepEqual(resp, receive);
    scope.done();
  });
});
