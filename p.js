// What a shared REGOL program looks like to somebody who does not have REGOL.
//
// The whole program is in the address. There is no server, no account and nothing to fetch: the
// `d` parameter is the same deflated JSON the app writes into a QR code, so this page reads it the
// way the phone would and shows the week before asking anybody to install anything.
//
// It exists because the old code said `regol://p?d=...`, which no browser and no camera can open
// without the app already installed - and the one audience a shared card has is people who do not
// have it. They scanned it, nothing happened, and that was the end of the only loop in the app
// that could ever bring somebody new in.
(function () {
  'use strict';

  var $ = function (s) { return document.querySelector(s); };
  var el = function (t, c, x) {
    var n = document.createElement(t);
    if (c) n.className = c;
    if (x != null) n.textContent = x;
    return n;
  };

  /** base64url, then raw deflate - with zlib second, because two releases wrote that container. */
  function decode(d) {
    var bin;
    try {
      bin = atob(d.replace(/-/g, '+').replace(/_/g, '/'));
    } catch (e) { return Promise.resolve(null); }
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

    var tries = ['deflate-raw', 'deflate'];
    var attempt = function (k) {
      if (k >= tries.length) return Promise.resolve(null);
      if (typeof DecompressionStream === 'undefined') return Promise.resolve(null);
      return new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream(tries[k])))
        .text()
        .then(function (txt) {
          var o = JSON.parse(txt);
          if (o && o.kind === 'program' && o.templates && o.templates.length) return o;
          return attempt(k + 1);
        })
        .catch(function () { return attempt(k + 1); });
    };
    return attempt(0);
  }

  /** "4 x 8-10 at 2 in reserve", in the app's own words. */
  function prescription(it) {
    var sets = it.sets == null ? 3 : it.sets;
    var lo = it.lo, hi = it.hi;
    var reps = lo == null ? '' : (hi == null || hi === lo ? ' x ' + lo : ' x ' + lo + '-' + hi);
    var rir = it.rir == null ? '' : ' at ' + it.rir + ' in reserve';
    return sets + reps + rir;
  }

  function draw(file) {
    var lifts = {};
    (file.exercises || []).forEach(function (e) { lifts[e.id] = e; });

    $('[data-title]').textContent = file.name || (file.program && file.program.name) || 'A REGOL program';

    var n = file.templates.length;
    var sets = 0;
    file.templates.forEach(function (t) {
      (t.items || []).forEach(function (i) { sets += (i.sets == null ? 3 : i.sets); });
    });
    var bits = [n + (n === 1 ? ' workout' : ' workouts'), sets + ' working sets a week'];
    var block = (file.program && file.program.block) || null;
    if (block && block.weeks) bits.push(block.weeks + '-week block');
    $('[data-sub]').textContent = bits.join(' · ') + '.';

    var host = $('[data-workouts]');
    host.textContent = '';
    file.templates.forEach(function (t) {
      var card = el('div', 'card');
      card.style.cssText = 'padding:18px 20px;display:flex;flex-direction:column;gap:10px';
      card.appendChild(el('span', 'kick', t.name || 'Workout'));
      var list = el('div');
      list.style.cssText = 'display:flex;flex-direction:column;gap:7px';
      (t.items || []).forEach(function (i) {
        var row = el('div');
        row.style.cssText = 'display:flex;gap:12px;align-items:baseline;font:400 15px/1.4 Barlow';
        var e = lifts[i.exId];
        var name = el('span', null, e ? e.name : 'A lift');
        name.style.cssText = 'flex:1;color:#F2F4EE';
        var num = el('span', null, prescription(i));
        num.style.cssText = 'color:#9AA093;font:400 14px/1.4 Barlow;text-align:right';
        row.appendChild(name); row.appendChild(num);
        list.appendChild(row);
      });
      card.appendChild(list);
      host.appendChild(card);
    });

    $('[data-ok]').hidden = false;
  }

  function fail(msg) {
    $('[data-bad]').hidden = false;
    $('[data-bad-why]').textContent = msg;
  }

  var d = new URLSearchParams(location.search).get('d');
  if (!d) {
    fail('This address carries no program. A shared code looks like regolapp.be/p.html?d=… - ' +
      'if you scanned one, try scanning it again so the whole code is in frame.');
  } else {
    // The app reads the very same parameter, so somebody who already has REGOL can hand it
    // straight over rather than reading it here.
    $('[data-open]').href = 'regol://p?d=' + d;
    $('[data-open]').hidden = false;
    decode(d).then(function (file) {
      if (file) draw(file);
      else fail('This code could not be read. It may have been cut off when it was copied, or ' +
        'only partly in frame when it was scanned. Ask for it again.');
    });
  }
})();
