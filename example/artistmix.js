const YTSR = require('../');

const main = async() => {
  return await YTSR('enrique iglesias')
};

main().then(results => {
  console.log(results.artistDetails)
}).catch(err => {
  console.log(err)
});
