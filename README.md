# REGOL — the public site

Ten static pages, no build step, no dependencies, no framework. They exist because Google Play
requires a privacy policy at a public URL, and because an app people pay for needs somewhere to
explain itself.

The site is the **Chapters** generation (October 2026): the home page and most sub-pages are
full-screen chapters, one idea per screen. On desktop they sit side by side and the wheel, the
arrow keys and the bottom rail move between them; under 940px they stack and snap vertically.
Privacy and Terms stay long-form.

| File | What it is |
|---|---|
| `index.html` | 14 chapters, then the FAQ and the footer |
| `try.html` | The whole app in the browser with a twelve-step tour, plus the engine calculator |
| `news.html` | Latest release, the timeline, how to follow |
| `news-1-8.html` | The 1.8 release, nine chapters |
| `roadmap.html` | Eight chapters, five of them read live from the GitHub issues API |
| `report.html` | The bug and idea form |
| `privacy.html` | **The URL Play asks for.** What the app stores and the three ways data can leave it |
| `terms.html` | Free plan, subscription, training sense |
| `support.html` | Contact, backups, moving phones, subscription questions |
| `404.html` | Root-absolute links, `noindex` |
| `testing.html` | A meta-refresh to the Play listing. The closed test is over; old links land here |
| `site.js` | The Play link, the scroll reveal and the chapter deck (`REGOL.deck`) |
| `site-ui.js` | The header menu and the chapter rail, on every page that has them |
| `site.css` | Hover and focus states, and the menu panel's open/closed rule |
| `try.js` | The tour, the simulator bridge and the engine calculator |
| `REGOL.dc.html` | The app prototype the Try page embeds |
| `overload-core.js` | Its data, view model and simplified engine |
| `support.js` | The runtime that renders `REGOL.dc.html` in the browser |

All ten pages are meant to be indexed. The only `noindex` tags on the site are in `404.html`
(a direct request to /404.html returns 200, even though GitHub Pages serves the file with a 404
status for unmatched paths), `testing.html` (a redirect) and `REGOL.dc.html` (GitHub Pages serves
it as a page of its own). `robots.txt` blocks only `/README.md`, which has no `<head>` to put a
tag in. Never disallow `/REGOL.dc.html`, `/support.js`, `/overload-core.js` or `/fonts/`: they are
what `try.html` renders from, and blocking them leaves Googlebot looking at an empty page.

## How the pages are written

Every page carries its layout in **inline styles**, exactly as the design reference in
`design_handoff_regol_site_v2/design/*.dc.html` does. That is deliberate: the design files are the
source of truth for look, copy and spacing, and keeping the markup identical means a change there
can be carried over by hand without reconciling a stylesheet.

An inline style beats any selector, so the three things a selector has to do
anyway — `:hover`, `:focus` and the phone layout — live in `site.css`, each forced
with `!important`. A design file's `style-hover="background:#E6FF7A;color:#0C0E0B"`
became `class="hv-play"`.

What the design files express as component logic is plain JavaScript here:

- **`site-ui.js`** reads `data-title` off each `[data-ch]` chapter and drives `[data-rail]`:
  the counter, the current title, the dots and the next button. It also runs the header menu
  (`[data-act="menu"]` toggles `data-open` on `[data-menu]`) and any `[data-scroll-to]` link.
- **`site.js`** is the design's own file, shipped unchanged.
- Per-page behaviour sits in a `<script>` at the end of the page it belongs to — the accent
  swatches on Home, the share buttons on the release page, the live issue lists on the roadmap,
  the two forms on Report. Only `try.html` is big enough to earn its own file.

Elements the scripts reach for are marked with `data-` attributes and nothing else; no class or
style on the page is load-bearing for JavaScript.

## Phones

Under 940px the design turns the deck vertical and keeps every chapter exactly
one viewport tall. Measured on a 375 × 812 phone, ten of the home page's
fourteen chapters held more than that — the hero by 448px — so each became its
own scroller inside a mandatory snap: copy cut off at the fold, the rail sitting
on whatever was under it, and two gestures needed to move on.

`site.css` ends with the phone rules, and they are the only place the site
departs from the design reference:

- A chapter is at least a screen tall and grows to its content. It is a flex
  item in a column, so its height is `flex-basis`, not `height: 100%`; both have
  to let go or nothing moves.
- The snap relaxes from mandatory to proximity, so a tall chapter is read in one
  movement and the next one still comes to rest at the top.
- `site-ui.js` stops using `REGOL.deck` here. The deck measures in whole
  viewports, which is right sideways and wrong once chapters differ in height,
  and it re-snaps on every resize — on a phone the address bar sliding away is a
  resize. The rail reads the nearest chapter's `offsetTop` instead. Sideways on
  desktop `REGOL.deck` is still in charge, wheel and keys and all, and nothing
  about that path changed.
- Four chapters needed a rule of their own, each noted in the stylesheet, and
  the controls that sat under the design's own 44px floor were raised. The
  rail's dots grow a hit area without the dot changing size.
- The header tightens at 400px and drops the Menu pill's word at 340px, which is
  what keeps a 320px phone free of a sideways scroll.

Check a change at 320, 375 and 430 before pushing. The quickest proof is
`document.documentElement.scrollWidth` matching the viewport width on every
page, and no `[data-ch]` being scrollable inside itself.

## The embedded app, and two fixes it needed

`try.html` embeds `REGOL.dc.html` in an iframe and picks the screen through **the frame's URL**:
`REGOL.dc.html?embedded=1&fast=1&scene=live&seed=3`. Two things forced that, both verified in a
browser rather than reasoned about:

1. **`__dcSetProps` cannot drive it.** The design's own Try page passes `scene` as a prop, which
   works inside the component runtime but not across a frame boundary: setting props after boot
   leaves the component rendering an empty shell. So `REGOL.dc.html` gained a small block that
   reads `scene`, `embedded` and `fast` from its own query string, with the props still winning
   when there is no query string — opening the file on its own behaves exactly as before.
2. **One missing `</div>`.** In the handed-over file the Today chapter's scroll container was
   never closed: the list that used to close it was replaced by the *Why these weights* row higher
   up, and its closing tag went with it. The browser then nested all 28 of the following
   `<sc-if>` blocks *inside* the Today block, so every screen other than Today rendered blank.
   One `</div>` before the bottom dock fixes it. **This is in the design file too and needs fixing
   there, or the next re-sync brings it back.**

Both changes are in `REGOL.dc.html` in this repo and are the first thing to re-apply after a
re-sync from the design project.

The three fixes the previous generation listed here — `noindex` in the app file's head, no rest
timer after the last set, and a step sized from the session rather than a flat percentage — are
all present in the handed-over files and need no re-applying. Check them again next time:
`grep -c 'content="noindex"' REGOL.dc.html` and `grep -c SLACK overload-core.js` should both be
non-zero.

## Rebuilding a page from the design

There is no build step in the repo, and there should not be one. The pages were produced by a
one-off converter that expands the design files' `sc-for`, `sc-if` and `{{ }}` against the data in
their logic classes, swaps `style-hover` for a class, inlines the header and footer and rewrites
`*.dc.html` hrefs to `*.html`. It lives in `E:\Overload\site-build`, outside this repo so nothing
unservable is served, and its own README says how to run it.

A small design change is faster to port by hand: the markup here is a character-for-character copy
of the design's, so a diff of the design file says exactly what to paste. Either way, read the diff
in this repo before pushing — the converter does not regenerate the hand-written scripts, and they
can fall out of step with a marker that moved. Do not introduce a framework for any of it.

## The app component and fonts

`REGOL.dc.html` declares its own five `@font-face` rules with relative `fonts/...` URLs. The
component runtime resolves a mounted component's relative URLs against the origin root rather than
the page, and the site is served from the origin root of `regolapp.be`, so they reach `/fonts/...`
and resolve. That was not true on the old `github.io/overload-site/` project page, which is why the
previous app file declared no faces and `try.html` built absolute URLs from `document.baseURI`
instead. If the site ever moves back under a path prefix, that problem returns and the
`document.baseURI` approach is the fix. Never hard-code a prefix.

## CNAME is load-bearing for SEO

`CNAME` is what makes GitHub Pages 301 every old
`filipmonbaillieu24-prog.github.io/overload-site/...` URL to its exact counterpart on
regolapp.be. The redirect preserves the path, which is the ideal case: every old URL maps to its
own counterpart rather than dumping everything on the home page, so Google transfers the signals
and drops the old URLs over a few weeks with nothing else to do. Deleting `CNAME`, or renaming the
repository, silently breaks that redirect and the old links start 404ing instead of pointing
anywhere. There is no warning when that happens.

Two things deliberately not done: no Change of Address in Search Console (it needs both properties
verified, and the old one can no longer be verified because a verification file placed in the repo
would itself be 301'd), and no removal request for the old github.io URLs (they drop out on their
own, and a removal request can suppress the destination URL too).

## Structured data: the dated fields

`index.html` carries a JSON-LD `@graph` that declares the app entity once, as
`https://regolapp.be/#app`. Every other page references it by `@id`, so these values are edited in
one file only. Four of them go stale on known triggers and nothing checks them automatically.

| Value | Where | Trigger | New value |
|---|---|---|---|
| `softwareVersion` | `#app` | every app release | the new `versionName` from `app-android/app/build.gradle.kts` (1.8 today) |
| `priceValidUntil` | first Offer | 1 January 2027 | remove the free-for-everyone Offer; the Subscription Offer takes over |
| `isAccessibleForFree` | `#app` | 1 January 2027 | `false` (charts, records, the weekly debrief and notes become paid) |
| `dateModified` | privacy.html, terms.html | any edit to those pages | the same date as their "Last updated" line |

Never add `aggregateRating`, `review`, `reviewCount`, an `award` or a download count. The app has
almost no ratings; inventing them is false and is one of the specific things Google issues a
structured-data manual action for. There is no honest placeholder either: `ratingCount` 0 and
`ratingValue` "0.0" are both validator errors. Add a real `aggregateRating` only when the Play
figure is live and the same number is visible to a human on `index.html`, and then update both
together or neither.

The `#developer` node is an `Organization` named "REGOL" rather than a `Person`, because the
personal name appears nowhere in human-readable text on the site. Swapping it for a `Person` is a
one-node change, since every reference is by `@id`.

## Keeping the feed and the sitemap in step

A new release means three edits, not one: the post itself (`news-1-8.html` and its card in
`news.html`), an `<item>` at the top of `feed.xml`, and a `<loc>` in `sitemap.xml`. The head of
every page links the feed.

## Images

`images/app/*.png` are real build-30 screenshots, recoloured from the owner's blue accent to the
lime default. Only the eleven the pages and the JSON-LD actually reference are in the repo; the rest
of the set is in `design_handoff_regol_site_v2/design/images/app/`. `images/og.png` is the link
preview, set as `og:image` on every page. `images/app-icon-512.png` is the Play icon.
