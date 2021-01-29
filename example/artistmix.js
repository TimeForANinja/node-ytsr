const YTSR = require('../');

const main = async() => {
  return await YTSR('enrique iglesias')
};

main().then(results => {
  console.log(results)
}).catch(err => {
  console.log(err)
});
