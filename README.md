<div align="center">
  <p>
    <a href="https://www.npmjs.com/package/ytsr"><img src="https://img.shields.io/npm/v/ytsr.svg?maxAge=3600" alt="NPM version" /></a>
    <a href="https://www.npmjs.com/package/ytsr"><img src="https://img.shields.io/npm/dt/ytsr.svg?maxAge=3600" alt="NPM downloads" /></a>
    <a href="https://david-dm.org/"><img src="https://img.shields.io/david/timeforaninja/node-ytsr.svg?maxAge=3600" alt="Dependencies" /></a>
    <a href="https://greenkeeper.io/"><img src="https://badges.greenkeeper.io/TimeForANinja/node-ytsr.svg" alt="Dependencies" /></a>
    <a hreF="https://discord.gg/V3vSCs7"><img src="https://img.shields.io/discord/484464227067887645.svg" alt="Discord" /></a>
  </p>
  <p>
    <a href="https://nodei.co/npm/ytsr/"><img src="https://nodei.co/npm/ytsr.png?downloads=true&stars=true" alt="NPM info" /></a>
  </p>
</div>

# node-ytsr

Simple js only module to search YouTube
Doesn't need any login or GoogleAPI key

# Usage

```js
const ytsr = require('ytsr');
let filter;

ytsr.getFilters('github', function(err, filters) {
  if(err) throw err;
  filter = filters.get('Type').find(o => o.name === 'Video');
  ytsr.getFilters(filter.ref, function(err, filters) {
    if(err) throw err;
    filter = filters.get('Duration').find(o => o.name.startsWith('Short'));
    var options = {
      limit: 5,
      nextpageRef: filter.ref,
    }
    ytsr(null, options, function(err, searchResults) {
      if(err) throw err;
      dosth(searchResults);
    });
  });
});
```


# API
### ytsr(searchString, [options, callback])

Searches for the given string

* `searchString`
    * string to search for
* `options`
    * object with options
    * possible settings:
    * safeSearch[Boolean] -> pull items in youtube restriction mode. 
    * limit[integer] -> limits the pulled items
	* nextpageRef[String] -> if u wanna continue a previous search or use filters
* `callback(err, result)`
    * function
    * getting fired after the request is done
    * contains an error or a result

* returns a Promise when no callback is defined
* [Example response](https://github.com/timeforaninja/node-ytsr/blob/master/example/example_search_output)

### ytsr.getFilters(searchString, [callback])

Pulls avaible filters for the given string/ref

* `searchString`
    * string to search for
    * or previously optained filter ref
* `callback(err, result)`
    * function
    * getting fired after the request is done
    * contains an error or a result

* returns a Promise when no callback is defined
* [Example response](https://github.com/timeforaninja/node-ytsr/blob/master/example/example_filters_output)


# Related / Works well with

* [node-ytdl-core](https://github.com/fent/node-ytdl-core)
* [node-ytpl](https://github.com/TimeForANinja/node-ytpl)


# Install

    npm install --save ytsr



# License
MIT
