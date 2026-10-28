// Try it: the twelve-step tour over the embedded app, and the calculator that
// asks the progression engine directly.
//
// The simulator is REGOL ITSELF, compiled to WebAssembly from the app's own source and loaded in
// an iframe. It used to be a hand-drawn HTML prototype, and the drawing drifted a whole version
// behind without anything noticing - its Stats screen was missing the three tiles 1.9 opens with.
// A picture of an app agrees with whatever you say about it; this one is built from the source.
//
// `?scene=` poses it. Only the scenes the sample log can actually reach: the drawing could show a
// live workout nobody started, and the real app cannot, which is the honest version.
//
// engine() below is still the app's RIR rule ported into JS, for the calculator further down the
// page - that one answers without loading the app at all.
//
// BUMP THIS WHENEVER try-app/ IS REBUILT.
//
// It is a cache key and nothing else. The iframe URL used to carry no version, the pages ship
// with `Cache-Control: max-age=600`, and the old prototype's engine was still on the server - so
// a browser holding the previous page served it from cache, found everything it asked for, and
// went on running the OLD app with nothing broken to show for it. That is not a theory; it is
// what happened on the 28 October deploy, and the only reason it was noticed is that somebody
// knew what the new one looked like.
//
// The prototype is gone now and so is its engine, so a stale cache would at least fail loudly.
// This stays anyway: failing loudly is not the same as being right.
const PROTOTYPE = '20261028';
(function () {
  'use strict';

  var TOUR = [
    ['Start', 'Start a workout', 'Today shows the next workout in your program on one card, with the weight the engine proposes for every lift. <b>Why these weights</b> sits on the card and opens the reason for each. Then tap <b>Start</b>.', 'today'],
    ['Why', 'Read the reasons', 'Every lift gets a sentence: green when it goes up, grey when it holds, red only when a weight actually comes down. These are the same words the live screen uses.', 'why'],
    ['Log', 'Log a set, then rate it', 'Weight and reps are already filled in. After the set, tap how many reps you had left, then <b>Log</b>. Change the reps or the reserve and watch <b>Next time</b> rewrite itself.', 'live'],
    ['Rest', 'Rest takes the screen', 'Logging starts the rest timer, full screen. <b>+30s</b> and <b>Skip</b> sit under your thumb. On the phone it rings and vibrates even on silent.', 'rest'],
    ['Set type', 'Pick a set type', 'Tap <b>Set type</b> next to the set for warm-up, drop set, rest-pause or AMRAP. Only normal sets and AMRAP move next time’s weight.', 'settype'],
    ['Options', 'Change this lift for today', '<b>Options</b> changes sets, rest and target reserve for this workout only, swaps the lift, or opens its history and settings.', 'liftopts'],
    ['Board', 'Machine taken? Jump around', 'The list icon opens the board: every lift in the workout and how far along it is. Tap one to go to it, or add a lift that is not in the template.', 'board'],
    ['Summary', 'Finish and read the verdict', 'The summary lists every new best, marks the set that beat it, and gives next time’s weight for each lift with its reason.', 'summary'],
    ['Lift', 'Every lift has a page', 'Estimated one-rep max over time, rep records, a percentage table and every session. <b>Settings</b> sets the step size and the lightest weight.', 'lift'],
    ['Progress', 'See the program working', 'Plans shows the active program and its rotation. <b>Progress since you started</b> lists every lift’s change since the program began.', 'progress'],
    ['Stats', 'Your history, readable', 'Workouts by week with a plain debrief, a calendar, and Stats: weekly tonnage and hard sets per muscle against targets you set.', 'stats'],
    ['You', 'Settings', 'Theme and accent, rest timer sound, weekly goal, the default progression rule, units, exports and backups. Everything lives on the phone. On the phone, Plans also lets you hand a template or program to a friend as a code.', 'settings']
  ];

  var PRESETS = [
    [{ w: 80, inc: 2.5, lo: 8, hi: 10, t: 2 }, [[10, 4], [10, 4], [10, 4]]],
    [{ w: 80, inc: 2.5, lo: 8, hi: 10, t: 2 }, [[9, 2], [9, 2], [8, 2]]],
    [{ w: 80, inc: 2.5, lo: 8, hi: 10, t: 2 }, [[10, 4], [9, 2], [8, 0]]],
    [{ w: 10, inc: 2.5, lo: 10, hi: 12, t: 2 }, [[12, 3], [11, 3], [11, 3]]],
    [{ w: 100, inc: 2.5, lo: 5, hi: 8, t: 1 }, [[5, 0], [4, 0], [3, 0]]]
  ];

  /* ---------- the engine ---------- */

  function engine(f, sets) {
    var repWord = function (n) { return n === 1 ? '1 rep' : n + ' reps'; };
    var resWord = function (n) { return n <= 0 ? 'nothing left in reserve' : 'about ' + repWord(n) + ' left in reserve'; };
    var clean = function (x) { return Math.round(x * 100) / 100; }, fmt = function (x) { return String(clean(x)); };
    var w = +f.w || 0, inc = +f.inc || 2.5, lo = Math.min(+f.lo, +f.hi), hi = Math.max(+f.lo, +f.hi), t = +f.t;
    var S = sets.map(function (s) { return [+s[0] || 0, +s[1] || 0]; });
    if (!S.length || w <= 0) return { kind: 'hold', w: w, d: 0, text: 'Log at least one set.', reps: hi };
    var reps = S.map(function (s) { return s[0]; });
    var avg = Math.round(S.reduce(function (a, s) { return a + s[1]; }, 0) / S.length);
    var lowest = Math.min.apply(null, reps);
    var over = Math.round(S.reduce(function (a, s) { return a + (s[1] - t); }, 0) / S.length);
    var allAt = reps.every(function (r) { return r >= hi; }), allPast = reps.every(function (r) { return r > hi; });
    var shortIdx = reps.findIndex(function (r) { return r < lo; }), shortBy = shortIdx >= 0 ? lo - lowest : 0;
    var oneRm = Math.max.apply(null, S.map(function (s) { return w * (1 + (s[0] + s[1]) / 30); }));
    var earned = function (want) {
      var k = 0;
      while (k < want) {
        var next = w + (k + 1) * inc;
        if (30 * (oneRm / next - 1) - t < lo - 2 - 1e-9) break;
        k++;
      }
      return k;
    };
    var P = function (kind, d, text) {
      var nw = clean(w + d);
      var r = kind === 'up' && d ? lo : kind === 'under' ? Math.min(hi, Math.max(lo, lowest)) : Math.min(hi, Math.max(lo, lowest + 1));
      return { kind: kind, w: nw, d: d, text: text, reps: r };
    };
    var step = function (k, head, sized) {
      head = head.replace(/\.$/, '');
      if (sized) {
        var fits = earned(k);
        if (fits === 0) return P('hold', 0, allAt
          ? head + ', but a jump of ' + fmt(inc) + ' kg is more than that earns. Same weight, and one rep past ' + repWord(hi) + ' moves it.'
          : head + ', but ' + fmt(inc) + ' kg more would leave you well short of ' + repWord(lo) + '. Same weight, and add a rep instead.');
        k = fits;
      }
      return P('up', clean(k * inc), head + '. Up ' + fmt(k * inc) + ' kg to ' + fmt(w + k * inc) + ' kg.');
    };
    if (allPast) return step(1, 'Every set went past ' + repWord(hi) + ', the top of your range. That earns the weight whatever the effort said', false);
    if (shortIdx >= 0 && (shortBy > 1 || over <= 0)) return P('under', 0, 'One set dropped to ' + repWord(lowest) + ', below your range of ' + lo + '–' + hi + '. Same weight again rather than less, so give it another go.');
    var fade = S[0][1] - S[S.length - 1][1];
    if (fade >= 3 && over >= 0 && S.length >= 2) return P('hold', 0, 'You started with ' + resWord(S[0][1]) + ' and finished with ' + resWord(S[S.length - 1][1]) + '. That is fatigue across the session rather than a weight that is too heavy. Same weight, and try it with a longer rest.');
    if (over >= 1 && reps.some(function (r) { return r + over <= hi; })) return P('hold', 0, 'You had ' + resWord(avg) + ', ' + (over === 1 ? 'one more' : over + ' more') + ' than the ' + t + ' you were aiming for, and ' + repWord(lowest + over) + ' still sits inside your range. Same weight, and take the reps instead.');
    if (over >= 2) return step(2, 'You had ' + resWord(avg) + ' and were aiming for ' + t + ', so there is plenty of room', true);
    if (over === 1) return step(1, 'You had ' + resWord(avg) + ', one more than the ' + t + ' you were aiming for', true);
    if (over < 0) {
      if (allAt) return P('hold', 0, 'Every set reached ' + repWord(hi) + ', the top of your range, with ' + resWord(avg) + '. Same weight, and the next step comes when a set goes past it.');
      return P('under', 0, 'You had ' + resWord(avg) + ', fewer than the ' + t + ' you were aiming for. Same weight again rather than less, so give it another go.');
    }
    if (allAt) return step(1, 'Every set reached ' + repWord(hi) + ', the top of your range, at the effort you were aiming for. That is the whole prescription', false);
    return P('hold', 0, t === 0
      ? 'Right on target. You took it to failure. Same weight, and try for another rep.'
      : 'Right on target with ' + repWord(t) + ' left in reserve. Same weight, and try for another rep.');
  }

  /* ---------- the calculator ---------- */

  var F = {}, rowsHost = null, rowTemplate = null;
  ['w', 'inc', 'lo', 'hi', 't'].forEach(function (k) { F[k] = document.querySelector('[data-act="f:' + k + '"]'); });

  var out = {
    iconBg: document.querySelector('[data-out-icon-bg]'),
    icon: document.querySelector('[data-out-icon]'),
    w: document.querySelector('[data-out-w]'),
    chip: document.querySelector('[data-out-chip]'),
    text: document.querySelector('[data-out-text]'),
    reps: document.querySelector('[data-out-reps]')
  };

  var rows = function () { return [].slice.call(document.querySelectorAll('[data-row]')); };

  function readForm() {
    var f = {};
    Object.keys(F).forEach(function (k) { f[k] = F[k] ? F[k].value : 0; });
    return f;
  }
  function readSets() {
    return rows().map(function (row) {
      return [row.querySelector('input').value, row.querySelector('select').value];
    });
  }

  function paintOut() {
    if (!out.text) return;
    var v = engine(readForm(), readSets());
    var chip = v.kind === 'up'
      ? { chip: '+' + v.d + ' kg', chipBg: '#D6FF3E', chipFg: '#0C0E0B', icon: 'M4 16l5-5 4 4 7-7M15 8h5v5' }
      : v.kind === 'under'
        ? { chip: 'again', chipBg: '#C9CEC2', chipFg: '#0C0E0B', icon: 'M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4' }
        : { chip: 'holds', chipBg: '#C9CEC2', chipFg: '#0C0E0B', icon: 'M5 12h14' };
    if (out.iconBg) out.iconBg.style.background = chip.chipBg;
    if (out.icon) out.icon.setAttribute('d', chip.icon);
    if (out.w) out.w.textContent = String(v.w);
    if (out.chip) {
      out.chip.textContent = chip.chip;
      out.chip.style.background = chip.chipBg;
      out.chip.style.color = chip.chipFg;
    }
    out.text.textContent = v.text;
    if (out.reps) out.reps.textContent = String(v.reps);
  }

  function renumber() {
    rows().forEach(function (row, k) {
      row.querySelector('span').textContent = String(k + 1);
      row.querySelector('input').setAttribute('aria-label', 'Set ' + (k + 1) + ' reps');
      row.querySelector('select').setAttribute('aria-label', 'Set ' + (k + 1) + ' left in reserve');
    });
  }

  function setRows(list) {
    var all = rows();
    if (!all.length) return;
    rowsHost = all[0].parentNode;
    while (rows().length > list.length) rowsHost.removeChild(rows()[rows().length - 1]);
    while (rows().length < list.length) {
      var copy = rowTemplate.cloneNode(true);
      rowsHost.insertBefore(copy, rows()[rows().length - 1].nextSibling);
    }
    rows().forEach(function (row, k) {
      row.querySelector('input').value = list[k][0];
      row.querySelector('select').value = list[k][1];
    });
    renumber();
  }

  function wireCalculator() {
    var all = rows();
    if (!all.length) return;
    rowsHost = all[0].parentNode;
    rowTemplate = all[0].cloneNode(true);

    Object.keys(F).forEach(function (k) {
      if (F[k]) { F[k].addEventListener('input', paintOut); F[k].addEventListener('change', paintOut); }
    });
    rowsHost.addEventListener('input', paintOut);
    rowsHost.addEventListener('change', paintOut);

    var add = document.querySelector('[data-act="add"]'), drop = document.querySelector('[data-act="drop"]');
    if (add) add.addEventListener('click', function () {
      var list = readSets();
      if (list.length >= 6) return;
      list.push(list[list.length - 1] || [8, 2]);
      setRows(list);
      paintOut();
    });
    if (drop) drop.addEventListener('click', function () {
      var list = readSets();
      if (list.length <= 1) return;
      setRows(list.slice(0, -1));
      paintOut();
    });

    [].slice.call(document.querySelectorAll('[data-act="preset"]')).forEach(function (b, k) {
      b.addEventListener('click', function () {
        var p = PRESETS[k];
        Object.keys(F).forEach(function (key) { if (F[key]) F[key].value = p[0][key]; });
        setRows(p[1]);
        paintOut();
      });
    });
    paintOut();
  }

  /* ---------- the tour and the embedded app ---------- */

  function wireSimulator() {
    var frame = document.querySelector('[data-sim]');
    var box = document.querySelector('[data-sim-box]');
    var scale = document.querySelector('[data-sim-scale]');
    var stepNo = document.querySelector('[data-step-no]');
    var stepTitle = document.querySelector('[data-step-title]');
    var stepHtml = document.querySelector('[data-step-html]');
    var chips = [].slice.call(document.querySelectorAll('[data-act="step"]'));
    var cur = 0, seed = 0;

    // The embedded page draws itself as a phone on a page of its own; inside the
    // frame it is the whole surface.
    function flatten() {
      try {
        var d = frame.contentDocument;
        if (!d || !d.head || d.getElementById('regol-embed')) return;
        var s = d.createElement('style');
        s.id = 'regol-embed';
        s.textContent = 'body{min-height:0 !important}body>div{margin:0 !important;box-shadow:none !important}';
        d.head.appendChild(s);
      } catch (e) { /* nothing to do */ }
    }

    // The screen travels in the frame's own URL. The design runtime builds the
    // component once and will not take new props afterwards, so a step is a
    // fresh load rather than a prop change.
    function show() {
      frame.src = 'try-app/index.html?scene=' + TOUR[cur][3] + '&v=' + PROTOTYPE;
    }

    // The embedded page draws its own shell as soon as it has one.
    var ticks = 0;
    (function poll() {
      flatten();
      if (ticks++ < 120) setTimeout(poll, 100);
    })();
    frame.addEventListener('load', flatten);

    function paintStep() {
      if (stepNo) stepNo.textContent = cur < 9 ? '0' + (cur + 1) : String(cur + 1);
      if (stepTitle) stepTitle.textContent = TOUR[cur][1];
      if (stepHtml) stepHtml.innerHTML = TOUR[cur][2];
      chips.forEach(function (b, k) {
        b.style.background = k === cur ? '#D6FF3E' : '#1F2320';
        b.style.color = k === cur ? '#0C0E0B' : '#C9CEC2';
        if (k === cur) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
      });
    }
    function go(k) {
      cur = (k + TOUR.length) % TOUR.length;
      seed += 1;
      paintStep();
      show();
    }

    chips.forEach(function (b, k) { b.addEventListener('click', function () { go(k); }); });
    var prev = document.querySelector('[data-act="prev"]'), next = document.querySelector('[data-act="next-step"]');
    if (prev) prev.addEventListener('click', function () { go(cur - 1); });
    if (next) next.addEventListener('click', function () { go(cur + 1); });
    var reset = document.querySelector('[data-act="reset"]');
    if (reset) reset.addEventListener('click', function () { go(0); });

    // The phone is 392 by 848 and is scaled down to whatever the column can give
    // it, which is what the design does.
    function fit() {
      var vw = document.documentElement.clientWidth, vh = innerHeight;
      var narrow = window.REGOL ? window.REGOL.narrow() : vw <= 940;
      var k = Math.min(1, (narrow ? vw - 48 : Math.min(vw * 0.42, 420)) / 410, (vh - 64 - 100) / 866);
      if (box) { box.style.width = Math.round(392 * k) + 'px'; box.style.height = Math.round(848 * k) + 'px'; }
      if (scale) scale.style.transform = 'scale(' + k + ')';
    }
    addEventListener('resize', fit);
    fit();
    paintStep();
  }

  function start() {
    if (document.querySelector('[data-sim]')) wireSimulator();
    wireCalculator();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
