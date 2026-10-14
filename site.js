// Shared by every REGOL page: the Play link, the scroll reveal and the chapter deck.
window.REGOL = window.REGOL || {
  play: 'https://play.google.com/store/apps/details?id=app.overload&pcampaignid=web_share',
  narrow() { return matchMedia('(max-width: 940px)').matches; },
  reveal(root) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ease = 'cubic-bezier(.2,.8,.2,1)';
    if (!this._io) this._io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.style.opacity = '1'; e.target.style.transform = 'none'; this._io.unobserve(e.target);
    }), { rootMargin: '0px 0px -6% 0px' });
    (root || document).querySelectorAll('[data-reveal]').forEach(el => {
      if (el.dataset.rv) return; el.dataset.rv = '1';
      el.style.opacity = '0'; el.style.transform = 'translateY(28px)';
      el.style.transition = `opacity .8s ${ease}, transform .8s ${ease}`;
      el.style.transitionDelay = (+el.dataset.reveal || 0) + 'ms';
      this._io.observe(el);
    });
  },
  // Full-screen chapters: sideways on desktop (wheel and arrow keys turn one chapter at a time),
  // vertical snap on phones. onIndex(i) fires when the visible chapter changes. Returns {goTo, destroy}.
  deck(el, onIndex) {
    const self = this, reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let idx = 0, lock = 0, acc = 0;
    const count = () => el.children.length;
    const goTo = (i, instant) => {
      i = Math.max(0, Math.min(count() - 1, i));
      const b = reduce || instant ? 'auto' : 'smooth';
      if (self.narrow()) el.scrollTo({ top: i * el.clientHeight, behavior: b }); else el.scrollTo({ left: i * el.clientWidth, behavior: b });
      lock = Date.now() + 650;
    };
    const read = () => {
      const i = self.narrow() ? Math.round(el.scrollTop / Math.max(1, el.clientHeight)) : Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
      if (i !== idx) { idx = i; onIndex && onIndex(i); }
    };
    const onWheel = e => {
      if (self.narrow()) return;
      const d = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      const atEnd = idx >= count() - 1 && d > 0, atStart = idx <= 0 && d < 0;
      if (atEnd || atStart) return; // let the page scroll on to the footer, or back up
      e.preventDefault();
      if (Date.now() < lock) return;
      acc += d;
      if (Math.abs(acc) > 40) { goTo(idx + (acc > 0 ? 1 : -1)); acc = 0; }
    };
    const onKey = e => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
      const next = self.narrow() ? ['ArrowDown', 'PageDown'] : ['ArrowRight', 'PageDown'];
      const prev = self.narrow() ? ['ArrowUp', 'PageUp'] : ['ArrowLeft', 'PageUp'];
      if (next.includes(e.key)) { e.preventDefault(); goTo(idx + 1); }
      else if (prev.includes(e.key)) { e.preventDefault(); goTo(idx - 1); }
    };
    const onResize = () => goTo(idx, true);
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('scroll', read, { passive: true });
    addEventListener('keydown', onKey); addEventListener('resize', onResize);
    const h = location.hash.slice(1);
    if (h) { const i = [...el.children].findIndex(c => c.id === h); if (i > 0) setTimeout(() => goTo(i, true), 50); }
    return { goTo, destroy() { el.removeEventListener('wheel', onWheel); el.removeEventListener('scroll', read); removeEventListener('keydown', onKey); removeEventListener('resize', onResize); } };
  },
};
