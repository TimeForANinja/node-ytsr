# node-ytsr
[![NPM version](https://img.shields.io/npm/v/ytsr.svg?maxAge=3600)](https://www.npmjs.com/package/ytsr)
[![NPM downloads](https://img.shields.io/npm/dt/ytsr.svg?maxAge=3600)](https://www.npmjs.com/package/ytsr)
[![codecov](https://codecov.io/gh/timeforaninja/node-ytsr/branch/master/graph/badge.svg)](https://codecov.io/gh/timeforaninja/node-ytsr)
[![Known Vulnerabilities](https://snyk.io/test/github/timeforaninja/node-ytsr/badge.svg)](https://snyk.io/test/github/timeforaninja/node-ytsr)
[![Discord](https://img.shields.io/discord/484464227067887645.svg)](https://discord.gg/V3vSCs7)

[![NPM info](https://nodei.co/npm/ytsr.png?downloads=true&stars=true)](https://nodei.co/npm/ytsr/)

Simple js only module to search YouTube
Doesn't need any login or GoogleAPI key

# Support
You can contact us for support on our [chat server](https://discord.gg/V3vSCs7)

# Usage

```js
const ytsr = require('ytsr');

ytsr.getFilters('github').then(async (filters1) => {
  const filter1 = filters1.get('Type').find(o => o.name === 'Video');
  const filters2 = await ytsr.getFilters(filter1.ref);
  const filter2 = filters2.get('Duration').find(o => o.name.startsWith('Short'));
  const options = {
    limit: 5,
    nextpageRef: filter2.ref,
  }
  const searchResults = await ytsr(null, options);
  dosth(searchResults);
}).catch(err => {
  console.error(err);
});
```


# API
### ytsr(searchString, [options])

Searches for the given string

* `searchString`
    * string to search for
* `options`
    * object with options
    * possible settings:
    * safeSearch[Boolean] -> pull items in youtube restriction mode.
    * limit[integer] -> limits the pulled items, defaults to 100, set to Infinity to get the whole playlist - numbers <1 result in the default being used
    * nextpageRef[String] -> if u wanna continue a previous search or use filters
    * All additional parameters will get passed to [miniget](https://github.com/fent/node-miniget), which is used to do the https requests
* returns a Promise
* [Example response](https://github.com/timeforaninja/node-ytsr/blob/master/example/example_search_output)


### ytsr.getFilters(searchString, options)

Pulls avaible filters for the given string/ref

* `searchString`
    * string to search for
    * or previously optained filter ref
* `options`
    * request options passed to miniget
* returns a Promise
* [Example response](https://github.com/timeforaninja/node-ytsr/blob/master/example/example_filters_output)


# Related / Works well with

* [node-ytdl-core](https://github.com/fent/node-ytdl-core)
* [node-ytpl](https://github.com/TimeForANinja/node-ytpl)


# Install

    npm install --save ytsr


# License
MIT
