/* global before, after */
const NOCK = require('nock');

const YT_HOST = 'https://www.youtube.com';

before(() => { NOCK.disableNetConnect(); });
after(() => { NOCK.enableNetConnect(); });

exports = module.exports = (id, opts) => {
  const scopes = [];
  if (typeof id === 'object') {
    opts = id;
    id = undefined;
  }

  if (opts.body) {
    scopes.push(
      NOCK(YT_HOST)
        .get(id)
        .reply(opts.statusCode || 200, opts.body)
    );
  }

  if (opts.error) {
    scopes.push(
      NOCK(YT_HOST)
        .get(id)
        .reply(400)
    );
  }

  return {
    ifError: err => { if (err) NOCK.cleanAll(); },
    done: () => scopes.forEach(scope => scope.done()),
  };
};
