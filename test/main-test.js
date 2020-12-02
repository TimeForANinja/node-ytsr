/* global describe, it, before, after */
const ASSERT = require('assert-diff');
ASSERT.options.strict = true;
const YTSR = require('../');
const NOCK = require('nock');

const YT_HOST = 'https://www.youtube.com';

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
