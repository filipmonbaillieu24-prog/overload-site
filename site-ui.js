// The header menu and the chapter rail: the behaviour that lived in the design
// components' logic classes. Loads after site.js, which owns REGOL.deck.
(function () {
  'use strict';
  var narrow = matchMedia('(max-width: 940px)');
  var pad = function (n) { return n < 10 ? '0' + n : String(n); };
  var on = function (mq, fn) { mq.addEventListener ? mq.addEventListener('change', fn) : mq.addListener(fn); };

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
      if (cta) cta.textContent = narrow.matches ? 'Get the app' : 'Get it on Google Play';
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

  function start() { header(); rail(); below(); window.REGOL && window.REGOL.reveal(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
