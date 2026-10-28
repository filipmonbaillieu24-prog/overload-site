// REGOL 1.8 prototype: data, a reading of the engine, and the view model the screens draw.
// Data is the app's own save format (polish/sample-data.json). Tokens come from polish/regol-core.js.

export const DAY0 = 20738; // Monday 12 October 2026, the last day in the sample log
const DOW = ['Thursday', 'Friday', 'Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday'];
const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const dateOf = d => new Date(Date.UTC(1970, 0, 1) + d * 864e5);
export const dow = d => DOW[((d % 7) + 7) % 7];
export const longDay = d => `${dow(d)} ${dateOf(d).getUTCDate()} ${MON[dateOf(d).getUTCMonth()]}`;
export const shortDay = d => `${dow(d).slice(0, 3)} ${dateOf(d).getUTCDate()} ${MON[dateOf(d).getUTCMonth()].slice(0, 3)}`;
export const monthYear = d => `${MON[dateOf(d).getUTCMonth()]} ${dateOf(d).getUTCFullYear()}`;
export const weekStart = d => d - ((((d - 4) % 7) + 7) % 7); // Monday-first
export const fmt = x => Number.isInteger(x) ? String(x) : String(Math.round(x * 100) / 100);
export const thousands = n => Math.round(n).toLocaleString('en-GB');
export const plural = (n, w, p) => `${n} ${n === 1 ? w : (p || w + 's')}`;
export const mmss = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
export const e1 = t => t.w * (1 + t.r / 30);
export const relDay = (d, today = DAY0) => d === today ? 'today' : d === today - 1 ? 'yesterday' : today - d < 7 ? dow(d).toLowerCase() : `${today - d} days ago`;

export function loadLabel(w, ex) {
  if (ex.load === 'added') return w > 0 ? `+${fmt(w)} kg` : 'BW';
  if (ex.load === 'assisted') return `${fmt(w)} kg assist`;
  return `${fmt(w)} ${ex.unit}`;
}
export const unitHeader = ex => ex.load === 'added' ? 'ADDED KG' : ex.perSide ? 'KG / SIDE' : ex.unit.toUpperCase();

export function seed(sample, plan) {
  const d = JSON.parse(JSON.stringify(sample));
  return { d, plan, screen: 'today', sheet: null, live: null, pending: null, liftId: null, sessionId: null, sessionBack: 'log', templateId: null,
    libTab: 'exercises', liftSort: 'recent', region: 'All', q: '', logTab: 'w', invited: false, restoreNote: 'Check again with Play',
    prShow: null, prRest: null, armed: null, toast: '', toastAt: 0, pe: null, sub: null, now: Date.now(), selected: null, accent: '#D6FF3E' };
}

// ---- history helpers
export const ex = (s, id) => s.d.exercises.find(e => e.id === id);
export const tpl = (s, id) => s.d.templates.find(t => t.id === id);
export const sessionsAsc = s => s.d.sessions.slice().sort((a, b) => a.dateEpochDay - b.dateEpochDay || a.createdAt - b.createdAt);
export const working = sets => sets.filter(t => !t.warm);
export function hist(s, exId) {
  return sessionsAsc(s).map(x => { const it = x.items.find(i => i.exId === exId); return it ? { day: x.dateEpochDay, id: x.id, sets: working(it.sets) } : null; }).filter(x => x && x.sets.length);
}
export const bestOf = sets => Math.max(0, ...sets.filter(t => !t.secs).map(e1));

// ---- the engine, read for the prototype (RIR gated)
export function propose(s, item) {
  const e = ex(s, item.exId), h = hist(s, item.exId), last = h[h.length - 1];
  if (item.timed) return { w: 0, timed: true, why: 'Timed. No proposal for next time.', delta: '', rising: false, warn: false, first: false };
  if (!last) return { w: e.min || 0, first: true, rising: false, warn: false, delta: '', why: `First time: pick a weight you could lift for about ${Math.round((item.lo + item.hi) / 2)} reps with ${item.rir} left.` };
  const W = last.sets[0].w, t = item.rir, sets = last.sets;
  const avg = Math.floor(sets.reduce((a, x) => a + x.rir, 0) / sets.length), top = sets.every(x => x.r >= item.hi), L = v => loadLabel(v, e);
  if (avg < t) return { w: W, warn: true, rising: false, first: false, delta: '', why: `Under target: these averaged ${avg} in reserve against ${t}. It holds at ${L(W)} next time, and a second session like this proposes a deload.` };
  if (top || avg >= t + 1) {
    const nw = W + e.inc;
    return { w: nw, rising: true, warn: false, first: false, delta: '+' + fmt(e.inc), why: top ? `You cleared ${item.hi} reps on every set, so it moves up ${fmt(e.inc)} and starts again at ${item.lo}.` : `Every set finished ${avg} in reserve against a target of ${t}, so it moves up ${fmt(e.inc)}.` };
  }
  const rw = t + 1 === 0 ? 'nothing left' : `${t + 1}`;
  return { w: W, rising: false, warn: false, first: false, delta: '', why: `Holds at ${L(W)} next time. Clear ${item.hi + 1} reps on every set, or finish them at ${rw} in reserve, and it's ${L(W + e.inc)}.` };
}
export function nextTemplate(s) {
  const p = s.d.programs.find(x => x.id === s.d.settings.activeProgram);
  if (s.selected) return tpl(s, s.selected);
  if (!p) return s.d.templates[0];
  const last = sessionsAsc(s).filter(x => p.templateIds.includes(x.templateId)).pop();
  const i = last ? (p.templateIds.indexOf(last.templateId) + 1) % p.templateIds.length : 0;
  return tpl(s, p.templateIds[i]);
}
export function blockState(s, p) {
  if (!p || !p.block) return null;
  const b = p.block, wk = Math.floor((DAY0 - b.startDay) / 7), n = b.weeks + (b.deload ? 1 : 0), w = wk % n;
  const deload = b.deload && w === b.weeks;
  return { week: w + 1, weeks: b.weeks, deload, rir: deload ? null : (b.rirPerWeek || [])[w], label: deload ? 'Deload week' : `Week ${w + 1} of ${b.weeks}` };
}

// ---- the free plan
export function openTemplates(s) {
  const T = s.d.templates; if (s.plan !== 'free' || T.length <= 3) return new Set(T.map(t => t.id));
  const last = id => Math.max(-1e9, ...s.d.sessions.filter(x => x.templateId === id).map(x => x.dateEpochDay));
  return new Set(T.slice().sort((a, b) => last(b.id) - last(a.id)).slice(0, 3).map(t => t.id));
}
export const REASON = { template: 'The free plan keeps 3 templates. The subscription lifts the limit.', program: 'The free plan keeps 1 program. The subscription lifts the limit.',
  stats: 'Charts, records and the weekly debrief come with the subscription.', notes: 'Notes on your lifts and templates come with the subscription.',
  start: 'This one is outside your free plan. The subscription trains all of them, or use one of the 3 the plan covers.' };

// ---- live workout
export function startLive(s, t) {
  const warmPct = s.d.settings.warmPct || 60;
  const cards = t.items.map(it => {
    const e = ex(s, it.exId), p = propose(s, it), sets = [];
    const snap = v => Math.max(e.min || 0, Math.round(v / e.inc) * e.inc);
    for (let i = 0; i < (it.warm || 0); i++) sets.push({ w: snap(p.w * (warmPct / 100) * (i + 1) / (it.warm)), r: i === 0 ? 8 : 5, rir: 4, warm: true, done: false });
    for (let i = 0; i < it.sets; i++) {
      const w = it.style === 'topBackoff' && i > 0 ? snap(p.w * (1 - (it.backoffPct || 10) / 100)) : p.w;
      sets.push(it.timed ? { w: 0, r: 0, secs: Math.round((it.lo + it.hi) / 2 / 5) * 5, rir: it.rir, warm: false, done: false } : { w, r: it.style === 'topBackoff' && i > 0 ? it.hi : (p.rising ? it.lo : Math.min(it.hi, (hist(s, it.exId).pop()?.sets[i]?.r ?? it.lo))), rir: it.rir, warm: false, done: false });
    }
    return { exId: it.exId, target: it, sets };
  });
  return { tplId: t.id, name: t.name, started: Date.now(), cards, ci: 0, rest: null, restWho: '', lastLog: 0 };
}
export function cursor(l) {
  for (let ci = l.ci; ci < l.cards.length; ci++) { const si = l.cards[ci].sets.findIndex(x => !x.done); if (si >= 0) return { ci, si }; }
  for (let ci = 0; ci < l.cards.length; ci++) { const si = l.cards[ci].sets.findIndex(x => !x.done); if (si >= 0) return { ci, si }; }
  return null;
}
export function finishLive(s) {
  const l = s.live, dur = Math.max(1, Math.round((Date.now() - l.started) / 60000));
  const items = l.cards.map(c => ({ exId: c.exId, name: ex(s, c.exId).name, target: c.target, sets: c.sets.filter(x => x.done).map(({ done, ...t }) => t) })).filter(i => i.sets.length);
  return { id: 'n' + Date.now(), templateId: l.tplId, name: l.name, dateEpochDay: DAY0, dur: Math.max(dur, 1), createdAt: Date.now(), items };
}

// ---- stats
export function sessionNumbers(s, x) {
  let sets = 0, ton = 0;
  x.items.forEach(it => { const e = ex(s, it.exId); working(it.sets).forEach(t => { sets++; if (!t.secs) ton += t.w * t.r * (e.perSide ? 2 : 1); }); });
  return { sets, ton };
}
export function recordsIn(s, x) {
  const before = s.d.sessions.filter(y => y.id !== x.id && (y.dateEpochDay < x.dateEpochDay || (y.dateEpochDay === x.dateEpochDay && y.createdAt < x.createdAt)));
  return x.items.map(it => {
    const prev = Math.max(0, ...before.flatMap(y => y.items.filter(i => i.exId === it.exId).flatMap(i => working(i.sets).filter(t => !t.secs).map(e1))));
    let run = prev, topT = null; working(it.sets).filter(t => !t.secs).forEach(t => { if (prev && e1(t) > run + .01) { run = e1(t); topT = t; } });
    return topT ? { exId: it.exId, t: topT, prev, now: run } : null;
  }).filter(Boolean);
}
export function lifetime(s) {
  let ton = 0, sets = 0, reps = 0, mins = 0;
  s.d.sessions.forEach(x => { const n = sessionNumbers(s, x); ton += n.ton; sets += n.sets; mins += x.dur; x.items.forEach(i => working(i.sets).forEach(t => reps += t.secs ? 0 : t.r)); });
  const first = Math.min(...s.d.sessions.map(x => x.dateEpochDay));
  return { ton, sets, reps, hours: Math.round(mins / 60), sessions: s.d.sessions.length, since: first };
}
export function weeklyStreak(s) {
  const goal = s.d.settings.weeklyGoal; let n = 0, w = weekStart(DAY0) - 7;
  for (;;) { const c = s.d.sessions.filter(x => x.dateEpochDay >= w && x.dateEpochDay < w + 7).length; if (c >= goal) { n++; w -= 7; } else break; }
  return n;
}
export const bodyweight = s => { const b = s.d.settings.bodyweight || []; return b.length ? b[b.length - 1] : null; };
