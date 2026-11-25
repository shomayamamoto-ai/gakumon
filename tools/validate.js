#!/usr/bin/env node
/* 本のデータの検査:node tools/validate.js [js/data/xxx.js ...](省略すると全部) */
const fs = require('fs'), path = require('path'), vm = require('vm');
const dir = path.join(__dirname, '..', 'js', 'data');
const files = process.argv.slice(2).length ? process.argv.slice(2) : fs.readdirSync(dir).filter(f => f.endsWith('.js')).map(f => path.join(dir, f));
const FIELDS = ['humanities', 'social', 'science', 'engineering', 'life', 'design'];
const MOTIFS = ['scale', 'book', 'graph', 'atom', 'flask', 'leaf', 'gear', 'heart', 'globe', 'brain', 'code', 'pen', 'building', 'sigma', 'people', 'coin'];
let errs = 0, books = [], pageIds = new Set(), bookIds = new Set();
const err = (f, m) => { errs++; console.log('✗ ' + path.basename(f) + ': ' + m); };
const str = v => typeof v === 'string' && v.trim().length > 0;
const arr = (v, min) => Array.isArray(v) && v.length >= (min || 1);
for (const f of files) {
  const got = [];
  const ctx = { GK: { addBook: b => got.push(b) }, window: {} };
  try { vm.runInNewContext(fs.readFileSync(f, 'utf8'), ctx, { filename: f }); } catch (e) { err(f, '読み込みエラー ' + e.message); continue; }
  if (got.length !== 1) { err(f, 'GK.addBook はファイルに1回だけ'); continue; }
  const b = got[0];
  ['id', 'name', 'short', 'about', 'color'].forEach(k => str(b[k]) || err(f, '本の ' + k + ' がない'));
  if (bookIds.has(b.id)) err(f, '本のidが重複: ' + b.id); bookIds.add(b.id);
  if (!FIELDS.includes(b.field)) err(f, 'field が不正: ' + b.field);
  if (!MOTIFS.includes(b.motif)) err(f, 'motif が不正: ' + b.motif);
  if (!/^#[0-9a-f]{6}$/i.test(b.color || '')) err(f, 'color は #rrggbb');
  ['faculty', 'fit', 'careers', 'chapters'].forEach(k => arr(b[k]) || err(f, k + ' がない'));
  let np = 0, nq = 0;
  (b.chapters || []).forEach((ch, ci) => {
    str(ch.name) || err(f, '章' + (ci + 1) + ' の name がない');
    arr(ch.pages) || err(f, '章' + (ci + 1) + ' にページがない');
    (ch.pages || []).forEach(p => {
      np++; const w = 'ページ ' + (p.id || '?') + ' ';
      if (!str(p.id) || p.id.indexOf(b.id + '-') !== 0) err(f, w + 'id は「本のid-」で始める');
      if (pageIds.has(p.id)) err(f, w + 'idが重複'); pageIds.add(p.id);
      ['title', 'point'].forEach(k => str(p[k]) || err(f, w + k + ' がない'));
      arr(p.goal) || err(f, w + 'goal がない');
      arr(p.secs, 2) || err(f, w + 'secs は2節以上');
      (p.secs || []).forEach((s, i) => {
        str(s.t) || err(f, w + '節' + (i + 1) + ' の t がない');
        if (!s.p && !s.list && !s.table) err(f, w + '節' + (i + 1) + ' に本文がない');
        if (s.table && (!arr(s.table, 2) || s.table.some(r => !Array.isArray(r) || r.length !== s.table[0].length))) err(f, w + '節' + (i + 1) + ' の表の列数がそろっていない');
      });
      arr(p.terms, 3) || err(f, w + 'terms は3つ以上');
      (p.terms || []).forEach(t => (Array.isArray(t) && t.length === 2 && str(t[0]) && str(t[1])) || err(f, w + 'terms の形が不正'));
      arr(p.ex) || err(f, w + 'ex がない');
      (p.ex || []).forEach(e => (str(e.q) && arr(e.steps) && str(e.a)) || err(f, w + 'ex の形が不正'));
      arr(p.check) || err(f, w + 'check がない');
      (p.check || []).forEach(e => (str(e.q) && str(e.a)) || err(f, w + 'check の形が不正'));
      arr(p.quiz, 4) || err(f, w + 'quiz は4問以上');
      (p.quiz || []).forEach((q, i) => {
        nq++;
        if (!str(q.q) || !arr(q.c, 2) || !str(q.e)) err(f, w + 'quiz' + (i + 1) + ' の形が不正');
        if (!(Number.isInteger(q.a) && q.a >= 0 && q.a < (q.c || []).length)) err(f, w + 'quiz' + (i + 1) + ' の a が範囲外');
        if (new Set(q.c || []).size !== (q.c || []).length) err(f, w + 'quiz' + (i + 1) + ' の選択肢が重複');
      });
      (p.papers || []).forEach(x => (str(x.t) && str(x.p) && /^https:\/\//.test(x.u || '')) || err(f, w + 'papers の形が不正(t・p・u が必要)'));
      (p.src || []).forEach(s => (str(s.t) && /^https:\/\//.test(s.u || '')) || err(f, w + 'src の形が不正'));
      const all = JSON.stringify(p);
      if (/<[a-z]/i.test(all)) err(f, w + 'HTMLタグは使わない(**太字**のみ)');
    });
  });
  books.push(b.short + '(' + np + 'ページ・' + nq + '問)');
}
console.log(books.join(' / '));
console.log(errs ? '\n✗ ' + errs + '件の問題' : '\n✓ 問題なし(' + books.length + '冊)');
process.exit(errs ? 1 : 0);
