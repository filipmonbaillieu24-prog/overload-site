// The header menu and the chapter rail: the behaviour that lived in the design
// components' logic classes. Loads after site.js, which owns REGOL.deck.
(function () {
  'use strict';
  var narrow = matchMedia('(max-width: 940px)');

  // Which store the header button should send this visitor to. Both are live since
  // 19 Nov 2026, and the button existed before that, so on an iPhone it used to offer
  // Google Play - a dead end for the one visitor most likely to tap it.
  // iPadOS reports itself as a Mac, hence the touch-point test beside the user agent.
  var APP_STORE = 'https://apps.apple.com/app/id6826528179';
  var apple = /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var APPLE_PATH = 'M17.05 12.04c-.03-2.8 2.29-4.14 2.39-4.2-1.3-1.9-3.33-2.17-4.05-2.2-1.72-.17-3.36 1.01-4.23 1.01-.88 0-2.22-.98-3.65-.96-1.88.03-3.61 1.1-4.58 2.77-1.95 3.4-.5 8.42 1.4 11.18.93 1.35 2.04 2.86 3.5 2.8 1.4-.05 1.93-.9 3.63-.9 1.68 0 2.16.9 3.64.88 1.5-.03 2.45-1.37 3.37-2.73 1.06-1.58 1.5-3.1 1.52-3.18-.03-.01-2.92-1.12-2.95-4.44zM14.5 3.98c.77-.93 1.29-2.22 1.15-3.5-1.13.05-2.5.75-3.3 1.68-.72.83-1.34 2.14-1.17 3.4 1.26.1 2.55-.64 3.32-1.58z';
  var pad = function (n) { return n < 10 ? '0' + n : String(n); };
  var on = function (mq, fn) { mq.addEventListener ? mq.addEventListener('change', fn) : mq.addListener(fn); };

  // Every store button on every page points at the store this visitor can actually
  // install from. Both stores are live since 19 Nov 2026; before that the only button
  // was Google Play, which is a dead end for an iPhone.
  //
  // Only BUTTONS are touched: an anchor whose visible label is "Get it on Google Play".
  // The two links in prose that name Google Play are about Google Play and are left
  // alone - rewriting those would make the sentence around them untrue.
  function stores() {
    if (!apple) return;
    var links = document.querySelectorAll('a[href*="play.google.com"]');
    for (var i = 0; i < links.length; i++) {
      var a = links[i];
      if (a.textContent.trim() !== 'Get it on Google Play') continue;
      a.href = APP_STORE;
      var glyph = a.querySelector('path');
      if (glyph) glyph.setAttribute('d', APPLE_PATH);
      for (var j = 0; j < a.childNodes.length; j++) {
        var n = a.childNodes[j];
        if (n.nodeType === 3 && n.nodeValue.indexOf('Google Play') > -1) {
          n.nodeValue = 'Download on the App Store';
        } else if (n.nodeType === 1 && n.hasAttribute('data-cta-label')) {
          n.textContent = 'Download on the App Store';
        }
      }
    }
  }

  function header() {
    var h = document.querySelector('[data-site-header]');
    if (!h) return;
    var btn = h.querySelector('[data-act="menu"]');
    var nav = h.querySelector('[data-menu]');
    var label = h.querySelector('[data-menu-label]');
    var icon = h.querySelector('[data-menu-icon]');
    var cta = h.querySelector('[data-cta-label]');
    var open = false;
    function paint() {
      if (cta) cta.textContent = narrow.matches ? 'Get the app'
        : (apple ? 'Download on the App Store' : 'Get it on Google Play');
      if (!btn || !nav) return;
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (label) label.textContent = open ? 'Close' : 'Menu';
      if (icon) icon.setAttribute('d', open ? 'M6 6l12 12M18 6L6 18' : 'M4 7h16M4 12h16M4 17h16');
      if (open) nav.setAttribute('data-open', ''); else nav.removeAttribute('data-open');
    }
    if (btn) btn.addEventListener('click', function () { open = !open; paint(); });
    if (nav) nav.addEventListener('click', function (e) { if (e.target.closest('a')) { open = false; paint(); } });
    addEventListener('keydown', function (e) { if (e.key === 'Escape' && open) { open = false; paint(); } });
    on(narrow, paint);
    paint();
  }

  // One rail per page: the counter, the current chapter's title, a dot each and
  // a next button that wraps round to the first chapter.
  function rail() {
    var deck = document.querySelector('[data-deck]');
    if (!deck || !window.REGOL) return;
    var r = document.querySelector('[data-rail]');
    var chapters = [].slice.call(deck.children);
    var titles = chapters.map(function (c) { return c.getAttribute('data-title') || ''; });
    var n = titles.length, i = 0;
    var counter = r && r.querySelector('[data-counter]');
    var cur = r && r.querySelector('[data-cur]');
    var dots = r ? [].slice.call(r.querySelectorAll('[data-act="dot"]')) : [];
    var nextBtn = r && r.querySelector('[data-act="next"]');
    var nextIcon = nextBtn && nextBtn.querySelector('path');

    function paint() {
      if (counter) counter.textContent = pad(i + 1) + ' / ' + n;
      if (cur) cur.textContent = titles[i];
      dots.forEach(function (d, k) {
        d.style.width = (k === i ? 22 : 8) + 'px';
        d.style.background = k === i ? '#D6FF3E' : k < i ? '#5E6458' : '#2B2F29';
        if (k === i) d.setAttribute('aria-current', 'step'); else d.removeAttribute('aria-current');
      });
      if (nextIcon) nextIcon.setAttribute('d', narrow.matches ? 'M6 9l6 6 6-6' : 'M9 6l6 6-6 6');
    }

    // REGOL.deck measures in whole viewports. Sideways on desktop that is
    // exactly right and it stays in charge, wheel and keys and all. On a phone
    // a chapter is as tall as its content, so the measure no longer holds, and
    // its re-snap on resize would fire every time the address bar slides away.
    // There it hands over to the two functions below.
    var api = null, reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    function attach() {
      if (narrow.matches) { if (api) { api.destroy(); api = null; } }
      else if (!api) api = window.REGOL.deck(deck, function (k) { i = k; paint(); });
    }

    function nearest() {
      var top = deck.scrollTop, best = 0, gap = Infinity;
      chapters.forEach(function (c, k) {
        var d = Math.abs(c.offsetTop - top);
        if (d < gap) { gap = d; best = k; }
      });
      return best;
    }
    function goTo(k, instant) {
      k = Math.max(0, Math.min(n - 1, k));
      if (api) return api.goTo(k, instant);
      deck.scrollTo({ top: chapters[k].offsetTop, behavior: reduce || instant ? 'auto' : 'smooth' });
      i = k;
      paint();
    }
    deck.addEventListener('scroll', function () {
      if (!narrow.matches) return;
      var k = nearest();
      if (k !== i) { i = k; paint(); }
    }, { passive: true });

    window.REGOL.chapters = { goTo: goTo };
    dots.forEach(function (d, k) { d.addEventListener('click', function () { goTo(k); }); });
    if (nextBtn) nextBtn.addEventListener('click', function () { goTo(i + 1 < n ? i + 1 : 0); });
    on(narrow, function () { attach(); if (narrow.matches) i = nearest(); paint(); });
    attach();
    paint();

    // A link into a chapter, such as /#price, lands by the deck's own measure.
    var hash = location.hash.slice(1);
    if (hash && narrow.matches) {
      var k = chapters.findIndex(function (c) { return c.id === hash; });
      if (k > 0) setTimeout(function () { goTo(k, true); }, 120);
    }

    // Links that jump to a chapter of this page rather than to another page.
    document.querySelectorAll('[data-go]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        var k = chapters.findIndex(function (c) { return c.id === el.getAttribute('data-go'); });
        if (k < 0) return;
        e.preventDefault();
        goTo(k);
      });
    });
  }

  // Anything below the deck is an ordinary page section, reached by scrolling
  // past the last chapter.
  function below() {
    document.querySelectorAll('[data-scroll-to]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        var t = document.getElementById(el.getAttribute('data-scroll-to'));
        if (!t) return;
        e.preventDefault();
        var top = t.getBoundingClientRect().top + scrollY - 64;
        scrollTo({ top: top, behavior: 'smooth' });
        // Some embedded browsers ignore a smooth window scroll outright, which
        // would leave the link doing nothing at all. Land it either way.
        setTimeout(function () { if (Math.abs(scrollY - top) > 4 && scrollY === 0) scrollTo(0, top); }, 400);
      });
    });
  }

  function start() { stores(); header(); rail(); below(); window.REGOL && window.REGOL.reveal(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
