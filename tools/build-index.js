#!/usr/bin/env node
/* js/data/ の本を index.html と sw.js に書き込む:node tools/build-index.js */
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const v = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
const data = fs.readdirSync(path.join(root, 'js/data')).filter(f => f.endsWith('.js')).sort();
const tags = data.map(f => `  <script defer src="js/data/${f}?v=${v}"></script>`).join('\n');
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
html = html.replace(/<!-- books:start -->[\s\S]*<!-- books:end -->/, `<!-- books:start -->\n${tags}\n  <!-- books:end -->`)
  .replace(/(css\/style\.css|js\/books\.js|js\/app\.js)\?v=\w+/g, `$1?v=${v}`);
fs.writeFileSync(path.join(root, 'index.html'), html);
let sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
sw = sw.replace(/const VERSION = '[^']*'/, `const VERSION = 'gk-${v}'`);
fs.writeFileSync(path.join(root, 'sw.js'), sw);
console.log(data.length + '冊を登録(v=' + v + ')');
