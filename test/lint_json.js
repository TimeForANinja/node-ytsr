/* eslint-disable no-console */
const FS = require('fs');
const PATH = require('path');

const DIRS = [
  'test/pages',
  'test/typeFiles',
].map(x => PATH.resolve(__dirname, '../', x));

for (const dir of DIRS) {
  const files = FS.readdirSync(dir)
    .map(x => PATH.resolve(dir, x))
    .filter(x => PATH.extname(x) === '.json');
  console.log(`${files.length} files in ${dir}`);
  for (const file of files) {
    const data = FS.readFileSync(file, 'utf8');
    const reformated = JSON.stringify(JSON.parse(data), null, 2);
    FS.writeFileSync(file, reformated);
  }
}
