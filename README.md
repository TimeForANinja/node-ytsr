# node-ytsr

Simple js only module to search YouTube
Doesn't need any login or GoogleAPI key

# Usage

```js

var ytsr = require('ytsr');

ytsr.get_filters('github', function(err, filters) {
	var filter = filters['type'].find((o) => {return o.name == 'Video'})
	var options = {
		limit: 5,
		nextpage_ref: filter.ref,
	}
	ytsr.search(null, options, function(err, search_results) {
		if(err) throw err;
		dosth(search_results);
	});
})

```


# API
### ytsr.search(search_string, [options,] callback)

Searches for the given string

* `search_string`
    * string to search for
* `options`
    * object with options
    * possible settings:
    * limit[integer] -> limits the pulled items
	* nextpage_ref[String] -> if u wanna continue a previous search
* `callback(err, result)`
    * function
    * getting fired after the request is done
    * contains an error or a result
* [Example response](https://github.com/timeforaninja/node-ytsr/blob/master/example/example_search_output)

### ytsr.get_filters(search_string, callback)

Pulls avaible filters for the given string

* `search_string`
    * string to search for
* `callback(err, result)`
    * function
    * getting fired after the request is done
    * contains an error or a result
* [Example response](https://github.com/timeforaninja/node-ytsr/blob/master/example/example_filters_output)


# Related / Works well with

* [node-ytdl-core](https://github.com/fent/node-ytdl-core)
* [node-ytpl](https://github.com/TimeForANinja/node-ytpl)


# Install

    npm install --save ytsr



# License
MIT
