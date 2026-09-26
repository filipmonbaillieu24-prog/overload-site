// Shared data, engine and view model for the three Overload prototypes (current, refine, rework).
// Each DC holds its own copy of the state; the markup is the only thing that differs.

const DAY = 864e5;
const TODAY = new Date(2026, 8, 26);
const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const dateOf = off => new Date(TODAY.getTime() + off * DAY);
export const fmt = x => Number.isInteger(x) ? String(x) : (Math.round(x * 10) / 10).toFixed(1).replace(/\.0$/, '');
const mmss = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const clock = t => { const d = new Date(t); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
const shortDay = off => { const d = dateOf(off); return `${DOW[d.getDay()].slice(0, 3)} ${d.getDate()} ${MON[d.getMonth()].slice(0, 3)}`; };
const longDay = off => { const d = dateOf(off); return `${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`; };
const relDay = off => off === 0 ? 'today' : off === -1 ? 'yesterday' : off > -7 ? DOW[dateOf(off).getDay()] : `${-off} days ago`;
const thousands = n => Math.round(n).toLocaleString('en-GB');
export const SWATCHES = [['#D6FF3E', 'Lime'], ['#4DE1C1', 'Mint'], ['#FF6B3D', 'Ember'], ['#B79BFF', 'Lilac'], ['#FFC53D', 'Amber']];
const SOUNDS = [['bell', 'Overload bell'], ['boxing', 'Boxing bell'], ['chime', 'Chime'], ['beep', 'Beep'], ['none', 'Silent']];
const LOGS = [['none', 'Off'], ['tick', 'Tick'], ['beep', 'Beep']];
const KINDS = [['warm', 'Warm-up', 'Warm-up'], ['normal', 'Normal set', 'Normal'], ['drop', 'Drop set', 'Drop'], ['rp', 'Rest-pause', 'Rest-pause'], ['amrap', 'AMRAP', 'AMRAP']];
const kindName = k => (KINDS.find(x => x[0] === (k || 'normal')) || KINDS[1])[1];
const PAL = {
  dark: { pg: '#0B0C0B', ch: '#0F110F', cd: '#161917', sk: '#131513', sh: '#131613', tl: '#1A1D1A', rs: '#1F2320', pr: '#262A26', bi: '#262A24', tk: '#22261E', hd: '#2B2F29',
    ink: '#F2F4EE', i2: '#E4E8DC', i3: '#C9CEC2', i4: '#9AA093', mu: '#8E948A', hr: 'rgba(255,255,255,.06)', hr2: 'rgba(255,255,255,.1)', scr: 'rgba(4,5,4,.72)',
    wn: '#FF7043', wg: '#221713', wb: '#4A2418', wg2: '#2A1A14', ow: '#1B0F0A' },
  light: { pg: '#F1F2ED', ch: '#E9EBE4', cd: '#FFFFFF', sk: '#E9EBE3', sh: '#F7F8F4', tl: '#F0F1EC', rs: '#ECEEE7', pr: '#DCDED3', bi: '#D5D8CE', tk: '#DDE0D6', hd: '#C9CDC2',
    ink: '#14160F', i2: '#1F221B', i3: '#3B3F35', i4: '#5E6458', mu: '#5A6054', hr: 'rgba(20,22,15,.09)', hr2: 'rgba(20,22,15,.16)', scr: 'rgba(20,22,15,.32)',
    wn: '#B8340F', wg: '#FBEDE8', wb: '#F0C4B5', wg2: '#F8E4DC', ow: '#FFFFFF' },
};
const hexRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
const lum = ([r, g, b]) => { const f = c => c <= .03928 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4); return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
const hsl2rgb = (h, s, l) => { const k = n => (n + h * 12) % 12, a = s * Math.min(l, 1 - l); return [0, 8, 4].map(n => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))); };
// Same hue, darkened until it reads at 4.5:1 on the light field colour (Theme.kt inkOf).
function inkOf(hex) {
  const [r, g, b] = hexRgb(hex), mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0, l = (mx + mn) / 2; const s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
  if (d) h = (mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4) / 6; if (h < 0) h += 1;
  const bg = lum(hexRgb('#E7E9E2'));
  for (; l > .05; l -= .01) { const c = hsl2rgb(h, s, l); if ((bg + .05) / (lum(c) + .05) >= 4.5) return '#' + c.map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join(''); }
  return '#222222';
}
export function themeVars(set) {
  const light = set.theme === 'light', p = PAL[light ? 'light' : 'dark'], ac = set.accent, aci = light ? inkOf(ac) : ac;
  return { ...p, ac, aci, acf: aci, am: `color-mix(in srgb, ${aci} ${light ? 60 : 45}%, ${p.cd})`, eg: `color-mix(in srgb, ${ac} ${light ? 16 : 7}%, ${p.cd})`,
    eb: `color-mix(in srgb, ${aci} ${light ? 45 : 22}%, ${p.cd})`, eg2: `color-mix(in srgb, ${ac} ${light ? 18 : 8}%, ${p.pg})`, gl: light ? 'rgba(0,0,0,0)' : `color-mix(in srgb, ${ac} 22%, transparent)` };
}
let AC;
export function playSound(kind, vol = .7) {
  try {
    const N = { bell: [[880, 0, 1.3], [1320, 0, .9], [1760, 0, .5]], boxing: [[660, 0, .5], [660, .28, .5], [660, .56, .9]], chime: [[784, 0, .6], [1047, .18, .9]], beep: [[1000, 0, .14], [1000, .22, .14]], tick: [[1500, 0, .05]] }[kind];
    if (!N) return; AC = AC || new (window.AudioContext || window.webkitAudioContext)(); const t = AC.currentTime, v = Math.pow(vol, 2) * .45;
    N.forEach(([f, d, len]) => { const o = AC.createOscillator(), e = AC.createGain(); o.type = kind === 'beep' || kind === 'tick' ? 'square' : 'sine'; o.frequency.value = f;
      e.gain.setValueAtTime(0, t + d); e.gain.linearRampToValueAtTime(kind === 'beep' || kind === 'tick' ? v * .4 : v, t + d + .01); e.gain.exponentialRampToValueAtTime(.0001, t + d + len);
      o.connect(e); e.connect(AC.destination); o.start(t + d); o.stop(t + d + len + .05); });
  } catch (e) { }
}
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const SUBS = ['to failure', '1 left', '2 left', '3 left', '4+ left'];
const rirTxt = n => n >= 4 ? '4+' : String(n);
const e1 = s => s.w * (1 + s.r / 30);
const REGIONS = ['All', 'Chest', 'Back', 'Shoulders', 'Legs', 'Arms', 'Core'];
const MUSCLES = ['Chest', 'Upper chest', 'Front delts', 'Side delts', 'Rear delts', 'Triceps', 'Lats', 'Upper back', 'Biceps', 'Quads', 'Hamstrings', 'Glutes'];

const L = (id, name, eq, region, mus, o) => ({ id, name, eq, region, mus, unit: 'kg', per: 1, step: 2.5, lo: 8, hi: 10, rir: 2, rest: 120, W: 20, phase: 'hold', ...o });
const LIFTS = [
  L('bench', 'Bench Press', 'Barbell', 'Chest', [['Chest', 1], ['Front delts', .5], ['Triceps', .5]], { lo: 6, hi: 8, rest: 150, W: 77.5, phase: 'top' }),
  L('ohp', 'Overhead Press', 'Barbell', 'Shoulders', [['Front delts', 1], ['Triceps', .5]], { lo: 6, hi: 8, rest: 150, W: 50, phase: 'stall' }),
  L('incline', 'Incline Dumbbell Press', 'Dumbbells', 'Chest', [['Upper chest', 1], ['Front delts', .5], ['Triceps', .5]], { unit: 'kg/side', per: 2, step: 2, W: 26 }),
  L('pushdown', 'Triceps Pushdown', 'Cable', 'Arms', [['Triceps', 1]], { lo: 10, hi: 12, rest: 90, W: 30, phase: 'top' }),
  L('pulldown', 'Lat Pulldown', 'Cable', 'Back', [['Lats', 1], ['Biceps', .5]], { W: 60 }),
  L('row', 'Barbell Row', 'Barbell', 'Back', [['Upper back', 1], ['Lats', .5], ['Biceps', .5]], { lo: 6, hi: 8, rest: 150, W: 70, phase: 'top' }),
  L('facepull', 'Face Pull', 'Cable', 'Shoulders', [['Rear delts', 1], ['Upper back', .5]], { lo: 12, hi: 15, rest: 90, W: 20 }),
  L('curl', 'EZ Bar Curl', 'EZ bar', 'Arms', [['Biceps', 1]], { rest: 90, W: 30, phase: 'top' }),
  L('squat', 'Back Squat', 'Barbell', 'Legs', [['Quads', 1], ['Glutes', .5]], { lo: 5, hi: 7, rest: 180, W: 100 }),
  L('rdl', 'Romanian Deadlift', 'Barbell', 'Legs', [['Hamstrings', 1], ['Glutes', .5]], { rest: 150, W: 90, phase: 'top' }),
  L('legpress', 'Leg Press', 'Machine', 'Legs', [['Quads', 1], ['Glutes', .5]], { lo: 10, hi: 12, step: 5, W: 160, phase: 'top' }),
  L('legcurl', 'Seated Leg Curl', 'Machine', 'Legs', [['Hamstrings', 1]], { lo: 10, hi: 12, rir: 1, rest: 90, W: 40 }),
  L('fly', 'Cable Fly', 'Cable', 'Chest', [['Chest', 1]], { lo: 12, hi: 15, rir: 1, rest: 90, W: 15, phase: 'none' }),
  L('lateral', 'Lateral Raise', 'Dumbbells', 'Shoulders', [['Side delts', 1]], { unit: 'kg/side', per: 2, step: 1, lo: 12, hi: 15, rir: 1, rest: 60, W: 8, phase: 'none' }),
];
const LIBRARY = [
  L('lib1', 'Dumbbell Overhead Press', 'Dumbbells', 'Shoulders', [['Front delts', 1], ['Triceps', .5]], { unit: 'kg/side', per: 2, step: 2, W: 16 }),
  L('lib2', 'Seated Overhead Press', 'Machine', 'Shoulders', [['Front delts', 1], ['Triceps', .5]], { step: 5, W: 40 }),
  L('lib3', 'Landmine Press', 'Barbell', 'Shoulders', [['Front delts', 1], ['Upper chest', .5]], { W: 25 }),
  L('lib4', 'Hammer Curl', 'Dumbbells', 'Arms', [['Biceps', 1]], { unit: 'kg/side', per: 2, step: 2, lo: 10, hi: 12, W: 12 }),
  L('lib5', 'Hip Thrust', 'Barbell', 'Legs', [['Glutes', 1], ['Hamstrings', .5]], { step: 5, W: 80 }),
  L('lib6', 'Chest-Supported Row', 'Machine', 'Back', [['Upper back', 1], ['Lats', .5]], { step: 5, W: 50 }),
  L('lib7', 'Hack Squat', 'Machine', 'Legs', [['Quads', 1]], { step: 5, W: 80 }),
  L('lib8', 'Cable Crunch', 'Cable', 'Core', [['Abs', 1]], { lo: 10, hi: 15, W: 30 }),
  L('lib9', 'Dumbbell Bench Press', 'Dumbbells', 'Chest', [['Chest', 1], ['Front delts', .5], ['Triceps', .5]], { unit: 'kg/side', per: 2, step: 2, W: 28 }),
];
const rx = l => ({ lift: l.id, sets: 3, lo: l.lo, hi: l.hi, rir: l.rir, rest: l.rest });
const TPLS = [
  { id: 'push', name: 'Push', rule: 'rir', items: ['bench', 'ohp', 'incline', 'pushdown'] },
  { id: 'pull', name: 'Pull', rule: 'rir', items: ['pulldown', 'row', 'facepull', 'curl'] },
  { id: 'legs', name: 'Legs', rule: 'rir', items: ['squat', 'rdl', 'legpress', 'legcurl'] },
];

function setsFor(l, j) {
  let w, top;
  if (l.phase === 'stall') {
    if (j < 5) return [[l.W, l.lo], [l.W, l.lo - 1], [l.W, l.lo - 1]].map(([w, r]) => ({ w, r, rir: 1 }));
    const jj = j - 5; w = l.W - l.step - l.step * Math.floor(jj / 2); top = jj % 2 === 0;
  } else if (l.phase === 'top') { w = l.W - l.step * Math.floor(j / 2); top = j % 2 === 0; }
  else { w = l.W - l.step * Math.floor((j + 1) / 2); top = j % 2 === 1; }
  w = Math.max(l.step * 2, w);
  return (top ? [l.hi, l.hi, l.hi] : [l.lo + 1, l.lo + 1, l.lo]).map(r => ({ w, r, rir: l.rir }));
}

export function initial() {
  const lifts = LIFTS.map(l => ({ ...l }));
  const tpls = TPLS.map(t => ({ ...t, items: t.items.map(id => rx(lifts.find(l => l.id === id))) }));
  const plan = [['pull', -5], ['legs', -3], ['push', -1]], slots = [];
  for (let w = 11; w >= 0; w--) for (const [t, o] of plan) { if (w === 0 && t === 'push') continue; slots.push({ tpl: t, off: o - 7 * w }); }
  const sessions = slots.map((sl, i) => {
    const j = slots.slice(i + 1).filter(x => x.tpl === sl.tpl).length;
    const t = tpls.find(x => x.id === sl.tpl);
    return { id: 's' + i, tpl: t.id, name: t.name, off: sl.off, dur: 42 + ((i * 7) % 13),
      items: t.items.map(it => ({ lift: it.lift, sets: setsFor(lifts.find(l => l.id === it.lift), j) })) };
  });
  return { tab: 'today', route: null, sheet: null, lifts, tpls, prog: { name: 'Push Pull Legs', ids: ['push', 'pull', 'legs'] }, sessions,
    live: null, pending: null, set: { goal: 3, rest: 120, adaptive: false, keepOn: true, haptic: true, unit: 'kg', rule: 'rir', theme: 'dark', accent: '#D6FF3E',
      sound: 'bell', volume: 70, vibrate: true, warn10: true, muted: true, pauseMusic: true, logKind: 'none', nudge: 0, health: false },
    editSet: null, confirm: null, sessEdit: false, nl: { name: '', eq: 'Barbell', region: 'Chest' }, pe: null, logQ: '',
    deload: {}, lfQ: '', lfRegion: 'All', logTab: 'w', picker: { target: 'builder', q: '' }, spec: null,
    kpF: 'w', kpBuf: '', kpFresh: true, toast: '', toastAt: 0, now: Date.now(), made: 0 };
}

// Opens the app straight into a state, by driving the same handlers a user would tap.
export function scene(name, opts = {}) {
  let st = initial(); const set = fn => { st = { ...st, ...fn(st) }; };
  const V = () => view(st, set, 'rework');
  if (opts.theme) st.set = { ...st.set, theme: opts.theme };
  if (opts.accent) st.set = { ...st.set, accent: opts.accent };
  const logAll = (bumpBench) => { for (let g = 0; g < 20 && V().lv.ready && !V().lv.modeFinish; g++) {
    if (V().lv.modeRest) V().lv.skip();
    if (bumpBench && V().lv.liftName === 'Bench Press') { V().lv.rPlus(); V().lv.rPlus(); }
    V().lv.log(); } V().lv.ready && V().lv.skip(); };
  const S = {
    today: () => {},
    live: () => { V().td.start(); V().lv.log(); V().lv.skip(); V().lv.rPlus(); },
    rest: () => { V().td.start(); V().lv.log(); },
    board: () => { V().td.start(); V().lv.log(); V().lv.skip(); V().lv.log(); V().lv.skip(); V().lv.log(); V().lv.skip(); V().lv.log(); V().lv.skip(); set(() => ({ sheet: 'board' })); },
    keypad: () => { V().td.start(); V().lv.editW(); },
    summary: () => { V().td.start(); logAll(true); V().lv.finish(); set(x => ({ pending: { ...x.pending, dur: 47 } })); },
    lift: () => set(() => ({ route: { n: 'lift', id: 'bench' } })),
    stall: () => set(() => ({ tab: 'lifts', lfQ: '' })),
    plans: () => set(() => ({ tab: 'plans' })),
    builder: () => set(() => ({ route: { n: 'builder', id: 'push' } })),
    log: () => set(() => ({ tab: 'log', logTab: 'w' })),
    stats: () => set(() => ({ tab: 'log', logTab: 's' })),
    calendar: () => set(() => ({ tab: 'log', logTab: 'c' })),
    session: () => { const x = st.sessions.slice().sort((a, b) => b.off - a.off)[0]; set(() => ({ route: { n: 'session', id: x.id } })); },
    settings: () => set(() => ({ route: { n: 'settings' } })),
    sound: () => set(() => ({ route: { n: 'settings' }, sheet: 'sound' })),
  };
  (S[name] || S.today)();
  return { ...st, toast: '' };
}

export function tick(s, f) {
  const now = Date.now(); let live = s.live;
  if (live && live.rest > 0) { const r = Math.max(0, live.rest - f);
    if (s.set.warn10 && live.rest > 10 && r <= 10 && r > 0) playSound('tick', s.set.volume / 100);
    if (r === 0) { if (s.set.sound !== 'none') playSound(s.set.sound, s.set.volume / 100); if (s.set.vibrate && navigator.vibrate) navigator.vibrate([200, 100, 200]); }
    live = { ...live, rest: r }; }
  return { ...s, live, now };
}

// The engine's voice: what a lift's logged (or projected) sets mean for next time.
function outlook(l, p, sets, final) {
  sets = sets.filter(x => x.k !== 'drop' && x.k !== 'rp' && x.k !== 'warm');
  const W = sets.length ? sets[sets.length - 1].w : l.W, u = l.unit, t = p.rir;
  const hold = (why, warn) => ({ nwNum: W, nw: `${fmt(W)} ${u}`, d: 'holds', up: false, notUp: true, warn: !!warn, why });
  if (!sets.length) return hold(`Nothing logged, so nothing moves. It proposes ${fmt(W)} ${u} again.`);
  const avg = Math.floor(sets.reduce((a, s) => a + s.rir, 0) / sets.length), top = sets.every(s => s.r >= p.hi);
  if (avg < t) return hold(`Under target: ${final ? 'these averaged' : 'that averages'} ${avg} in reserve against ${t}. It holds at ${fmt(W)} ${u}, and a second session like this proposes a deload.`, true);
  let st = top ? 1 : 0;
  if (avg >= t + 2) st = 2; else if (avg >= t + 1) st = Math.max(st, 1);
  if (st) {
    const nw = W + st * l.step, d = '+' + fmt(st * l.step);
    const why = final
      ? (top ? `You cleared ${p.hi} reps on every set, so it moves up ${fmt(st * l.step)} and starts again at ${p.lo}.`
             : `Every set finished ${avg} in reserve against a target of ${t}, so it moves up ${fmt(st * l.step)}.`)
      : `Finish like this and next time is ${fmt(nw)} ${u} (${d}).`;
    return { nwNum: nw, nw: `${fmt(nw)} ${u}`, d, up: true, notUp: false, warn: false, why };
  }
  return hold(`Holds at ${fmt(W)} ${u} next time. Clear ${p.hi} reps on every set, or finish them at ${t + 1} in reserve, and it's ${fmt(W + l.step)} ${u}.`);
}

export function view(s, set, variant) {
  const now = s.now, isB = variant === 'rework', isA = variant === 'refine';
  const lift = id => s.lifts.find(l => l.id === id);
  const tpl = id => s.tpls.find(t => t.id === id);
  const upd = fn => set(st => fn(st));
  const toast = msg => ({ toast: msg, toastAt: Date.now() });
  const sessAsc = s.sessions.slice().sort((a, b) => a.off - b.off);
  const hist = id => sessAsc.filter(x => x.items.some(i => i.lift === id)).map(x => ({ off: x.off, id: x.id, sets: x.items.find(i => i.lift === id).sets }));
  const rxOf = id => { for (const t of s.tpls) { const it = t.items.find(i => i.lift === id); if (it) return it; } return rx(lift(id)); };
  const bestOf = sets => Math.max(0, ...sets.map(e1));
  const prop = (id, p) => {
    const l = lift(id), h = hist(id), last = h[h.length - 1];
    if (!last) return { w: l.W, propR: p.lo, up: false, first: true, o: null };
    const o = outlook(l, p, last.sets, true);
    let w = o.nwNum;
    if (s.deload[id]) w = Math.max(l.step, Math.round(last.sets[0].w * .9 / l.step) * l.step);
    return { w, propR: o.up ? p.lo : p.hi, up: o.up && !s.deload[id], o, deload: !!s.deload[id], prevW: last.sets[0].w };
  };
  const stalled = id => { const h = hist(id); if (h.length < 5) return false; const b = h.map(x => bestOf(x.sets));
    return Math.max(...b.slice(-4)) <= Math.max(...b.slice(0, -4)) + .01; };
  const weekStart = -5; // Monday 21
  const thisWeek = s.sessions.filter(x => x.off >= weekStart);
  const nextTpl = () => { const inProg = sessAsc.filter(x => s.prog.ids.includes(x.tpl)); const last = inProg[inProg.length - 1];
    const i = last ? (s.prog.ids.indexOf(last.tpl) + 1) % s.prog.ids.length : 0; return tpl(s.prog.ids[i]) || s.tpls[0]; };
  const tplMeta = t => { const sets = t.items.reduce((a, i) => a + i.sets, 0); const h = sessAsc.filter(x => x.tpl === t.id);
    return { lifts: plural(t.items.length, 'lift'), sets: plural(sets, 'working set'), last: h.length ? relDay(h[h.length - 1].off) : 'never trained', lastOff: h.length ? h[h.length - 1].off : null }; };
  const go = tab => () => upd(() => ({ tab, route: null, sheet: null }));
  const push = (n, id) => () => upd(() => ({ route: { n, id }, sheet: null }));
  const back = () => upd(st => ({ route: null, sheet: null }));
  const r = s.route ? s.route.n : null;

  // ---- start a workout
  const mkItem = it => { const p = prop(it.lift, it); return { ...it, w: p.w, propR: p.propR, logged: [], extra: 0 }; };
  const startTpl = id => () => upd(st => {
    if (st.live) return { route: { n: 'live' }, sheet: null, tab: 'today' };
    const t = st.tpls.find(x => x.id === id);
    return { live: { tpl: id, name: t.name, started: Date.now(), focus: null, pend: {}, rest: 0, restTotal: 1, restWho: '', items: t.items.map(mkItem) }, route: { n: 'live' }, sheet: null };
  });
  const startEmpty = () => upd(st => st.live ? { route: { n: 'live' }, sheet: null } :
    ({ live: { tpl: null, name: 'Workout', started: Date.now(), focus: null, pend: {}, rest: 0, restTotal: 1, restWho: '', items: [] }, route: { n: 'live' }, sheet: 'picker', picker: { target: 'live', q: '' } }));

  // ---- Today
  const nt = nextTpl(), ntm = tplMeta(nt);
  const week = ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((l, i) => { const off = weekStart + i, n = dateOf(off).getDate(), tr = s.sessions.some(x => x.off === off), today = off === 0;
    return { l, n, trained: tr, today, other: !today, plain: !tr && !today, todayTrained: today && tr, todayOnly: today && !tr, dot: tr ? '#D6FF3E' : 'transparent',
      tap: tr ? push('session', s.sessions.filter(x => x.off === off).pop().id) : () => {} }; });
  const wk = `${thisWeek.length} of ${s.set.goal}`;
  const ntLifts = nt.items.map(it => { const l = lift(it.lift), p = prop(it.lift, it);
    return { name: l.name, pres: `${it.sets} × ${it.lo}–${it.hi} @ RIR ${it.rir}`, pres2: `${it.sets} × ${it.lo}–${it.hi} @ RIR ${it.rir}`, w: `${fmt(p.w)} ${l.unit}`,
      up: p.up, hold: !p.up && !p.deload && !p.first, deload: p.deload, first: p.first, delta: p.up ? fmt(p.w - p.prevW) : '',
      why: p.o ? p.o.why : `First time: pick a weight you could lift for about ${Math.round((it.lo + it.hi) / 2)} reps with ${it.rir} left.` }; });
  const lead = nt.items.map(it => ({ it, p: prop(it.lift, it) })).find(x => x.p.up) || nt.items.map(it => ({ it, p: prop(it.lift, it) }))[0];
  const todayEngine = lead ? { label: lift(lead.it.lift).name, nw: `${fmt(lead.p.w)} ${lift(lead.it.lift).unit}`, d: lead.p.up ? '+' + fmt(lead.p.w - lead.p.prevW) : 'holds',
    up: lead.p.up, notUp: !lead.p.up, why: lead.p.o ? lead.p.o.why : 'First time on this lift.' } : { label: '', nw: '', d: '', up: false, notUp: true, why: '' };
  const others = s.tpls.filter(t => t.id !== nt.id).map(t => { const m = tplMeta(t); return { name: t.name, meta: `${m.lifts} · ${m.last}`, tap: startTpl(t.id) }; });
  const liveDone = s.live ? s.live.items.reduce((a, i) => a + i.logged.length, 0) : 0, liveTot = s.live ? s.live.items.reduce((a, i) => a + i.sets + i.extra, 0) : 0;
  const td = { week, wk, weekNote: `${wk} sessions`, nextName: nt.name, nextMeta: `${ntm.lifts} · ${ntm.sets} · last trained ${ntm.last}`,
    nextMeta2: `${ntm.lifts} · ${nt.items.reduce((a, i) => a + i.sets, 0)} sets · about ${Math.round(nt.items.reduce((a, i) => a + i.sets * (i.rest + 45), 0) / 60)} minutes`,
    program: s.prog.name, lifts: ntLifts, engine: todayEngine, others, startEmpty,
    hasLive: !!s.live, noLive: !s.live, liveName: s.live ? s.live.name : '', liveMeta: s.live ? `${liveDone} of ${liveTot} sets · ${Math.round((now - s.live.started) / 60000)} min` : '',
    start: startTpl(nt.id), startLabel: s.live ? `Resume ${s.live.name}` : `Start ${nt.name}`, openPick: () => upd(() => ({ sheet: 'pick' })) };

  // ---- Plans
  const pl = { program: s.prog.name, progMeta: `${s.prog.ids.length} templates · next: ${nt.name}`,
    cells: s.prog.ids.map(id => ({ name: tpl(id).name, next: id === nt.id, notNext: id !== nt.id })),
    templates: s.tpls.map(t => { const m = tplMeta(t); return { name: t.name, meta: `${m.lifts} · ${m.sets} · ${m.last}`, meta2: `${m.lifts} · ${t.items.reduce((a, i) => a + i.sets, 0)} sets`, last: m.last,
      chips: t.items.slice(0, 4).map(i => ({ t: lift(i.lift).name })), names: t.items.map(i => lift(i.lift).name).join(', '), isNext: t.id === nt.id, tap: push('builder', t.id) }; }),
    newTemplate: () => upd(st => { const id = 't' + (st.made + 1); return { made: st.made + 1, tpls: [...st.tpls, { id, name: 'New template', rule: 'rir', items: [] }], route: { n: 'builder', id } }; }),
    newProgram: () => upd(() => toast('Programs are edited in a sheet in the app. Not in this prototype.')) };

  // ---- Builder
  let bd = {};
  if (r === 'builder') {
    const t = tpl(s.route.id), m = tplMeta(t);
    const patchT = fn => upd(st => ({ tpls: st.tpls.map(x => x.id === t.id ? { ...x, ...fn(x) } : x) }));
    const RULES = { rir: ['RIR gated', 'Finish your sets with more in reserve than planned and the weight goes up. Clear the top of the range and it goes up anyway. Under target, it holds.'],
      double: ['Double progression', 'Add reps inside the range at the same weight. Once every set reaches the top, the weight goes up a step.'],
      linear: ['Linear', 'The weight goes up a step every session you finish the planned reps. Miss them twice and it holds.'] };
    bd = { name: t.name, id: t.id, meta: `${m.lifts} · ${m.sets}`, meta2: `${m.lifts} · ${t.items.reduce((a, i) => a + i.sets, 0)} sets`, empty: t.items.length === 0, notEmpty: t.items.length > 0,
      onName: e => { const v = e.target.value; patchT(() => ({ name: v })); },
      items: t.items.map((it, i) => { const l = lift(it.lift);
        return { n: i + 1, name: l.name, sets: String(it.sets), reps: `${it.lo}–${it.hi}`, rir: String(it.rir), pres: `${it.sets} × ${it.lo}–${it.hi} @ RIR ${it.rir}`, rest: mmss(it.rest),
          sub: `${l.eq} · steps of ${fmt(l.step)} kg · rest ${mmss(it.rest)}`, edit: () => upd(() => ({ sheet: 'spec', spec: { tpl: t.id, idx: i } })),
          remove: () => patchT(x => ({ items: x.items.filter((_, j) => j !== i) })),
          up: () => patchT(x => { if (!i) return {}; const a = x.items.slice(); [a[i - 1], a[i]] = [a[i], a[i - 1]]; return { items: a }; }),
          swap: () => upd(() => toast('Swap opens the lift picker in the app.')) }; }),
      addLift: () => upd(() => ({ sheet: 'picker', picker: { target: 'builder', q: '', tpl: t.id } })),
      rules: Object.entries(RULES).map(([k, [label]]) => ({ label, on: t.rule === k, off: t.rule !== k, tap: () => patchT(() => ({ rule: k })) })),
      ruleName: RULES[t.rule][0], ruleText: RULES[t.rule][1], start: startTpl(t.id), startLabel: s.live ? `Resume ${s.live.name}` : `Start ${t.name}`,
      canStart: t.items.length > 0, cantStart: t.items.length === 0 };
  }

  // ---- Lifts
  const q = s.lfQ.trim().toLowerCase();
  const matches = l => !q || [l.name, l.eq, l.region, ...l.mus.map(m => m[0])].some(x => x.toLowerCase().includes(q));
  const inTpl = id => s.tpls.some(t => t.items.some(i => i.lift === id));
  const liftRow = l => { const h = hist(l.id), bs = h.map(x => bestOf(x.sets)), best = bs.length ? Math.max(...bs) : 0;
    const cur = bs[bs.length - 1] || 0, ref = bs[Math.max(0, bs.length - 5)] || 0, dir = !bs.length ? 0 : cur > ref + .5 ? 1 : cur < ref - .5 ? -1 : 0;
    const sp = bs.slice(-6), mn = Math.min(...sp), mx = Math.max(...sp);
    const spark = sp.map((v, i) => `${2 + i * (52 / Math.max(1, sp.length - 1))},${mx === mn ? 12 : 21 - (v - mn) / (mx - mn) * 17}`).join(' ');
    const p = prop(l.id, rxOf(l.id));
    return { name: l.name, sub: h.length ? `${l.eq} · ${relDay(h[h.length - 1].off)} · ${plural(h.length, 'session')}` : `${l.eq} · never trained`,
      sub2: h.length ? `${relDay(h[h.length - 1].off)} · ${fmt(p.w)} ${l.unit} next` : `${l.eq} · not trained yet`,
      e1rm: best ? String(Math.round(best)) : '–', up: dir > 0, flat: dir === 0, down: dir < 0, spark, hasSpark: sp.length > 1, noSpark: sp.length <= 1,
      stalled: stalled(l.id), tap: push('lift', l.id) }; };
  const shown = s.lifts.filter(l => matches(l) && (s.lfRegion === 'All' || l.region === s.lfRegion));
  const groups = REGIONS.slice(1).map(g => ({ title: g, rows: shown.filter(l => l.region === g).map(liftRow) })).filter(g => g.rows.length).map(g => ({ ...g, count: plural(g.rows.length, 'lift') }));
  const attention = s.lifts.filter(l => stalled(l.id) && !s.deload[l.id]).map(l => { const h = hist(l.id);
    return { name: l.name, why: 'Stalled: no new best in 4 sessions', why2: `No new best in 4 sessions over ${-(h[h.length - 5].off - h[h.length - 1].off)} days. Take a deload next time, or move the rep range up in every template.`,
      tap: push('lift', l.id), deload: () => upd(st => ({ deload: { ...st.deload, [l.id]: true }, ...toast(`${l.name}: deload queued for next time`) })) }; });
  const libHits = q ? LIBRARY.filter(matches).filter(x => !s.lifts.some(l => l.name === x.name)) : [];
  const lf = { query: s.lfQ, hasQuery: !!q, noQuery: !q, onQuery: e => { const v = e.target.value; upd(() => ({ lfQ: v })); }, clear: () => upd(() => ({ lfQ: '' })),
    regions: REGIONS.map(g => ({ label: g, on: s.lfRegion === g, off: s.lfRegion !== g, tap: () => upd(() => ({ lfRegion: g })) })),
    groups, none: !groups.length, attention, hasAttention: attention.length > 0 && !q, countTxt: `${plural(s.lifts.length, 'lift')} · ${s.lifts.filter(l => inTpl(l.id)).length} in your plans`,
    lib: libHits.map(x => ({ name: x.name, sub: `${x.mus.map(m => m[0]).join(', ')} · ${x.eq}`, tap: () => upd(st => ({ lifts: [...st.lifts, { ...x, id: 'n' + st.made, phase: 'none' }], made: st.made + 1, ...toast(`${x.name} added to your lifts`) })) })),
    hasLib: libHits.length > 0, newLift: () => upd(() => toast('New lift opens the library sheet in the app. Search above to add one.')) };

  // ---- Lift detail
  let ld = {};
  if (r === 'lift') {
    const l = lift(s.route.id), h = hist(l.id), bs = h.map(x => bestOf(x.sets)), best = bs.length ? Math.max(...bs) : 0, p = rxOf(l.id), pr = prop(l.id, p);
    let heavy = null; h.forEach(x => x.sets.forEach(t => { if (!heavy || t.w > heavy.w || (t.w === heavy.w && t.r > heavy.r)) heavy = t; }));
    const sp = bs.slice(-12), mn = Math.min(...sp) - 2, mx = Math.max(...sp) + 2;
    const pts = sp.map((v, i) => [i * (330 / Math.max(1, sp.length - 1)), 100 - (v - mn) / Math.max(1, mx - mn) * 88]);
    let run = 0; const prOffs = new Set(); h.forEach(x => { const b = bestOf(x.sets); if (b > run + .01) { if (run) prOffs.add(x.off); run = b; } });
    const eng = pr.o ? { nw: `${fmt(pr.w)} ${l.unit}`, d: pr.deload ? 'deload' : pr.up ? '+' + fmt(pr.w - pr.prevW) : 'holds', up: pr.up, notUp: !pr.up,
      why: pr.deload ? `Deload queued: ${fmt(pr.w)} ${l.unit}, about 90% of the working weight, then it picks up where it left off.` : pr.o.why } :
      { nw: `${fmt(l.W)} ${l.unit}`, d: 'first', up: false, notUp: true, why: `Never trained. The first session finds your working weight: aim for about ${Math.round((p.lo + p.hi) / 2)} reps with ${p.rir} left.` };
    const trend = sp.length > 1 ? Math.round(sp[sp.length - 1] - sp[0]) : 0;
    ld = { name: l.name, eq: l.eq.toUpperCase() + ' · ' + l.region.toUpperCase(), sub: `${l.eq} · ${l.mus[0][0]}${l.mus.length > 1 ? ' + ' + l.mus.slice(1).map(m => m[0]).join(', ') : ''} · steps of ${fmt(l.step)} kg`,
      best: best ? String(Math.round(best)) : '–', heavy: heavy ? `${fmt(heavy.w)}×${heavy.r}` : '–', heavy2: heavy ? `${fmt(heavy.w)} × ${heavy.r}` : '–', sessions: String(h.length),
      rm5: best ? String(Math.round(best / (1 + 5 / 30))) : '–', trendTxt: trend >= 0 ? `▲ ${trend} kg` : `▼ ${-trend} kg`, trendLong: `${trend >= 0 ? '▲' : '▼'} ${Math.abs(trend)} kg in ${sp.length} sessions`,
      hasChart: sp.length > 1, noChart: sp.length <= 1, pts: pts.map(p => p.map(v => v.toFixed(1)).join(',')).join(' '),
      area: pts.length ? `M0 110 L${pts.map(p => p.map(v => v.toFixed(1)).join(' ')).join(' L')} L330 110Z` : '',
      lx: pts.length ? pts[pts.length - 1][0].toFixed(1) : 0, ly: pts.length ? pts[pts.length - 1][1].toFixed(1) : 0,
      eng, stalled: stalled(l.id) && !s.deload[l.id], deload: () => upd(st => ({ deload: { ...st.deload, [l.id]: true }, ...toast('Deload queued for next time') })),
      stallWhy: h.length > 4 ? `No new best in 4 sessions over ${-(h[h.length - 5].off - h[h.length - 1].off)} days.` : '',
      history: h.slice().reverse().slice(0, 8).map(x => ({ date: shortDay(x.off), date2: `${DOW[dateOf(x.off).getDay()].slice(0, 3)} ${dateOf(x.off).getDate()} ${MON[dateOf(x.off).getMonth()].slice(0, 3)}${dateOf(x.off).getFullYear() !== TODAY.getFullYear() ? ' ' + dateOf(x.off).getFullYear() : ''}`,
        sets: `${fmt(x.sets[0].w)} × ${x.sets.map(t => t.r).join(', ')} @ ${rirTxt(x.sets[0].rir)}`, sets2: `${fmt(x.sets[0].w)} × ${x.sets.map(t => t.r).join(' · ')}`, pr: prOffs.has(x.off) })),
      hasHistory: h.length > 0, noHistory: !h.length };
  }

  // ---- Summary of a session (pending or past)
  const summaryOf = (sess, fresh) => {
    const before = s.sessions.filter(x => x.off < sess.off || (fresh && x !== sess));
    let ton = 0, sets = 0, prs = []; const vol = {};
    sess.items.forEach(it => { const l = lift(it.lift); const prevBest = Math.max(0, ...before.flatMap(x => x.items.filter(i => i.lift === it.lift).flatMap(i => i.sets.map(e1))));
      let top = null, run = prevBest; it.prIdx = new Set();
      it.sets.forEach((t, i) => { if (t.k === 'warm') return; sets++; ton += t.w * t.r * l.per;
        if (prevBest && e1(t) > run + .01) { it.prIdx.add(i); run = e1(t); } if (prevBest && e1(t) > prevBest + .01 && (!top || e1(t) > e1(top))) top = t; });
      l.mus.forEach(([m, v]) => vol[m] = (vol[m] || 0) + v * it.sets.filter(t => t.k !== 'warm').length); if (top) prs.push({ l, t: top, prevBest }); });
    const vmax = Math.max(1, ...Object.values(vol)), pr = prs[0];
    return { name: sess.name, date: longDay(sess.off), min: sess.dur, minTxt: plural(sess.dur, 'minute'), minLbl: sess.dur === 1 ? 'minute' : 'minutes', sets, ton: thousands(ton),
      hiGlyph: pr ? '★' : '=', hiTag: pr ? (prs.length > 1 ? `${prs.length} NEW BESTS` : 'NEW BEST') : 'HELD', hiBg: pr ? 'var(--ac,#D6FF3E)' : 'var(--rs,#1F2320)', hiInk: pr ? '#0C0E0B' : 'var(--i3,#C9CEC2)',
      hiTitle: pr ? `${pr.l.name}: ${fmt(pr.t.w)} × ${pr.t.r}` : 'Everything held',
      hiBody: pr ? `An estimated one-rep max of ${Math.round(e1(pr.t))} ${pr.l.unit}, up from ${Math.round(pr.prevBest)}.${prs.length > 1 ? ` Plus ${plural(prs.length - 1, 'other record')}.` : ''}` : 'No new records this session. Loads stayed where the engine put them.',
      lifts: sess.items.map(it => { const l = lift(it.lift), p = sess.rx && sess.rx[it.lift] || rxOf(it.lift);
        return { name: l.name, unit: l.unit, chips: it.sets.map((t, i) => ({ txt: `${fmt(t.w)} × ${t.r} @${rirTxt(t.rir)}${t.k && t.k !== 'normal' ? ' · ' + kindName(t.k) : ''}`,
          tap: () => upd(() => ({ sheet: 'editset', editSet: { src: 'session', sid: sess.id, lift: it.lift, idx: i } })) })),
        rows: it.sets.map((t, i) => ({ n: t.k === 'warm' ? 'WARM' : `SET ${it.sets.slice(0, i + 1).filter(z => z.k !== 'warm').length}`, wr: `${fmt(t.w)} ${l.unit} × ${t.r}`, kind: t.k && t.k !== 'normal' && t.k !== 'warm' ? kindName(t.k) : '', pr: it.prIdx.has(i), noPr: !it.prIdx.has(i), rir: t.rir === 0 ? 'to failure' : `${rirTxt(t.rir)} in reserve` })), setsTxt: it.sets.map(t => `${fmt(t.w)}×${t.r} @${rirTxt(t.rir)}`).join(' · '), top: `${fmt(it.sets[0].w)} ${l.unit}`, ...(o => ({ ...o, nextLine: `Next time: ${o.nw}${o.up ? ` (${o.d})` : ', same weight'}` }))(outlook(l, p, it.sets, true)) }; }),
      vol: Object.entries(vol).map(([name, v]) => ({ name, sets: fmt(v), pct: Math.round(v / vmax * 100) })), fresh, past: !fresh };
  };
  let sm = {};
  if (r === 'summary' && s.pending) sm = { ...summaryOf(s.pending, true), done: () => upd(st => ({ sessions: [...st.sessions, st.pending], pending: null, live: null, route: null, tab: 'today', deload: Object.fromEntries(Object.entries(st.deload).filter(([k]) => !st.pending.items.some(i => i.lift === k))) })), doneLabel: 'Done' };
  if (r === 'session' && s.sessions.some(y => y.id === s.route.id)) { const x = s.sessions.find(y => y.id === s.route.id); sm = { ...summaryOf(x, false), done: back, doneLabel: 'Back to Log', share: () => upd(() => toast('Share opens the share card in the app.')) }; }
  sm.share = sm.share || (() => upd(() => toast('Share opens the share card in the app.')));
  sm.editing = false; sm.notEditing = true;

  // ---- Log
  const byWeek = {};
  s.sessions.filter(x => !s.logQ || (x.name + ' ' + x.items.map(i => lift(i.lift).name).join(' ')).toLowerCase().includes(s.logQ.trim().toLowerCase())).sort((a, b) => b.off - a.off).forEach(x => { const wkIdx = Math.floor((x.off - weekStart) / 7); (byWeek[wkIdx] = byWeek[wkIdx] || []).push(x); });
  const sessRow = x => { const sm2 = summaryOf(x, false); const prc = sm2.hiTag === 'HELD' ? 0 : (sm2.hiTag.match(/^\d+/) ? +sm2.hiTag.match(/^\d+/)[0] : 1);
    return { name: x.name, day: String(dateOf(x.off).getDate()), dow: DOW[dateOf(x.off).getDay()].slice(0, 3).toUpperCase(), date: longDay(x.off),
      meta: `${sm2.sets} working sets · ${sm2.ton} kg moved · ${x.dur} min`, meta2: `${x.dur} min · ${sm2.sets} sets · ${sm2.ton} kg`, chips: x.items.map(i => ({ t: lift(i.lift).name })),
      hasPr: prc > 0, noPr: !prc, prTxt: prc > 1 ? `${prc} PR` : 'PR', prTxt2: prc > 1 ? `${prc} NEW BEST` : 'NEW BEST', tap: push('session', x.id) }; };
  const wkKeys = Object.keys(byWeek).map(Number).sort((a, b) => b - a).slice(0, 4);
  const wkGroups = wkKeys.map(k => ({ title: k === 0 ? `This week · ${byWeek[k].length} of ${s.set.goal}` : k === -1 ? `Last week · ${byWeek[k].length} of ${s.set.goal}` : `Week of ${longDay(weekStart + 7 * k).replace(/^\w+ /, '')}`,
    rows: byWeek[k].map(sessRow) }));
  const monthDays = []; const first = new Date(2026, 8, 1), lead0 = (first.getDay() + 6) % 7;
  for (let i = 0; i < lead0; i++) monthDays.push({ n: '', blank: true, trained: false, today: false, plain: false });
  for (let d = 1; d <= 30; d++) { const off = d - 26, tr = s.sessions.some(x => x.off === off); monthDays.push({ n: String(d), blank: false, trained: tr, today: off === 0 && !tr, plain: !tr && off !== 0, todayTrained: off === 0 && tr,
    tap: tr ? push('session', s.sessions.filter(x => x.off === off).pop().id) : () => {} }); }
  const wkTon = []; for (let k = -11; k <= 0; k++) { const a = weekStart + 7 * k; const t = s.sessions.filter(x => x.off >= a && x.off < a + 7).reduce((acc, x) => acc + x.items.reduce((b, it) => b + it.sets.reduce((c, t) => c + t.w * t.r * lift(it.lift).per, 0), 0), 0); wkTon.push({ t, k }); }
  const tmax = Math.max(1, ...wkTon.map(x => x.t));
  const volWeek = {}; thisWeek.forEach(x => x.items.forEach(it => lift(it.lift).mus.forEach(([m, v]) => volWeek[m] = (volWeek[m] || 0) + v * it.sets.length)));
  const planned = {}; s.prog.ids.forEach(id => tpl(id).items.forEach(it => lift(it.lift).mus.forEach(([m, v]) => planned[m] = (planned[m] || 0) + v * it.sets)));
  const untrained = MUSCLES.filter(m => !planned[m]);
  const prsWeek = thisWeek.reduce((a, x) => { const m = summaryOf(x, false).hiTag; return a + (m === 'HELD' ? 0 : (m.match(/^\d+/) ? +m.match(/^\d+/)[0] : 1)); }, 0);
  const done = thisWeek.map(x => x.name), todo = s.prog.ids.map(id => tpl(id).name).filter(n => !done.includes(n));
  const debrief = { count: `${thisWeek.length} of ${s.set.goal}`,
    why: `${done.join(' and ') || 'Nothing'} done${prsWeek ? `, with ${plural(prsWeek, 'record')}` : ''}. ${todo.length ? `${todo.join(' and ')} still to do this week.` : 'The rotation is complete for this week.'}`,
    doNext: untrained.length ? `${untrained[0]} get no hard sets in any template. ${untrained[0] === 'Side delts' ? 'Lateral Raise is in your lifts; add it to Push.' : ''}` : 'Every big muscle is covered by the plan.' };
  const lg = { q: s.logQ, hasQ: !!s.logQ, onQ: e => { const v = e.target.value; upd(() => ({ logQ: v })); }, clearQ: () => upd(() => ({ logQ: '' })), noRows: !wkGroups.length, tabW: s.logTab === 'w', tabC: s.logTab === 'c', tabS: s.logTab === 's', toW: () => upd(() => ({ logTab: 'w' })), toC: () => upd(() => ({ logTab: 'c' })), toS: () => upd(() => ({ logTab: 's' })),
    debrief, groups: wkGroups, month: 'September 2026', days: monthDays, weekCount: String(thisWeek.length), monthCount: String(s.sessions.filter(x => x.off >= -25 && x.off <= 4).length), streak: '11 weeks',
    bars: wkTon.map(x => ({ h: Math.max(3, Math.round(x.t / tmax * 100)), cur: x.k === 0, past: x.k !== 0, lbl: x.k === 0 ? 'now' : x.k % 4 === 0 ? `${-x.k}w` : '' })),
    tonTxt: thousands(wkTon[11].t), tonPrev: thousands(wkTon[10].t),
    muscles: MUSCLES.map(m => ({ name: m, sets: fmt(volWeek[m] || 0), pct: Math.min(100, Math.round((volWeek[m] || 0) / 20 * 100)), low: (volWeek[m] || 0) < 10, ok: (volWeek[m] || 0) >= 10 })) };

  // ---- Settings
  const st = s.set, tog = k => () => upd(x => ({ set: { ...x.set, [k]: !x.set[k] } }));
  const settings = { goal: plural(st.goal, 'session'), cycleGoal: () => upd(x => ({ set: { ...x.set, goal: x.set.goal >= 6 ? 2 : x.set.goal + 1 } })),
    rest: mmss(st.rest), cycleRest: () => upd(x => ({ set: { ...x.set, rest: x.set.rest >= 240 ? 60 : x.set.rest + 30 } })),
    adaptive: st.adaptive ? 'On' : 'Off', adaptiveOn: st.adaptive, adaptiveOff: !st.adaptive, toggleAdaptive: tog('adaptive'),
    keepOn: st.keepOn ? 'On' : 'Off', keepOnOn: st.keepOn, keepOnOff: !st.keepOn, toggleKeep: tog('keepOn'),
    haptic: st.haptic ? 'On' : 'Off', hapticOn: st.haptic, hapticOff: !st.haptic, toggleHaptic: tog('haptic'),
    sound: st.sound ? 'On' : 'Off', soundOn: st.sound, soundOff: !st.sound, toggleSound: tog('sound'),
    unit: st.unit, cycleUnit: () => upd(x => ({ set: { ...x.set, unit: x.set.unit === 'kg' ? 'lb' : 'kg' } })),
    act: msg => () => upd(() => toast(msg)),
    exportFile: () => upd(() => toast('overload-2026-09-26.json is ready to share')), copy: () => upd(() => toast('Copied as text')),
    csv: () => upd(() => toast('overload-2026-09-26.csv is ready to share')), report: () => upd(() => toast('Opens a prefilled report. Nothing is sent until you press send.')) };

  const SW = s.set, togs = {};
  ['adaptive', 'keepOn', 'haptic', 'vibrate', 'warn10', 'muted', 'pauseMusic', 'health'].forEach(k => { togs[k + 'On'] = !!SW[k]; togs[k + 'Off'] = !SW[k]; togs['t_' + k] = tog(k); });
  Object.assign(settings, togs, {
    isDark: SW.theme === 'dark', isLight: SW.theme === 'light', toDark: () => upd(x => ({ set: { ...x.set, theme: 'dark' } })), toLight: () => upd(x => ({ set: { ...x.set, theme: 'light' } })),
    accents: SWATCHES.map(([c, name]) => ({ c, name, on: SW.accent === c, off: SW.accent !== c, tap: () => upd(x => ({ set: { ...x.set, accent: c } })) })),
    accentName: (SWATCHES.find(a => a[0] === SW.accent) || ['', 'Custom'])[1],
    soundName: SOUNDS.find(a => a[0] === SW.sound)[1], logName: LOGS.find(a => a[0] === SW.logKind)[1], openSound: () => upd(() => ({ sheet: 'sound' })),
    sounds: SOUNDS.map(([k, label]) => ({ label, on: SW.sound === k, off: SW.sound !== k, tap: () => { upd(x => ({ set: { ...x.set, sound: k } })); playSound(k, SW.volume / 100); } })),
    logKinds: LOGS.map(([k, label]) => ({ label, on: SW.logKind === k, off: SW.logKind !== k, tap: () => { upd(x => ({ set: { ...x.set, logKind: k } })); playSound(k, SW.volume / 100); } })),
    volume: SW.volume, volTxt: SW.volume + '%', onVolume: e => { const v = +e.target.value; upd(x => ({ set: { ...x.set, volume: v } })); }, test: () => playSound(SW.sound === 'none' ? 'bell' : SW.sound, SW.volume / 100),
    goalN: String(SW.goal), goalMinus: () => upd(x => ({ set: { ...x.set, goal: Math.max(1, x.set.goal - 1) } })), goalPlus: () => upd(x => ({ set: { ...x.set, goal: Math.min(7, x.set.goal + 1) } })),
    restMinus: () => upd(x => ({ set: { ...x.set, rest: Math.max(30, x.set.rest - 15) } })), restPlus: () => upd(x => ({ set: { ...x.set, rest: Math.min(300, x.set.rest + 15) } })),
    nudge: SW.nudge ? `After ${SW.nudge} quiet days` : 'Off', cycleNudge: () => upd(x => ({ set: { ...x.set, nudge: ({ 0: 3, 3: 5, 5: 7, 7: 0 })[x.set.nudge] } })),
    ruleName: { rir: 'RIR gated', double: 'Double progression', linear: 'Linear' }[SW.rule], cycleRule: () => upd(x => ({ set: { ...x.set, rule: ({ rir: 'double', double: 'linear', linear: 'rir' })[x.set.rule] } })),
    importFile: () => upd(() => toast('Import reads an Overload export, a shared program, or a Strong or Hevy CSV.')),
    widget: () => upd(() => toast('Widget added to the home screen')), licences: () => upd(() => toast('Exercise data: Free Exercise DB (public domain) and exercises-dataset (MIT).')),
    ask: () => upd(() => toast('Opens a prefilled request. Nothing is sent until you press send.')),
    wipeLabel: s.confirm === 'wipe' ? 'Tap again to delete every session' : 'Delete everything',
    wipe: () => upd(x => x.confirm === 'wipe' ? { ...initial(), set: x.set, sessions: [], ...toast('Every logged session deleted.') } : { confirm: 'wipe' }),
  });

  // ---- Live
  let lv = { ready: false };
  if (s.live) {
    const lvS = s.live, updL = fn => upd(x => ({ live: { ...x.live, ...fn(x.live) } }));
    const total = it => it.sets + it.extra, left = it => total(it) - it.logged.length;
    const fi = lvS.items.findIndex(it => it.lift === lvS.focus);
    const pi = fi >= 0 && left(lvS.items[fi]) > 0 ? fi : lvS.items.findIndex(it => left(it) > 0);
    const empty = lvS.items.length === 0, ptr = pi >= 0;
    const it = lvS.items[ptr ? pi : Math.max(0, lvS.items.length - 1)] || null;
    const l = it ? lift(it.lift) : null, lg2 = it ? it.logged : [], si = lg2.length, tot = it ? total(it) : 0;
    const lastW = lg2.length ? lg2[lg2.length - 1].w : it ? it.w : 0;
    const cw = lvS.pend.w ?? lastW, cr = lvS.pend.r ?? (it ? it.propR : 0), crir = lvS.pend.rir ?? (it ? it.rir : 2);
    const proj = it && ptr ? lg2.concat([{ w: cw, r: cr, rir: crir }], Array(Math.max(0, tot - si - 1)).fill({ w: cw, r: it.propR, rir: it.rir })) : lg2;
    const eng = it ? outlook(l, it, proj, !ptr) : { nw: '', d: '', up: false, notUp: true, why: '' };
    const doneCount = lvS.items.reduce((a, x) => a + x.logged.length, 0), totalCount = lvS.items.reduce((a, x) => a + total(x), 0);
    const remSecs = (totalCount - doneCount) * 45 + lvS.items.reduce((a, x) => a + Math.max(0, left(x) - 1) * x.rest, 0) + lvS.rest;
    const nxt = ptr ? lvS.items.slice(pi + 1).find(x => left(x) > 0) : null;
    const segColor = (x, j) => { const d = x.logged.length; return j < d ? 'var(--acf,#D6FF3E)' : (ptr && x === it && j === d ? 'var(--am,#6E822C)' : 'var(--bi,#262A24)'); };
    const board = lvS.items.map(x => { const d = x.logged.length, t = total(x), cur = ptr && x === it, fin = d >= t, xl = lift(x.lift), w = d ? x.logged[d - 1].w : x.w;
      return { name: xl.name, sub: `${d} of ${t} sets · ${fmt(w)} ${xl.unit}`, cur, fin, rest: !cur && !fin, tag: cur ? 'now' : fin ? 'done' : `${d} of ${t}`,
        tagInk: cur ? 'var(--aci,#D6FF3E)' : 'var(--i4,#9AA093)', bg: cur ? 'var(--eg2,#1E2317)' : 'transparent', segs: Array.from({ length: t }, (_, j) => ({ c: segColor(x, j) })),
        tap: () => updL(() => ({ focus: x.lift, pend: {} })) }; });
    const finish = () => upd(x => { const L2 = x.live, items = L2.items.filter(i => i.logged.length).map(i => ({ lift: i.lift, sets: i.logged }));
      if (!items.length) return { live: null, route: null, tab: 'today', sheet: null, ...toast('Nothing logged, so nothing was saved.') };
      const rxm = Object.fromEntries(L2.items.map(i => [i.lift, { lo: i.lo, hi: i.hi, rir: i.rir, sets: i.sets }]));
      return { pending: { id: 's' + Date.now(), tpl: L2.tpl, name: L2.name, off: 0, dur: Math.max(1, Math.round((Date.now() - L2.started) / 60000)), items, rx: rxm },
        live: { ...L2, rest: 0 }, route: { n: 'summary' }, sheet: null }; });
    const rail = Array.from({ length: tot }, (_, i) => i < si
      ? { done: true, now: false, todo: false, n: i + 1, tap: () => upd(() => ({ sheet: 'editset', editSet: { src: 'live', lift: it.lift, idx: i } })), lbl2: lg2[i].k === 'warm' ? 'WARM-UP' : lg2[i].k && lg2[i].k !== 'normal' ? kindName(lg2[i].k).toUpperCase() : `SET ${lg2.slice(0, i + 1).filter(z => z.k !== 'warm').length}`, w2: `${fmt(lg2[i].w)} × ${lg2[i].r}`, lbl: isB ? `Set ${i + 1}` : `SET ${i + 1}`, val: isB ? `${fmt(lg2[i].w)} × ${lg2[i].r}` : `${fmt(lg2[i].w)}×${lg2[i].r}`, sub: `@${rirTxt(lg2[i].rir)}` }
      : { done: false, now: i === si && ptr, todo: !(i === si && ptr), n: i + 1, lbl2: `SET ${i - lg2.filter(z => z.k === 'warm').length + 1}`, w2: i === si && ptr ? 'now' : '–', lbl: isB ? `Set ${i + 1}` : `SET ${i + 1}`, val: '–', sub: '' });
    lv = { ready: true, step: l ? fmt(l.step) : '',
      wMinus: () => updL(x => ({ pend: { ...x.pend, w: Math.max(0, cw - l.step) } })), wPlus: () => updL(x => ({ pend: { ...x.pend, w: cw + l.step } })),
      rMinus: () => updL(x => ({ pend: { ...x.pend, r: Math.max(0, cr - 1) } })), rPlus: () => updL(x => ({ pend: { ...x.pend, r: cr + 1 } })),
      kindLabel: kindName(lvS.pend.k), kindOn: !!lvS.pend.k && lvS.pend.k !== 'normal', kindOff: !lvS.pend.k || lvS.pend.k === 'normal',
      kinds: KINDS.map(([k, , label]) => ({ label, on: (lvS.pend.k || 'normal') === k, off: (lvS.pend.k || 'normal') !== k, tap: () => updL(x => ({ pend: { ...x.pend, k } })) })),
      kindHint: ({ warm: 'A warm-up. It does not count as a working set or move next time\u2019s weight.', drop: 'Logged as a drop set. It does not move next time’s weight.', rp: 'Logged as rest-pause. It does not move next time’s weight.', amrap: 'As many reps as you can. It counts towards next time.' })[lvS.pend.k] || '',
      cycleKind: () => updL(x => { const i = KINDS.findIndex(k => k[0] === (x.pend.k || 'normal')); return { pend: { ...x.pend, k: KINDS[(i + 1) % KINDS.length][0] } }; }),
      empty, notEmpty: !empty, name: lvS.name, nameUp: lvS.name.toUpperCase(),
      elapsed: mmss(Math.max(0, (now - lvS.started) / 1000)), ends: clock(now + remSecs * 1000), pct: totalCount ? Math.round(doneCount / totalCount * 100) : 0,
      doneTxt: `${doneCount} of ${totalCount} sets`, liftName: l ? l.name : '', liftKicker: l ? `Lift ${(ptr ? pi : lvS.items.length - 1) + 1} of ${lvS.items.length} · ${l.eq}` : '',
      liftSub: it ? (isB ? `Set ${Math.min(si - lg2.filter(z => z.k === 'warm').length + 1, tot - lg2.filter(z => z.k === 'warm').length)} of ${tot - lg2.filter(z => z.k === 'warm').length} · ${it.lo}–${it.hi} reps @ RIR ${it.rir}` : `Set ${Math.min(si + 1, tot)} of ${tot} · ${it.lo}–${it.hi} reps · ${l.eq}`) : '',
      rail, target: it ? it.rir : 2, board, eng, cw: fmt(cw), cr: String(cr), unit: l ? (isB ? l.unit.toUpperCase() : l.unit) : '', unitUp: l ? l.unit.toUpperCase() : '',
      rirs: [0, 1, 2, 3, 4].map(n => { const on = crir === n; return { n: rirTxt(n), sub: SUBS[n], on, off: !on, isTarget: it && n === it.rir,
        subColor: it && n === it.rir ? 'var(--aci,#D6FF3E)' : 'var(--i4,#9AA093)', dot: it && n === it.rir ? (on ? '#0C0E0B' : 'var(--aci,#D6FF3E)') : 'transparent', tap: () => updL(x => ({ pend: { ...x.pend, rir: n } })) }; }),
      prevTxt: si ? `set ${si}: ${fmt(lg2[si - 1].w)} × ${lg2[si - 1].r}` : 'working weight', upNext: nxt ? lift(nxt.lift).name : 'Last lift of the workout', upNextSub: nxt ? `${fmt(nxt.w)} ${lift(nxt.lift).unit} · ${nxt.sets} × ${nxt.lo}–${nxt.hi}` : 'last lift',
      editW: () => upd(x => ({ sheet: 'kp', kpF: 'w', kpBuf: fmt(cw), kpFresh: true })), editR: () => upd(x => ({ sheet: 'kp', kpF: 'r', kpBuf: String(cr), kpFresh: true })),
      addSet: () => updL(x => ({ items: x.items.map(y => y === it || (it && y.lift === it.lift) ? { ...y, extra: y.extra + 1 } : y) })),
      modeLog: ptr && lvS.rest <= 0, modeRest: ptr && lvS.rest > 0, modeFinish: !ptr && !empty, modeEmpty: empty,
      logLabel: it ? `Log ${fmt(cw)} ${l.unit} × ${cr} @ ${rirTxt(crir)}` : '', logLabel2: it ? `Log set ${si + 1} · ${fmt(cw)} ${l.unit} × ${cr}` : '',
      log: () => { if (!it) return; if (s.set.logKind !== 'none') playSound(s.set.logKind, s.set.volume / 100); if (s.set.haptic && navigator.vibrate) navigator.vibrate(15); updL(x => { const n = it.logged.length + 1, rest0 = it.rest ?? s.set.rest;
        const rest = s.set.adaptive ? Math.max(45, Math.min(300, rest0 + (crir === 0 ? 30 : crir >= it.rir + 2 ? -30 : 0))) : rest0;
        return { items: x.items.map(y => y.lift === it.lift ? { ...y, extra: y.extra + ((x.pend.k || 'normal') === 'warm' ? 1 : 0), logged: [...y.logged, { w: cw, r: cr, rir: crir, k: x.pend.k || 'normal' }] } : y), pend: {}, rest, restTotal: rest, restWho: `${l.name}, set ${n} logged` }; }); },
      restTxt: mmss(lvS.rest), restWho: lvS.restWho, restPct: Math.round(lvS.rest / Math.max(1, lvS.restTotal) * 100),
      nextLine: it ? `Next: ${l.name}, set ${si + 1} · ${fmt(cw)} ${l.unit} × ${cr}` : '',
      plus30: () => updL(x => ({ rest: x.rest + 30, restTotal: x.restTotal + 30 })), skip: () => updL(() => ({ rest: 0 })),
      finish, openBoard: () => upd(() => ({ sheet: 'board' })), addLift: () => upd(() => ({ sheet: 'picker', picker: { target: 'live', q: '' } })),
      discard: () => upd(() => ({ live: null, route: null, tab: 'today', sheet: null, ...toast('Workout discarded') })) };
    // Keypad
    const kpIsW = s.kpF === 'w';
    const commit = x => { const v = parseFloat(x.kpBuf); if (isNaN(v)) return x.live.pend; return { ...x.live.pend, [x.kpF]: x.kpF === 'w' ? Math.max(0, v) : Math.max(0, Math.round(v)) }; };
    const curOf = (pend, f) => f === 'w' ? (pend.w ?? lastW) : (pend.r ?? (it ? it.propR : 0));
    lv.kp = { head: l ? `${l.name} · set ${Math.min(si + 1, tot)}` : '', val: s.kpBuf || '0', unit: kpIsW ? (l ? l.unit : '') : 'reps', stepTxt: kpIsW ? fmt(l ? l.step : 1) : '1', isW: kpIsW, isR: !kpIsW,
      toW: () => upd(x => { const pend = commit(x); return { live: { ...x.live, pend }, kpF: 'w', kpBuf: fmt(curOf(pend, 'w')), kpFresh: true }; }),
      toR: () => upd(x => { const pend = commit(x); return { live: { ...x.live, pend }, kpF: 'r', kpBuf: String(curOf(pend, 'r')), kpFresh: true }; }),
      minus: () => upd(x => ({ kpBuf: fmt(Math.max(0, (parseFloat(x.kpBuf) || 0) - (x.kpF === 'w' ? l.step : 1))), kpFresh: true })),
      plus: () => upd(x => ({ kpBuf: fmt((parseFloat(x.kpBuf) || 0) + (x.kpF === 'w' ? l.step : 1)), kpFresh: true })),
      keys: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'].map(ch => ({ k: ch, tap: () => upd(x => {
        let b = x.kpFresh ? '' : x.kpBuf;
        if (ch === '⌫') b = (x.kpFresh ? x.kpBuf : b).slice(0, -1);
        else if (ch === '.') { if (x.kpF === 'r' || b.includes('.')) return {}; b = (b || '0') + '.'; }
        else if (b.length < 5) b += ch;
        return { kpBuf: b, kpFresh: false }; }) })),
      done: () => upd(x => ({ live: { ...x.live, pend: commit(x) }, sheet: null })) };
  }

  // ---- Picker
  const pk = s.picker, pq = pk.q.trim().toLowerCase();
  const pmatch = l => !pq || [l.name, l.eq, l.region, ...l.mus.map(m => m[0])].some(x => x.toLowerCase().includes(pq));
  const taken = pk.target === 'live' ? (s.live ? s.live.items.map(i => i.lift) : []) : ((tpl(pk.tpl) || { items: [] }).items.map(i => i.lift));
  const addTo = (st, id, lifts) => {
    const L3 = lifts.find(l => l.id === id), item = rx(L3);
    if (st.picker.target === 'live') { const p = prop(id, item); return { live: { ...st.live, items: [...st.live.items, { ...item, w: L3.W, propR: item.lo, ...(hist(id).length ? { w: p.w, propR: p.propR } : {}), logged: [], extra: 0 }], focus: id, pend: {} }, sheet: null }; }
    return { tpls: st.tpls.map(t => t.id === st.picker.tpl ? { ...t, items: [...t.items, item] } : t), sheet: null };
  };
  const picker = { title: pk.target === 'live' ? `Add to ${s.live ? s.live.name : 'workout'}` : `Add to ${(tpl(pk.tpl) || { name: '' }).name}`, titleUp: (pk.target === 'live' ? 'ADD TO ' + (s.live ? s.live.name : 'WORKOUT') : 'ADD TO ' + (tpl(pk.tpl) || { name: '' }).name).toUpperCase(),
    q: pk.q, onQ: e => { const v = e.target.value; upd(x => ({ picker: { ...x.picker, q: v } })); },
    mine: s.lifts.filter(l => pmatch(l) && !taken.includes(l.id)).slice(0, 6).map(l => { const h = hist(l.id);
      return { name: l.name, sub: `${l.eq} · ${l.mus[0][0]}${h.length ? ` · ${fmt(h[h.length - 1].sets[0].w)} ${l.unit}` : ''}`, sub2: h.length ? `Yours · ${l.eq} · ${fmt(h[h.length - 1].sets[0].w)} ${l.unit} last time` : `Yours · ${l.eq}`, tap: () => upd(x => addTo(x, l.id, x.lifts)) }; }),
    lib: LIBRARY.filter(x => pmatch(x) && !s.lifts.some(l => l.name === x.name)).slice(0, pq ? 6 : 3).map(x => ({ name: x.name, sub: `${x.eq} · ${x.mus.map(m => m[0]).join(' + ')}`,
      tap: () => upd(st2 => { const id = 'n' + st2.made, lifts = [...st2.lifts, { ...x, id, phase: 'none' }]; return { lifts, made: st2.made + 1, ...addTo({ ...st2, lifts }, id, lifts) }; }) })),
    custom: () => upd(() => toast('Custom lift builds a lift by hand in the app.')) };
  picker.hasMine = picker.mine.length > 0; picker.hasLib = picker.lib.length > 0; picker.count = `${picker.mine.length + picker.lib.length} found`;

  // ---- Spec sheet (prescription)
  let spec = {};
  if (s.spec && tpl(s.spec.tpl) && tpl(s.spec.tpl).items[s.spec.idx]) {
    const t = tpl(s.spec.tpl), i0 = s.spec.idx, it = t.items[i0], l = lift(it.lift);
    const pi = fn => upd(x => ({ tpls: x.tpls.map(y => y.id === t.id ? { ...y, items: y.items.map((z, j) => j === i0 ? { ...z, ...fn(z) } : z) } : y) }));
    const row = (label, hint, val, minus, plus) => ({ label, hint, val, minus, plus });
    spec = { name: l.name, tplName: t.name.toUpperCase(), rows: [
      row('Sets', 'Working sets, not counting warm-ups', String(it.sets), () => pi(z => ({ sets: Math.max(1, z.sets - 1) })), () => pi(z => ({ sets: Math.min(8, z.sets + 1) }))),
      row('Bottom of range', 'Where it starts after a step up', String(it.lo), () => pi(z => ({ lo: Math.max(1, z.lo - 1) })), () => pi(z => ({ lo: Math.min(z.hi, z.lo + 1) }))),
      row('Top of range', 'Clear it on every set and the weight goes up', String(it.hi), () => pi(z => ({ hi: Math.max(z.lo, z.hi - 1) })), () => pi(z => ({ hi: Math.min(30, z.hi + 1) }))),
      row('Target RIR', 'Reps you should have left at the end of each set', String(it.rir), () => pi(z => ({ rir: Math.max(0, z.rir - 1) })), () => pi(z => ({ rir: Math.min(4, z.rir + 1) }))),
      row('Rest', 'Time between sets', mmss(it.rest), () => pi(z => ({ rest: Math.max(30, z.rest - 15) })), () => pi(z => ({ rest: Math.min(300, z.rest + 15) }))),
    ], canUp: i0 > 0, canDown: i0 < t.items.length - 1,
      up: () => upd(x => ({ tpls: x.tpls.map(y => { if (y.id !== t.id || !i0) return y; const a = y.items.slice(); [a[i0 - 1], a[i0]] = [a[i0], a[i0 - 1]]; return { ...y, items: a }; }), spec: { ...x.spec, idx: i0 - 1 } })),
      down: () => upd(x => ({ tpls: x.tpls.map(y => { if (y.id !== t.id || i0 >= y.items.length - 1) return y; const a = y.items.slice(); [a[i0 + 1], a[i0]] = [a[i0], a[i0 + 1]]; return { ...y, items: a }; }), spec: { ...x.spec, idx: i0 + 1 } })),
      remove: () => upd(x => ({ tpls: x.tpls.map(y => y.id === t.id ? { ...y, items: y.items.filter((_, j) => j !== i0) } : y), sheet: null, spec: null })), done: () => upd(() => ({ sheet: null })) };
  }

  // ---- Edit a logged set, programs, new lift, deletes, tables
  let es = {};
  if (s.editSet) {
    const e = s.editSet;
    const arrOf = st => e.src === 'live' ? ((st.live && st.live.items.find(i => i.lift === e.lift)) || { logged: [] }).logged
      : (((st.sessions.find(x => x.id === e.sid) || { items: [] }).items.find(i => i.lift === e.lift)) || { sets: [] }).sets;
    const cur = arrOf(s)[e.idx], l = lift(e.lift);
    if (cur && l) {
      const mapArr = (st, fn) => e.src === 'live'
        ? { live: { ...st.live, items: st.live.items.map(i => i.lift === e.lift ? { ...i, logged: fn(i.logged) } : i) } }
        : { sessions: st.sessions.map(x => x.id !== e.sid ? x : { ...x, items: x.items.map(i => i.lift === e.lift ? { ...i, sets: fn(i.sets) } : i).filter(i => i.sets.length) }) };
      const patch = fn => upd(st => mapArr(st, a => a.map((t, j) => j === e.idx ? { ...t, ...fn(t) } : t)));
      es = { title: l.name, sub: `Set ${e.idx + 1}${e.src === 'session' ? ' · logged workout' : ' · this workout'}`, w: fmt(cur.w), unit: l.unit, r: String(cur.r), step: fmt(l.step),
        wMinus: () => patch(t => ({ w: Math.max(0, t.w - l.step) })), wPlus: () => patch(t => ({ w: t.w + l.step })),
        rMinus: () => patch(t => ({ r: Math.max(0, t.r - 1) })), rPlus: () => patch(t => ({ r: t.r + 1 })),
        rirs: [0, 1, 2, 3, 4].map(n => ({ n: rirTxt(n), sub: SUBS[n], on: cur.rir === n, off: cur.rir !== n, tap: () => patch(() => ({ rir: n })) })),
        kinds: KINDS.map(([k, label]) => ({ label, on: (cur.k || 'normal') === k, off: (cur.k || 'normal') !== k, tap: () => patch(() => ({ k })) })),
        removeLabel: e.src === 'live' ? 'Mark not done' : 'Delete set',
        remove: () => upd(st => ({ ...mapArr(st, a => a.filter((_, j) => j !== e.idx)), sheet: null, editSet: null })),
        done: () => upd(() => ({ sheet: null, editSet: null })) };
    }
  }
  pl.editProgram = () => upd(st => ({ sheet: 'prog', pe: { name: st.prog.name, ids: st.prog.ids.slice() } }));
  pl.newProgram = () => upd(() => ({ sheet: 'prog', pe: { name: 'New program', ids: [] } }));
  let pe = {};
  if (s.pe) pe = { name: s.pe.name, onName: e => { const v = e.target.value; upd(st => ({ pe: { ...st.pe, name: v } })); },
    tpls: s.tpls.map(t => { const i = s.pe.ids.indexOf(t.id); return { name: t.name, meta: `${tplMeta(t).lifts} · ${t.items.map(x => lift(x.lift).name).slice(0, 2).join(', ')}`, on: i >= 0, off: i < 0, pos: i >= 0 ? String(i + 1) : '',
      tap: () => upd(st => ({ pe: { ...st.pe, ids: i >= 0 ? st.pe.ids.filter(x => x !== t.id) : [...st.pe.ids, t.id] } })) }; }),
    canSave: s.pe.ids.length > 0, cantSave: !s.pe.ids.length,
    save: () => upd(st => ({ prog: { name: st.pe.name.trim() || 'Program', ids: st.pe.ids }, pe: null, sheet: null, ...toast(`${st.pe.name.trim() || 'Program'} is the active program`) })) };
  lf.newLift = () => upd(() => ({ sheet: 'newlift', nl: { name: s.lfQ || '', eq: 'Barbell', region: s.lfRegion !== 'All' ? s.lfRegion : 'Chest' } }));
  const NL = s.nl, EQS = ['Barbell', 'Dumbbells', 'Cable', 'Machine', 'Bodyweight'], RM = { Chest: 'Chest', Back: 'Lats', Shoulders: 'Front delts', Legs: 'Quads', Arms: 'Biceps', Core: 'Abs' };
  const nl = { name: NL.name, onName: e => { const v = e.target.value; upd(st => ({ nl: { ...st.nl, name: v } })); },
    eqs: EQS.map(q => ({ label: q, on: NL.eq === q, off: NL.eq !== q, tap: () => upd(st => ({ nl: { ...st.nl, eq: q } })) })),
    regions: REGIONS.slice(1).map(g => ({ label: g, on: NL.region === g, off: NL.region !== g, tap: () => upd(st => ({ nl: { ...st.nl, region: g } })) })),
    canCreate: NL.name.trim().length > 1, cantCreate: NL.name.trim().length <= 1,
    create: () => upd(st => { const id = 'c' + st.made, db = st.nl.eq === 'Dumbbells';
      const L4 = L(id, st.nl.name.trim(), st.nl.eq, st.nl.region, [[RM[st.nl.region], 1]], { unit: db ? 'kg/side' : 'kg', per: db ? 2 : 1, step: db ? 2 : st.nl.eq === 'Machine' ? 5 : 2.5, W: 20, phase: 'none' });
      return { lifts: [...st.lifts, L4], made: st.made + 1, sheet: null, route: { n: 'lift', id }, ...toast(`${L4.name} added to your lifts`) }; }) };
  if (r === 'builder') { const id = s.route.id;
    bd.delLabel = s.confirm === 'tpl:' + id ? 'Tap again to delete this template' : 'Delete template';
    bd.del = () => upd(st => st.tpls.length <= 1 ? toast('Keep at least one template.') : st.confirm === 'tpl:' + id
      ? { tpls: st.tpls.filter(t => t.id !== id), prog: { ...st.prog, ids: st.prog.ids.filter(x => x !== id).length ? st.prog.ids.filter(x => x !== id) : [st.tpls.find(t => t.id !== id).id] }, route: null, tab: 'plans', confirm: null, ...toast('Template deleted') }
      : { confirm: 'tpl:' + id });
    bd.share = () => upd(st => toast(`${st.tpls.find(t => t.id === id).name}.overload is ready to share`)); }
  if (r === 'lift' && ld.best && ld.best !== '–') { const l = lift(s.route.id), best = Math.max(...hist(l.id).map(x => bestOf(x.sets))), snap = v => Math.floor(v / l.step) * l.step;
    ld.pct = [100, 90, 80, 70, 60].map(p => ({ p: p + '%', w: fmt(snap(best * p / 100)), reps: p === 100 ? '1 rep' : `≈${Math.round(30 * (100 / p - 1))} reps` }));
    ld.rms = [1, 3, 5, 8, 10].map(n => ({ n: n + 'RM', w: fmt(snap(best / (1 + n / 30))) })); }
  if (ld.name) { ld.hasPct = !!ld.pct; ld.pct = ld.pct || []; ld.rms = ld.rms || []; }
  if (r === 'session' && sm.name) { const sid = s.route.id;
    Object.assign(sm, { editing: s.sessEdit, notEditing: !s.sessEdit, toggleEdit: () => upd(st => ({ sessEdit: !st.sessEdit, confirm: null })), editLabel: s.sessEdit ? 'Done' : 'Edit',
      delLabel: s.confirm === 'sess:' + sid ? 'Tap again to delete this workout' : 'Delete workout',
      del: () => upd(st => st.confirm === 'sess:' + sid ? { sessions: st.sessions.filter(x => x.id !== sid), route: null, confirm: null, sessEdit: false, ...toast('Workout deleted') } : { confirm: 'sess:' + sid }),
      durMinus: () => upd(st => ({ sessions: st.sessions.map(x => x.id === sid ? { ...x, dur: Math.max(1, x.dur - 5) } : x) })),
      durPlus: () => upd(st => ({ sessions: st.sessions.map(x => x.id === sid ? { ...x, dur: x.dur + 5 } : x) })),
      done: () => upd(() => ({ route: null, sheet: null, sessEdit: false, confirm: null })) }); }

  const onRoot = !s.route;
  return {
    ready: true, dateLong: longDay(0), dateUp: longDay(0).toUpperCase(),
    rToday: onRoot && s.tab === 'today', rPlans: onRoot && s.tab === 'plans', rLifts: onRoot && s.tab === 'lifts', rLog: onRoot && s.tab === 'log',
    rBuilder: r === 'builder', rLift: r === 'lift', rSession: r === 'session', rSettings: r === 'settings', rLive: r === 'live' && !!s.live, rSummary: r === 'summary' && !!s.pending,
    rSumm: (r === 'summary' && !!s.pending) || r === 'session', showTabs: onRoot,
    tToday: s.tab === 'today', tPlans: s.tab === 'plans', tLifts: s.tab === 'lifts', tLog: s.tab === 'log',
    nToday: s.tab !== 'today', nPlans: s.tab !== 'plans', nLifts: s.tab !== 'lifts', nLog: s.tab !== 'log',
    goToday: go('today'), goPlans: go('plans'), goLifts: go('lifts'), goLog: go('log'), openSettings: push('settings'), back,
    toLiveBack: () => upd(() => ({ route: null, tab: 'today', sheet: null })),
    hasToast: !!s.toast && now - s.toastAt < 2600, toast: s.toast,
    shKp: s.sheet === 'kp' && !!s.live, shBoard: s.sheet === 'board' && !!s.live, shPicker: s.sheet === 'picker', shSpec: s.sheet === 'spec' && !!spec.rows, shPick: s.sheet === 'pick',
    closeSheet: () => upd(() => ({ sheet: null, editSet: null, pe: null })),
    shEdit: s.sheet === 'editset' && !!es.title, shSound: s.sheet === 'sound', shProg: s.sheet === 'prog' && !!s.pe, shNewLift: s.sheet === 'newlift', es, pe, nl, vars: themeVars(s.set),
    td, pl, bd, lf, ld, lg, sm, st: settings, lv, pk: picker, spec,
  };
}
