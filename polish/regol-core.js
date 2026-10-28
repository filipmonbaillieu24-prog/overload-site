// REGOL design tokens, generated from the shipped app.
//
// Source of truth: app-android/shared/src/commonMain/kotlin/app/overload/ui/theme/Theme.kt
// at versionName 1.9. Generated rather than transcribed, so the numbers are the ones the app
// actually renders. If you change a value here, change it there too, or the prototype stops
// being evidence of anything.
//
// Regenerated 28 Oct 2026. The 1.8 set was green-tinted throughout - page #0B0C0B against the
// app's #0C0C0C, ink #F2F4EE against #F3F3F3 - because the neutrals were still the card
// palette's at that version. Every surface on the Try page carried a cast the app does not.
//
// Three themes, not two: dark is the reference, light is for bright gyms, black is for OLED
// screens. Every surface token exists in all three.

export const PAL = {
  dark: {
    page: '#0C0C0C',
    screen: '#0C0C0C',
    chrome: '#101010',
    card: '#181818',
    control: '#1B1B1B',
    field: '#151515',
    hairList: 'rgba(255,255,255,0.039)',
    hairChrome: 'rgba(255,255,255,0.055)',
    hairRow: 'rgba(255,255,255,0.039)',
    track: '#252525',
    border: 'rgba(255,255,255,0.055)',
    borderStrong: 'rgba(255,255,255,0.071)',
    dashed: '#4F4F4F',
    borderHover: 'rgba(255,255,255,0.141)',
    ink: '#F3F3F3',
    ink2: '#E6E6E6',
    ink3: '#CCCCCC',
    ink4: '#9E9E9E',
    muted: '#929292',
    warn: '#FF7043',
    warnGround: '#1C120E',
    warnGround2: '#221712',
    warnGround3: '#2A150F',
    warnGround4: '#2A1A14',
    warnBorder: '#3A2018',
    warnBorder2: '#4A2418',
    onWarn: '#1B0F0A',
    scrim: 'rgba(5,5,5,0.722)',
    cardSoft: '#131313',
    raised: '#222222',
    pressed: '#292929',
    sheet: '#151515',
    tile: '#1C1C1C',
    sunk: '#141414',
    hair: 'rgba(255,255,255,0.059)',
    hairSoft: 'rgba(255,255,255,0.051)',
    dashedInk: '#3E3E3E',
    barIdle: '#292929',
    handle: '#2E2E2E',
    highlight: 'rgba(255,255,255,0.047)',
  },
  light: {
    page: '#F1F1F1',
    screen: '#F1F1F1',
    chrome: '#EAEAEA',
    card: '#FFFFFF',
    control: '#F2F2F2',
    field: '#E8E8E8',
    hairList: 'rgba(21,21,21,0.059)',
    hairChrome: 'rgba(21,21,21,0.078)',
    hairRow: 'rgba(21,21,21,0.059)',
    track: '#DFDFDF',
    border: 'rgba(21,21,21,0.09)',
    borderStrong: 'rgba(21,21,21,0.133)',
    dashed: '#8E8E8E',
    borderHover: 'rgba(21,21,21,0.2)',
    ink: '#151515',
    ink2: '#212121',
    ink3: '#3E3E3E',
    ink4: '#626262',
    muted: '#5E5E5E',
    warn: '#B8340F',
    warnGround: '#FBEDE8',
    warnGround2: '#F8E4DC',
    warnGround3: '#F8DDD3',
    warnGround4: '#F8E9E2',
    warnBorder: '#F0C4B5',
    warnBorder2: '#E8A58F',
    onWarn: '#FFFFFF',
    scrim: 'rgba(21,21,21,0.322)',
    cardSoft: '#FAFAFA',
    raised: '#EDEDED',
    pressed: '#DDDDDD',
    sheet: '#F8F8F8',
    tile: '#F0F0F0',
    sunk: '#EAEAEA',
    hair: 'rgba(21,21,21,0.09)',
    hairSoft: 'rgba(21,21,21,0.078)',
    dashedInk: '#A1A1A1',
    barIdle: '#D7D7D7',
    handle: '#CBCBCB',
    highlight: 'rgba(255,255,255,0)',
  },
  black: {
    page: '#000000',
    screen: '#000000',
    chrome: '#000000',
    card: '#121212',
    control: '#161616',
    field: '#0E0E0E',
    hairList: 'rgba(255,255,255,0.059)',
    hairChrome: 'rgba(255,255,255,0.071)',
    hairRow: 'rgba(255,255,255,0.059)',
    track: '#1D1D1D',
    border: 'rgba(255,255,255,0.071)',
    borderStrong: 'rgba(255,255,255,0.122)',
    dashed: '#4F4F4F',
    borderHover: 'rgba(255,255,255,0.18)',
    ink: '#F3F3F3',
    ink2: '#E6E6E6',
    ink3: '#CCCCCC',
    ink4: '#9E9E9E',
    muted: '#929292',
    warn: '#FF7043',
    warnGround: '#160E0B',
    warnGround2: '#1C130F',
    warnGround3: '#24110C',
    warnGround4: '#241611',
    warnBorder: '#3A2018',
    warnBorder2: '#4A2418',
    onWarn: '#1B0F0A',
    scrim: 'rgba(0,0,0,0.8)',
    cardSoft: '#0D0D0D',
    raised: '#1C1C1C',
    pressed: '#242424',
    sheet: '#0E0E0E',
    tile: '#171717',
    sunk: '#0B0B0B',
    hair: 'rgba(255,255,255,0.071)',
    hairSoft: 'rgba(255,255,255,0.071)',
    dashedInk: '#3E3E3E',
    barIdle: '#222222',
    handle: '#262626',
    highlight: 'rgba(255,255,255,0.047)',
  },
};

/** The five preset accents, and the names the app calls them. */
export const SWATCHES = [['#FF3E', 'Lime'], ['#E1C1', 'Mint'], ['#6B3D', 'Ember'], ['#9BFF', 'Lilac'], ['#C53D', 'Amber']];

/** Ink on an accent is always this, in every theme, and is never up for negotiation. */
export const ON_ACCENT = '#0C0E0B';

/** The spacing scale, in dp. Snap to a step; nothing should move more than 2dp off it. */
export const SPACE = {
  nudge: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  screen: 20,
  gap: 18,
};

/** Corner radii, in dp. A filled card needs a larger radius than a bordered one to read as a slab. */
export const RADIUS = {
  chip: 8,
  control: 12,
  card: 16,
  tag: 6,
  block: 18,
  track: 16,
  sheet: 24,
  pill: 999,
  group: 22,
  cardLg: 26,
  hero: 30,
  button: 22,
};

/** The minimum touch target, in dp. */
export const TOUCH = 48;

/** The type scale, in sp. Numerals and titles are Barlow Condensed; everything else is Barlow. */
export const TYPE = {
  micro: 11.5,
  caption: 13,
  body: 15,
  bodyLg: 17,
  title: 22,
  display: 28,
  hero: 52,
  heroXL: 60,
  numeral: 92,
  tiny: 10.5,
  caption2: 12.5,
  row: 16,
  titleS: 24,
  titleM: 32,
  titleL: 40,
  titleXL: 46,
  hero80: 80,
  numeralXL: 96,
  countdown: 172,
};


// ---- Colour maths -------------------------------------------------------------------------------
// Mirrors ui/theme/Contrast.kt exactly. WCAG 2.1 with the 0.03928 channel threshold.

const chan = v => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };

export const hexRgb = h => {
  const s = h.replace('#', '');
  return [0, 2, 4].map(i => parseInt(s.slice(i, i + 2), 16));
};

export const luminance = ([r, g, b]) => 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b);

/** 1.0 for identical, 21.0 for black on white. */
export function contrastRatio(a, b) {
  const la = luminance(typeof a === 'string' ? hexRgb(a) : a);
  const lb = luminance(typeof b === 'string' ? hexRgb(b) : b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** HSL to #RRGGBB. h in degrees, s and l in 0..1. */
export function hslHex(h, s, l) {
  const hue = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((hue / 60) % 2 - 1));
  const m = l - c / 2;
  const [r, g, b] =
    hue < 60 ? [c, x, 0] : hue < 120 ? [x, c, 0] : hue < 180 ? [0, c, x] :
    hue < 240 ? [0, x, c] : hue < 300 ? [x, 0, c] : [c, 0, x];
  const byte = v => Math.round(Math.min(255, Math.max(0, (v + m) * 255)));
  return '#' + [r, g, b].map(v => byte(v).toString(16).padStart(2, '0').toUpperCase()).join('');
}

// ---- A colour of your own -------------------------------------------------------------------------
// A picker, not a free choice. Ink on the accent is ON_ACCENT everywhere and always will be, so the
// one thing a custom colour must not do is go dark enough to swallow it. Hue is yours, saturation
// is fixed, lightness is floored per hue.

export const CUSTOM_SAT = 0.92;
export const CUSTOM_HI = 0.82;
export const CUSTOM_MIN_RANGE = 0.08;
export const CUSTOM_MIN_CONTRAST = 7.0;
const CUSTOM_CEIL = 0.90;

/**
 * The darkest this hue may be and still carry ON_ACCENT ink at 7:1.
 *
 * Per hue, because a blue needs to be far lighter than a yellow to hold black text - .78 against
 * .33 - and one fixed floor would either ban most of the spectrum or let the blues through
 * unreadable. Walks UP from .30, so the answer is the smallest lightness that passes.
 */
export function customFloor(hue) {
  let l = 0.30;
  while (l < CUSTOM_CEIL) {
    if (contrastRatio(hslHex(hue, CUSTOM_SAT, l), ON_ACCENT) >= CUSTOM_MIN_CONTRAST) break;
    l += 0.01;
  }
  return Math.min(l, CUSTOM_CEIL);
}

/** Never less than CUSTOM_MIN_RANGE above the floor, so a high-floor hue still has a slider. */
export const customHi = hue => Math.max(CUSTOM_HI, customFloor(hue) + CUSTOM_MIN_RANGE);

/** hue 0-359, bright 0-100. The worst case across the whole spectrum is exactly 7.00:1. */
export function customAccent(hue, bright) {
  const lo = customFloor(hue);
  const hi = customHi(hue);
  const l = lo + (hi - lo) * (Math.min(100, Math.max(0, bright)) / 100);
  return hslHex(hue, CUSTOM_SAT, l);
}

/**
 * Same hue, darkened step by step until it reads at 4.5:1 on the light field colour.
 *
 * This is why accent TEXT is readable on the light theme: a raw lime on near-white is about
 * 1.15:1 and simply vanishes.
 */
export function inkOf(hex) {
  const [r, g, b] = hexRgb(hex).map(v => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0;
  const l0 = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l0 - 1));
  if (d !== 0) {
    h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60; if (h < 0) h += 360;
  }
  let l = l0;
  while (l > 0.05) {
    const c = hslHex(h, s, l);
    if (contrastRatio(c, PAL.light.field) >= 4.5) return c;
    l -= 0.01;
  }
  return hslHex(h, s, l);
}

// ---- Every accent-derived token ---------------------------------------------------------------------
// The app reads these through one object so a screen never does its own colour maths. Each one has a
// single job; the comments say which, because mixing two of them up is how a tab bar ends up with an
// unreadable icon on an olive pill.

const over = (hex, pct, under) => {
  const [r, g, b] = hexRgb(hex), [ur, ug, ub] = hexRgb(under);
  const mix = (a, b2) => Math.round(a * pct + b2 * (1 - pct));
  return '#' + [mix(r, ur), mix(g, ug), mix(b, ub)].map(v => v.toString(16).padStart(2, '0').toUpperCase()).join('');
};

/**
 * Every token a screen can ask for, for one theme and one accent.
 *
 * theme: 'dark' | 'light' | 'black'. accent: a hex string.
 * calm: the user asked for the accent to stay off the large surfaces.
 */
export function tokens(theme, accent, calm = false) {
  const p = PAL[theme] || PAL.dark;
  const light = theme === 'light';
  const aci = light ? inkOf(accent) : accent;
  return {
    ...p,
    calm,
    accent,
    onAccent: ON_ACCENT,
    /** A fill that carries dark ink: a tab pill, a chip, a selected segment, a primary button. */
    accentOn: accent,
    /** Accent TEXT and thin lines. Darkened on light so it survives a near-white page. */
    accentInk: aci,
    /** Filled marks: bars, sparklines, dots. Needs the 3:1 that non-text content requires. */
    accentFill: light ? aci : accent,
    /** The 1dp edge an accentOn fill needs on light, and does not need on dark. */
    accentEdge: light ? aci : null,
    /** A soft wash over the PAGE, not over a card: done cells, the current row, today's dot. */
    accentSoft: over(accent, light ? 0.22 : 0.16, p.page),
    accentRow: over(accent, light ? 0.12 : 0.08, p.page),
    accentGround: over(accent, light ? 0.16 : 0.12, p.card),
    accentBorder: over(accent, light ? 0.55 : 0.32, p.card),
    /** The engine block. Quieter than accentGround, because it carries a paragraph not a chip. */
    engineGround: over(accent, light ? 0.10 : 0.07, p.card),
    engineBorder: over(accent, light ? 0.40 : 0.22, p.card),
    accentMid: over(accent, light ? 0.65 : 0.45, p.card),
    accentSelected: light ? aci : over(accent, 0.46, p.card),
    /** A glow is light spilling onto a dark page; on a near-white page it is only a smudge. */
    glow: light ? 'transparent' : accent + '38',
  };
}

/** The same tokens as CSS custom properties, for a prototype that themes with a stylesheet. */
export function cssVars(theme, accent, calm = false) {
  const t = tokens(theme, accent, calm);
  return Object.entries(t)
    .filter(([, v]) => typeof v === 'string')
    .map(([k, v]) => `--${k.replace(/[A-Z]/g, m => '-' + m.toLowerCase())}: ${v};`)
    .join('\n');
}
