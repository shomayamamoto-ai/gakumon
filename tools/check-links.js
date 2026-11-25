#!/usr/bin/env node
/* 出典リンクを実際に開いて確かめる:node tools/check-links.js [js/data/xxx.js ...] */
const fs = require('fs'), path = require('path'), vm = require('vm'), { execFileSync } = require('child_process');
const dir = path.join(__dirname, '..', 'js', 'data');
const files = process.argv.slice(2).length ? process.argv.slice(2) : fs.readdirSync(dir).filter(f => f.endsWith('.js')).map(f => path.join(dir, f));
let bad = 0, n = 0; const seen = {};
for (const f of files) {
  const B = []; vm.runInNewContext(fs.readFileSync(f, 'utf8'), { GK: { addBook: b => B.push(b) } });
  for (const b of B) for (const ch of b.chapters) for (const p of ch.pages) for (const s of [].concat(p.src || [], p.papers || [])) {
    if (!s.u) continue; n++;
    if (!(s.u in seen)) { let code = '000'; try { code = execFileSync('curl', ['-s', '-o', '/dev/null', '-w', '%{http_code}', '-L', '--max-time', '25', '-A', 'Mozilla/5.0 (link check)', s.u]).toString(); } catch (e) {} seen[s.u] = code; }
    if (!/^2/.test(seen[s.u])) { bad++; console.log(seen[s.u] + ' ' + p.id + ' ' + s.u); }
  }
}
console.log(bad ? '✗ ' + bad + ' / ' + n + ' 件が開けません' : '✓ ' + n + ' 件すべて開けました');
