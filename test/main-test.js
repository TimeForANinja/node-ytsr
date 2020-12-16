/* global describe, it, before, after */
const ASSERT = require('assert-diff');
ASSERT.options.strict = true;
const YTSR = require('../');
const NOCK = require('nock');
const FS = require('fs');

const YT_HOST = 'https://www.youtube.com';
const SEARCH_PATH = '/results';
const API_PATH = '/youtubei/v1/search';


describe('YTSR()', () => {
  before(() => {
    NOCK.disableNetConnect();
  });

  after(() => {
    NOCK.enableNetConnect();
  });

  it('propagate json#alerts', async() => {
    const scope = NOCK(YT_HOST)
      .get(SEARCH_PATH)
      .query({ gl: 'US', hl: 'en', search_query: 'testing' })
      .replyWithFile(200, 'test/pages/privatepage.html');

    await ASSERT.rejects(
      YTSR('testing', { pages: 1 }),
      // Yes, this is just batched together from the ytpl-example
      // Since i was unable to get one of these errors searching
      /API-Error: This playlist is private\./,
    );
    scope.done();
  });

  it('parses first page using limit', async() => {
    const scope = NOCK(YT_HOST)
      .get(SEARCH_PATH)
      .query({ gl: 'US', hl: 'en', search_query: 'testing' })
      .replyWithFile(200, 'test/pages/firstpage_01.html');

    const resp = await YTSR('testing', { limit: 11 });
    ASSERT.equal(resp.items.length, 11);
    ASSERT.equal(resp.continuation, null);
    scope.done();
  });

  it('parses multiple pages using limit', async() => {
    const scope1 = NOCK(YT_HOST)
      .get(SEARCH_PATH)
      .query({ gl: 'US', hl: 'en', search_query: 'testing' })
      .replyWithFile(200, 'test/pages/firstpage_01.html');

    const scope2 = NOCK(YT_HOST)
      .post(API_PATH, () => true)
      .query({ key: '<apikey>' })
      .replyWithFile(200, 'test/pages/secondpage_01.html');

    const resp = await YTSR('testing', { limit: 24 });
    ASSERT.equal(resp.items.length, 24);
    ASSERT.equal(resp.continuation, null);
    scope1.done();
    scope2.done();
  });

  it('returns no continuation with limit', async() => {
    const scope = NOCK(YT_HOST)
      .get(SEARCH_PATH)
      .query({ gl: 'US', hl: 'en', search_query: 'testing' })
      .replyWithFile(200, 'test/pages/firstpage_01.html');

    const resp = await YTSR('testing', { limit: 11 });
    ASSERT.equal(resp.items.length, 11);
    ASSERT.equal(resp.continuation, null);
    scope.done();
  });

  it('compare first page', async() => {
    const scope = NOCK(YT_HOST)
      .get(SEARCH_PATH)
      .query({ gl: 'US', hl: 'en', search_query: 'testing' })
      .replyWithFile(200, 'test/pages/firstpage_01.html');
    const parsed = JSON.parse(FS.readFileSync('test/pages/firstpage_01.json', 'utf8'));

    const resp = await YTSR('testing', { limit: 15 });
    resp.items = resp.items.length;
    resp.refinements = resp.refinements.length;
    ASSERT.deepEqual(parsed, resp);
    scope.done();
  });

  it('parse first page', async() => {
    const scope = NOCK(YT_HOST)
      .get(SEARCH_PATH)
      .query({ gl: 'US', hl: 'en', search_query: 'testing' })
      .replyWithFile(200, 'test/pages/firstpage_01.html');

    const resp = await YTSR('testing', { pages: 1 });
    ASSERT.equal(resp.items.length, 21);
    ASSERT.equal(resp.continuation[0], '<apikey>');
    ASSERT.equal(resp.continuation[1], '<firstContinuationToken>');
    ASSERT.equal(resp.continuation[2].client.clientVersion, '<client_version>');
    scope.done();
  });

  it('continues with second page', async() => {
    const scope1 = NOCK(YT_HOST)
      .get(SEARCH_PATH)
      .query({ gl: 'US', hl: 'en', search_query: 'testing' })
      .replyWithFile(200, 'test/pages/firstpage_01.html');

    const scope2 = NOCK(YT_HOST)
      .post(API_PATH, body => body.continuation === '<firstContinuationToken>')
      .query({ key: '<apikey>' })
      .replyWithFile(200, 'test/pages/secondpage_01.html');

    const resp = await YTSR('testing', { pages: 2 });
    ASSERT.equal(resp.items.length, 39);
    ASSERT.equal(resp.continuation[0], '<apikey>');
    ASSERT.equal(resp.continuation[1], '<secondContinuationToken>');
    ASSERT.equal(resp.continuation[2].client.clientVersion, '<client_version>');
    scope1.done();
    scope2.done();
  });

  it('continues with second page recursively', async() => {
    const scope1 = NOCK(YT_HOST)
      .get(SEARCH_PATH)
      .query({ gl: 'US', hl: 'en', search_query: 'testing' })
      .replyWithFile(200, 'test/pages/firstpage_01.html');

    const scope2 = NOCK(YT_HOST)
      .post(API_PATH, body => body.continuation === '<firstContinuationToken>')
      .query({ key: '<apikey>' })
      .replyWithFile(200, 'test/pages/secondpage_01.html');

    const scope3 = NOCK(YT_HOST)
      .post(API_PATH, body => body.continuation === '<secondContinuationToken>')
      .query({ key: '<apikey>' })
      .replyWithFile(200, 'test/pages/secondpage_01.html');

    const resp = await YTSR('testing', { pages: 3 });
    ASSERT.equal(resp.items.length, 57);
    ASSERT.equal(resp.continuation[0], '<apikey>');
    ASSERT.equal(resp.continuation[1], '<secondContinuationToken>');
    ASSERT.equal(resp.continuation[2].client.clientVersion, '<client_version>');
    scope1.done();
    scope2.done();
    scope3.done();
  });
});

describe('YTSR.continue()', () => {
  before(() => {
    NOCK.disableNetConnect();
  });

  after(() => {
    NOCK.enableNetConnect();
  });

  it('Errors if param is no array of length 4', async() => {
    await ASSERT.rejects(
      YTSR.continueReq(null),
      /invalid continuation array/,
    );
  });

  it('Errors if param is not of length 4', async() => {
    await ASSERT.rejects(
      YTSR.continueReq([1, 2, 3]),
      /invalid continuation array/,
    );
  });

  it('Errors for invalid apiKey', async() => {
    await ASSERT.rejects(
      YTSR.continueReq([1, null, null, null]),
      /invalid apiKey/,
    );
  });

  it('Errors for invalid token', async() => {
    await ASSERT.rejects(
      YTSR.continueReq(['null', 2, null, null]),
      /invalid token/,
    );
  });

  it('Errors for invalid context', async() => {
    await ASSERT.rejects(
      YTSR.continueReq(['null', 'null', 3, null]),
      /invalid context/,
    );
  });

  it('Errors for invalid opts', async() => {
    await ASSERT.rejects(
      YTSR.continueReq(['null', 'null', {}, 4]),
      /invalid opts/,
    );
  });

  it('Errors for non-paged requests', async() => {
    await ASSERT.rejects(
      YTSR.continueReq(['null', 'null', {}, { limit: 3 }]),
      /continueReq only allowed for paged requests/,
    );
  });

  it('does an api request using the provided information', async() => {
    const opts = [
      'apiKey',
      'token',
      { context: 'context' },
      { requestOptions: { headers: { test: 'test' } } },
    ];
    const body = { context: opts[2], continuation: opts[1] };
    const scope = NOCK(YT_HOST, { reqheaders: opts[3].headers })
      .post(API_PATH, JSON.stringify(body))
      .query({ key: opts[0] })
      .replyWithFile(200, 'test/pages/secondpage_01.html');

    const { items, continuation } = await YTSR.continueReq(opts);
    ASSERT.equal(items.length, 18);
    ASSERT.ok(Array.isArray(continuation));
    ASSERT.equal(continuation[1], '<secondContinuationToken>');
    scope.done();
  });

  it('does not crash with limit=Infinity', async() => {
    const opts = [
      'apiKey',
      'token',
      { context: 'context' },
      { requestOptions: { headers: { test: 'test' } }, limit: Infinity },
    ];
    const body = { context: opts[2], continuation: opts[1] };
    const scope = NOCK(YT_HOST, { reqheaders: opts[3].headers })
      .post(API_PATH, JSON.stringify(body))
      .query({ key: opts[0] })
      .replyWithFile(200, 'test/pages/secondpage_01.html');

    const { items, continuation } = await YTSR.continueReq(opts);
    ASSERT.equal(items.length, 18);
    ASSERT.ok(Array.isArray(continuation));
    ASSERT.equal(continuation[1], '<secondContinuationToken>');
    scope.done();
  });

  it('does not crash when passing continuation from ytsr()', async() => {
    const scope1 = NOCK(YT_HOST)
      .get(SEARCH_PATH)
      .query({ gl: 'US', hl: 'en', search_query: 'testing' })
      .replyWithFile(200, 'test/pages/firstpage_01.html');

    const resp = await YTSR('testing', { pages: 1 });

    const body = { context: resp.continuation[2], continuation: resp.continuation[1] };
    const scope2 = NOCK(YT_HOST, { reqheaders: resp.continuation[3].headers })
      .post(API_PATH, JSON.stringify(body))
      .query({ key: resp.continuation[0] })
      .replyWithFile(200, 'test/pages/secondpage_01.html');

    const { items, continuation } = await YTSR.continueReq(resp.continuation);
    ASSERT.equal(items.length, 18);
    ASSERT.ok(Array.isArray(continuation));
    ASSERT.equal(continuation[1], '<secondContinuationToken>');
    scope1.done();
    scope2.done();
  });

  it('handles "no more results" response', async() => {
    const opts = [
      'apiKey',
      'token',
      { context: 'context' },
      { requestOptions: { headers: { test: 'test' } } },
    ];
    const body = { context: opts[2], continuation: opts[1] };
    const scope = NOCK(YT_HOST, { reqheaders: opts[3].headers })
      .post(API_PATH, JSON.stringify(body))
      .query({ key: opts[0] })
      .replyWithFile(200, 'test/pages/secondpage_failing.html');

    const { items, continuation } = await YTSR.continueReq(opts);
    ASSERT.deepEqual(items, []);
    ASSERT.equal(continuation, null);
    scope.done();
  });
});

describe('YTSR.getFilters()', () => {
  before(() => {
    NOCK.disableNetConnect();
  });

  after(() => {
    NOCK.enableNetConnect();
  });

  it('fetches filters', async() => {
    const scope = NOCK(YT_HOST)
      .get('/results')
      .query({ hl: 'en', gl: 'US', search_query: 'test' })
      .replyWithFile(200, 'test/pages/firstpage_01.html');
    const filters = await YTSR.getFilters('test');
    // Parsing checks & go are done in utils-test.js
    ASSERT.ok(filters !== null);
    scope.done();
  });

  it('passes errors from miniget', async() => {
    const scope = NOCK(YT_HOST)
      .get('/results')
      .query({ hl: 'en', gl: 'US', search_query: 'test' })
      .reply(400, '<html> ERROR 400 </html>');

    await ASSERT.rejects(
      YTSR.getFilters('test'),
      /Error: Status code: ./,
    );

    scope.done();
  });
});
