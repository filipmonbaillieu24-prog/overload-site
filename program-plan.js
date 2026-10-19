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
    pull: { areas: ['back', 'arms'], slots: [
      ['vpull', 'P'], ['row', 'S'], ['hinge', 'S'],
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

  // One template per training day. `v` is the variant: the second Push of the week takes the
  // next lift for each slot, so Push A and Push B are not the same session twice.
  var SPLITS = {
    1: { name: 'Full body', days: [['full', 'Full body', 0]] },
    2: { name: 'Full body', days: [['full', 'Full body A', 0], ['full', 'Full body B', 1]] },
    3: { name: 'Push / Pull / Legs', days: [['push', 'Push', 0], ['pull', 'Pull', 0], ['legs', 'Legs', 0]] },
    4: { name: 'Upper / Lower', days: [
      ['upper', 'Upper A', 0], ['lower', 'Lower A', 0], ['upper', 'Upper B', 1], ['lower', 'Lower B', 1],
    ] },
    5: { name: 'Push / Pull / Legs + Upper / Lower', days: [
      ['push', 'Push', 0], ['pull', 'Pull', 0], ['legs', 'Legs', 0], ['upper', 'Upper', 1], ['lower', 'Lower', 1],
    ] },
    6: { name: 'Push / Pull / Legs', days: [
      ['push', 'Push A', 0], ['pull', 'Pull A', 0], ['legs', 'Legs A', 0],
      ['push', 'Push B', 1], ['pull', 'Pull B', 1], ['legs', 'Legs B', 1],
    ] },
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

  var CLASS = {
    P: { sets: 4, lo: 5, hi: 8 },
    S: { sets: 3, lo: 8, hi: 10 },
    I: { sets: 3, lo: 10, hi: 15 },
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

  function plan(answers, library) {
    var a = answers || {};
    var days = Math.max(1, Math.min(6, a.days || 3));
    var kit = {};
    (a.kit && a.kit.length ? a.kit : ['Barbell', 'Dumbbell', 'Cable', 'Machine', 'Bodyweight'])
      .forEach(function (e) { kit[e] = true; });
    var level = LEVEL[a.level] || LEVEL.some;
    var cap = Math.floor((a.minutes || 60) / MIN_PER_SET);   // working sets the clock allows
    var split = SPLITS[days];

    var byKey = {};
    library.forEach(function (r) { byKey[r.n + '|' + r.e] = r; });

    var out = { name: split.name, unit: a.unit || 'kg', block: null, templates: [], lifts: {}, seq: 0 };
    var exOf = {};                                   // name|equip -> exercise id, shared program-wide
    var skipped = {};                                // slot label -> true, for the report

    split.days.forEach(function (day) {
      var tpl = TEMPLATES[day[0]];
      var slots = slotsFor(tpl, a.emphasis);
      var variant = day[2];
      var usedHere = {};
      var items = [];
      var sets = 0;

      for (var i = 0; i < slots.length; i++) {
        var slot = SLOTS[slots[i][0]];
        var cls = CLASS[slots[i][1]];
        var n = Math.max(MIN_SETS, cls.sets + level.sets);

        // The clock. Three slots go in whatever it says; after that a slot has to fit.
        if (items.length >= MIN_SLOTS && sets + n > cap) break;

        var free = slot.picks.filter(function (c) {
          return kit[c[1]] && !usedHere[c[0] + '|' + c[1]] && byKey[c[0] + '|' + c[1]];
        });
        if (!free.length) { skipped[slot.label] = true; continue; }
        var pick = free[Math.min(variant, free.length - 1)];
        var key = pick[0] + '|' + pick[1];
        usedHere[key] = true;

        if (!exOf[key]) {
          out.seq += 1;
          exOf[key] = 'x' + out.seq;
          out.lifts[exOf[key]] = byKey[key];
        }
        items.push({ exId: exOf[key], sets: n, lo: cls.lo, hi: cls.hi, rir: level.rir });
        sets += n;
      }

      out.seq += 1;
      out.templates.push({ id: 't' + out.seq, name: day[1], items: items });
    });

    if (a.weeks) out.block = { startDay: todayDay(), weeks: a.weeks };

    out.skipped = Object.keys(skipped);
    return out;
  }

  var api = {
    plan: plan, todayDay: todayDay,
    SLOTS: SLOTS, TEMPLATES: TEMPLATES, SPLITS: SPLITS, CLASS: CLASS, LEVEL: LEVEL, EMPHASIS: EMPHASIS,
  };
  root.REGOL = root.REGOL || {};
  root.REGOL.plan = plan;
  root.REGOL.planner = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : globalThis);
