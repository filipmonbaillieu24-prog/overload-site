// The six-question generator.
//
// Six answers in, a program out. This file is only the rules: it takes the answers and the lift
// library and returns the same shape program.js edits, so everything it proposes can be changed
// afterwards and nothing here is special-cased downstream.
//
// It is a separate file, and a pure function, so it can be run outside the browser and checked
// against the real library - every combination of answers, every slot, every lift name.
//
// The rules, as decided:
//
//   Days a week pick the split by name: 1 full body, 2 full body twice, 3 push / pull / legs,
//   4 upper / lower twice, 5 push / pull / legs plus upper / lower, 6 push / pull / legs twice.
//   One template per training day, so the rotation on the Plans card has exactly as many rungs
//   as days you said you had. Where a split repeats a session - full body twice, upper twice -
//   the second one takes the next lift for each slot, so A and B are not the same workout.
//
//   Each template is an ordered list of movement slots. Your kit picks the lift for each slot,
//   in the order written here: nothing is inferred from muscle names, because the difference
//   between a good default and a bad one is not something a muscle tag knows.
//
//   Three slot classes carry the prescription: P 4 x 5-8, S 3 x 8-10, I 3 x 10-15. Experience
//   moves both the set count and the target reserve - first year one fewer set at RIR 3, a few
//   years as written at RIR 2, experienced one more set at RIR 1.
//
//   Session length fills slots until the app's own arithmetic - three minutes a working set,
//   rest included - reaches the time you have. Three slots is the floor whatever you answer,
//   because two is not a session.
//
//   Emphasis adds one more slot for that area to every session that trains it, placed beside
//   the slot it doubles. The time cap then drops from the end, so the extra slot displaces the
//   lowest-priority one rather than making the session longer.
//
//   An area you would rather not train has its slots taken out before the clock is counted, so
//   the time goes to what is left rather than to a gap. A session that is left with fewer than
//   three lifts is not a session, so that day goes to the workouts that do still have lifts -
//   four days and no legs is four upper-body days, not two days and two empty rungs. Both
//   answers are kept. Only when nothing in the split survives is the week left short.
//
//   A block is optional and carries only its length: the app's own defaults do the rest - a
//   deload week at the end, reserve ramping from the target down to two harder.
(function (root) {
  'use strict';

  /* ---------- the slot table ---------- */

  // Each slot is an ordered list of [name, equipment] from the library. The first one your kit
  // allows is what you get; a session never takes the same lift twice, so a slot that repeats
  // moves down the list. A slot with nothing your kit can do is left out - bodyweight alone has
  // no overhead press worth prescribing, and inventing one would be worse than saying nothing.
  var SLOTS = {
    squat: { area: 'legs', label: 'Squat', picks: [
      ['Barbell Squat', 'Barbell'],
      ['Hack Squat', 'Machine'],
      ['Dumbbell Goblet Squat', 'Dumbbell'],
      ['Barbell Front Squat', 'Barbell'],
      ['Leg Press', 'Machine'],
      ['Dumbbell Squat', 'Dumbbell'],
      ['Bodyweight Squat', 'Bodyweight'],
    ] },
    hpress: { area: 'chest', label: 'Horizontal press', picks: [
      ['Barbell Bench Press', 'Barbell'],
      ['Dumbbell Bench Press', 'Dumbbell'],
      ['Machine Bench Press', 'Machine'],
      ['Cable Bench Press', 'Cable'],
      ['Push-up', 'Bodyweight'],
      ['Push-Up Wide', 'Bodyweight'],
    ] },
    incline: { area: 'chest', label: 'Incline press', picks: [
      ['Barbell Incline Bench Press', 'Barbell'],
      ['Dumbbell Incline Bench Press', 'Dumbbell'],
      ['Cable Incline Bench Press', 'Cable'],
      ['Decline Push-up', 'Bodyweight'],
      ['Push-Ups With Feet Elevated', 'Bodyweight'],
    ] },
    vpress: { area: 'shoulders', label: 'Overhead press', picks: [
      ['Barbell Seated Overhead Press', 'Barbell'],
      ['Dumbbell Seated Shoulder Press', 'Dumbbell'],
      ['Lever Military Press', 'Machine'],
      ['Cable Shoulder Press', 'Cable'],
      ['Dumbbell Standing Overhead Press', 'Dumbbell'],
      ['Barbell Shoulder Press', 'Barbell'],
    ] },
    row: { area: 'back', label: 'Row', picks: [
      ['Barbell Bent Over Row', 'Barbell'],
      ['Bent Over Two-Dumbbell Row', 'Dumbbell'],
      ['Cable Seated Row', 'Cable'],
      ['Lever Seated Row', 'Machine'],
      ['Inverted Row', 'Bodyweight'],
      ['Barbell Pendlay Row', 'Barbell'],
    ] },
    vpull: { area: 'back', label: 'Vertical pull', picks: [
      ['Pullups', 'Bodyweight'],
      ['Cable Pulldown', 'Cable'],
      ['Assisted Pull-up', 'Machine'],
      ['Chin-Up', 'Bodyweight'],
      ['Cable Lateral Pulldown With V-bar', 'Cable'],
    ] },
    hinge: { area: 'legs', label: 'Hinge', picks: [
      ['Barbell Romanian Deadlift', 'Barbell'],
      ['Dumbbell Romanian Deadlift', 'Dumbbell'],
      ['Cable Pull Through (with Rope)', 'Cable'],
      ['Lever Back Extension', 'Machine'],
      ['Glute-ham Raise', 'Bodyweight'],
      ['Barbell Deadlift', 'Barbell'],
    ] },
    legpress: { area: 'legs', label: 'Leg press or split squat', picks: [
      ['Leg Press', 'Machine'],
      ['Dumbbell Single Leg Split Squat', 'Dumbbell'],
      ['Barbell Single Leg Split Squat', 'Barbell'],
      ['Split Squats', 'Bodyweight'],
      ['Narrow Stance Leg Press', 'Machine'],
    ] },
    splitsquat: { area: 'legs', label: 'Split squat', picks: [
      ['Dumbbell Single Leg Split Squat', 'Dumbbell'],
      ['Barbell Single Leg Split Squat', 'Barbell'],
      ['Leg Press', 'Machine'],
      ['Split Squats', 'Bodyweight'],
      ['Barbell Walking Lunge', 'Barbell'],
    ] },
    chestiso: { area: 'chest', label: 'Chest isolation', picks: [
      ['Butterfly', 'Machine'],
      ['Cable Middle Fly', 'Cable'],
      ['Dumbbell Flyes', 'Dumbbell'],
      ['Cable Low Fly', 'Cable'],
      ['Push-Up Wide', 'Bodyweight'],
    ] },
    sidedelt: { area: 'shoulders', label: 'Side delt', picks: [
      ['Dumbbell Lateral Raise', 'Dumbbell'],
      ['Cable Lateral Raise', 'Cable'],
      ['Lever Lateral Raise', 'Machine'],
      ['Barbell Upright Row', 'Barbell'],
      ['Dumbbell Seated Lateral Raise', 'Dumbbell'],
    ] },
    reardelt: { area: 'shoulders', label: 'Rear delt', picks: [
      ['Dumbbell Rear Delt Raise', 'Dumbbell'],
      ['Cable Rear Delt Fly', 'Cable'],
      ['Lever Seated Reverse Fly', 'Machine'],
      ['Barbell Rear Delt Raise', 'Barbell'],
    ] },
    biceps: { area: 'arms', label: 'Biceps', picks: [
      ['Barbell Curl', 'Barbell'],
      ['Dumbbell Bicep Curl', 'Dumbbell'],
      ['Cable Curl', 'Cable'],
      ['Lever Preacher Curl', 'Machine'],
      ['Dumbbell Hammer Curl', 'Dumbbell'],
      ['Biceps Pull-up', 'Bodyweight'],
    ] },
    triceps: { area: 'arms', label: 'Triceps', picks: [
      ['Cable Pushdown (with Rope Attachment)', 'Cable'],
      ['Barbell Lying Triceps Extension', 'Barbell'],
      ['Dumbbell Lying Triceps Extension', 'Dumbbell'],
      ['Dip Machine', 'Machine'],
      ['Bench Dips', 'Bodyweight'],
      ['Dumbbell One-Arm Triceps Extension', 'Dumbbell'],
    ] },
    arms: { area: 'arms', label: 'Arms', picks: [
      ['Barbell Curl', 'Barbell'],
      ['Dumbbell Bicep Curl', 'Dumbbell'],
      ['Cable Curl', 'Cable'],
      ['Lever Preacher Curl', 'Machine'],
      ['Bench Dips', 'Bodyweight'],
    ] },
    shrug: { area: 'back', label: 'Shrug', picks: [
      ['Barbell Shrug', 'Barbell'],
      ['Dumbbell Shrug', 'Dumbbell'],
      ['Lever Shrug', 'Machine'],
      ['Cable Shrugs', 'Cable'],
    ] },
    hamcurl: { area: 'legs', label: 'Hamstring curl', picks: [
      ['Lever Lying Leg Curl', 'Machine'],
      ['Seated Leg Curl', 'Machine'],
      ['Cable Assisted Inverse Leg Curl', 'Cable'],
      ['Glute-ham Raise', 'Bodyweight'],
      ['Inverse Leg Curl (bench Support)', 'Bodyweight'],
    ] },
    quadext: { area: 'legs', label: 'Quad extension', picks: [
      ['Lever Leg Extension', 'Machine'],
      ['Leg Extensions', 'Machine'],
      ['Sissy Squat', 'Bodyweight'],
      ['Single-Leg Leg Extension', 'Machine'],
    ] },
    calves: { area: 'legs', label: 'Calves', picks: [
      ['Standing Calf Raises', 'Machine'],
      ['Barbell Standing Calf Raise', 'Barbell'],
      ['Dumbbell Seated Calf Raise', 'Dumbbell'],
      ['Cable Standing Calf Raise', 'Cable'],
      ['Bodyweight Standing Calf Raise', 'Bodyweight'],
    ] },
    core: { area: 'core', label: 'Core', picks: [
      ['Cable Crunch', 'Cable'],
      ['Ab Crunch Machine', 'Machine'],
      ['Hanging Leg Raise', 'Bodyweight'],
      ['Decline Crunch', 'Bodyweight'],
      ['Dumbbell Side Bend', 'Dumbbell'],
    ] },
  };

  // Each template, in the order the slots are trained. The class is the template's, not the
  // slot's: a row leads a Pull session and supports an Upper one.
  var TEMPLATES = {
    full: { areas: ['chest', 'back', 'shoulders', 'arms', 'legs'], slots: [
      ['squat', 'P'], ['hpress', 'P'], ['row', 'S'], ['hinge', 'S'],
      ['vpress', 'S'], ['vpull', 'S'], ['arms', 'I'], ['calves', 'I'],
    ] },
    push: { areas: ['chest', 'shoulders', 'arms'], slots: [
      ['hpress', 'P'], ['incline', 'S'], ['vpress', 'S'],
      ['chestiso', 'I'], ['sidedelt', 'I'], ['triceps', 'I'],
    ] },
    // A second vertical pull rather than a hinge. The hinge is also in Legs and in Lower, so on
    // a five-day week a Romanian deadlift was trained three times: measured against the app's own
    // volume targets, glutes landed over target in 57% of programs and lats under in 61%. One
    // line, and both come right - lats on target 39% -> 69%, glutes 43% -> 65%.
    pull: { areas: ['back', 'arms'], slots: [
      ['vpull', 'P'], ['row', 'S'], ['vpull', 'S'],
      ['reardelt', 'I'], ['biceps', 'I'], ['shrug', 'I'],
    ] },
    legs: { areas: ['legs'], slots: [
      ['squat', 'P'], ['hinge', 'S'], ['legpress', 'S'],
      ['hamcurl', 'I'], ['quadext', 'I'], ['calves', 'I'],
    ] },
    upper: { areas: ['chest', 'back', 'shoulders', 'arms'], slots: [
      ['hpress', 'P'], ['vpull', 'P'], ['vpress', 'S'], ['row', 'S'],
      ['sidedelt', 'I'], ['biceps', 'I'], ['triceps', 'I'],
    ] },
    lower: { areas: ['legs'], slots: [
      ['squat', 'P'], ['hinge', 'S'], ['splitsquat', 'S'],
      ['hamcurl', 'I'], ['calves', 'I'], ['core', 'I'],
    ] },
  };

  var TITLE = { full: 'Full body', push: 'Push', pull: 'Pull', legs: 'Legs', upper: 'Upper', lower: 'Lower' };

  // One template per training day, as [template, variant]. The variant is which lift each slot
  // takes, so the second Push of the week is not the first one again. Names are not written
  // here: a day is called Push when it is the only one and Push A when it is not, and a day
  // that has been handed to another template has to be named after that one instead.
  var SPLITS = {
    1: [['full', 0]],
    2: [['full', 0], ['full', 1]],
    3: [['push', 0], ['pull', 0], ['legs', 0]],
    4: [['upper', 0], ['lower', 0], ['upper', 1], ['lower', 1]],
    5: [['push', 0], ['pull', 0], ['legs', 0], ['upper', 1], ['lower', 1]],
    6: [['push', 0], ['pull', 0], ['legs', 0], ['push', 1], ['pull', 1], ['legs', 1]],
  };

  var SPLIT_NAME = {
    1: 'Full body', 2: 'Full body', 3: 'Push / Pull / Legs', 4: 'Upper / Lower',
    5: 'Push / Pull / Legs + Upper / Lower', 6: 'Push / Pull / Legs',
  };

  // What an emphasis doubles, in order of what it would rather add. The first slot the template
  // already has is the one that gets a second entry; a template that trains none of them - legs
  // on a Push day - is left alone.
  var EMPHASIS = {
    chest: ['chestiso', 'incline', 'hpress'],
    back: ['row', 'vpull', 'shrug'],
    shoulders: ['sidedelt', 'vpress', 'reardelt'],
    arms: ['biceps', 'triceps', 'arms'],
    legs: ['quadext', 'legpress', 'splitsquat', 'hinge', 'squat'],
  };

  /**
   * What each slot class asks for.
   *
   * [rest] is seconds, and null means the lifter's own default - which is the right answer for
   * the middle of a session. A main compound wants longer than a default and an isolation lift
   * wants less, and saying so is most of the difference between a program that reads as designed
   * and one that reads as generated.
   *
   * [bw] is the same slot when the lift turns out to be bodyweight. A push-up prescribed 4 x 5-8
   * is a prescription almost nobody can make hard, and a pull-up at 10-15 is one almost nobody
   * can start. The ranges are wider than the loaded ones on purpose: with no weight to add, reps
   * are the only thing that can move, and a bodyweight lift that takes added load can grow out of
   * the range from the top.
   */
  var CLASS = {
    P: { sets: 4, lo: 5, hi: 8, rest: 180, bw: { lo: 6, hi: 12 } },
    S: { sets: 3, lo: 8, hi: 10, rest: null, bw: { lo: 8, hi: 15 } },
    I: { sets: 3, lo: 10, hi: 15, rest: 90, bw: { lo: 12, hi: 20 } },
  };

  // First year, a few years, experienced.
  var LEVEL = {
    'new': { sets: -1, rir: 3 },
    some: { sets: 0, rir: 2 },
    'long': { sets: 1, rir: 1 },
  };

  var MIN_SLOTS = 3;        // two lifts is not a session, whatever the clock says
  var MIN_SETS = 2;
  var MIN_PER_SET = 3;      // the app's own arithmetic for the time a working set takes

  /* ---------- the plan ---------- */

  function todayDay() {
    var d = new Date();
    // LocalDate.toEpochDay on the other side: the calendar day where the lifter is, not UTC.
    return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
  }

  // The slot list a template trains, after the emphasis has been added.
  function slotsFor(tpl, emphasis) {
    var slots = tpl.slots.map(function (s) { return s.slice(); });
    if (!emphasis || tpl.areas.indexOf(emphasis) < 0) return slots;
    var pref = EMPHASIS[emphasis] || [];
    for (var p = 0; p < pref.length; p++) {
      var at = -1;
      for (var i = 0; i < slots.length; i++) if (slots[i][0] === pref[p]) at = i;
      if (at >= 0) { slots.splice(at + 1, 0, [slots[at][0], slots[at][1]]); return slots; }
    }
    return slots;
  }

  /**
   * One session, as a list of library keys. No ids are handed out here, because a session may
   * be built and thrown away: whether a template is worth a day in the week is only knowable
   * by building it.
   */
  function buildOne(key, variant, ctx) {
    var tpl = TEMPLATES[key];
    var slots = slotsFor(tpl, ctx.emphasis);
    var usedHere = {};
    var items = [];
    var sets = 0;

    for (var i = 0; i < slots.length; i++) {
      var slot = SLOTS[slots[i][0]];
      var cls = CLASS[slots[i][1]];
      // Before the clock, not after: an hour you asked for should go to the lifts you want, not
      // sit as a hole where the ones you do not want would have been.
      if (ctx.avoid[slot.area]) continue;
      var n = Math.max(MIN_SETS, cls.sets + ctx.level.sets);

      // The clock. Three lifts go in whatever it says; after that, take a set off the biggest
      // lifts already in rather than drop this one.
      //
      // Dropping from the end sounds neutral and is not: the end of every list is where the
      // isolation work lives, so the lifts cut were always the only ones training side delts,
      // rear delts and calves - never trained at all in a fifth to a third of programs. Six lifts
      // at three sets cover a week better than four at five. The dose is thinner and the coverage
      // is wider, which is the trade, taken deliberately.
      if (items.length >= MIN_SLOTS && sets + n > ctx.cap) {
        // One set at a time, from the back of the session forwards, round and round. Taking it
        // from whichever lift has the most to give sounds fair and is not: the lift with the most
        // sets is always the main compound, so the heaviest lift of the session came out with
        // fewer sets than the lateral raise after it. The lead lift only loses a set once every
        // accessory has lost one.
        // The lift arriving is in the pool too, or it lands at full sets beside neighbours that
        // were trimmed to make room for it, and the session ends on a number that looks arbitrary.
        var pool = items.concat([{ sets: n }]);
        var freed = 0, moved = true;
        while (sets + n - freed > ctx.cap && moved) {
          moved = false;
          for (var o = pool.length - 1; o >= 0 && sets + n - freed > ctx.cap; o--) {
            if (pool[o].sets > MIN_SETS) { pool[o].sets -= 1; freed += 1; moved = true; }
          }
        }
        n = pool[pool.length - 1].sets;
        sets = items.reduce(function (a, x) { return a + x.sets; }, 0);
        if (sets + n > ctx.cap) break;
      }

      var free = slot.picks.filter(function (c) {
        return ctx.kit[c[1]] && !usedHere[c[0] + '|' + c[1]] && ctx.byKey[c[0] + '|' + c[1]];
      });
      if (!free.length) { ctx.skipped[slot.label] = true; continue; }
      var pick = free[Math.min(variant, free.length - 1)];
      var k = pick[0] + '|' + pick[1];
      usedHere[k] = true;
      // Which prescription applies is only knowable once the kit has chosen the lift.
      var range = pick[1] === 'Bodyweight' ? cls.bw : cls;
      // Warm up properly for the first lift of the session, a little for a second heavy one, and
      // not at all for the rest. The app shrinks them further when the muscle is already warm
      // from an earlier lift, so this only has to say roughly what the lift deserves.
      var warm = items.length === 0 ? 3 : (slots[i][1] === 'P' ? 1 : 0);
      items.push({
        key: k, sets: n, lo: range.lo, hi: range.hi, rir: ctx.level.rir,
        warm: warm, rest: cls.rest,
      });
      sets += n;
    }
    return items;
  }

  function plan(answers, library) {
    var a = answers || {};
    var days = Math.max(1, Math.min(6, a.days || 3));
    var kit = {};
    (a.kit && a.kit.length ? a.kit : ['Barbell', 'Dumbbell', 'Cable', 'Machine', 'Bodyweight'])
      .forEach(function (e) { kit[e] = true; });
    var avoid = {};
    (a.avoid || []).forEach(function (x) { if (x) avoid[x] = true; });

    var byKey = {};
    library.forEach(function (r) { byKey[r.n + '|' + r.e] = r; });

    var ctx = {
      kit: kit, avoid: avoid, byKey: byKey,
      emphasis: a.emphasis,
      level: LEVEL[a.level] || LEVEL.some,
      cap: Math.floor((a.minutes || 60) / MIN_PER_SET),    // working sets the clock allows
      skipped: {},                                         // slot label -> nothing your kit can do
    };

    var split = SPLITS[days];

    // Which of the split's templates still hold a session. The lift count does not depend on
    // the variant - the same slots are filled either way - so one build per template answers it.
    var keys = [];
    split.forEach(function (d) { if (keys.indexOf(d[0]) < 0) keys.push(d[0]); });
    var viable = keys.filter(function (k) { return buildOne(k, 0, ctx).length >= MIN_SLOTS; });
    var dropped = keys.filter(function (k) { return viable.indexOf(k) < 0; }).map(function (k) { return TITLE[k]; });

    // Every day you said you had keeps a workout. A day whose own template no longer holds one
    // goes to the templates that do, taking the next variant so it is not a session repeated.
    var next = {};
    split.forEach(function (d) { next[d[0]] = Math.max(next[d[0]] || 0, d[1] + 1); });
    var picked = [];
    var sub = 0;
    split.forEach(function (d) {
      if (viable.indexOf(d[0]) >= 0) { picked.push([d[0], d[1]]); return; }
      if (!viable.length) return;                          // nothing in the split survives
      var k = viable[sub++ % viable.length];
      picked.push([k, next[k]++]);
    });

    // A day is called Push when it is the only one and Push A when it is not.
    var count = {};
    picked.forEach(function (d) { count[d[0]] = (count[d[0]] || 0) + 1; });
    var nth = {};
    var names = picked.map(function (d) {
      if (count[d[0]] === 1) return TITLE[d[0]];
      nth[d[0]] = (nth[d[0]] || 0) + 1;
      return TITLE[d[0]] + ' ' + String.fromCharCode(64 + nth[d[0]]);
    });

    var out = { name: SPLIT_NAME[days], unit: a.unit || 'kg', block: null, templates: [], lifts: {}, seq: 0 };
    var exOf = {};                                   // name|equip -> exercise id, shared program-wide
    ctx.skipped = {};                                // the trial builds have had their say

    picked.forEach(function (d, i) {
      var items = buildOne(d[0], d[1], ctx).map(function (it) {
        if (!exOf[it.key]) {
          out.seq += 1;
          exOf[it.key] = 'x' + out.seq;
          out.lifts[exOf[it.key]] = byKey[it.key];
        }
        return {
          exId: exOf[it.key], sets: it.sets, lo: it.lo, hi: it.hi, rir: it.rir,
          warm: it.warm, rest: it.rest,
        };
      });
      out.seq += 1;
      out.templates.push({ id: 't' + out.seq, name: names[i], items: items });
    });

    // The name has to describe what came out, not what was asked for.
    if (dropped.length) {
      var base = [];
      out.templates.forEach(function (t) {
        var b = t.name.replace(/ [A-Z]$/, '');
        if (base.indexOf(b) < 0) base.push(b);
      });
      out.name = base.join(' / ') || 'Program';
    }

    if (a.weeks) out.block = { startDay: todayDay(), weeks: a.weeks };

    out.skipped = Object.keys(ctx.skipped);
    out.dropped = dropped;
    return out;
  }

  var api = {
    plan: plan, todayDay: todayDay,
    SLOTS: SLOTS, TEMPLATES: TEMPLATES, SPLITS: SPLITS, CLASS: CLASS, LEVEL: LEVEL, EMPHASIS: EMPHASIS,
    TITLE: TITLE, MIN_SLOTS: MIN_SLOTS,
  };
  root.REGOL = root.REGOL || {};
  root.REGOL.plan = plan;
  root.REGOL.planner = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : globalThis);
