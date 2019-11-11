/* global before, after */
const NOCK = require('nock');
const PATH = require('path');
const QS = require('querystring');

const YT_HOST = 'https://www.youtube.com';
const SEARCH_TRACE = '&spf=navigate&gl=US&hl=en';
const SEARCH_PATH = '/results?search_query=';
const ADDITIONAL_SEARCH_PATH = '/results?sp=';
const ADDITIONAL_MIDDLE = '&search_query=';

before(() => { NOCK.disableNetConnect(); });
after(() => { NOCK.enableNetConnect(); });

exports = module.exports = (id, opts) => { // eslint-disable-line complexity
  const scopes = [];
  if (typeof id === 'object') {
    opts = id;
    id = undefined;
  }

  if (opts && opts.body) {
    scopes.push(
      NOCK(YT_HOST)
        .get(id)
        .reply(opts.statusCode || 200, opts.body),
    );
  }

  if (opts && opts.error) {
    scopes.push(
      NOCK(YT_HOST)
        .get(id)
        .reply(400),
    );
  }

  if (opts && Array.isArray(opts.pages)) {
    if (opts.pages.includes(1)) {
      scopes.push(
        NOCK(YT_HOST)
          .get(SEARCH_PATH + QS.escape(id) + SEARCH_TRACE)
          .replyWithFile(opts.statusCode || 200, PATH.resolve(__dirname, 'mainFiles/Page1.html')),
      );
    }
    if (opts.pages.includes(2)) {
      scopes.push(
        NOCK(YT_HOST)
          .get(`${ADDITIONAL_SEARCH_PATH}${'SBTqAwA%253D'}${ADDITIONAL_MIDDLE}github${SEARCH_TRACE}`)
          .replyWithFile(opts.statusCode || 200, PATH.resolve(__dirname, 'mainFiles/Page2.html')),
      );
    }
    if (opts.pages.includes(3)) {
      scopes.push(
        NOCK(YT_HOST)
          .get(`${ADDITIONAL_SEARCH_PATH}${'SCjqAwA%253D'}${ADDITIONAL_MIDDLE}github${SEARCH_TRACE}`)
          .replyWithFile(opts.statusCode || 200, PATH.resolve(__dirname, 'mainFiles/Page3.html')),
      );
    }
    if (opts.pages.includes(4)) {
      scopes.push(
        NOCK(YT_HOST)
          .get(`${ADDITIONAL_SEARCH_PATH}${'SDzqAwA%253D'}${ADDITIONAL_MIDDLE}github${SEARCH_TRACE}`)
          .replyWithFile(opts.statusCode || 200, PATH.resolve(__dirname, 'mainFiles/Page4.html')),
      );
    }
    if (opts.pages.includes(5)) {
      scopes.push(
        NOCK(YT_HOST)
          .get(`${ADDITIONAL_SEARCH_PATH}${'SFDqAwA%253D'}${ADDITIONAL_MIDDLE}github${SEARCH_TRACE}`)
          .replyWithFile(opts.statusCode || 200, PATH.resolve(__dirname, 'mainFiles/Page5.html')),
      );
    }
    if (opts.pages.includes(6)) {
      scopes.push(
        NOCK(YT_HOST)
          .get(`${ADDITIONAL_SEARCH_PATH}${'SGTqAwA%253D'}${ADDITIONAL_MIDDLE}github${SEARCH_TRACE}`)
          .replyWithFile(opts.statusCode || 200, PATH.resolve(__dirname, 'mainFiles/Page6.html')),
      );
    }
    if (opts.pages.includes(7)) {
      scopes.push(
        NOCK(YT_HOST)
          .get(`${ADDITIONAL_SEARCH_PATH}${'SHjqAwA%253D'}${ADDITIONAL_MIDDLE}github${SEARCH_TRACE}`)
          .replyWithFile(opts.statusCode || 200, PATH.resolve(__dirname, 'mainFiles/Page7.html')),
      );
    }
  }

  return {
    ifError: err => { if (err) NOCK.cleanAll(); },
    done: () => scopes.forEach(scope => scope.done()),
  };
};
