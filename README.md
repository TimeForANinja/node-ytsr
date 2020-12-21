# node-ytsr
[![NPM version](https://img.shields.io/npm/v/ytsr.svg?maxAge=3600)](https://www.npmjs.com/package/ytsr)
[![NPM downloads](https://img.shields.io/npm/dt/ytsr.svg?maxAge=3600)](https://www.npmjs.com/package/ytsr)
[![codecov](https://codecov.io/gh/timeforaninja/node-ytsr/branch/master/graph/badge.svg)](https://codecov.io/gh/timeforaninja/node-ytsr)
[![Known Vulnerabilities](https://snyk.io/test/github/timeforaninja/node-ytsr/badge.svg)](https://snyk.io/test/github/timeforaninja/node-ytsr)
[![Discord](https://img.shields.io/discord/484464227067887645.svg)](https://discord.gg/V3vSCs7)

Simple js only module to search YouTube
Doesn't need any login or GoogleAPI key

# Support
You can contact us for support on our [chat server](https://discord.gg/V3vSCs7)

# Usage

```js
const ytsr = require('ytsr');

const searchResults = await ytsr('github');
dosth(searchResults);
```


# API
### ytsr(searchString, [options])

Searches for the given string

* `searchString`
    * search string or url (from getFilters) to search from
* `options`
    * object with options
    * possible settings:
    * gl[String] -> 2-Digit Code of a Country, defaults to `US` - Allows for localisation of the request
    * hl[String] -> 2-Digit Code for a Language, defaults to `en` - Allows for localisation of the request
    * safeSearch[Boolean] -> pull items in youtube restriction mode.
    * limit[integer] -> limits the pulled items, defaults to 100, set to Infinity to get the whole list of search results - numbers <1 result in the default being used
    * pages[Number] -> limits the pulled pages, pages contain 20-30 items, set to Infinity to get the whole list of search results - numbers <1 result in the default limit being used - overwrites limit
    * requestOptions[Object] -> Additional parameters to passed to [miniget](https://github.com/fent/node-miniget), which is used to do the https requests

* returns a Promise
* [Example response](https://github.com/timeforaninja/node-ytsr/blob/master/example/example_search_output.txt)


### ytsr.getFilters(searchString, options)

Pulls avaible filters for the given string or link

#### Usage

```js
const ytsr = require('ytsr');

const filters1 = await ytsr.getFilters('github');
const filter1 = filters1.get('Type').get('Video');
const filters2 = await ytsr.getFilters(filter1.url);
const filter2 = filters2.get('Duration').get('Short');
const options = {
  pages: 2,
}
const searchResults = await ytsr(filter2.url, options);
dosth(searchResults);
```

* `searchString`
    * string to search for
    * or previously optained filter ref
* `options`
    * gl[String] -> 2-Digit Code of a Country, defaults to `US` - Allows for localisation of the request
    * hl[String] -> 2-Digit Code for a Language, defaults to `en` - Allows for localisation of the request
    * requestOptions[Object] -> Additional parameters to passed to [miniget](https://github.com/fent/node-miniget), which is used to do the https requests
* returns a Promise resulting in a `Map<String, Map<String, Filter>>`
* [Example response](https://github.com/timeforaninja/node-ytsr/blob/master/example/example_filters_output.txt)

### ytsr.continueReq(continuationData)
Continues a previous request by pulling yet another page.  
The previous request had to be done using `pages` limitation.

#### Usage
```js
var ytsr = require('ytsr');

const search = await ytsr('github', { pages: 1 });
display(search.items);
const r2 = ytsr.continueReq(playlist.continuation);
display(r2.items);
const r3 = ytsr.continueReq(r2.continuation);
display(r3.items);
```

* returns a Promise resolving into `{ continuation, items }`

# Related / Works well with

* [node-ytdl-core](https://github.com/fent/node-ytdl-core)
* [node-ytpl](https://github.com/TimeForANinja/node-ytpl)


# Install

    npm install --save ytsr

# License
MIT
