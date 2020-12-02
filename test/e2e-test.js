/* global describe, it, before, after */
const YTSR = require('../');
const ASSERT = require('assert-diff');
ASSERT.options.strict = true;
const NOCK = require('nock');

describe('e2e', function e2e() {
  this.timeout(0);

  before(() => {
    NOCK.enableNetConnect();
  });

  after(() => {
    NOCK.disableNetConnect();
  });

  it('search for NoCopyrightSounds Uploads', async() => {
    const search = await YTSR('NoCopyrightSounds', { limit: 25 });
    ASSERT.equal(search.query, 'NoCopyrightSounds');
    // Check that we found the channel
    ASSERT.ok(search.items.some(a => a.type === 'channel'));
    // Check if limit worked
    ASSERT.equal(search.items.length, 25);
  });

  it('search using filters', async() => {
    const filters = await YTSR.getFilters('NoCopyrightSounds');
    const filter = filters.get('Type').find(a => a.label === 'Video');
    const search = await YTSR(filter.query);
    // Check that the filter worked
    ASSERT.ok(search.items.some(a => a.type !== 'Video'));
    // Check if the default limit worked
    ASSERT.equal(search.items.length, 100);
  });
});
