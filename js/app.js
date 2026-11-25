/*
 * 学問の教科書(アプリ本体)
 *   #home            本棚(分野でしぼりこみ・検索・続きから読む)
 *   #b/<本id>        本(表紙・この学問とは・目次)
 *   #p/<ページid>    単元のページ(学習目標・要点・本文・用語・板書の例題・説明チェック・練習問題)
 *   #test/<本id>     確認テスト(その本の練習問題から10問)
 *   #review          復習(まちがえた問題だけを解き直す)
 *   #search          検索
 *   #settings        設定(文字の大きさ・テーマ・データ)
 *   #about           このテキストについて
 * 学習の記録は、この端末のブラウザ(localStorage)にだけ保存します。
 */
(function () {
  'use strict';
  var BOOKS = GK.books;
  var FIELDS = [
    ['humanities', '人文'], ['social', '社会'], ['science', '理学'],
    ['engineering', '工学・情報'], ['life', '医療・生命・農'], ['design', '建築・芸術']
  ];
  var FIELD_NAME = {}; FIELDS.forEach(function (f) { FIELD_NAME[f[0]] = f[1]; });
  var FIELD_ORDER = FIELDS.map(function (f) { return f[0]; });
  BOOKS.sort(function (a, b) { return FIELD_ORDER.indexOf(a.field) - FIELD_ORDER.indexOf(b.field); });

  // ページの索引(id → {book, chapter, page, no})
  var PAGES = {}, ORDER = [];
  BOOKS.forEach(function (b) {
    b.pageIds = [];
    b.chapters.forEach(function (ch, ci) {
      ch.pages.forEach(function (p, pi) {
        PAGES[p.id] = { b: b, ch: ch, ci: ci, p: p, no: (ci + 1) + '-' + (pi + 1) };
        b.pageIds.push(p.id); ORDER.push(p.id);
      });
    });
  });
  function bookOf(id) { return BOOKS.filter(function (b) { return b.id === id; })[0]; }

  // ---------- 保存 ----------
  var KEY = 'gk_state_v1';
  var S = load();
  function load() {
    var d = {};
    try { d = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { d = {}; }
    d.read = d.read || {}; d.quiz = d.quiz || {}; d.bm = d.bm || {}; d.pos = d.pos || {};
    d.fs = d.fs || 'm'; d.theme = d.theme || 'auto';
    return d;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* 保存できない環境でも動かす */ } }
  function applyTheme() {
    if (S.theme === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', S.theme);
  }
  applyTheme();

  // ---------- 小さな道具 ----------
  var view = document.getElementById('view');
  function h(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function rt(s) { return h(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>'); }
  function plain(s) { return String(s || '').replace(/\*\*/g, ''); }
  function toast(msg) {
    var t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toast.tm); toast.tm = setTimeout(function () { t.classList.remove('show'); }, 2200);
  }
  function qkey(pid, i) { return pid + ':' + i; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function pct(a, b) { return b ? Math.round(a / b * 100) : 0; }
  function bookStat(b) {
    var read = b.pageIds.filter(function (id) { return S.read[id]; }).length, qa = 0, qo = 0, qn = 0;
    b.pageIds.forEach(function (id) { PAGES[id].p.quiz.forEach(function (q, i) { qn++; var r = S.quiz[qkey(id, i)]; if (r) { qa++; if (r.ok) qo++; } }); });
    return { read: read, total: b.pageIds.length, qa: qa, qo: qo, qn: qn };
  }

  // 表紙の図柄(線画)
  var MOTIF = {
    scale: '<path d="M40 12v52M22 64h36M16 22h48"/><path d="M16 22l-9 20h18zM64 22l-9 20h18z"/><path d="M7 42a9 6 0 0 0 18 0M55 42a9 6 0 0 0 18 0"/>',
    book: '<path d="M10 16c10-4 20-4 30 2 10-6 20-6 30-2v44c-10-4-20-4-30 2-10-6-20-6-30-2z"/><path d="M40 18v44"/>',
    graph: '<path d="M10 64h60M10 64V12"/><path d="M16 22c12 0 22 30 50 34"/><path d="M16 56c14-2 30-26 48-38"/>',
    atom: '<circle cx="40" cy="38" r="4"/><ellipse cx="40" cy="38" rx="30" ry="11"/><ellipse cx="40" cy="38" rx="30" ry="11" transform="rotate(60 40 38)"/><ellipse cx="40" cy="38" rx="30" ry="11" transform="rotate(120 40 38)"/>',
    flask: '<path d="M32 10h16M34 10v18L16 62a4 4 0 0 0 4 6h40a4 4 0 0 0 4-6L46 28V10"/><path d="M24 50h32"/><circle cx="36" cy="58" r="2"/><circle cx="46" cy="55" r="1.5"/>',
    leaf: '<path d="M14 66C14 34 34 14 68 12c0 34-20 54-54 54z"/><path d="M14 66L50 30M30 50h14M38 42V30"/>',
    gear: '<circle cx="40" cy="38" r="10"/><path d="M40 10v8M40 58v8M12 38h8M60 38h8M20 18l6 6M54 52l6 6M20 58l6-6M54 24l6-6"/><circle cx="40" cy="38" r="20"/>',
    heart: '<path d="M40 64S12 46 12 28a14 14 0 0 1 28-6 14 14 0 0 1 28 6c0 18-28 36-28 36z"/><path d="M18 38h12l4-8 6 16 4-8h18"/>',
    globe: '<circle cx="40" cy="38" r="26"/><path d="M14 38h52M40 12c-10 8-10 44 0 52M40 12c10 8 10 44 0 52M18 24h44M18 52h44"/>',
    brain: '<path d="M38 14c-8-4-18 2-18 10-8 2-10 14-4 20-4 8 2 18 12 18 4 4 10 2 10-2zM42 14c8-4 18 2 18 10 8 2 10 14 4 20 4 8-2 18-12 18-4 4-10 2-10-2z"/><path d="M38 14v48M42 14v48M26 32h10M44 40h10"/>',
    code: '<rect x="8" y="14" width="64" height="48" rx="6"/><path d="M8 24h64M28 36l-8 8 8 8M52 36l8 8-8 8M44 34l-8 20"/>',
    pen: '<path d="M54 10l16 16-36 36H18V46z"/><path d="M46 18l16 16M18 62l12-2-10-10z"/><path d="M10 70h40"/>',
    building: '<path d="M10 66h60M16 66V30l24-16 24 16v36"/><path d="M26 66V44h12v22M46 40h10v8H46zM26 32h28"/>',
    sigma: '<path d="M58 14H18l20 24-20 24h40"/><path d="M58 14v6M58 62v-6"/>',
    people: '<circle cx="28" cy="24" r="8"/><circle cx="54" cy="28" r="7"/><path d="M12 62c0-12 7-20 16-20s16 8 16 20M42 62c0-10 5-17 12-17s12 7 12 17"/>',
    coin: '<ellipse cx="40" cy="22" rx="22" ry="8"/><path d="M18 22v12c0 4 10 8 22 8s22-4 22-8V22M18 34v12c0 4 10 8 22 8s22-4 22-8V34M18 46v12c0 4 10 8 22 8s22-4 22-8V46"/>'
  };
  function cover(b, big) {
    return '<div class="cover' + (big ? ' big' : '') + '" style="--c:' + h(b.color) + '"><p class="c-top">Gakumon</p>' +
      '<svg viewBox="0 0 80 76" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (MOTIF[b.motif] || MOTIF.book) + '</svg>' +
      '<b>' + h(b.name) + '</b><small>' + h(FIELD_NAME[b.field] || '') + '</small></div>';
  }
  function progBar(a, b) { return '<div class="prog" aria-hidden="true"><i style="width:' + pct(a, b) + '%"></i></div>'; }

  // ---------- ホーム(本棚) ----------
  var home = { field: '', q: '' };
  function renderHome() {
    var allRead = Object.keys(S.read).filter(function (id) { return PAGES[id]; }).length;
    var qs = Object.keys(S.quiz).filter(function (k) { return PAGES[k.split(':')[0]]; });
    var ok = qs.filter(function (k) { return S.quiz[k].ok; }).length;
    var html = '<section class="band"><p class="script">Gakumon</p><h1>大学の学問を、<br>教科書で先どり。</h1>' +
      '<p>法学・経済学から物理学・医学まで、大学で学ぶ' + BOOKS.length + 'の学問を、高校生にもわかる言葉でまとめた入門テキストです。読んで、例題で考えて、練習問題で確かめましょう。</p>' +
      '<div class="stats"><div class="stat"><b>' + BOOKS.length + '</b><small>冊の教科書</small></div><div class="stat"><b>' + allRead + '<small> / ' + ORDER.length + '</small></b><small>読んだページ</small></div><div class="stat"><b>' + (qs.length ? pct(ok, qs.length) + '%' : '—') + '</b><small>練習問題の正答率</small></div></div></section>';
    var last = S.last && PAGES[S.last];
    if (last) html += '<a class="card resume" href="#p/' + last.p.id + '"><div><span>続きから読む</span><b>' + h(last.b.short) + '・' + h(last.p.title) + '</b></div><i aria-hidden="true">›</i></a>';
    html += '<div class="bar"><div class="chips" role="group" aria-label="分野でしぼりこむ">' + [['', 'すべて']].concat(FIELDS).filter(function (f) { return !f[0] || BOOKS.some(function (b) { return b.field === f[0]; }); }).map(function (f) {
      var n = f[0] ? BOOKS.filter(function (b) { return b.field === f[0]; }).length : BOOKS.length;
      return '<button type="button" class="chip' + (home.field === f[0] ? ' on' : '') + '" aria-pressed="' + (home.field === f[0]) + '" data-field="' + f[0] + '">' + h(f[1]) + '<small>' + n + '</small></button>';
    }).join('') + '</div>' +
      '<label class="search"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg><span class="sr">学問をさがす</span><input id="hq" type="search" placeholder="学問・学部でさがす(例:心理、医学部)" value="' + h(home.q) + '"></label></div>';
    html += '<section class="card"><div class="shelf" id="shelf"></div></section>';
    html += '<p class="note">※ 大学・学部によって、学ぶ内容や順番は異なります。この本は「入門の一例」です。くわしくは<a href="#about">このテキストについて</a>をごらんください。</p>';
    view.innerHTML = html;
    drawShelf();
    view.querySelectorAll('[data-field]').forEach(function (btn) {
      btn.addEventListener('click', function () { home.field = btn.getAttribute('data-field'); renderHome(); });
    });
    var q = document.getElementById('hq');
    q.addEventListener('input', function () { home.q = q.value; drawShelf(); });
  }
  function drawShelf() {
    var q = home.q.trim().toLowerCase();
    var list = BOOKS.filter(function (b) {
      if (home.field && b.field !== home.field) return false;
      if (!q) return true;
      return (b.name + b.short + b.faculty.join('') + b.about + FIELD_NAME[b.field]).toLowerCase().indexOf(q) >= 0;
    });
    var el = document.getElementById('shelf');
    el.innerHTML = list.length ? list.map(function (b) {
      var s = bookStat(b);
      return '<a class="shelf-item" href="#b/' + b.id + '" aria-label="' + h(b.name) + '(' + s.total + 'ページ中 ' + s.read + 'ページ読了)">' + cover(b) +
        progBar(s.read, s.total) + '<span class="shelf-meta"><span>' + s.read + ' / ' + s.total + 'ページ</span><span>' + (s.qa ? '正答 ' + pct(s.qo, s.qa) + '%' : '') + '</span></span></a>';
    }).join('') : '<p class="empty">見つかりませんでした。別のことばで検索してみてください。</p>';
  }

  // ---------- 本(表紙・目次) ----------
  function renderBook(b) {
    var s = bookStat(b), n = 0;
    var firstUnread = b.pageIds.filter(function (id) { return !S.read[id]; })[0] || b.pageIds[0];
    var html = '<div class="reader-tb"><a href="#home">‹ 本棚</a><b>' + h(b.name) + '</b><span class="rt-r"></span></div>' +
      '<section class="card front">' + cover(b, true) + '<div><p class="crumb">' + h(FIELD_NAME[b.field]) + '</p><h1>' + h(b.name) + '</h1><p class="lead">' + rt(b.about) + '</p>' +
      progBar(s.read, s.total) + '<p class="small muted">' + b.chapters.length + '章・' + s.total + 'ページ・練習問題' + s.qn + '問 / 読んだページ ' + s.read + '・解いた問題 ' + s.qa + (s.qa ? '(正答率 ' + pct(s.qo, s.qa) + '%)' : '') + '</p>' +
      '<div class="btns"><a class="btn" href="#p/' + firstUnread + '">' + (s.read ? '続きを読む' : '1ページ目から読む') + '</a><a class="btn ghost" href="#test/' + b.id + '">確認テスト(10問)</a></div></div></section>' +
      '<section class="card two"><div><h3>向いている人</h3><ul>' + b.fit.map(function (x) { return '<li>' + rt(x) + '</li>'; }).join('') + '</ul></div>' +
      '<div><h3>学べる主な学部(目安)</h3><ul class="tags">' + b.faculty.map(function (x) { return '<li>' + h(x) + '</li>'; }).join('') + '</ul>' +
      '<h3 style="margin-top:12px">生かせる進路の例</h3><ul class="tags">' + b.careers.map(function (x) { return '<li>' + h(x) + '</li>'; }).join('') + '</ul></div></section>' +
      '<section class="card"><h2>目次</h2>' + b.chapters.map(function (ch, ci) {
        return '<div class="toc-ch"><h3>第' + (ci + 1) + '章 ' + h(ch.name) + '</h3><ol>' + ch.pages.map(function (p, pi) {
          n++;
          var qd = p.quiz.filter(function (q, i) { return S.quiz[qkey(p.id, i)]; }).length;
          var qo = p.quiz.filter(function (q, i) { var r = S.quiz[qkey(p.id, i)]; return r && r.ok; }).length;
          return '<li><a href="#p/' + p.id + '"><span class="toc-no">' + (ci + 1) + '-' + (pi + 1) + '</span><span class="toc-t">' + h(p.title) + '</span><span class="toc-badges">' +
            (S.bm[p.id] ? '<em class="badge bm">しおり</em>' : '') + (qd ? '<em class="badge' + (qo === p.quiz.length ? ' ok' : '') + '">' + qo + '/' + p.quiz.length + '問</em>' : '') + (S.read[p.id] ? '<em class="badge ok">✓ 読了</em>' : '') + '</span></a></li>';
        }).join('') + '</ol></div>';
      }).join('') + '</section>';
    view.innerHTML = html;
  }

  // ---------- 単元のページ ----------
  function quizHtml(pid, q, i, label) {
    var r = S.quiz[qkey(pid, i)];
    return '<div class="quiz" data-pid="' + pid + '" data-qi="' + i + '"><p class="qn">' + h(label) + (r ? (r.ok ? '・前回 正解' : '・前回 不正解') : '') + '</p><p class="qt">' + rt(q.q) + '</p><div class="choices">' +
      q.c.map(function (c, ci) { return '<button type="button" class="choice" data-ci="' + ci + '"><i>' + 'ABCDEFG'.charAt(ci) + '</i><span>' + rt(c) + '</span></button>'; }).join('') + '</div><div class="fb-slot"></div></div>';
  }
  function bindQuiz(root, onAnswer) {
    root.querySelectorAll('.quiz').forEach(function (box) {
      box.querySelectorAll('.choice').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var pid = box.getAttribute('data-pid'), i = +box.getAttribute('data-qi'), ci = +btn.getAttribute('data-ci');
          var q = PAGES[pid].p.quiz[i], ok = ci === q.a;
          box.querySelectorAll('.choice').forEach(function (b2, k) { b2.disabled = true; if (k === q.a) b2.classList.add('ok'); else if (k === ci) b2.classList.add('ng'); });
          box.querySelector('.fb-slot').innerHTML = '<div class="fb' + (ok ? '' : ' ng') + '" role="status"><b>' + (ok ? '正解!' : '不正解… 正解は ' + 'ABCDEFG'.charAt(q.a)) + '</b>' + rt(q.e) + '</div>';
          var k = qkey(pid, i), prev = S.quiz[k] || { n: 0, miss: 0 };
          S.quiz[k] = { ok: ok, n: prev.n + 1, miss: prev.miss + (ok ? 0 : 1), t: Date.now() };
          save();
          if (onAnswer) onAnswer(ok);
        });
      });
    });
  }
  function renderPage(id) {
    var P = PAGES[id], p = P.p, b = P.b, k = b.pageIds.indexOf(id);
    var prev = b.pageIds[k - 1], next = b.pageIds[k + 1], n = 0;
    S.last = id; save();
    function sec(t) { n++; return '<section class="sec" id="s' + n + '"><h2><span>' + n + '</span>' + h(t) + '</h2>'; }
    var html = '<div class="page fs-' + S.fs + '"><div class="reader-tb"><a href="#b/' + b.id + '">‹ 目次</a><b>' + h(b.short) + ' ' + P.no + '</b>' +
      '<span class="rt-r"><button type="button" id="fsBtn" aria-label="文字の大きさを変える">文字 ' + { s: '小', m: '中', l: '大', xl: '特大' }[S.fs] + '</button><button type="button" id="bmBtn" aria-pressed="' + !!S.bm[id] + '" aria-label="しおり">' + (S.bm[id] ? '★' : '☆') + ' しおり</button></span>' +
      '<span class="read-prog" aria-hidden="true"><i id="rp"></i></span></div>';
    html += '<article class="card"><p class="crumb">第' + (P.ci + 1) + '章 ' + h(P.ch.name) + '</p><h1>' + h(p.title) + '</h1><p class="sub">' + h(b.name) + '・' + P.no + (S.read[id] ? '・✓ 読了' : '') + '</p>';
    html += '<div class="goal"><b>このページの学習目標</b><ul>' + p.goal.map(function (g) { return '<li>' + rt(g) + '</li>'; }).join('') + '</ul></div>';
    html += '<p class="point">' + rt(p.point) + '</p>';
    p.secs.forEach(function (s) {
      html += sec(s.t);
      (s.p || []).forEach(function (x) { html += '<p>' + rt(x) + '</p>'; });
      if (s.list) html += '<ul>' + s.list.map(function (x) { return '<li>' + rt(x) + '</li>'; }).join('') + '</ul>';
      if (s.table) html += '<div class="tbl-wrap"><table><thead><tr>' + s.table[0].map(function (c) { return '<th scope="col">' + rt(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
        s.table.slice(1).map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + rt(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
      html += '</section>';
    });
    html += sec('重要用語') + '<dl class="terms">' + p.terms.map(function (t) { return '<div><dt>' + rt(t[0]) + '</dt><dd>' + rt(t[1]) + '</dd></div>'; }).join('') + '</dl></section>';
    html += sec('板書で考える(例題)') + p.ex.map(function (e, i) {
      return '<div class="board"><div class="board-h"><b>例題' + (p.ex.length > 1 ? i + 1 : '') + '</b><em>考えてみよう</em></div><div class="board-b"><p class="q">' + rt(e.q) + '</p>' +
        '<details><summary>考え方と答えを見る</summary><ol>' + e.steps.map(function (s2) { return '<li>' + rt(s2) + '</li>'; }).join('') + '</ol><p class="ans">答え:' + rt(e.a) + '</p></details></div></div>';
    }).join('') + '</section>';
    html += sec('説明チェック') + '<p class="small muted">声に出して、または紙に書いて説明してから、解答例を開きましょう。</p><div class="check">' + p.check.map(function (c) {
      return '<details><summary>' + rt(c.q) + '</summary><p class="ans"><small>解答例</small>' + rt(c.a) + '</p></details>';
    }).join('') + '</div></section>';
    html += sec('練習問題') + '<div id="qz">' + p.quiz.map(function (q, i) { return quizHtml(id, q, i, '問' + (i + 1)); }).join('') + '</div></section>';
    if (p.next && p.next.length) html += sec('大学で続けて学ぶ科目(例)') + '<ul class="next-list">' + p.next.map(function (x) { return '<li>' + h(x) + '</li>'; }).join('') + '</ul></section>';
    if (p.src && p.src.length) html += '<section class="sec"><h2 style="font-size:.95em">出典・参考</h2><ul class="src">' + p.src.map(function (s2) { return '<li><a href="' + h(s2.u) + '" target="_blank" rel="noopener noreferrer">' + h(s2.t) + '</a></li>'; }).join('') + '</ul></section>';
    html += '<p class="done-mark" id="endMark">' + (S.read[id] ? '<span class="badge ok">✓ このページは読了済みです</span>' : '<button type="button" class="btn" id="doneBtn">読み終えた</button>') + '</p></article>';
    function pn(pid, dir) {
      if (!pid) return '<a class="off" aria-hidden="true"></a>';
      return '<a href="#p/' + pid + '">' + (dir < 0 ? '‹ 前のページ' : '次のページ ›') + '<small>' + h(PAGES[pid].p.title) + '</small></a>';
    }
    html += '<nav class="pn" aria-label="ページ送り">' + pn(prev, -1) + '<a href="#b/' + b.id + '" style="text-align:center">目次</a>' + pn(next, 1) + '</nav></div>';
    view.innerHTML = html;

    bindQuiz(view);
    document.getElementById('bmBtn').addEventListener('click', function () {
      if (S.bm[id]) delete S.bm[id]; else S.bm[id] = Date.now();
      save(); this.setAttribute('aria-pressed', !!S.bm[id]); this.textContent = (S.bm[id] ? '★' : '☆') + ' しおり';
      toast(S.bm[id] ? 'しおりをはさみました' : 'しおりを外しました');
    });
    document.getElementById('fsBtn').addEventListener('click', function () {
      var o = ['s', 'm', 'l', 'xl'], nx = o[(o.indexOf(S.fs) + 1) % o.length];
      S.fs = nx; save();
      var pg = view.querySelector('.page'); pg.className = 'page fs-' + nx;
      this.textContent = '文字 ' + { s: '小', m: '中', l: '大', xl: '特大' }[nx];
    });
    var done = document.getElementById('doneBtn');
    function markRead() {
      if (S.read[id]) return;
      S.read[id] = Date.now(); save();
      var em = document.getElementById('endMark'); if (em) em.innerHTML = '<span class="badge ok">✓ このページは読了済みです</span>';
      toast('読了にしました');
    }
    if (done) done.addEventListener('click', markRead);
    // 読んだ位置(進みぐあい)
    var rp = document.getElementById('rp');
    onScroll = function () {
      var el = document.documentElement, max = el.scrollHeight - el.clientHeight;
      var r = max > 0 ? Math.min(1, el.scrollTop / max) : 1;
      if (rp) rp.style.width = Math.round(r * 100) + '%';
    };
    onScroll();
  }
  var onScroll = null;
  window.addEventListener('scroll', function () { if (onScroll) onScroll(); }, { passive: true });

  // ---------- 確認テスト ----------
  function runTest(title, items, backHref, backLabel) {
    var i = 0, ok = 0, miss = [];
    function step() {
      if (i >= items.length) {
        view.innerHTML = '<div class="reader-tb"><a href="' + backHref + '">‹ ' + h(backLabel) + '</a><b>' + h(title) + '</b><span class="rt-r"></span></div>' +
          '<section class="card"><div class="score">結果<big>' + ok + ' / ' + items.length + '問</big>正答率 ' + pct(ok, items.length) + '%</div>' +
          (miss.length ? '<h2 style="margin-top:18px">まちがえた問題の単元</h2><ul class="list">' + miss.map(function (m) { return '<li><a href="#p/' + m.pid + '">' + h(PAGES[m.pid].b.short) + ' ' + PAGES[m.pid].no + ' ' + h(PAGES[m.pid].p.title) + '</a><br><span class="small muted">' + h(plain(m.q)) + '</span></li>'; }).join('') + '</ul>' : '<p class="empty">全問正解です。すばらしい!</p>') +
          '<div class="btns" style="margin-top:14px"><a class="btn" href="' + backHref + '">' + h(backLabel) + 'へ戻る</a>' + (miss.length ? '<a class="btn ghost" href="#review">復習ページへ</a>' : '') + '</div></section>';
        window.scrollTo(0, 0);
        return;
      }
      var it = items[i];
      view.innerHTML = '<div class="reader-tb"><a href="' + backHref + '">‹ やめる</a><b>' + h(title) + ' ' + (i + 1) + ' / ' + items.length + '</b><span class="rt-r"></span><span class="read-prog"><i style="width:' + pct(i, items.length) + '%"></i></span></div>' +
        '<div class="page">' + quizHtml(it.pid, PAGES[it.pid].p.quiz[it.i], it.i, PAGES[it.pid].b.short + ' ' + PAGES[it.pid].no + '「' + PAGES[it.pid].p.title + '」') + '<div class="btns" id="nx" hidden><button type="button" class="btn" id="nxBtn">' + (i + 1 < items.length ? '次の問題へ' : '結果を見る') + '</button></div></div>';
      bindQuiz(view, function (good) {
        if (good) ok++; else miss.push({ pid: it.pid, q: PAGES[it.pid].p.quiz[it.i].q });
        var nx = document.getElementById('nx'); nx.hidden = false;
        document.getElementById('nxBtn').addEventListener('click', function () { i++; step(); });
        document.getElementById('nxBtn').focus();
      });
      window.scrollTo(0, 0);
    }
    step();
  }
  function renderTest(b) {
    var all = [];
    b.pageIds.forEach(function (pid) { PAGES[pid].p.quiz.forEach(function (q, i) { all.push({ pid: pid, i: i }); }); });
    runTest(b.short + ' 確認テスト', shuffle(all).slice(0, 10), '#b/' + b.id, '目次');
  }

  // ---------- 復習 ----------
  function wrongItems() {
    return Object.keys(S.quiz).filter(function (k) { var pid = k.split(':')[0]; return PAGES[pid] && !S.quiz[k].ok && PAGES[pid].p.quiz[+k.split(':')[1]]; })
      .map(function (k) { return { pid: k.split(':')[0], i: +k.split(':')[1] }; });
  }
  function renderReview() {
    var w = wrongItems();
    var bms = Object.keys(S.bm).filter(function (id) { return PAGES[id]; });
    var html = '<section class="card"><h2>復習:まちがえた問題</h2>' + (w.length ?
      '<p class="small muted">いま不正解のままの問題が <b>' + w.length + '問</b> あります。正解すると、このリストから消えます。</p><div class="btns" style="margin-bottom:10px"><button type="button" class="btn" id="rvGo">まとめて解き直す(最大10問)</button></div><ul class="list">' +
      w.map(function (x) { var P = PAGES[x.pid]; return '<li><a href="#p/' + x.pid + '">' + h(P.b.short) + ' ' + P.no + ' ' + h(P.p.title) + '</a><br><span class="small muted">' + h(plain(P.p.quiz[x.i].q)) + '</span></li>'; }).join('') + '</ul>'
      : '<p class="empty">まちがえた問題はありません。<br>各ページの練習問題や確認テストに挑戦しましょう。</p>') + '</section>';
    html += '<section class="card"><h2>しおり</h2>' + (bms.length ? '<ul class="list">' + bms.map(function (id) { var P = PAGES[id]; return '<li><a href="#p/' + id + '">' + h(P.b.short) + ' ' + P.no + ' ' + h(P.p.title) + '</a></li>'; }).join('') + '</ul>' : '<p class="empty">しおりをはさんだページはありません。</p>') + '</section>';
    html += '<section class="card"><h2>本ごとの進みぐあい</h2>' + BOOKS.map(function (b) {
      var s = bookStat(b);
      return '<div class="row"><a href="#b/' + b.id + '">' + h(b.name) + '</a><span class="small muted">読了 ' + s.read + '/' + s.total + '・正答 ' + (s.qa ? pct(s.qo, s.qa) + '%' : '—') + '</span><div style="flex-basis:100%">' + progBar(s.read, s.total) + '</div></div>';
    }).join('') + '</section>';
    view.innerHTML = html;
    var go = document.getElementById('rvGo');
    if (go) go.addEventListener('click', function () { runTest('復習', shuffle(w).slice(0, 10), '#review', '復習'); });
  }

  // ---------- 検索 ----------
  var sq = '';
  function renderSearch() {
    view.innerHTML = '<section class="card"><h2>検索</h2><label class="search"><span class="sr">キーワード</span><input id="sq" type="search" placeholder="用語・人名・テーマ(例:機会費用、DNA、正当防衛)" value="' + h(sq) + '"></label><div id="hits" style="margin-top:10px"></div></section>';
    var inp = document.getElementById('sq');
    inp.addEventListener('input', function () { sq = inp.value; drawHits(); });
    inp.focus(); drawHits();
  }
  function drawHits() {
    var q = sq.trim(), el = document.getElementById('hits');
    if (!q) { el.innerHTML = '<p class="empty">ことばを入れると、全' + BOOKS.length + '冊の本文・用語・問題からさがします。</p>'; return; }
    var lq = q.toLowerCase(), hits = [];
    ORDER.forEach(function (id) {
      var p = PAGES[id].p, parts = [p.title, p.point].concat(
        p.secs.map(function (s) { return s.t + ' ' + (s.p || []).join(' ') + ' ' + (s.list || []).join(' ') + ' ' + (s.table || []).map(function (r) { return r.join(' '); }).join(' '); }),
        p.terms.map(function (t) { return t[0] + ':' + t[1]; }));
      var txt = plain(parts.join(' ')), at = txt.toLowerCase().indexOf(lq);
      if (at < 0) return;
      var score = (p.title.toLowerCase().indexOf(lq) >= 0 ? 3 : 0) + (p.terms.some(function (t) { return t[0].toLowerCase().indexOf(lq) >= 0; }) ? 2 : 0);
      var a = Math.max(0, at - 30), snip = (a ? '…' : '') + txt.slice(a, at + q.length + 50) + '…';
      hits.push({ id: id, score: score, snip: snip });
    });
    hits.sort(function (x, y) { return y.score - x.score; });
    el.innerHTML = hits.length ? '<p class="small muted">' + hits.length + '件</p>' + hits.slice(0, 50).map(function (x) {
      var P = PAGES[x.id];
      return '<a class="hit" href="#p/' + x.id + '"><small>' + h(P.b.short) + ' ' + P.no + '</small><br><b>' + h(P.p.title) + '</b><br><span class="small muted">' + h(x.snip).replace(new RegExp(h(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), function (m) { return '<mark>' + m + '</mark>'; }) + '</span></a>';
    }).join('') : '<p class="empty">見つかりませんでした。</p>';
  }

  // ---------- 設定 ----------
  function renderSettings() {
    function seg(name, cur, opts) { return '<div class="seg" role="group">' + opts.map(function (o) { return '<button type="button" data-' + name + '="' + o[0] + '" class="' + (cur === o[0] ? 'on' : '') + '" aria-pressed="' + (cur === o[0]) + '">' + o[1] + '</button>'; }).join('') + '</div>'; }
    view.innerHTML = '<section class="card"><h2>設定</h2>' +
      '<div class="row"><span>文字の大きさ(本文)</span>' + seg('fs', S.fs, [['s', '小'], ['m', '中'], ['l', '大'], ['xl', '特大']]) + '</div>' +
      '<div class="row"><span>画面の明るさ</span>' + seg('theme', S.theme, [['auto', '自動'], ['light', 'ライト'], ['dark', 'ダーク']]) + '</div></section>' +
      '<section class="card"><h2>学習データ</h2><p class="small muted">読んだページ・練習問題の結果・しおりは、この端末のブラウザにだけ保存されています。機種変更のときは書き出して、新しい端末で読み込んでください。</p>' +
      '<div class="btns"><button type="button" class="btn ghost small" id="exp">データを書き出す</button><label class="btn ghost small">データを読み込む<input type="file" id="imp" accept="application/json" hidden></label><button type="button" class="btn ghost small" id="rst" style="color:var(--ng);border-color:var(--ng)">記録をすべて消す</button></div></section>';
    view.querySelectorAll('[data-fs]').forEach(function (b) { b.addEventListener('click', function () { S.fs = b.getAttribute('data-fs'); save(); renderSettings(); toast('文字の大きさを変えました'); }); });
    view.querySelectorAll('[data-theme]').forEach(function (b) { b.addEventListener('click', function () { S.theme = b.getAttribute('data-theme'); save(); applyTheme(); renderSettings(); }); });
    document.getElementById('exp').addEventListener('click', function () {
      var blob = new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' });
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'gakumon-data.json'; a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    });
    document.getElementById('imp').addEventListener('change', function () {
      var f = this.files[0]; if (!f) return;
      var r = new FileReader();
      r.onload = function () {
        try { var d = JSON.parse(r.result); if (!d || typeof d !== 'object' || !d.read) throw 0; localStorage.setItem(KEY, JSON.stringify(d)); S = load(); applyTheme(); toast('読み込みました'); renderSettings(); }
        catch (e) { toast('このファイルは読み込めません'); }
      };
      r.readAsText(f);
    });
    document.getElementById('rst').addEventListener('click', function () {
      if (!confirm('読んだページ・問題の結果・しおりをすべて消します。よろしいですか?')) return;
      var keep = { fs: S.fs, theme: S.theme }; S = load(); S.read = {}; S.quiz = {}; S.bm = {}; S.last = null; S.fs = keep.fs; S.theme = keep.theme; save(); toast('記録を消しました'); renderSettings();
    });
  }

  // ---------- このテキストについて ----------
  function renderAbout() {
    var nsrc = 0; ORDER.forEach(function (id) { nsrc += (PAGES[id].p.src || []).length; });
    view.innerHTML = '<section class="card"><h2>このテキストについて</h2>' +
      '<p>大学の学問ごとに、1年生の「概論」の授業で学ぶ中心的なテーマを、高校生にもわかる言葉でまとめた入門テキストです。大学受験ロードマップのアプリと同じ「本棚 → 目次 → 単元のページ」のつくりで、読む・考える・確かめるをくり返せます。</p>' +
      '<h3>1ページの組み立て</h3><ol><li><b>学習目標</b>:読み終えたときに説明できるようになること</li><li><b>要点</b>:いちばん大事なことを1〜2文で</li><li><b>本文</b>:図表をまじえた解説</li><li><b>重要用語</b>:用語と意味の一覧</li><li><b>板書で考える</b>:例題(ケース)を考え方の順に解く</li><li><b>説明チェック</b>:自分の言葉で説明してから解答例を見る</li><li><b>練習問題</b>:4択。結果は記録され、まちがえた問題は「復習」に集まります</li></ol>' +
      '<h3>情報の扱い</h3><ul><li>文章はすべてこのテキストのオリジナルです。特定の教科書の文章は使っていません。</li><li>条文・年号・統計などの事実には、各ページの「出典・参考」に出典を示しています(全' + nsrc + '件)。法律や統計は改正・更新されることがあるため、最新の情報は出典先で確認してください。</li><li>学説が分かれる内容は「〜という考え方がある」と書き、断定していません。</li><li>大学・学部によって、学ぶ内容や順番は異なります。進路を決めるときは、各大学の公式サイト・シラバスもあわせて確認してください。</li><li>医療に関する内容は学問の入門としての一般的な説明であり、診断や治療の助言ではありません。</li></ul>' +
      '<h3>本を増やすには</h3><p class="small">js/data/ に1冊1ファイルで追加します。書き方は docs/data-format.md を見てください。</p></section>';
  }

  // ---------- 画面の切りかえ ----------
  function setNav(r) { document.querySelectorAll('.nav a').forEach(function (a) { a.classList.toggle('active', a.getAttribute('data-r') === r); }); }
  function route() {
    onScroll = null;
    var hash = decodeURIComponent(location.hash.replace(/^#/, '')) || 'home', parts = hash.split('/'), r = parts[0], b;
    var title = '学問の教科書';
    if (r === 'b' && (b = bookOf(parts[1]))) { renderBook(b); setNav('home'); title = b.name; }
    else if (r === 'p' && PAGES[parts[1]]) { renderPage(parts[1]); setNav('home'); title = PAGES[parts[1]].p.title + '|' + PAGES[parts[1]].b.short; }
    else if (r === 'test' && (b = bookOf(parts[1]))) { renderTest(b); setNav('home'); title = b.short + ' 確認テスト'; }
    else if (r === 'review') { renderReview(); setNav('review'); title = '復習'; }
    else if (r === 'search') { renderSearch(); setNav('search'); title = '検索'; }
    else if (r === 'settings') { renderSettings(); setNav('settings'); title = '設定'; }
    else if (r === 'about') { renderAbout(); setNav('about'); title = 'このテキストについて'; }
    else { renderHome(); setNav('home'); }
    document.title = title + (title === '学問の教科書' ? '' : '|学問の教科書');
    window.scrollTo(0, 0);
    var h1 = view.querySelector('h1, h2'); if (h1) { h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll: true }); }
  }
  window.addEventListener('hashchange', route);
  route();

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(function () { /* オフライン対応なしでも動く */ });
  }
})();
