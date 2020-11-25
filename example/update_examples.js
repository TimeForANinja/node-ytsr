const YTSR = require('../');
const FS = require('fs');
const UTIL = require('util');

const main = async() => {
  let saveString;

  // Save filters
  const filters = await YTSR.getFilters('NoCopyrightSounds');
  saveString = UTIL.inspect(filters, { depth: Infinity });
  FS.writeFileSync('./example_filters_output.txt', saveString);

  // Save search query
  const search = await YTSR('NoCopyrightSounds', { limit: 15 });
  saveString = UTIL.inspect(search, { depth: Infinity });
  FS.writeFileSync('./example_search_output.txt', saveString);
};
main();
