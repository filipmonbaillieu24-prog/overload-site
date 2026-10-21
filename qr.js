// A QR code, drawn in the browser.
//
// The program maker hands a program over as `regol://p?d=...`, and the point of a code rather than
// a link is that it crosses from one screen to another phone with nothing in between - no network,
// no server, no account. So it has to be made here, and the site has no build step and no
// dependencies, which means writing it.
//
// Byte mode only. The payload is a base64url link: ASCII, but with lowercase and underscores in
// it, so the alphanumeric mode's 45-character set cannot take it and there is nothing to gain by
// pretending otherwise.
//
// The one part of this that cannot be reasoned about is the data - how many error-correction
// codewords each version and level uses, how codewords split into blocks, where the alignment
// patterns sit. One wrong number there is a code that looks perfectly plausible and scans as
// nothing. So those are not typed: qr-tables.json is read out of zxing, by QrTablesDumpTest.
//
// And "it decodes" turned out not to be the only proof that matters. The app no longer encodes with
// zxing at all - zxing is a JVM library and the engine compiles for iOS now - so it runs a Kotlin
// port of this file, and that port is checked against zxing MODULE FOR MODULE rather than by
// decoding. Three defects in here survived years of round-trip tests, because every one of them
// produced a code that scans perfectly and is a different picture: two timing modules wiped by the
// format reservation, and two penalty rules whose arithmetic disagreed with zxing's and could
// therefore choose a different mask. All three are fixed; see the comment at each. Eight masks are
// legal and a reader tries all of them, which is exactly why a decoder cannot tell you that you
// drew the wrong one.
(function (root) {
  'use strict';

  var T = null;                       // the tables, once fetched
  var LEVELS = ['L', 'M', 'Q', 'H'];
  /** The two bits each level is written as in the format information. Not its index. */
  var LEVEL_BITS = { L: 1, M: 0, Q: 3, H: 2 };

  function load() {
    if (T) return Promise.resolve(T);
    return fetch('qr-tables.json').then(function (r) { return r.json(); }).then(function (t) {
      T = t;
      return t;
    });
  }

  /* ---------- the field everything else is arithmetic in ---------- */

  // GF(256) with the QR primitive polynomial, x^8 + x^4 + x^3 + x^2 + 1.
  var EXP = new Uint8Array(512), LOG = new Uint8Array(256);
  (function () {
    var x = 1;
    for (var i = 0; i < 255; i++) {
      EXP[i] = x;
      LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11d;
    }
    for (i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
  })();

  function mul(a, b) { return a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]]; }

  /** The generator polynomial for `n` error-correction codewords: (x-a^0)(x-a^1)...(x-a^n-1). */
  function generator(n) {
    var g = [1];
    for (var i = 0; i < n; i++) {
      var next = new Array(g.length + 1).fill(0);
      for (var j = 0; j < g.length; j++) {
        // g[0] is the highest power, so multiplying by x keeps the index and multiplying by a
        // scalar moves it down one. The other way round makes the polynomial non-monic, which
        // leaves a code that is structurally perfect and fails its own checksum.
        next[j] ^= g[j];
        next[j + 1] ^= mul(g[j], EXP[i]);
      }
      g = next;
    }
    return g;
  }

  /** Reed-Solomon remainder: the error-correction codewords for one block. */
  function ecc(data, n) {
    var g = generator(n);
    var out = new Array(n).fill(0);
    for (var i = 0; i < data.length; i++) {
      var factor = data[i] ^ out[0];
      out.shift();
      out.push(0);
      for (var j = 0; j < n; j++) out[j] ^= mul(g[j + 1], factor);
    }
    return out;
  }

  /* ---------- how big it has to be ---------- */

  function dataCodewords(version, level) {
    var li = LEVELS.indexOf(level), vi = version - 1;
    return T.totalCodewords[vi] - T.ecPerBlock[li][vi] * T.blocks[li][vi];
  }

  /** Bits the character count takes, which widens twice as versions grow. */
  function countBits(version) { return version <= 9 ? 8 : 16; }

  function capacity(version, level) {
    return Math.floor((dataCodewords(version, level) * 8 - 4 - countBits(version)) / 8);
  }

  /**
   * The smallest code that holds this, at the strongest error correction that costs nothing.
   *
   * Size is what decides whether a phone can read a code off another phone's screen, so the
   * version is chosen first and the level is raised afterwards only while the version holds. A
   * code that recovers from more damage at the same number of modules is free; one that needs
   * more modules to do it is not.
   */
  function fit(bytes) {
    for (var v = 1; v <= 40; v++) {
      if (bytes > capacity(v, 'L')) continue;
      var best = 'L';
      ['M', 'Q', 'H'].forEach(function (l) { if (bytes <= capacity(v, l)) best = l; });
      return { version: v, level: best };
    }
    return null;                      // past 2,953 bytes there is no QR code at all
  }

  /* ---------- the codewords ---------- */

  function codewords(bytes, version, level) {
    var li = LEVELS.indexOf(level), vi = version - 1;
    var total = dataCodewords(version, level);
    var bits = [];
    function put(value, n) { for (var i = n - 1; i >= 0; i--) bits.push((value >> i) & 1); }

    put(4, 4);                        // byte mode
    put(bytes.length, countBits(version));
    for (var i = 0; i < bytes.length; i++) put(bytes[i], 8);

    // Terminator, then out to a whole codeword, then the two pad bytes in turn.
    var room = total * 8;
    for (i = 0; i < 4 && bits.length < room; i++) bits.push(0);
    while (bits.length % 8 !== 0) bits.push(0);
    var data = [];
    for (i = 0; i < bits.length; i += 8) {
      var b = 0;
      for (var j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
      data.push(b);
    }
    for (i = 0; data.length < total; i++) data.push(i % 2 === 0 ? 0xec : 0x11);

    // Split into blocks. The spec gives the remainder blocks one codeword more than the rest,
    // which is why this file carries no table of block groups - see QrTablesDumpTest.
    var nBlocks = T.blocks[li][vi], ecLen = T.ecPerBlock[li][vi];
    var shortLen = Math.floor(total / nBlocks), long = total % nBlocks;
    var dataBlocks = [], ecBlocks = [], at = 0;
    for (i = 0; i < nBlocks; i++) {
      var len = shortLen + (i >= nBlocks - long ? 1 : 0);
      var block = data.slice(at, at + len);
      at += len;
      dataBlocks.push(block);
      ecBlocks.push(ecc(block, ecLen));
    }

    // Interleaved: one codeword from each block in turn, data then error correction.
    var out = [];
    for (i = 0; i < shortLen + 1; i++) {
      for (j = 0; j < nBlocks; j++) if (i < dataBlocks[j].length) out.push(dataBlocks[j][i]);
    }
    for (i = 0; i < ecLen; i++) for (j = 0; j < nBlocks; j++) out.push(ecBlocks[j][i]);
    return out;
  }

  /* ---------- the grid ---------- */

  function Grid(size) {
    this.size = size;
    this.m = new Uint8Array(size * size);        // 1 is dark
    this.fixed = new Uint8Array(size * size);    // function modules, which no mask may touch
  }
  Grid.prototype.get = function (r, c) { return this.m[r * this.size + c]; };
  Grid.prototype.set = function (r, c, v, fixed) {
    this.m[r * this.size + c] = v ? 1 : 0;
    if (fixed) this.fixed[r * this.size + c] = 1;
  };
  Grid.prototype.isFixed = function (r, c) { return this.fixed[r * this.size + c] === 1; };

  function finder(g, r, c) {
    for (var i = -1; i <= 7; i++) for (var j = -1; j <= 7; j++) {
      var rr = r + i, cc = c + j;
      if (rr < 0 || cc < 0 || rr >= g.size || cc >= g.size) continue;
      var inRing = (i >= 0 && i <= 6 && (j === 0 || j === 6)) || (j >= 0 && j <= 6 && (i === 0 || i === 6));
      var inCore = i >= 2 && i <= 4 && j >= 2 && j <= 4;
      g.set(rr, cc, inRing || inCore, true);
    }
  }

  function alignment(g, r, c) {
    for (var i = -2; i <= 2; i++) for (var j = -2; j <= 2; j++) {
      g.set(r + i, c + j, Math.max(Math.abs(i), Math.abs(j)) !== 1, true);
    }
  }

  /** BCH(15,5) for the format, BCH(18,6) for the version. */
  function bch(value, generatorPoly, bits) {
    var v = value << bits;
    var gBits = 0, t = generatorPoly;
    while (t) { gBits++; t >>= 1; }
    while (true) {
      var vBits = 0; t = v;
      while (t) { vBits++; t >>= 1; }
      if (vBits < gBits) break;
      v ^= generatorPoly << (vBits - gBits);
    }
    return (value << bits) | v;
  }

  function putFormat(g, level, mask) {
    var bits = bch((LEVEL_BITS[level] << 3) | mask, 0x537, 10) ^ 0x5412;
    var n = g.size;
    for (var i = 0; i < 15; i++) {
      var bit = (bits >> i) & 1;
      // The copy beside the top-left finder, running down then left around the corner.
      if (i < 6) g.set(i, 8, bit, true);
      else if (i === 6) g.set(7, 8, bit, true);
      else if (i === 7) g.set(8, 8, bit, true);
      else if (i === 8) g.set(8, 7, bit, true);
      else g.set(8, 14 - i, bit, true);
      // And the second copy, split between the other two finders.
      if (i < 8) g.set(8, n - 1 - i, bit, true);
      else g.set(n - 15 + i, 8, bit, true);
    }
    g.set(n - 8, 8, 1, true);          // the dark module, which is always dark
  }

  function putVersion(g, version) {
    if (version < 7) return;
    var bits = bch(version, 0x1f25, 12);
    var n = g.size;
    for (var i = 0; i < 18; i++) {
      var bit = (bits >> i) & 1;
      g.set(Math.floor(i / 3), n - 11 + (i % 3), bit, true);
      g.set(n - 11 + (i % 3), Math.floor(i / 3), bit, true);
    }
  }

  function skeleton(version) {
    var n = 17 + 4 * version;
    var g = new Grid(n);
    finder(g, 0, 0);
    finder(g, 0, n - 7);
    finder(g, n - 7, 0);

    var centres = T.align[version - 1];
    for (var i = 0; i < centres.length; i++) for (var j = 0; j < centres.length; j++) {
      var r = centres[i], c = centres[j];
      // The three that would sit on a finder are not drawn.
      if ((r <= 8 && c <= 8) || (r <= 8 && c >= n - 9) || (r >= n - 9 && c <= 8)) continue;
      alignment(g, r, c);
    }

    for (i = 8; i < n - 8; i++) {
      g.set(6, i, i % 2 === 0, true);
      g.set(i, 6, i % 2 === 0, true);
    }
    putVersion(g, version);
    // Reserved so the data placement steps over them; the real bits go in once the mask is known.
    //
    // `i !== 6` is not a nicety. Row 6 and column 6 are the timing patterns, and the format
    // information steps over them: column 8 carries format bits at rows 0-5, 7 and 8, and row 8 at
    // columns 0-5, 7 and 8. Reserving the full nine wiped the timing modules at (6,8) and (8,6) to
    // light, and putFormat skips them too, so nothing ever wrote them back. The codes still
    // scanned - a reader finds its grid from the finder and alignment patterns, not from those two
    // - which is why a round-trip test never saw it.
    for (i = 0; i < 9; i++) {
      if (i === 6) continue;
      g.set(8, i, 0, true);
      g.set(i, 8, 0, true);
    }
    for (i = 0; i < 8; i++) { g.set(8, n - 1 - i, 0, true); g.set(n - 1 - i, 8, 0, true); }
    return g;
  }

  /** Up the right-hand column of each pair, then down the next, skipping the timing column. */
  function placeData(g, words) {
    var n = g.size, bit = 0, up = true;
    for (var right = n - 1; right > 0; right -= 2) {
      if (right === 6) right = 5;                 // column 6 is the vertical timing pattern
      for (var step = 0; step < n; step++) {
        var r = up ? n - 1 - step : step;
        for (var k = 0; k < 2; k++) {
          var c = right - k;
          if (g.isFixed(r, c)) continue;
          var v = 0;
          if (bit < words.length * 8) v = (words[bit >> 3] >> (7 - (bit & 7))) & 1;
          g.set(r, c, v, false);
          bit++;
        }
      }
      up = !up;
    }
  }

  function maskBit(mask, r, c) {
    switch (mask) {
      case 0: return (r + c) % 2 === 0;
      case 1: return r % 2 === 0;
      case 2: return c % 3 === 0;
      case 3: return (r + c) % 3 === 0;
      case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
      case 5: return ((r * c) % 2) + ((r * c) % 3) === 0;
      case 6: return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
      default: return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0;
    }
  }

  function applyMask(g, mask) {
    for (var r = 0; r < g.size; r++) for (var c = 0; c < g.size; c++) {
      if (!g.isFixed(r, c) && maskBit(mask, r, c)) {
        g.m[r * g.size + c] ^= 1;
      }
    }
  }

  /** The four penalty rules. Lower is a code a scanner has an easier time with. */
  function penalty(g) {
    var n = g.size, score = 0, r, c, i;

    // Runs of five or more, in both directions.
    for (var pass = 0; pass < 2; pass++) {
      for (r = 0; r < n; r++) {
        var run = 1, prev = -1;
        for (c = 0; c < n; c++) {
          var v = pass === 0 ? g.get(r, c) : g.get(c, r);
          if (v === prev) { run++; if (run === 5) score += 3; else if (run > 5) score += 1; }
          else { run = 1; prev = v; }
        }
      }
    }

    // Every two-by-two block of one colour.
    for (r = 0; r < n - 1; r++) for (c = 0; c < n - 1; c++) {
      var a = g.get(r, c);
      if (a === g.get(r, c + 1) && a === g.get(r + 1, c) && a === g.get(r + 1, c + 1)) score += 3;
    }

    // The finder-like sequence, which a scanner can mistake for a finder.
    //
    // Counted ONCE per occurrence, the way zxing counts it: the seven-module core 1011101 with four
    // light modules on one side OR the other. Matching the two eleven-module patterns 10111010000
    // and 00001011101 separately - which is what this did - scores a sequence with light on BOTH
    // sides twice, at forty points a go. Out of bounds counts as not-light, so a sequence running
    // off the edge of the code gets no benefit of the doubt.
    function light(line, from, to) {
      if (from < 0 || line.length < to) return false;
      for (var k2 = from; k2 < to; k2++) if (line[k2]) return false;
      return true;
    }
    function hitsIn(line) {
      var hits = 0;
      for (var s = 0; s + 6 < line.length; s++) {
        if (line[s] && !line[s + 1] && line[s + 2] && line[s + 3] && line[s + 4] &&
            !line[s + 5] && line[s + 6] &&
            (light(line, s + 7, s + 11) || light(line, s - 4, s))) {
          hits++;
        }
      }
      return hits;
    }
    for (r = 0; r < n; r++) {
      var row = [], col = [];
      for (c = 0; c < n; c++) { row.push(g.get(r, c)); col.push(g.get(c, r)); }
      score += 40 * (hitsIn(row) + hitsIn(col));
    }

    // How far off an even split of dark and light it is.
    //
    // |2*dark - total| * 10 / total, in that order, which is zxing's arithmetic. Computing a
    // percentage first and then dividing by five rounds twice, and the two answers differ by a
    // whole step of ten points for darkness fractions that are common rather than rare.
    var dark = 0;
    for (i = 0; i < g.m.length; i++) dark += g.m[i];
    var total = n * n;
    score += 10 * Math.floor(Math.abs(dark * 2 - total) * 10 / total);
    return score;
  }

  /* ---------- the code ---------- */

  /**
   * Returns `{ size, modules, version, level }`, where `modules` is one byte per module, row by
   * row, 1 for dark. Null when the text is longer than any QR code holds.
   */
  function make(text) {
    if (!T) throw new Error('qr tables not loaded - await REGOL.qr.load() first');
    var bytes = [];
    for (var i = 0; i < text.length; i++) {
      var ch = text.charCodeAt(i);
      // Everything a program link holds is ASCII. Anything else is encoded as UTF-8 rather than
      // truncated, because a wrong code is worse than a big one.
      if (ch < 0x80) bytes.push(ch);
      else if (ch < 0x800) bytes.push(0xc0 | (ch >> 6), 0x80 | (ch & 63));
      else bytes.push(0xe0 | (ch >> 12), 0x80 | ((ch >> 6) & 63), 0x80 | (ch & 63));
    }
    var size = fit(bytes.length);
    if (!size) return null;

    var words = codewords(bytes, size.version, size.level);
    var best = null;
    for (var mask = 0; mask < 8; mask++) {
      var g = skeleton(size.version);
      placeData(g, words);
      applyMask(g, mask);
      putFormat(g, size.level, mask);
      var p = penalty(g);
      if (!best || p < best.p) best = { p: p, g: g, mask: mask };
    }
    return {
      size: best.g.size,
      modules: best.g.m,
      version: size.version,
      level: size.level,
      mask: best.mask,
    };
  }

  /** The code as an SVG string, at one unit a module, for dropping straight into a page. */
  function svg(code, quiet) {
    var q = quiet == null ? 4 : quiet;
    var n = code.size, w = n + q * 2;
    var d = '';
    for (var r = 0; r < n; r++) {
      var c = 0;
      while (c < n) {
        if (!code.modules[r * n + c]) { c++; continue; }
        var start = c;
        while (c < n && code.modules[r * n + c]) c++;
        d += 'M' + (start + q) + ' ' + (r + q) + 'h' + (c - start) + 'v1h' + -(c - start) + 'z';
      }
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + w + '" ' +
      'shape-rendering="crispEdges" role="img">' +
      '<rect width="' + w + '" height="' + w + '" fill="#fff"/>' +
      '<path d="' + d + '" fill="#000"/></svg>';
  }

  root.REGOL = root.REGOL || {};
  // Outside a browser there is nothing to fetch from, so a harness hands the tables over
  // directly: that is how the round-trip fixtures are made, and they are the proof this works.
  function tables(t) { T = t; }

  root.REGOL.qr = { load: load, make: make, svg: svg, fit: fit, capacity: capacity, tables: tables };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.REGOL.qr;
})(typeof self !== 'undefined' ? self : globalThis);
