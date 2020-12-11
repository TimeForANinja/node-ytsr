/* global describe, it, before, after */
const ASSERT = require('assert-diff');
ASSERT.options.strict = true;
const YTSR = require('../');
const NOCK = require('nock');

const YT_HOST = 'https://www.youtube.com';
const API_PATH = '/youtubei/v1/search';

describe('YTPL.continue()', () => {
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
      .replyWithFile(200, 'test/pages/secondpage.html');

    const { items, continuation } = await YTSR.continueReq(opts);
    ASSERT.equal(items.length, 18);
    ASSERT.ok(Array.isArray(continuation));
    ASSERT.equal(continuation[1], '<secondContinuationToken>');
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
      .replyWithFile(200, 'test/pages/firstpage.html');
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
