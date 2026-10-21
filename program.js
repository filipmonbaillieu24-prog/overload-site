// The REGOL program builder: three stages on one page, and two sheets over them.
//
// Builds a training program in the browser and hands it to the phone as a code. Nothing is
// uploaded - the whole program is deflated into the link - so this file does the work a server
// would otherwise do: it plans, it edits, it encodes, and it draws the QR.
//
// Ported from design_handoff_regol_program_builder (October 2026). The engine side is untouched:
// REGOL.plan / REGOL.volume / REGOL.planner.todayDay from program-plan.js, REGOL.qr from qr.js,
// and lifts.json. Only the page is new.
//
// There is no framework here, as there is nothing anywhere else on this site. The pattern is one
// state object and one render that rebuilds the stage, which is affordable because the page is
// small and which removes every class of bug where the screen and the state disagree. The one
// thing a full rebuild costs is the caret in a text field, so render() puts it back by hand.
(function () {
  'use strict';

  var MAX = 2600;
  var DRAFT = 'regol.program.draft';
  var ANS = 'regol.program.answers';
  var EQUIP = ['Barbell', 'Dumbbell', 'Cable', 'Machine', 'Bodyweight'];
  var NAMES = ['Workout A', 'Workout B', 'Workout C', 'Workout D', 'Workout E', 'Workout F', 'Workout G'];
  var MAX_WORKOUTS = 7;

  // An ordinary web address, matching Formats.programLink on the phone. A regol:// code only
  // opens where REGOL is already installed, and a shared code is the one thing here that travels
  // to people who do not have it - so it points at a page, which reads the same payload and hands
  // it on. The scheme form is kept for the button on a phone, where it opens the app directly.
  var LINK_WEB = 'https://regolapp.be/p.html';
  var LINK_APP = 'regol://p';

  var S = {
    stage: 'start', qi: 0, answers: null, prog: null, lib: null, draft: null,
    pick: null, pickQ: '', equip: {}, added: 0, edit: null,
    link: null, qr: null, phone: false, col: 0, toast: '', copied: false,
    ready: false, drag: null,
  };

  var byKey = {};
  var lastJson = null;
  var toastTimer = null;
  var copyTimer = null;
  var root = null;

  /* ---------- building blocks ---------- */

  function h(tag, attrs, kids) {
    var n = document.createElement(tag);
    attrs = attrs || {};
    // Before anything else: cssText wipes the element's style, custom properties included, so a
    // hover colour set first would be thrown away by the declaration block that follows it.
    if (attrs.style) n.style.cssText = attrs.style;
    for (var k in attrs) {
      var v = attrs[k];
      if (k === 'style' || v == null || v === false) continue;
      if (k === 'text') n.textContent = v;
      // The QR arrives as an SVG string from qr.js, and SVG needs its own namespace: innerHTML
      // in an HTML context gets that right where createElement never would.
      else if (k === 'html') n.innerHTML = v;
      else if (k === 'hov') { n.setAttribute('data-hov', ''); n.style.setProperty('--hov', v); }
      else if (k === 'hovc') { n.setAttribute('data-hovc', ''); n.style.setProperty('--hovc', v); }
      else if (k === 'hovr') { n.setAttribute('data-hovr', ''); n.style.setProperty('--hovr', v); }
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2).toLowerCase(), v);
      else if (v === true) n.setAttribute(k, '');
      else n.setAttribute(k, v);
    }
    (kids || []).forEach(function (c) {
      if (c == null || c === false) return;
      n.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    });
    return n;
  }

  /** SVG needs its own namespace, and innerHTML on a div is the shortest way to get it right. */
  function ico(markup) {
    var d = document.createElement('div');
    d.innerHTML = markup;
    return d.firstElementChild;
  }

  var I = {
    chev: function (c, w) { return ico('<svg width="' + (w || 16) + '" height="' + (w || 16) + '" viewBox="0 0 24 24" fill="none" stroke="' + c + '" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>'); },
    back: function (c, w) { return ico('<svg width="' + (w || 18) + '" height="' + (w || 18) + '" viewBox="0 0 24 24" fill="none" stroke="' + c + '" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>'); },
    plus: function (c, w) { return ico('<svg width="' + (w || 15) + '" height="' + (w || 15) + '" viewBox="0 0 24 24" fill="none" stroke="' + c + '" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>'); },
    minus: function (c, w) { return ico('<svg width="' + (w || 14) + '" height="' + (w || 14) + '" viewBox="0 0 24 24" fill="none" stroke="' + c + '" stroke-width="2.6" stroke-linecap="round"><path d="M5 12h14"/></svg>'); },
    bin: function () { return ico('<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>'); },
    pencil: function () { return ico('<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D6FF3E" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>'); },
    chain: function () { return ico('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>'); },
    check: function (c, w) { return ico('<svg width="' + (w || 13) + '" height="' + (w || 13) + '" viewBox="0 0 24 24" fill="none" stroke="' + c + '" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>'); },
    play: function () { return ico('<svg width="16" height="16" viewBox="0 0 24 24" fill="#D6FF3E"><path d="M6 3.5v17l14-8.5z"/></svg>'); },
    grip: function () { return ico('<svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor"><circle cx="2" cy="2" r="1.6"/><circle cx="8" cy="2" r="1.6"/><circle cx="2" cy="8" r="1.6"/><circle cx="8" cy="8" r="1.6"/><circle cx="2" cy="14" r="1.6"/><circle cx="8" cy="14" r="1.6"/></svg>'); },
    up: function () { return ico('<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#F2F4EE" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 15l6-6 6 6"/></svg>'); },
    down: function () { return ico('<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#F2F4EE" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>'); },
    cross: function () { return ico('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>'); },
    search: function () { return ico('<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9AA093" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>'); },
    tick: function () { return ico('<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'); },
    bang: function () { return ico('<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8v5M12 16.5v.5"/></svg>'); },
  };

  /* ---------- state ---------- */

  function set(patch, then) {
    for (var k in patch) S[k] = patch[k];
    render();
    if (then) then();
  }

  function blankAnswers() {
    return { days: 3, kit: EQUIP.slice(), level: 'some', minutes: 60, focus: [], less: [], avoid: [], weeks: 0 };
  }

  function flash(t) {
    clearTimeout(toastTimer);
    S.toast = t;
    render();
    toastTimer = setTimeout(function () { S.toast = ''; render(); }, 1800);
  }

  /** Every change to the program is saved and re-encoded; there is no other way to change it. */
  function setProg(fn) {
    var p = JSON.parse(JSON.stringify(S.prog));
    var out = fn(p);
    S.prog = out === undefined ? p : out;
    try { localStorage.setItem(DRAFT, JSON.stringify(S.prog)); } catch (e) { /* private window */ }
    render();
    encode();
  }

  function setAns(fn) {
    var a = {
      days: S.answers.days, kit: S.answers.kit.slice(), level: S.answers.level,
      minutes: S.answers.minutes, focus: S.answers.focus.slice(), less: S.answers.less.slice(),
      avoid: S.answers.avoid.slice(), weeks: S.answers.weeks,
    };
    var out = fn(a);
    S.answers = out === undefined ? a : out;
    try { localStorage.setItem(ANS, JSON.stringify(S.answers)); } catch (e) {}
    render();
  }

  function nid(prefix, prog) { prog.seq = (prog.seq || 0) + 1; return prefix + prog.seq; }

  function mins(items) { return Math.round(items.reduce(function (a, i) { return a + i.sets; }, 0) * 3); }

  function restLabel(s) {
    if (s == null) return 'default rest';
    return s % 60 ? Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0') : (s / 60) + ':00';
  }

  /* ---------- supersets ---------- */

  /**
   * Put the superset ids back in order after anything moved.
   *
   * Two rules: one id may describe only one run of adjacent items, so a second run of the same id
   * is given a new one; and a run of one is not a superset, so a lone id is dropped. Without this
   * a lift dragged out of the middle of a group leaves two halves claiming to be the same thing.
   */
  function normSS(p, items) {
    var seen = {}, k = 0, n = items.length;
    while (k < n) {
      var g = items[k].superset;
      if (!g) { k++; continue; }
      var e = k;
      while (e + 1 < n && items[e + 1].superset === g) e++;
      if (seen[g]) { var ng = nid('g', p); for (var j = k; j <= e; j++) items[j].superset = ng; }
      else seen[g] = 1;
      k = e + 1;
    }
    dropLoners(items);
  }

  function dropLoners(items) {
    items.forEach(function (it, j) {
      var before = items[j - 1] && items[j - 1].superset;
      var after = items[j + 1] && items[j + 1].superset;
      if (it.superset && before !== it.superset && after !== it.superset) delete it.superset;
    });
  }

  function toggleSS(p, items, i) {
    var a = items[i], b = items[i + 1], k;
    if (!a || !b) return;
    if (a.superset && a.superset === b.superset) {
      // Already joined: split the group between them, so everything after b keeps its own id.
      var ng = nid('g', p), old = a.superset;
      for (k = i + 1; k < items.length && items[k].superset === old; k++) items[k].superset = ng;
    } else {
      var g = a.superset || b.superset || nid('g', p), was = b.superset;
      a.superset = g;
      for (k = i + 1; k < items.length && (k === i + 1 || (was && items[k].superset === was)); k++) items[k].superset = g;
    }
    dropLoners(items);
  }

  function ssView(items, i, ci) {
    var g = items[i].superset;
    var prevIn = !!g && items[i - 1] && items[i - 1].superset === g;
    var nextIn = !!g && items[i + 1] && items[i + 1].superset === g;
    var size = 0;
    if (g && !prevIn) for (var k = i; k < items.length && items[k].superset === g; k++) size++;
    var R = 16;
    var rad = !g ? '14px' : (prevIn ? '0 0 ' : R + 'px ' + R + 'px ') + (nextIn ? '0 0' : R + 'px ' + R + 'px');
    return {
      ssHead: g && !prevIn ? 'SUPERSET · ' + size + ' LIFTS' : '',
      ssBg: g ? 'rgba(214,255,62,.05)' : 'transparent',
      ssRail: g ? 'inset 3px 0 0 #D6FF3E' : 'none',
      ssRadius: rad,
      canLink: i < items.length - 1,
      linkLabel: nextIn ? 'Unlink' : 'Superset with next',
      linkAria: nextIn ? 'Unlink from the next lift' : 'Make a superset with the next lift',
      linkFg: nextIn ? '#9AA093' : '#D6FF3E',
      toggleLink: function () { setProg(function (p) { toggleSS(p, p.templates[ci].items, i); }); },
    };
  }

  /* ---------- the file the phone reads ---------- */

  function exercise(exId, row, unit) {
    var e = { id: exId, name: row.n, group: row.g, equip: row.e, unit: unit, min: row.min, inc: row.inc };
    if (row.s) e.secondary = row.s;
    if (row.ps) e.perSide = true;
    if (row.l) e.load = row.l;
    return e;
  }

  /** Defaults are left out: the app fills in the same ones, and a code has 2,600 characters. */
  function item(it) {
    var o = { exId: it.exId };
    if (it.warm) o.warm = it.warm;
    if (it.sets !== 3) o.sets = it.sets;
    if (it.lo !== 8) o.lo = it.lo;
    if (it.hi !== 10) o.hi = it.hi;
    if (it.rir !== 2) o.rir = it.rir;
    if (it.rest != null) o.rest = it.rest;
    if (it.superset) o.superset = it.superset;
    return o;
  }

  /** Engine.blockState's straight line: rampStart 0 to rampEnd -2, with Java's half-up rounding. */
  function line(weeks, w) { return weeks <= 1 ? 0 : 0 - Math.floor(w * 2 / (weeks - 1) + 0.5); }

  function file(st) {
    var used = {};
    st.templates.forEach(function (t) { t.items.forEach(function (i) { used[i.exId] = true; }); });
    var name = (st.name || '').trim() || (st.templates[0] && st.templates[0].name) || 'Program';
    var f = {
      kind: 'program',
      name: name,
      templates: st.templates.map(function (t) {
        return { id: t.id, name: (t.name || '').trim() || 'Workout', items: t.items.map(item) };
      }),
      exercises: Object.keys(used).map(function (k) { return exercise(k, st.lifts[k], st.unit); }),
    };
    if (st.templates.length > 1) {
      f.program = { id: 'p', name: name, templateIds: st.templates.map(function (t) { return t.id; }) };
      if (st.block) {
        var b = { startDay: st.block.startDay };
        if (st.block.weeks !== 4) b.weeks = st.block.weeks;
        if (st.block.deload === false) b.deload = false;
        // Only when it differs from the line the app would draw anyway, and only at exactly the
        // block's length: Engine.blockState takes it with `takeIf { it.size == b.weeks }` and
        // silently ignores anything else, so a wrong length is worse than none at all.
        var rw = st.block.rirPerWeek;
        if (rw && rw.length === st.block.weeks && rw.some(function (x, i) { return x !== line(st.block.weeks, i); })) {
          b.rirPerWeek = rw.slice();
        }
        f.program.block = b;
      }
    }
    return f;
  }

  function b64url(buf) {
    var s = '', b = new Uint8Array(buf);
    for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function encode() {
    var st = S.prog;
    if (!st || !st.templates.some(function (t) { return t.items.length; })) {
      S.link = null; S.qr = null; render(); return;
    }
    var json = JSON.stringify(file(st));
    lastJson = json;
    if (!self.CompressionStream) { S.link = { error: 'old-browser' }; S.qr = null; render(); return; }
    new Response(new Blob([json]).stream().pipeThrough(new CompressionStream('deflate-raw')))
      .arrayBuffer()
      .then(function (packed) {
        if (lastJson !== json) return;              // a later edit already won
        var d = b64url(packed);
        var url = LINK_WEB + '?d=' + d;
        var over = url.length > MAX;
        S.link = { url: url, appUrl: LINK_APP + '?d=' + d, chars: url.length, over: over };
        S.qr = null;
        render();
        if (over) return;
        window.REGOL.qr.load().then(function () {
          if (lastJson !== json) return;
          var code = window.REGOL.qr.make(url);
          S.qr = code ? { svg: window.REGOL.qr.svg(code), size: code.size } : null;
          render();
        }).catch(function () { S.qr = null; render(); });
      })
      .catch(function () { S.link = { error: 'old-browser' }; S.qr = null; render(); });
  }

  /* ---------- starting a program ---------- */

  function scratch() {
    var p = { name: 'My program', unit: 'kg', block: null, templates: [], lifts: {}, seq: 0 };
    p.templates.push({ id: nid('t', p), name: 'Workout A', items: [] });
    S.stage = 'edit'; S.col = 0; S.prog = p;
    try { localStorage.setItem(DRAFT, JSON.stringify(p)); } catch (e) {}
    render(); encode();
  }

  function build() {
    var pl = window.REGOL.plan(S.answers, S.lib);
    S.prog = {
      name: pl.name, unit: (S.prog && S.prog.unit) || 'kg', block: pl.block,
      templates: pl.templates, lifts: pl.lifts, seq: pl.seq,
    };
    S.stage = 'edit'; S.col = 0;
    try { localStorage.setItem(DRAFT, JSON.stringify(S.prog)); } catch (e) {}
    render(); encode();
    scrollTo({ top: 0 });
  }

  /** Relevance, so "squat" does not open on Squat Jerk. Unchanged from the old builder. */
  function rank(r, q, words) {
    var n = r.n.toLowerCase();
    if (n === q) return 0;
    if (n.indexOf(q) === 0) return 1;
    if (n.indexOf(' ' + q) >= 0) return 2;
    if (n.indexOf(q) >= 0) return 3;
    var hay = n + ' ' + r.e.toLowerCase() + ' ' + r.g.toLowerCase();
    for (var i = 0; i < words.length; i++) if (hay.indexOf(words[i]) < 0) return -1;
    return 4;
  }

  function addLift(row) {
    var ti = S.pick;
    setProg(function (p) {
      var exId = Object.keys(p.lifts).find(function (k) { return p.lifts[k].n === row.n && p.lifts[k].e === row.e; });
      if (!exId) { exId = nid('x', p); p.lifts[exId] = row; }
      p.templates[ti].items.push({ exId: exId, sets: 3, lo: 8, hi: 10, rir: 2 });
    });
    S.added += 1;
    flash(row.n + ' added');
  }

  /* ---------- drag to reorder ---------- */

  function dragView(kind, i) {
    var d = S.drag, on = d && d.kind === kind;
    return {
      di: String(i),
      onGrip: function (e) { grip(e, kind, i); },
      dOp: on && d.from === i ? '.4' : '1',
      dOl: on && d.over === i && d.from !== i ? '2px solid #D6FF3E' : '0 solid transparent',
    };
  }

  /**
   * Pointer events on the handle only, so one code path covers mouse and touch.
   *
   * The row under the finger is found with elementFromPoint rather than by listening on each row,
   * because during a drag the pointer is captured and the rows never see it.
   */
  function grip(e, kind, i) {
    e.preventDefault(); e.stopPropagation();
    S.drag = { kind: kind, from: i, over: i };
    render();
    var done = false;
    function mv(ev) {
      var el = document.elementFromPoint(ev.clientX, ev.clientY);
      var t = el && el.closest('[data-dk="' + kind + '"]');
      if (!t) return;
      var o = +t.dataset.di;
      if (S.drag && o !== S.drag.over) { S.drag.over = o; render(); }
    }
    function up() {
      if (done) return;
      done = true;
      removeEventListener('pointermove', mv);
      removeEventListener('pointerup', up);
      removeEventListener('pointercancel', up);
      var d = S.drag;
      S.drag = null;
      if (!d || d.from === d.over) { render(); return; }
      if (kind === 'w') {
        setProg(function (p) { var t = p.templates.splice(d.from, 1)[0]; p.templates.splice(d.over, 0, t); });
        // The selection follows the workout it was on, not the slot it used to sit in.
        var c = curIdx(), nc = c;
        if (c === d.from) nc = d.over;
        else if (d.from < c && d.over >= c) nc = c - 1;
        else if (d.from > c && d.over <= c) nc = c + 1;
        S.col = nc; render();
      } else {
        var ci = curIdx();
        setProg(function (p) {
          var it = p.templates[ci].items, x = it.splice(d.from, 1)[0];
          it.splice(d.over, 0, x);
          normSS(p, it);
        });
      }
    }
    addEventListener('pointermove', mv);
    addEventListener('pointerup', up);
    addEventListener('pointercancel', up);
  }

  function curIdx() {
    var n = S.prog ? S.prog.templates.length : 1;
    return Math.max(0, Math.min(S.col || 0, n - 1));
  }

  /* ---------- 01 Start ---------- */

  var HOW = [
    ['1', 'Six questions', 'Days, kit, experience, time, what to focus on, and whether to run a block. One tap each.'],
    ['2', 'Shape the week', 'Every workout side by side. Swap, add or remove lifts and change any number.'],
    ['3', 'Send it', 'Scan the code with REGOL, or open the link on your phone. Nothing is uploaded.'],
  ];

  function viewStart() {
    var D = S.draft;
    var left = h('div', { style: 'flex:1 1 460px;min-width:0;display:flex;flex-direction:column;gap:clamp(16px,2.4vh,26px)' }, [
      h('span', { style: 'font:600 13px/1 Barlow;letter-spacing:.16em;text-transform:uppercase;color:#D6FF3E', text: 'Program maker' }),
      h('h1', { style: "margin:0;font:700 clamp(52px,8vw,128px)/.86 'Barlow Condensed';letter-spacing:-.02em;text-wrap:balance", text: 'Build a program. Send it to your phone.' }),
      h('p', { style: 'margin:0;font:400 clamp(17px,1.4vw,21px)/1.5 Barlow;color:#C9CEC2;max-width:560px;text-wrap:pretty', text: 'Answer six questions and get a first draft, or start from an empty one. Change every number, then hand it to REGOL as a code. The whole program travels inside the code, so nothing is uploaded and it works with the network off.' }),
      h('div', { style: 'display:flex;flex-wrap:wrap;gap:10px' }, [
        h('button', {
          style: 'border:0;cursor:pointer;height:62px;padding:0 28px;border-radius:22px;background:#D6FF3E;color:#0C0E0B;font:600 17px/1 Barlow;display:flex;align-items:center;gap:12px;white-space:nowrap;flex:none',
          hov: '#E6FF7A', onclick: function () { set({ stage: 'quiz', qi: 0 }); },
        }, ['Answer six questions', I.chev('#0C0E0B')]),
        h('button', {
          style: 'border:0;cursor:pointer;height:62px;padding:0 26px;border-radius:22px;background:transparent;box-shadow:inset 0 0 0 1px rgba(255,255,255,.16);color:#F2F4EE;font:500 17px/1 Barlow;white-space:nowrap;flex:none',
          hov: '#161917', onclick: scratch,
        }, ['Start from scratch']),
      ]),
      D && h('button', {
        style: 'border:0;cursor:pointer;align-self:flex-start;max-width:100%;min-height:64px;padding:12px 18px 12px 14px;border-radius:22px;background:#161917;box-shadow:inset 0 1px 0 rgba(255,255,255,.05);display:flex;align-items:center;gap:14px;text-align:left;color:#F2F4EE',
        hov: '#1A1D1A',
        onclick: function () { S.prog = D; S.stage = 'edit'; S.col = 0; render(); encode(); },
      }, [
        h('span', { style: 'width:40px;height:40px;border-radius:13px;background:#1F2320;display:flex;align-items:center;justify-content:center;flex:none' }, [I.pencil()]),
        h('span', { style: 'display:flex;flex-direction:column;gap:4px;min-width:0' }, [
          h('span', { style: 'font:600 16px/1.2 Barlow', text: 'Continue ' + ((D.name || '').trim() || 'your draft') }),
          h('span', {
            style: 'font:400 13.5px/1.3 Barlow;color:#9AA093',
            text: D.templates.length + ' workout' + (D.templates.length === 1 ? '' : 's') + ' · ' +
              D.templates.reduce(function (a, t) { return a + t.items.length; }, 0) + ' lifts · saved in this browser',
          }),
        ]),
      ]),
    ]);

    var right = h('ol', { style: 'flex:1 1 320px;min-width:0;max-width:520px;list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:1px;border-radius:28px;overflow:hidden;background:rgba(255,255,255,.06)' },
      HOW.map(function (s) {
        return h('li', { style: 'background:#131513;padding:clamp(16px,2.4vh,22px) 22px;display:flex;gap:16px;align-items:flex-start' }, [
          h('span', { style: "width:34px;height:34px;border-radius:17px;background:#D6FF3E;color:#0C0E0B;display:flex;align-items:center;justify-content:center;font:700 18px/1 'Barlow Condensed';flex:none", text: s[0] }),
          h('span', { style: 'display:flex;flex-direction:column;gap:5px' }, [
            h('strong', { style: "font:700 24px/1 'Barlow Condensed'", text: s[1] }),
            h('span', { style: 'font:400 15px/1.5 Barlow;color:#C9CEC2;text-wrap:pretty', text: s[2] }),
          ]),
        ]);
      }));

    return h('section', { style: 'min-height:calc(100dvh - 64px);box-sizing:border-box;position:relative;overflow:hidden;display:flex;align-items:center' }, [
      h('div', { 'aria-hidden': 'true', style: 'position:absolute;right:-14%;top:50%;width:min(64vw,680px);aspect-ratio:1;transform:translateY(-50%);border-radius:50%;box-shadow:inset 0 0 0 clamp(44px,7vw,80px) #161917;pointer-events:none' }),
      h('div', { style: 'position:relative;max-width:1400px;width:100%;margin:0 auto;padding:clamp(32px,6vh,72px) 24px;box-sizing:border-box;display:flex;flex-wrap:wrap;align-items:center;gap:32px 56px' }, [left, right]),
    ]);
  }

  /* ---------- 02 Six questions ---------- */

  var SPLIT = { 1: 'Full body', 2: 'Full body, twice', 3: 'Push, pull, legs', 4: 'Upper, lower, twice', 5: 'Push, pull, legs, upper, arms', 6: 'Push, pull, legs, twice' };
  var KITSUB = { Barbell: 'Bar and plates', Dumbbell: 'Fixed or adjustable', Cable: 'Stack and pulleys', Machine: 'Plate-loaded or selectorised', Bodyweight: 'Bars, rings, a bench' };

  var Q = [
    { key: 'days', ask: 'How many days a week can you train?', why: 'One workout per day. The split follows from the number.', min: 150, h: 128, big: 64,
      opts: [1, 2, 3, 4, 5, 6].map(function (n) { return [n, String(n), SPLIT[n]]; }) },
    { key: 'kit', multi: true, ask: 'What can you train with?', why: 'Every movement takes the first lift your kit allows. One that nothing you tick can do is left out rather than faked.', min: 180, h: 112, big: 34,
      opts: EQUIP.map(function (e) { return [e, e, KITSUB[e]]; }) },
    { key: 'level', ask: 'How long have you been lifting?', why: 'Moves the set count and how close to failure it asks for.', min: 220, h: 124, big: 38,
      opts: [['new', 'First year', '3 reps in reserve, one set fewer'], ['some', 'A few years', '2 reps in reserve, as written'], ['long', 'Longer than that', '1 rep in reserve, one set more']] },
    { key: 'minutes', ask: 'How long can a session be?', why: 'Lifts are added until three minutes a working set reaches your answer, the app’s own arithmetic. Three lifts go in whatever you say.', min: 130, h: 112, big: 56,
      opts: [[30, '30', 'minutes'], [45, '45', 'minutes'], [60, '60', 'minutes'], [75, '75', 'minutes'], [90, '90', 'minutes'], [120, '2', 'hours']] },
    { key: 'groups', groups: true, ask: 'More or less of anything?', why: 'Focus adds a lift in every session that trains it. Less keeps the lifts and takes a set off each. Skip takes them out, and the time goes to the rest.' },
    { key: 'weeks', ask: 'Should it run as a block?', why: 'A run of weeks that each ask for a little more, then a deload week. You can shape it week by week afterwards. Needs REGOL 1.9 or newer; without a block the program simply rotates.', min: 220, h: 118, big: 32,
      opts: [[0, 'No block', 'Rotates for as long as you like'], [4, '4 weeks', '4 weeks, then a deload'], [6, '6 weeks', '6 weeks, then a deload'], [8, '8 weeks', '8 weeks, then a deload']] },
  ];

  var GROUPS = [['chest', 'Chest'], ['back', 'Back'], ['shoulders', 'Shoulders'], ['arms', 'Arms'], ['legs', 'Legs'], ['core', 'Core']];
  var STATES = [['normal', 'As planned'], ['focus', 'Focus'], ['less', 'Less'], ['avoid', 'Skip']];

  function pickAns(key, val, multi) {
    setAns(function (a) {
      if (multi) {
        var i = a[key].indexOf(val);
        // Untick the last kit and there is nothing to build with, so the last one stays.
        if (i >= 0) { if (a[key].length > 1) a[key].splice(i, 1); }
        else a[key].push(val);
      } else a[key] = val;
    });
  }

  function quizPreview() {
    var ready = S.ready && S.lib;
    if (!ready) return { stats: [], line: 'Loading the lift library…', color: '#9AA093' };
    try {
      var pl = window.REGOL.plan(S.answers, S.lib);
      var sets = pl.templates.reduce(function (a, t) { return a + t.items.reduce(function (b, i) { return b + i.sets; }, 0); }, 0);
      var nl = Object.keys(pl.lifts).length;
      var longest = Math.max.apply(null, [0].concat(pl.templates.map(function (t) { return mins(t.items); })));
      var vol = window.REGOL.volume(pl).filter(function (x) { return x.state !== 'none'; });
      var light = vol.filter(function (x) { return x.state === 'light'; });
      var txt = (pl.name ? pl.name + '. ' : '') +
        (light.length ? 'Light on ' + light.map(function (x) { return x.group.toLowerCase(); }).join(', ') + ' for the week.'
          : vol.length ? 'Every muscle it aims at lands in its weekly range.' : '') +
        (pl.skipped && pl.skipped.length ? ' Left out, nothing you ticked can do it: ' + pl.skipped.join(', ') + '.' : '');
      return {
        stats: [[pl.templates.length, pl.templates.length === 1 ? 'workout' : 'workouts'], [nl, 'lifts'], [sets, 'sets a week'], ['~' + longest, 'min longest']],
        line: txt, color: light.length ? '#FF9B7A' : '#9AA093',
      };
    } catch (e) {
      return { stats: [], line: 'That combination does not make a program. Change an answer.', color: '#FF9B7A' };
    }
  }

  function viewQuiz() {
    var q = Q[S.qi], last = S.qi === Q.length - 1, ready = !!(S.ready && S.lib);
    var A = S.answers;

    var top = h('div', { style: 'max-width:1100px;width:100%;margin:0 auto;padding:20px 24px 0;box-sizing:border-box;display:flex;flex-direction:column;gap:12px' }, [
      h('div', { style: 'display:flex;align-items:center;gap:14px' }, [
        h('button', { 'aria-label': 'Back', hov: '#262A26', style: 'border:0;cursor:pointer;width:44px;height:44px;border-radius:22px;background:#1F2320;display:flex;align-items:center;justify-content:center;flex:none', onclick: function () { S.qi ? set({ qi: S.qi - 1 }) : set({ stage: 'start' }); } }, [I.back('#F2F4EE')]),
        h('span', { style: "font:700 15px/1 'Barlow Condensed';letter-spacing:.06em;color:#D6FF3E", text: String(S.qi + 1).padStart(2, '0') + ' / 06' }),
        h('span', { style: 'flex:1' }),
        h('button', { hovc: '#F2F4EE', style: 'border:0;cursor:pointer;height:44px;padding:0 14px;border-radius:22px;background:transparent;color:#9AA093;font:500 14px/1 Barlow', onclick: function () { set({ stage: 'start' }); }, text: 'Close' }),
      ]),
      h('div', { 'aria-hidden': 'true', style: 'display:grid;grid-template-columns:repeat(6,1fr);gap:6px' },
        Q.map(function (_, i) { return h('div', { style: 'height:5px;border-radius:3px;background:' + (i <= S.qi ? '#D6FF3E' : '#2B2F29') + ';transition:background .25s ease' }); })),
    ]);

    var answers;
    if (!q.groups) {
      answers = h('div', { role: q.multi ? 'group' : 'radiogroup', style: 'display:grid;grid-template-columns:repeat(auto-fill,minmax(' + q.min + 'px,1fr));gap:10px' },
        q.opts.map(function (o) {
          var val = o[0], on = q.multi ? A[q.key].indexOf(val) >= 0 : A[q.key] === val;
          return h('button', {
            'aria-pressed': on ? 'true' : 'false', hovr: 'inset 0 0 0 1.5px #6E822C',
            style: 'border:0;cursor:pointer;text-align:left;min-height:' + q.h + 'px;padding:16px 18px;border-radius:24px;background:' + (on ? '#202419' : '#161917') + ';color:#F2F4EE;box-shadow:' + (on ? 'inset 0 0 0 2px #D6FF3E' : 'inset 0 0 0 1px rgba(255,255,255,.06)') + ';display:flex;flex-direction:column;justify-content:space-between;gap:10px;transition:background .15s ease',
            onclick: function () { pickAns(q.key, val, q.multi); },
          }, [
            h('span', { style: 'display:flex;align-items:flex-start;justify-content:space-between;gap:10px' }, [
              h('span', { style: "font:700 " + q.big + "px/1 'Barlow Condensed';letter-spacing:-.01em;min-width:0;text-wrap:balance", text: o[1] }),
              h('span', { style: 'width:24px;height:24px;border-radius:' + (q.multi ? '7px' : '12px') + ';box-shadow:' + (on ? 'inset 0 0 0 2px #D6FF3E' : 'inset 0 0 0 1.5px rgba(255,255,255,.2)') + ';background:' + (on ? '#0C0E0B' : 'transparent') + ';display:flex;align-items:center;justify-content:center;flex:none' }, [on && I.check('#D6FF3E')]),
            ]),
            h('span', { style: 'font:500 14px/1.35 Barlow;opacity:.8;text-wrap:pretty', text: o[2] }),
          ]);
        }));
    } else {
      answers = h('div', { style: 'display:flex;flex-direction:column;gap:8px' }, GROUPS.map(function (g) {
        var key = g[0];
        var cur = A.focus.indexOf(key) >= 0 ? 'focus' : A.less.indexOf(key) >= 0 ? 'less' : A.avoid.indexOf(key) >= 0 ? 'avoid' : 'normal';
        return h('div', { style: 'border-radius:22px;background:#161917;padding:10px 10px 10px 20px;display:flex;flex-wrap:wrap;align-items:center;gap:10px 16px' }, [
          h('span', { style: "flex:1 1 120px;font:700 26px/1 'Barlow Condensed'", text: g[1] }),
          h('div', { role: 'radiogroup', 'aria-label': g[1], style: 'flex:1 1 360px;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px;padding:4px;border-radius:18px;background:#0B0C0B' },
            STATES.map(function (st) {
              var k = st[0], on = k === cur;
              var bg = !on ? 'transparent' : k === 'avoid' ? '#2A1A14' : k === 'normal' ? '#1F2320' : '#D6FF3E';
              var fg = !on ? '#9AA093' : k === 'avoid' ? '#FF9B7A' : k === 'normal' ? '#F2F4EE' : '#0C0E0B';
              return h('button', {
                role: 'radio', 'aria-checked': on ? 'true' : 'false',
                style: 'border:0;cursor:pointer;min-height:44px;padding:0 6px;border-radius:14px;background:' + bg + ';color:' + fg + ';font:600 13.5px/1.1 Barlow',
                text: st[1],
                onclick: function () {
                  setAns(function (a) {
                    ['focus', 'less', 'avoid'].forEach(function (x) { a[x] = a[x].filter(function (y) { return y !== key; }); });
                    if (k !== 'normal') a[k].push(key);
                  });
                },
              });
            })),
        ]);
      }));
    }

    var pv = quizPreview();
    var bottom = h('div', { style: 'margin-top:auto;display:flex;flex-direction:column;gap:12px;padding-top:8px' }, [
      h('div', { style: 'border-radius:22px;background:#131513;box-shadow:inset 0 0 0 1px rgba(255,255,255,.06);padding:14px 18px;display:flex;flex-wrap:wrap;align-items:center;gap:8px 22px' },
        [h('span', { style: 'font:600 11.5px/1 Barlow;letter-spacing:.14em;color:#9AA093', text: 'SO FAR' })]
          .concat(pv.stats.map(function (p) {
            return h('span', { style: 'display:flex;align-items:baseline;gap:6px' }, [
              h('b', { style: "font:700 24px/1 'Barlow Condensed';color:#F2F4EE", text: String(p[0]) }),
              h('span', { style: 'font:400 13.5px/1 Barlow;color:#9AA093', text: p[1] }),
            ]);
          }))
          .concat([h('span', { style: 'flex:1 1 100%;font:400 13.5px/1.45 Barlow;color:' + pv.color, text: pv.line })])),
      h('div', { style: 'display:flex;gap:10px;justify-content:flex-end' }, [
        h('button', {
          disabled: !ready, hov: '#E6FF7A',
          style: 'border:0;cursor:pointer;height:62px;padding:0 30px;border-radius:22px;background:' + (ready ? '#D6FF3E' : '#5E6458') + ';color:#0C0E0B;font:600 17px/1 Barlow;display:flex;align-items:center;gap:12px;min-width:200px;justify-content:center',
          onclick: function () { if (!ready) return; if (last) build(); else set({ qi: S.qi + 1 }); },
        }, [last ? (ready ? 'Build it' : 'Loading…') : 'Next', I.chev('#0C0E0B')]),
      ]),
    ]);

    return h('section', { style: 'min-height:calc(100dvh - 64px);box-sizing:border-box;display:flex;flex-direction:column' }, [
      top,
      h('div', { style: 'flex:1;max-width:1100px;width:100%;margin:0 auto;padding:clamp(24px,5vh,56px) 24px 24px;box-sizing:border-box;display:flex;flex-direction:column;gap:clamp(18px,3vh,30px)' }, [
        h('div', { style: 'display:flex;flex-direction:column;gap:14px;animation:stepIn .35s cubic-bezier(.2,.8,.2,1)' }, [
          h('h2', { style: "margin:0;font:700 clamp(44px,6.4vw,92px)/.9 'Barlow Condensed';letter-spacing:-.02em;text-wrap:balance", text: q.ask }),
          h('p', { style: 'margin:0;font:400 clamp(15px,1.2vw,18px)/1.55 Barlow;color:#9AA093;max-width:760px;text-wrap:pretty', text: q.why }),
        ]),
        answers,
        bottom,
      ]),
    ]);
  }

  /* ---------- 03 Editor: the step heading every step opens with ---------- */

  function stepHead(n, title, body, lime) {
    return h('div', { style: 'display:flex;align-items:flex-start;gap:14px' }, [
      h('span', { style: "width:32px;height:32px;border-radius:16px;background:" + (lime ? '#D6FF3E' : '#1F2320') + ";color:" + (lime ? '#0C0E0B' : '#D6FF3E') + ";display:flex;align-items:center;justify-content:center;font:700 17px/1 'Barlow Condensed';flex:none;margin-top:2px", text: n }),
      h('div', { style: 'flex:1;min-width:0;display:flex;flex-direction:column;gap:5px' }, [
        h('h2', { style: "margin:0;font:700 clamp(26px,2.4vw,34px)/1 'Barlow Condensed'", text: title }),
        body && h('span', { style: 'font:400 14px/1.45 Barlow;color:#9AA093;text-wrap:pretty', text: body }),
      ]),
    ]);
  }

  function gripCell(onGrip) {
    return h('span', {
      'aria-hidden': 'true', title: 'Drag to reorder', onpointerdown: onGrip, hov: '#1C1F1C', hovc: '#C9CEC2',
      style: 'width:26px;height:44px;flex:none;display:flex;align-items:center;justify-content:center;cursor:grab;touch-action:none;color:#5E6458;border-radius:10px',
    }, [I.grip()]);
  }

  function numCell(v) {
    return h('span', { style: "width:64px;text-align:right;font:700 19px/1 'Barlow Condensed';font-variant-numeric:tabular-nums;color:#F2F4EE", text: v });
  }

  function colLabel(t) {
    return h('span', { style: 'width:64px;text-align:right;font:600 10.5px/1 Barlow;letter-spacing:.12em;color:#7E847A', text: t });
  }

  function viewWorkouts() {
    var T = S.prog.templates, lifts = S.prog.lifts, ci = curIdx();

    var rail = h('div', { 'data-rail': '', style: 'display:flex;flex-direction:column;gap:6px' }, T.map(function (t, i) {
      var dv = dragView('w', i);
      var letter = String.fromCharCode(65 + i);
      var meta = t.items.length
        ? t.items.length + ' lift' + (t.items.length === 1 ? '' : 's') + ' · ' + t.items.reduce(function (a, x) { return a + x.sets; }, 0) + ' sets · ~' + mins(t.items) + ' min'
        : 'Empty';
      return h('div', { 'data-dk': 'w', 'data-di': dv.di, style: 'display:flex;align-items:center;gap:2px;opacity:' + dv.dOp + ';outline:' + dv.dOl + ';outline-offset:2px;border-radius:18px' }, [
        gripCell(dv.onGrip),
        h('button', {
          'aria-current': i === ci ? 'true' : 'false', hov: '#1C1F1C',
          style: 'border:0;cursor:pointer;text-align:left;min-height:64px;padding:10px 12px;border-radius:18px;background:' + (i === ci ? '#1C1F1C' : 'transparent') + ';box-shadow:' + (i === ci ? 'inset 0 0 0 1.5px #D6FF3E' : 'inset 0 0 0 1px rgba(255,255,255,.07)') + ';color:#F2F4EE;display:flex;align-items:center;gap:12px;flex:1;min-width:0',
          onclick: function () { set({ col: i }); },
        }, [
          h('span', { style: "width:34px;height:34px;border-radius:11px;background:" + (i === ci ? '#D6FF3E' : '#1F2320') + ";color:" + (i === ci ? '#0C0E0B' : '#C9CEC2') + ";display:flex;align-items:center;justify-content:center;font:700 18px/1 'Barlow Condensed';flex:none", text: letter }),
          h('span', { style: 'flex:1;min-width:0;display:flex;flex-direction:column;gap:4px' }, [
            h('span', { style: 'font:600 15.5px/1.2 Barlow;overflow:hidden;text-overflow:ellipsis;white-space:nowrap', text: (t.name || '').trim() || 'Workout ' + letter }),
            h('span', { style: 'font:400 12.5px/1.2 Barlow;color:#9AA093;white-space:nowrap', text: meta }),
          ]),
        ]),
      ]);
    }));

    var nav = h('nav', { 'aria-label': 'Workouts', style: 'flex:1 1 230px;max-width:100%;min-width:0;display:flex;flex-direction:column;gap:6px' }, [
      rail,
      T.length < MAX_WORKOUTS ? h('button', {
        hov: '#131513', hovc: '#F2F4EE',
        style: 'border:0;cursor:pointer;min-height:52px;padding:0 14px;border-radius:18px;background:transparent;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.1);color:#C9CEC2;display:flex;align-items:center;gap:12px;font:600 15px/1 Barlow',
        onclick: function () {
          if (T.length >= MAX_WORKOUTS) return;
          setProg(function (p) {
            p.templates.push({ id: nid('t', p), name: NAMES[p.templates.length] || 'Workout ' + String.fromCharCode(65 + p.templates.length), items: [] });
          });
          set({ col: T.length });
        },
      }, [
        h('span', { style: 'width:34px;height:34px;border-radius:11px;background:#1F2320;display:flex;align-items:center;justify-content:center;flex:none' }, [I.plus('#D6FF3E')]),
        'Add a workout',
        h('span', { style: 'margin-left:auto;font:500 12.5px/1 Barlow;color:#7E847A', text: T.length + ' of ' + MAX_WORKOUTS }),
      ]) : h('span', { style: 'padding:4px 6px;font:400 13px/1.45 Barlow;color:#9AA093', text: 'Seven workouts is the most a program holds.' }),
    ]);

    var t = T[ci], letter = String.fromCharCode(65 + ci);
    var shortName = (t.name || '').trim() || 'workout ' + letter;
    var tMeta = t.items.length
      ? t.items.length + ' lift' + (t.items.length === 1 ? '' : 's') + ' · ' + t.items.reduce(function (a, x) { return a + x.sets; }, 0) + ' sets · ~' + mins(t.items) + ' min'
      : 'Empty';

    var rows = t.items.map(function (it, ii) {
      var r = lifts[it.exId] || { n: '?', e: '' };
      var ss = ssView(t.items, ii, ci);
      var dv = dragView('l', ii);
      var reps = it.lo === it.hi ? String(it.lo) : it.lo + '–' + it.hi;
      var pres = it.sets + ' × ' + reps + ' @ ' + it.rir + ' in reserve · ' + restLabel(it.rest) + (it.warm ? ' · ' + it.warm + ' warm-up' : '');
      return h('li', { 'data-dk': 'l', 'data-di': dv.di, style: 'opacity:' + dv.dOp + ';outline:' + dv.dOl + ';outline-offset:1px;display:flex;flex-direction:column;border-radius:' + ss.ssRadius + ';background:' + ss.ssBg + ';box-shadow:' + ss.ssRail }, [
        ss.ssHead && h('span', { style: 'padding:12px 12px 2px 40px;font:600 10.5px/1 Barlow;letter-spacing:.14em;color:#D6FF3E', text: ss.ssHead }),
        h('div', { style: 'display:flex;align-items:center' }, [
          gripCell(dv.onGrip),
          h('button', {
            hov: '#1C1F1C',
            style: 'border:0;cursor:pointer;flex:1;min-width:0;text-align:left;min-height:58px;padding:10px;border-radius:14px;background:transparent;color:#F2F4EE;display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px',
            onclick: function () { set({ edit: { ti: ci, ii: ii } }); },
          }, [
            h('span', { style: "width:20px;font:700 16px/1 'Barlow Condensed';color:#7E847A;text-align:center;flex:none", text: String(ii + 1) }),
            h('span', { style: 'flex:1 1 180px;min-width:0;display:flex;flex-direction:column;gap:3px' }, [
              h('span', { style: 'font:600 15.5px/1.25 Barlow;overflow-wrap:anywhere', text: r.n }),
              h('span', { 'data-narrow': '', style: 'font:400 13px/1.3 Barlow;color:#9AA093', text: pres }),
              it.warm ? h('span', { 'data-wide': '', style: 'font:400 12.5px/1.2 Barlow;color:#9AA093', text: it.warm + ' warm-up set' + (it.warm === 1 ? '' : 's') }) : null,
            ]),
            h('span', { 'data-wide': '', style: 'display:flex;gap:4px' }, [
              numCell(String(it.sets)), numCell(reps), numCell(String(it.rir)), numCell(restLabel(it.rest)),
            ]),
            ico('<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5E6458" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="flex:none"><path d="M9 6l6 6-6 6"/></svg>'),
          ]),
        ]),
        ss.canLink && h('button', {
          'aria-label': ss.linkAria, hov: '#1F2320', hovc: '#F2F4EE',
          style: 'border:0;cursor:pointer;align-self:flex-start;margin:-4px 0 2px 60px;height:32px;padding:0 10px;border-radius:16px;background:transparent;color:' + ss.linkFg + ';display:flex;align-items:center;gap:6px;font:500 12.5px/1 Barlow',
          onclick: ss.toggleLink,
        }, [I.chain(), ss.linkLabel]),
      ]);
    });

    var detail = h('article', { style: 'flex:3 1 420px;min-width:0;border-radius:24px;background:#161917;box-shadow:inset 0 1px 0 rgba(255,255,255,.05);display:flex;flex-direction:column' }, [
      h('header', { style: 'padding:16px 14px 14px 18px;display:flex;align-items:flex-start;gap:12px;border-bottom:1px solid rgba(255,255,255,.06)' }, [
        h('span', { style: "width:40px;height:40px;border-radius:13px;background:#D6FF3E;color:#0C0E0B;display:flex;align-items:center;justify-content:center;font:700 21px/1 'Barlow Condensed';flex:none", text: letter }),
        h('div', { style: 'flex:1;min-width:0;display:flex;flex-direction:column;gap:6px' }, [
          h('input', {
            value: t.name, 'aria-label': 'Workout name', maxlength: '30', 'data-fk': 'wname',
            style: "width:100%;min-width:0;border:0;background:transparent;color:#F2F4EE;font:700 28px/1 'Barlow Condensed';padding:0;outline:none",
            oninput: function (e) { var x = e.target.value; setProg(function (p) { p.templates[ci].name = x; }); },
          }),
          h('span', { style: 'font:400 13.5px/1.2 Barlow;color:#9AA093', text: tMeta }),
        ]),
        h('button', {
          'aria-label': 'Remove ' + ((t.name || '').trim() || 'this workout'), hov: '#1F2320', hovc: '#FF9B7A',
          style: 'border:0;cursor:pointer;height:40px;padding:0 12px;border-radius:14px;background:transparent;display:flex;align-items:center;gap:8px;color:#9AA093;font:500 13.5px/1 Barlow;flex:none',
          onclick: function () {
            if (T.length <= 1) { flash('A program needs at least one workout'); return; }
            setProg(function (p) { p.templates.splice(ci, 1); });
            set({ col: Math.max(0, ci - 1) });
          },
        }, [I.bin(), 'Remove']),
      ]),
      t.items.length ? h('div', { 'data-wide': '', style: 'display:flex;align-items:center;gap:12px;padding:12px 18px 4px' }, [
        h('span', { style: 'width:20px' }),
        h('span', { style: 'flex:1;font:600 10.5px/1 Barlow;letter-spacing:.12em;color:#7E847A', text: 'LIFT' }),
        h('span', { style: 'display:flex;gap:4px' }, [colLabel('SETS'), colLabel('REPS'), colLabel('RESERVE'), colLabel('REST')]),
        h('span', { style: 'width:16px' }),
      ]) : null,
      h('ol', { style: 'list-style:none;margin:0;padding:6px 8px;display:flex;flex-direction:column;gap:2px' },
        t.items.length ? rows : [h('li', { style: 'min-height:120px;margin:6px 2px;border-radius:16px;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.08);display:flex;align-items:center;justify-content:center;padding:20px;text-align:center;font:400 14.5px/1.5 Barlow;color:#9AA093', text: 'No lifts in this workout yet.' })]),
      h('div', { style: 'padding:4px 12px 12px' }, [
        h('button', {
          hov: 'rgba(214,255,62,.06)',
          style: 'border:0;cursor:pointer;width:100%;height:50px;border-radius:16px;background:transparent;box-shadow:inset 0 0 0 1.5px rgba(214,255,62,.3);color:#D6FF3E;font:600 15px/1 Barlow;display:flex;align-items:center;justify-content:center;gap:8px',
          onclick: function () { set({ pick: ci, pickQ: '', added: 0 }); },
        }, [I.plus('currentColor'), 'Add a lift to ' + shortName]),
      ]),
    ]);

    return h('div', { style: 'display:flex;flex-direction:column;gap:14px' }, [
      stepHead('1', 'Workouts', 'Up to seven, trained in this order and then from the top again. Pick a workout to see its lifts, tap a lift to change it, and link two lifts in a row to make a superset. Drag the dotted handles to reorder.'),
      h('div', { style: 'display:flex;flex-wrap:wrap;gap:12px;align-items:flex-start' }, [nav, detail]),
    ]);
  }

  /* ---------- 03 Editor: step 2, how it progresses ---------- */

  function viewBlock() {
    var P = S.prog, T = P.templates, B = P.block, on = !!B, multi = T.length > 1;

    // The straight line is drawn for the reserve most of the lifts actually ask for, so the
    // numbers on the chart are numbers the reader recognises from their own workouts.
    var cnt = {};
    T.forEach(function (t) { t.items.forEach(function (i) { cnt[i.rir] = (cnt[i.rir] || 0) + 1; }); });
    var base = +(Object.keys(cnt).sort(function (x, y) { return cnt[y] - cnt[x]; })[0] || 2);

    var offs = on ? (B.rirPerWeek && B.rirPerWeek.length === B.weeks ? B.rirPerWeek.slice()
      : Array.from({ length: B.weeks }, function (_, w) { return line(B.weeks, w); })) : [];

    function setOffs(fn) {
      setProg(function (p) {
        var cur = p.block.rirPerWeek && p.block.rirPerWeek.length === p.block.weeks
          ? p.block.rirPerWeek.slice()
          : Array.from({ length: p.block.weeks }, function (_, w) { return line(p.block.weeks, w); });
        p.block.rirPerWeek = fn(cur);
      });
    }
    function setWeeks(n) {
      setProg(function (p) {
        p.block.weeks = Math.max(2, Math.min(12, n));
        delete p.block.rirPerWeek;   // a ramp drawn for four weeks says nothing about six
      });
    }

    var custom = on && !!B.rirPerWeek && B.rirPerWeek.length === B.weeks &&
      B.rirPerWeek.some(function (x, i) { return x !== line(B.weeks, i); });

    var kids = [
      h('div', { style: 'display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px' }, [
        h('span', { style: 'font:500 15px/1.2 Barlow', text: 'Weights in' }),
        h('div', { role: 'radiogroup', 'aria-label': 'Unit', style: 'display:flex;gap:4px;padding:4px;border-radius:16px;background:#131513' },
          ['kg', 'lb'].map(function (u) {
            var sel = P.unit === u;
            return h('button', {
              role: 'radio', 'aria-checked': sel ? 'true' : 'false', text: u,
              style: 'border:0;cursor:pointer;height:38px;min-width:52px;padding:0 12px;border-radius:12px;background:' + (sel ? '#D6FF3E' : 'transparent') + ';color:' + (sel ? '#0C0E0B' : '#9AA093') + ';font:600 14px/1 Barlow',
              onclick: function () { setProg(function (p) { p.unit = u; }); },
            });
          })),
      ]),
      h('div', { style: 'height:1px;background:rgba(255,255,255,.06)' }),
      h('div', {
        role: 'switch', 'aria-checked': on ? 'true' : 'false', tabindex: '0',
        style: 'display:flex;align-items:center;gap:14px;cursor:pointer;min-height:44px',
        onclick: function () { setProg(function (p) { p.block = p.block ? null : { startDay: window.REGOL.planner.todayDay(), weeks: 4 }; }); },
        onkeydown: function (e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); e.currentTarget.click(); } },
      }, [
        h('span', { style: 'flex:1;display:flex;flex-direction:column;gap:4px' }, [
          h('span', { style: 'font:500 15px/1.2 Barlow', text: 'Run it as a block' }),
          h('span', { style: 'font:400 13px/1.4 Barlow;color:#9AA093', text: on ? B.weeks + ' weeks' + (B.deload !== false ? ', then a deload week' : ', no deload') + '. Needs REGOL 1.9 or newer.' : 'Off: the rotation repeats at the reserve each lift asks for.' }),
        ]),
        h('span', { style: 'width:52px;height:30px;border-radius:15px;background:' + (on ? '#D6FF3E' : '#2B2F29') + ';position:relative;flex:none;transition:background .15s ease' }, [
          h('span', { style: 'position:absolute;top:3px;left:' + (on ? 25 : 3) + 'px;width:24px;height:24px;border-radius:12px;background:' + (on ? '#0C0E0B' : '#9AA093') + ';transition:left .15s ease' }),
        ]),
      ]),
    ];

    if (on) {
      kids.push(h('div', { style: 'display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px' }, [
        h('span', { style: 'display:flex;flex-direction:column;gap:4px' }, [
          h('span', { style: 'font:500 15px/1.2 Barlow', text: 'Training weeks' }),
          h('span', { style: 'font:400 13px/1.4 Barlow;color:#9AA093', text: 'Before the deload' }),
        ]),
        h('span', { style: 'display:flex;align-items:center;gap:8px' }, [
          h('button', { 'aria-label': 'Fewer weeks', hov: '#262A26', style: 'border:0;cursor:pointer;width:40px;height:40px;border-radius:13px;background:#1F2320;display:flex;align-items:center;justify-content:center;flex:none', onclick: function () { setWeeks(B.weeks - 1); } }, [I.minus('#F2F4EE')]),
          h('span', { style: "min-width:40px;text-align:center;font:700 26px/1 'Barlow Condensed'", text: String(B.weeks) }),
          h('button', { 'aria-label': 'More weeks', hov: '#262A26', style: 'border:0;cursor:pointer;width:40px;height:40px;border-radius:13px;background:#1F2320;display:flex;align-items:center;justify-content:center;flex:none', onclick: function () { setWeeks(B.weeks + 1); } }, [I.plus('#F2F4EE', 14)]),
        ]),
      ]));

      var top = base + 3;
      var cols = offs.map(function (o, w) {
        var val = Math.max(0, base + o);
        return h('div', { style: 'min-width:0;display:flex;flex-direction:column;align-items:center;gap:8px' }, [
          h('span', { style: "font:700 22px/1 'Barlow Condensed';color:" + (o < 0 ? '#D6FF3E' : '#F2F4EE') + ';font-variant-numeric:tabular-nums', text: String(val) }),
          h('div', { style: 'width:100%;height:120px;display:flex;align-items:flex-end;justify-content:center' }, [
            h('div', { style: 'width:min(44px,100%);height:' + Math.round(22 + 78 * val / top) + '%;border-radius:10px 10px 4px 4px;background:' + (o < 0 ? '#D6FF3E' : '#C9CEC2') + ';transition:height .2s ease' }),
          ]),
          h('span', { style: 'font:600 11px/1 Barlow;letter-spacing:.08em;color:#9AA093;white-space:nowrap', text: 'W' + (w + 1) }),
          h('div', { style: 'display:flex;flex-direction:column;gap:4px;width:100%;max-width:44px' }, [
            h('button', { 'aria-label': 'Week ' + (w + 1) + ': one rep easier', hov: '#262A26', style: 'border:0;cursor:pointer;height:32px;border-radius:10px;background:#1F2320;display:flex;align-items:center;justify-content:center', onclick: function () { setOffs(function (c) { c[w] = Math.min(3, c[w] + 1); return c; }); } }, [I.up()]),
            h('button', { 'aria-label': 'Week ' + (w + 1) + ': one rep harder', hov: '#262A26', style: 'border:0;cursor:pointer;height:32px;border-radius:10px;background:#1F2320;display:flex;align-items:center;justify-content:center', onclick: function () { setOffs(function (c) { c[w] = Math.max(-4, c[w] - 1); return c; }); } }, [I.down()]),
          ]),
        ]);
      });

      var hasDeload = B.deload !== false;
      cols.push(h('div', { style: 'min-width:0;display:flex;flex-direction:column;align-items:center;gap:8px' }, [
        h('span', { style: "font:700 22px/1 'Barlow Condensed';color:" + (hasDeload ? '#9AA093' : '#5E6458') + ';font-variant-numeric:tabular-nums', text: hasDeload ? String(base) : '–' }),
        h('div', { style: 'width:100%;height:120px;display:flex;align-items:flex-end;justify-content:center' }, [
          h('div', { style: 'width:min(44px,100%);height:' + (hasDeload ? 18 : 6) + '%;border-radius:10px 10px 4px 4px;background:transparent;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,' + (hasDeload ? '.22' : '.1') + ')' }),
        ]),
        h('span', { style: 'font:600 11px/1 Barlow;letter-spacing:.08em;color:' + (hasDeload ? '#9AA093' : '#7E847A') + ';white-space:nowrap', text: hasDeload ? 'DELOAD' : 'NO DELOAD' }),
        h('button', {
          'aria-label': hasDeload ? 'Leave the deload week out' : 'Add the deload week back', hovc: '#F2F4EE',
          style: 'border:0;cursor:pointer;height:68px;width:100%;max-width:44px;border-radius:10px;background:#1F2320;color:#C9CEC2;display:flex;align-items:center;justify-content:center',
          onclick: function () { setProg(function (p) { p.block.deload = p.block.deload === false; }); },
        }, [hasDeload ? I.cross() : I.plus('currentColor', 14)]),
      ]));

      kids.push(h('div', { style: 'display:flex;flex-direction:column;gap:10px' }, [
        h('div', { style: 'display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:8px' }, [
          h('span', { style: 'font:600 11.5px/1 Barlow;letter-spacing:.14em;color:#9AA093', text: 'REPS IN RESERVE, WEEK BY WEEK · TALLER IS EASIER' }),
          custom && h('button', { hovc: '#F2F4EE', style: 'border:0;cursor:pointer;height:30px;padding:0 12px;border-radius:15px;background:#1F2320;color:#C9CEC2;font:500 13px/1 Barlow;white-space:nowrap', text: 'Back to the straight line', onclick: function () { setProg(function (p) { delete p.block.rirPerWeek; }); } }),
        ]),
        h('div', { style: 'display:grid;grid-template-columns:repeat(' + (B.weeks + 1) + ',minmax(0,1fr));gap:6px;align-items:end;border-radius:20px;background:#0F110F;padding:14px 10px 10px' }, cols),
        h('span', { style: 'font:400 13px/1.5 Barlow;color:#9AA093;text-wrap:pretty', text: 'Numbers are for a lift planned at ' + base + ' in reserve; every lift moves by the same amount and never goes below 0. The arrows move a week up (easier, one more rep in reserve) or down (harder). The deload week halves the sets.' }),
      ]));
    }

    if (on && !multi) {
      kids.push(h('span', { style: 'font:400 13px/1.5 Barlow;color:#FF9B7A', text: 'A block runs across a rotation, so it needs at least two workouts. Add a second one and it travels with the program.' }));
    }

    return h('div', { style: 'display:flex;flex-direction:column;gap:14px' }, [
      stepHead('2', 'How it progresses', 'Run the rotation as it is, or as a block: a set number of weeks that get harder, then a deload week.'),
      h('div', { style: 'border-radius:26px;background:#161917;box-shadow:inset 0 1px 0 rgba(255,255,255,.05);padding:20px;display:flex;flex-direction:column;gap:16px' }, kids),
    ]);
  }

  /* ---------- 03 Editor: step 3, the balance ---------- */

  function viewVolume() {
    var vol = [];
    try { vol = window.REGOL.volume(S.prog); } catch (e) { vol = []; }
    var rows = vol.filter(function (x) { return x.sets > 0; }).sort(function (a, b) { return b.sets - a.sets; });
    var vmax = Math.max.apply(null, [16].concat(rows.map(function (x) { return Math.max(x.sets, x.hi || 0); })));

    var body = rows.length ? rows.map(function (x) {
      var bar = x.state === 'light' ? '#FF7043' : x.state === 'heavy' ? '#E6C84A' : '#D6FF3E';
      var label = x.state === 'on' ? 'on target' : x.state === 'light' ? 'light' : x.state === 'heavy' ? 'heavy' : '';
      var col = x.state === 'light' ? '#FF9B7A' : x.state === 'heavy' ? '#E6C84A' : '#9AA093';
      return h('div', { style: 'display:grid;grid-template-columns:88px minmax(0,1fr) 26px 58px;align-items:center;gap:10px' }, [
        h('span', { style: 'font:500 14px/1.2 Barlow;color:#E4E8DC;white-space:nowrap;overflow:hidden;text-overflow:ellipsis', text: x.group }),
        h('div', { style: 'position:relative;height:10px;border-radius:5px;background:#1F2320' }, [
          x.lo ? h('div', { style: 'position:absolute;top:-3px;bottom:-3px;left:' + (x.lo / vmax * 100) + '%;width:' + ((x.hi - x.lo) / vmax * 100) + '%;border-radius:4px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.18)' }) : null,
          h('div', { style: 'position:absolute;left:0;top:0;bottom:0;width:' + Math.min(100, x.sets / vmax * 100) + '%;border-radius:5px;background:' + bar }),
        ]),
        h('b', { style: "font:700 17px/1 'Barlow Condensed';text-align:right;font-variant-numeric:tabular-nums", text: String(x.sets) }),
        h('span', { style: 'font:500 12px/1 Barlow;color:' + col + ';text-align:right', text: label }),
      ]);
    }) : [h('span', { style: 'font:400 14px/1.5 Barlow;color:#9AA093', text: 'Add lifts and the week’s sets per muscle show up here.' })];

    return h('div', { style: 'display:flex;flex-direction:column;gap:14px' }, [
      stepHead('3', 'Check the balance', 'Hard sets a week for each muscle, against the range REGOL aims for (the outline).'),
      h('div', { style: 'border-radius:26px;background:#161917;box-shadow:inset 0 1px 0 rgba(255,255,255,.05);padding:20px;display:flex;flex-direction:column;gap:12px' }, body),
    ]);
  }

  /* ---------- 03 Editor: step 4, send it ---------- */

  function viewSend() {
    var P = S.prog, T = P.templates, L = S.link;
    var has = T.some(function (t) { return t.items.length; });
    var tooMany = T.length > 3;

    var title = !has ? 'Nothing to send yet.' : S.phone ? 'Open it on this phone.' : 'Scan the QR code.';
    var text = !has ? 'Add at least one lift and the code appears here.'
      : S.phone ? 'Tap Open in REGOL and the app imports the program. On another phone, send yourself the link.'
        : 'Point your phone’s camera at the code and open the link. REGOL imports the program.';

    var showQr = !S.phone && !!S.qr && has;
    var showOpen = S.phone && !!L && !!L.appUrl && !L.over && has;
    var warn = L && L.error ? 'This browser cannot make the code. Download the file instead, or open the page in a current Chrome, Edge, Firefox or Safari.'
      : L && L.over ? 'Too big for one code: ' + L.chars + ' of ' + MAX + ' characters. Take a lift out, or send the file instead.' : '';

    var qrPx = S.qr ? Math.max(200, Math.min(300, Math.round((S.qr.size + 8) * 2.2))) : 220;

    var planBody = tooMany
      ? 'The free plan starts up to 3 workouts and this program has ' + T.length + '. Without a subscription, ' +
        T.slice(3).map(function (t, i) { return (t.name || '').trim() || 'Workout ' + String.fromCharCode(68 + i); }).join(', ') +
        ' stay' + (T.length === 4 ? 's' : '') + ' visible but can’t be started. Everything is free until 31 December 2026, and a subscription starts with a free month.'
      : T.length + ' of 3 workouts the free plan starts. The free plan holds one program at a time, and everything is unlocked until 31 December 2026.';

    var card = h('div', { id: 'send', style: 'border-radius:24px;background:#D6FF3E;color:#0C0E0B;padding:16px;display:flex;flex-direction:column;gap:10px' }, [
      h('div', { style: 'display:flex;flex-direction:column;gap:6px' }, [
        h('span', { style: 'font:700 11px/1 Barlow;letter-spacing:.16em', text: 'SEND IT TO YOUR PHONE' }),
        h('h2', { style: "margin:0;font:700 24px/1 'Barlow Condensed'", text: title }),
        h('span', { style: 'font:400 14.5px/1.5 Barlow;color:#2E3415;text-wrap:pretty', text: text }),
      ]),
      showQr ? h('div', { style: 'display:flex;justify-content:center' }, [
        h('div', { style: 'width:' + qrPx + 'px;max-width:100%;aspect-ratio:1;flex:none;border-radius:14px;background:#FFFFFF;padding:8px;box-sizing:border-box', html: S.qr.svg }),
      ]) : null,
      showOpen ? h('a', {
        href: L.appUrl, hovc: '#D6FF3E',
        style: 'height:50px;border-radius:18px;background:#0C0E0B;color:#D6FF3E;text-decoration:none;display:flex;align-items:center;justify-content:center;gap:10px;font:600 17px/1 Barlow',
      }, [I.play(), 'Open in REGOL']) : null,
      warn ? h('div', { style: 'border-radius:16px;background:#0C0E0B;color:#FF9B7A;padding:12px 14px;font:500 14px/1.45 Barlow', text: warn }) : null,
      h('div', { style: 'display:flex;flex-wrap:wrap;justify-content:center;gap:8px' }, [
        h('button', {
          disabled: !(L && L.url && !L.over), hov: 'rgba(12,14,11,.16)',
          style: 'border:0;cursor:pointer;height:40px;padding:0 14px;border-radius:14px;background:rgba(12,14,11,.1);color:#0C0E0B;font:600 13.5px/1 Barlow;white-space:nowrap;flex:none',
          text: S.copied ? 'Link copied' : 'Copy the link',
          onclick: function () {
            if (!(L && L.url)) return;
            if (!navigator.clipboard) return;
            navigator.clipboard.writeText(L.url).then(function () {
              clearTimeout(copyTimer);
              S.copied = true; render();
              copyTimer = setTimeout(function () { S.copied = false; render(); }, 1600);
            });
          },
        }),
        h('button', {
          disabled: !has, hov: 'rgba(12,14,11,.16)',
          style: 'border:0;cursor:pointer;height:40px;padding:0 14px;border-radius:14px;background:rgba(12,14,11,.1);color:#0C0E0B;font:600 13.5px/1 Barlow;white-space:nowrap;flex:none',
          text: 'Download the file', onclick: download,
        }),
      ]),
      h('div', { style: 'border-radius:16px;background:rgba(12,14,11,.08);padding:12px 14px;display:flex;gap:10px;align-items:flex-start' }, [
        h('span', { style: 'width:22px;height:22px;border-radius:11px;background:#0C0E0B;color:#D6FF3E;display:flex;align-items:center;justify-content:center;flex:none;margin-top:1px' }, [tooMany ? I.bang() : I.tick()]),
        h('span', { style: 'display:flex;flex-direction:column;gap:4px;min-width:0' }, [
          h('strong', { style: 'font:700 15px/1.2 Barlow', text: tooMany ? 'Needs a subscription from 2027' : 'Works on the free plan' }),
          h('span', { style: 'font:400 13px/1.45 Barlow;color:#2E3415;text-wrap:pretty', text: planBody }),
        ]),
      ]),
    ]);

    return h('aside', { style: 'flex:1 1 340px;min-width:0;position:sticky;top:80px;display:flex;flex-direction:column;gap:12px' }, [
      h('div', { 'data-wide': '', style: 'display:flex;align-items:center;gap:14px;padding:0 4px' }, [
        h('span', { style: "width:32px;height:32px;border-radius:16px;background:#D6FF3E;color:#0C0E0B;display:flex;align-items:center;justify-content:center;font:700 17px/1 'Barlow Condensed';flex:none", text: '4' }),
        h('h2', { style: "margin:0;font:700 clamp(26px,2.4vw,34px)/1 'Barlow Condensed'", text: 'Send it' }),
      ]),
      card,
    ]);
  }

  function download() {
    var P = S.prog;
    if (!P || !P.templates.some(function (t) { return t.items.length; })) return;
    var b = new Blob([JSON.stringify(file(P), null, 1)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    a.download = ((P.name || 'program').trim().replace(/[^\w-]+/g, '-').toLowerCase() || 'program') + '.regol.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  /* ---------- 03 Editor ---------- */

  function viewEdit() {
    var P = S.prog, T = P.templates;
    var allSets = T.reduce(function (a, t) { return a + t.items.reduce(function (b, i) { return b + i.sets; }, 0); }, 0);
    var nLifts = Object.keys(P.lifts).filter(function (k) {
      return T.some(function (t) { return t.items.some(function (i) { return i.exId === k; }); });
    }).length;
    var longest = Math.max.apply(null, [0].concat(T.map(function (t) { return mins(t.items); })));
    var has = T.some(function (t) { return t.items.length; });
    var L = S.link;
    var showOpen = S.phone && !!L && !!L.appUrl && !L.over && has;

    var totals = [[T.length, T.length === 1 ? 'WORKOUT' : 'WORKOUTS'], [nLifts, 'LIFTS'], [allSets, 'SETS A WEEK'], ['~' + longest, 'MIN LONGEST']];

    var head = h('div', { style: 'display:flex;flex-direction:column;gap:10px' }, [
      h('div', { style: 'display:flex;align-items:center;gap:10px' }, [
        h('button', {
          hovc: '#F2F4EE',
          style: 'border:0;cursor:pointer;height:32px;padding:0 12px 0 8px;border-radius:16px;background:#1F2320;color:#C9CEC2;font:500 13px/1 Barlow;display:flex;align-items:center;gap:4px;white-space:nowrap;flex:none',
          onclick: function () { set({ stage: 'start', draft: P }); },
        }, [I.back('currentColor', 14), 'Start over']),
        // Not nowrap, which the design has: beside the "Start over" chip it wants 295px of a
        // 327px row at 375, refuses to shrink, and pushes the whole page sideways. It has the
        // room to stay on one line everywhere it fits, and wraps to two where it does not.
        h('span', { style: 'min-width:0;font:600 12px/1.35 Barlow;letter-spacing:.16em;color:#D6FF3E', text: 'YOUR PROGRAM · SAVED IN THIS BROWSER' }),
      ]),
      h('input', {
        value: P.name, 'aria-label': 'Program name', placeholder: 'Name it', maxlength: '40', 'data-fk': 'pname',
        style: "border:0;background:transparent;color:#F2F4EE;font:700 clamp(44px,5.6vw,80px)/.95 'Barlow Condensed';letter-spacing:-.02em;padding:0;outline:none;width:100%;min-width:0",
        oninput: function (e) { var x = e.target.value; setProg(function (p) { p.name = x; }); },
      }),
      h('div', { style: 'display:flex;flex-wrap:wrap;gap:6px 26px' }, totals.map(function (t) {
        return h('span', { style: 'display:flex;align-items:baseline;gap:7px' }, [
          h('b', { style: "font:700 26px/1 'Barlow Condensed';font-variant-numeric:tabular-nums", text: String(t[0]) }),
          h('span', { style: 'font:600 10.5px/1 Barlow;letter-spacing:.14em;color:#9AA093', text: t[1] }),
        ]);
      })),
    ]);

    var bar = h('div', { 'data-narrow': '', style: 'position:fixed;left:0;right:0;bottom:0;z-index:20;padding:12px 16px calc(12px + env(safe-area-inset-bottom));background:rgba(11,12,11,.92);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-top:1px solid rgba(255,255,255,.06);display:flex;gap:10px;align-items:center' }, [
      h('span', { style: 'flex:1;min-width:0;display:flex;flex-direction:column;gap:3px' }, [
        h('b', { style: "font:700 18px/1 'Barlow Condensed';white-space:nowrap;overflow:hidden;text-overflow:ellipsis", text: (P.name || '').trim() || 'Your program' }),
        h('span', { style: 'font:400 12.5px/1 Barlow;color:#9AA093', text: has ? T.length + ' workout' + (T.length === 1 ? '' : 's') + ' · ' + allSets + ' sets a week' : 'Add a lift to send it' }),
      ]),
      h('a', {
        href: showOpen ? L.appUrl : '#send',
        style: 'height:52px;padding:0 20px;border-radius:20px;background:#D6FF3E;color:#0C0E0B;text-decoration:none;display:flex;align-items:center;gap:8px;font:600 15px/1 Barlow;white-space:nowrap',
        onclick: function (e) {
          if (showOpen) return;
          e.preventDefault();
          var el = document.getElementById('send');
          if (el) scrollTo({ top: el.getBoundingClientRect().top + scrollY - 80, behavior: 'smooth' });
        },
      }, [showOpen ? 'Open in REGOL' : 'Send']),
    ]);

    return h('section', { style: 'padding:clamp(20px,3vh,36px) 0 120px' }, [
      h('div', { style: 'max-width:1400px;margin:0 auto;padding:0 24px;box-sizing:border-box;display:flex;flex-wrap:wrap;gap:28px 32px;align-items:flex-start' }, [
        h('div', { style: 'flex:3 1 640px;min-width:0;display:flex;flex-direction:column;gap:28px' }, [head, viewWorkouts(), viewBlock(), viewVolume()]),
        viewSend(),
      ]),
      bar,
    ]);
  }

  /* ---------- sheets ---------- */

  function sheetPick() {
    var T = S.prog.templates, pk = S.pick, lifts = S.prog.lifts;
    var lib = S.lib || [];
    var qq = (S.pickQ || '').trim().toLowerCase();
    var words = qq ? qq.split(/\s+/) : [];
    var onKit = EQUIP.filter(function (e) { return S.equip[e]; });

    var out = [];
    for (var i = 0; i < lib.length; i++) {
      var r = lib[i];
      if (onKit.length && onKit.indexOf(r.e) < 0) continue;
      if (words.length) { var k = rank(r, qq, words); if (k < 0) continue; out.push({ r: r, k: k }); }
      else { if (out.length >= 80) break; out.push({ r: r, k: 0 }); }
    }
    if (words.length) out.sort(function (a, b) { return a.k - b.k || a.r.n.length - b.r.n.length; });

    var inT = {};
    T[pk].items.forEach(function (it) { var e = lifts[it.exId] || {}; inT[e.n + '|' + e.e] = true; });

    var list = out.slice(0, 80).map(function (o) {
      var r = o.r, there = !!inT[r.n + '|' + r.e];
      return h('button', {
        hov: '#1A1D1A',
        style: 'border:0;cursor:pointer;text-align:left;min-height:60px;padding:10px 12px 10px 16px;border-radius:16px;background:transparent;color:#F2F4EE;display:flex;align-items:center;gap:12px',
        onclick: function () { addLift(r); },
      }, [
        h('span', { style: 'flex:1;min-width:0;display:flex;flex-direction:column;gap:4px' }, [
          h('b', { style: 'font:600 15.5px/1.25 Barlow', text: r.n }),
          h('span', { style: 'font:400 12.5px/1.3 Barlow;color:#9AA093', text: r.e + ' · ' + r.g + (r.s ? ', ' + r.s.join(', ') : '') }),
        ]),
        h('span', { style: 'height:30px;padding:0 10px;border-radius:10px;background:' + (there ? '#1F2320' : '#D6FF3E') + ';color:' + (there ? '#9AA093' : '#0C0E0B') + ';display:flex;align-items:center;font:600 12px/1 Barlow;flex:none', text: there ? 'In workout' : 'Add' }),
      ]);
    });

    var close = function () { set({ pick: null }); };

    return h('div', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Add a lift', style: 'position:fixed;inset:0;z-index:50;display:flex;align-items:flex-end;justify-content:center' }, [
      h('div', { style: 'position:absolute;inset:0;background:rgba(0,0,0,.66)', onclick: close }),
      h('div', { style: 'position:relative;width:min(720px,100%);height:min(86vh,820px);border-radius:30px 30px 0 0;background:#131513;box-shadow:0 -20px 60px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.06);display:flex;flex-direction:column;animation:sheetUp .28s cubic-bezier(.2,.8,.2,1)' }, [
        h('div', { style: 'padding:16px 16px 12px;display:flex;flex-direction:column;gap:12px;border-bottom:1px solid rgba(255,255,255,.06)' }, [
          h('div', { style: 'display:flex;align-items:center;gap:10px' }, [
            h('div', { style: 'flex:1;display:flex;flex-direction:column;gap:4px;padding-left:6px' }, [
              h('span', { style: "font:700 30px/1 'Barlow Condensed'", text: 'Add to ' + ((T[pk].name || '').trim() || 'workout') }),
              h('span', { style: 'font:400 13px/1 Barlow;color:#9AA093', text: S.added ? S.added + ' added · tap more, then Done' : lib.length ? 'Tap to add. Add several, then Done.' : 'Loading…' }),
            ]),
            h('button', { style: 'border:0;cursor:pointer;height:46px;padding:0 20px;border-radius:18px;background:#D6FF3E;color:#0C0E0B;font:600 15px/1 Barlow', text: 'Done', onclick: close }),
          ]),
          h('div', { style: 'display:flex;align-items:center;gap:10px;height:52px;border-radius:18px;background:#1A1D1A;box-shadow:inset 0 0 0 1px rgba(255,255,255,.1);padding:0 14px' }, [
            I.search(),
            h('input', {
              value: S.pickQ, placeholder: 'Search ' + (lib.length ? lib.length.toLocaleString('en-GB') : '1,577') + ' lifts', 'aria-label': 'Search lifts', 'data-fk': 'pickq',
              style: 'flex:1;min-width:0;border:0;background:transparent;color:#F2F4EE;font:400 16px/1 Barlow;outline:none',
              oninput: function (e) { set({ pickQ: e.target.value }); },
            }),
          ]),
          h('div', { style: 'display:flex;gap:6px;overflow-x:auto;scrollbar-width:none' }, EQUIP.map(function (e) {
            var on = !!S.equip[e];
            return h('button', {
              'aria-pressed': on ? 'true' : 'false', text: e,
              style: 'border:0;cursor:pointer;height:36px;padding:0 14px;border-radius:18px;background:' + (on ? '#D6FF3E' : '#1F2320') + ';color:' + (on ? '#0C0E0B' : '#C9CEC2') + ';font:600 13px/1 Barlow;white-space:nowrap;flex:none',
              onclick: function () { S.equip[e] = !S.equip[e]; render(); },
            });
          })),
        ]),
        h('div', { style: 'flex:1;min-height:0;overflow-y:auto;padding:8px;display:flex;flex-direction:column;gap:4px' },
          list.length ? list : [h('p', { style: 'margin:24px 0;text-align:center;font:400 15px/1.5 Barlow;color:#9AA093', text: lib.length ? 'Nothing matches that.' : 'Loading…' })]),
      ]),
    ]);
  }

  function sheetEdit() {
    var E = S.edit, T = S.prog.templates;
    var t = T[E.ti], it = t.items[E.ii], r = S.prog.lifts[it.exId] || { n: '?', e: '', g: '' };
    var tl = t.items.length;
    var close = function () { set({ edit: null }); };
    function patch(fn) { setProg(function (p) { fn(p.templates[E.ti].items[E.ii]); }); }

    var rows = [
      ['Sets', 'Working sets, warm-ups not counted', String(it.sets),
        function () { patch(function (x) { x.sets = Math.max(1, x.sets - 1); }); },
        function () { patch(function (x) { x.sets = Math.min(10, x.sets + 1); }); }],
      ['Reps from', 'Bottom of the range', String(it.lo),
        function () { patch(function (x) { x.lo = Math.max(1, x.lo - 1); }); },
        function () { patch(function (x) { x.lo = Math.min(30, x.lo + 1); if (x.hi < x.lo) x.hi = x.lo; }); }],
      ['Reps to', 'Top of the range', String(it.hi),
        function () { patch(function (x) { x.hi = Math.max(1, x.hi - 1); if (x.lo > x.hi) x.lo = x.hi; }); },
        function () { patch(function (x) { x.hi = Math.min(30, x.hi + 1); }); }],
      ['In reserve', 'Reps left at the end of each set', String(it.rir),
        function () { patch(function (x) { x.rir = Math.max(0, x.rir - 1); }); },
        function () { patch(function (x) { x.rir = Math.min(5, x.rir + 1); }); }],
      ['Rest', it.rest == null ? 'The app’s default for this lift' : 'Between sets', it.rest == null ? 'Default' : restLabel(it.rest),
        function () { patch(function (x) { x.rest = x.rest == null ? 105 : x.rest - 15; if (x.rest != null && x.rest < 30) x.rest = null; }); },
        function () { patch(function (x) { x.rest = x.rest == null ? 135 : Math.min(600, x.rest + 15); }); }],
    ];

    return h('div', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Edit lift', style: 'position:fixed;inset:0;z-index:50;display:flex;align-items:flex-end;justify-content:center' }, [
      h('div', { style: 'position:absolute;inset:0;background:rgba(0,0,0,.66)', onclick: close }),
      h('div', { style: 'position:relative;width:min(560px,100%);max-height:90vh;overflow-y:auto;border-radius:30px 30px 0 0;background:#131513;box-shadow:0 -20px 60px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.06);padding:18px 16px calc(20px + env(safe-area-inset-bottom));box-sizing:border-box;display:flex;flex-direction:column;gap:14px;animation:sheetUp .28s cubic-bezier(.2,.8,.2,1)' }, [
        h('div', { style: 'display:flex;align-items:flex-start;gap:10px;padding:0 4px' }, [
          h('div', { style: 'flex:1;min-width:0;display:flex;flex-direction:column;gap:5px' }, [
            h('span', { style: 'font:600 11.5px/1 Barlow;letter-spacing:.14em;color:#D6FF3E', text: (((t.name || 'Workout') + ' · lift ' + (E.ii + 1) + ' of ' + tl)).toUpperCase() }),
            h('span', { style: "font:700 30px/1 'Barlow Condensed';overflow-wrap:anywhere", text: r.n }),
            h('span', { style: 'font:400 13px/1.3 Barlow;color:#9AA093', text: r.e + ' · ' + r.g + (it.warm ? ' · ' + it.warm + ' warm-up set' + (it.warm === 1 ? '' : 's') + ' first' : '') }),
          ]),
          h('button', { style: 'border:0;cursor:pointer;height:46px;padding:0 20px;border-radius:18px;background:#D6FF3E;color:#0C0E0B;font:600 15px/1 Barlow;flex:none', text: 'Done', onclick: close }),
        ]),
        h('div', { style: 'border-radius:22px;background:#161917;display:flex;flex-direction:column' }, rows.map(function (row, i) {
          return h('div', { style: 'min-height:66px;display:flex;align-items:center;gap:10px;padding:8px 10px 8px 18px;border-top:' + (i ? '1px solid rgba(255,255,255,.06)' : 'none') }, [
            h('span', { style: 'flex:1;display:flex;flex-direction:column;gap:3px' }, [
              h('span', { style: 'font:500 16px/1.2 Barlow', text: row[0] }),
              h('span', { style: 'font:400 12.5px/1.3 Barlow;color:#9AA093', text: row[1] }),
            ]),
            h('button', { 'aria-label': 'Less ' + row[0].toLowerCase(), hov: '#262A26', style: 'border:0;cursor:pointer;width:46px;height:46px;border-radius:15px;background:#1F2320;display:flex;align-items:center;justify-content:center', onclick: row[3] }, [I.minus('#F2F4EE', 16)]),
            h('span', { style: "min-width:64px;text-align:center;font:700 26px/1 'Barlow Condensed';font-variant-numeric:tabular-nums", text: row[2] }),
            h('button', { 'aria-label': 'More ' + row[0].toLowerCase(), hov: '#262A26', style: 'border:0;cursor:pointer;width:46px;height:46px;border-radius:15px;background:#1F2320;display:flex;align-items:center;justify-content:center', onclick: row[4] }, [I.plus('#F2F4EE', 16)]),
          ]);
        })),
        h('div', { style: 'display:flex;flex-wrap:wrap;gap:8px' }, [
          h('button', {
            disabled: E.ii === 0, text: 'Move up',
            style: 'flex:1 1 120px;border:0;cursor:pointer;height:50px;border-radius:18px;background:#1F2320;color:' + (E.ii === 0 ? '#5E6458' : '#F2F4EE') + ';font:600 14px/1 Barlow',
            onclick: function () {
              if (!E.ii) return;
              // normSS after the swap, as after a drag: moving a lift out of a group can leave a
              // run of one, and a superset of one lift is not a superset.
              setProg(function (p) { var a = p.templates[E.ti].items, x = a[E.ii - 1]; a[E.ii - 1] = a[E.ii]; a[E.ii] = x; normSS(p, a); });
              set({ edit: { ti: E.ti, ii: E.ii - 1 } });
            },
          }),
          h('button', {
            disabled: E.ii === tl - 1, text: 'Move down',
            style: 'flex:1 1 120px;border:0;cursor:pointer;height:50px;border-radius:18px;background:#1F2320;color:' + (E.ii === tl - 1 ? '#5E6458' : '#F2F4EE') + ';font:600 14px/1 Barlow',
            onclick: function () {
              if (E.ii >= tl - 1) return;
              setProg(function (p) { var a = p.templates[E.ti].items, x = a[E.ii + 1]; a[E.ii + 1] = a[E.ii]; a[E.ii] = x; normSS(p, a); });
              set({ edit: { ti: E.ti, ii: E.ii + 1 } });
            },
          }),
          h('button', {
            text: 'Remove from ' + ((t.name || '').trim() || 'this workout'),
            style: 'flex:1 1 100%;border:0;cursor:pointer;height:50px;border-radius:18px;background:#2A1A14;color:#FF9B7A;font:600 14px/1 Barlow',
            onclick: function () {
              setProg(function (p) { var a = p.templates[E.ti].items; a.splice(E.ii, 1); normSS(p, a); });
              set({ edit: null });
            },
          }),
        ]),
      ]),
    ]);
  }

  /* ---------- render ---------- */

  function render() {
    if (!root) return;

    // A full rebuild loses the caret, so it is put back by hand. Each text field carries a key
    // that survives the rebuild; without this, typing a program name would reverse it one
    // character at a time as the cursor jumped home after every keystroke.
    var act = document.activeElement;
    var fk = act && act.dataset ? act.dataset.fk : null;
    var selA = fk ? act.selectionStart : null;
    var selB = fk ? act.selectionEnd : null;

    root.textContent = '';
    if (S.stage === 'start') root.appendChild(viewStart());
    else if (S.stage === 'quiz') root.appendChild(viewQuiz());
    else if (S.stage === 'edit' && S.prog) root.appendChild(viewEdit());
    else root.appendChild(viewStart());

    if (S.stage === 'edit' && S.prog) {
      if (S.pick != null && S.prog.templates[S.pick]) root.appendChild(sheetPick());
      var E = S.edit;
      if (E && S.prog.templates[E.ti] && S.prog.templates[E.ti].items[E.ii]) root.appendChild(sheetEdit());
    }
    if (S.toast) {
      root.appendChild(h('div', {
        role: 'status',
        style: 'position:fixed;left:50%;bottom:96px;transform:translateX(-50%);z-index:60;height:44px;padding:0 18px;border-radius:22px;background:#F2F4EE;color:#0C0E0B;display:flex;align-items:center;font:600 14px/1 Barlow;box-shadow:0 12px 30px rgba(0,0,0,.4);white-space:nowrap',
        text: S.toast,
      }));
    }

    if (fk) {
      var back = root.querySelector('[data-fk="' + fk + '"]');
      if (back) {
        back.focus();
        try { back.setSelectionRange(selA, selB); } catch (e) { /* not a text input */ }
      }
    }
  }

  /* ---------- start ---------- */

  function init() {
    root = document.getElementById('pm');
    if (!root) return;

    var mq = matchMedia('(pointer: coarse) and (hover: none)');
    S.phone = mq.matches;
    mq.addEventListener('change', function () { S.phone = mq.matches; render(); });

    try {
      var d = JSON.parse(localStorage.getItem(DRAFT));
      if (d && d.templates) S.draft = d;
    } catch (e) { /* private window, or something else wrote there */ }
    try {
      var a = JSON.parse(localStorage.getItem(ANS));
      if (a && a.days) S.answers = a;
    } catch (e) {}
    if (!S.answers) S.answers = blankAnswers();
    // Answers saved before the groups question had four states, or before it existed.
    ['focus', 'less', 'avoid', 'kit'].forEach(function (k) { if (!Array.isArray(S.answers[k])) S.answers[k] = k === 'kit' ? EQUIP.slice() : []; });

    render();

    fetch('lifts.json')
      .then(function (r) { return r.json(); })
      .then(function (rows) {
        byKey = {};
        rows.forEach(function (r) { byKey[r.n + '|' + r.e] = r; });
        S.lib = rows; render();
      })
      .catch(function () { S.lib = []; render(); });

    // program-plan.js and qr.js are ordinary scripts in the head, but the Next button must not
    // go live before they have. Polling is the cheap answer and costs nothing after the first try.
    (function wait() {
      if (window.REGOL && window.REGOL.plan && window.REGOL.qr) { S.ready = true; render(); return; }
      setTimeout(wait, 60);
    })();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
