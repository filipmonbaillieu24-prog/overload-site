# REGOL — the public site

Eight static pages, no build step, no dependencies. They exist because Google Play requires a
privacy policy at a public URL, and because a paid app needs somewhere to explain itself.

| File | What it is |
|---|---|
| `index.html` | What REGOL is, what it costs, early access |
| `try.html` | The whole app running in the browser, with a twelve-step guided tour |
| `testing.html` | How to join the closed test |
| `roadmap.html` | The GitHub issues feed and the board |
| `report.html` | The bug and idea form |
| `privacy.html` | **The URL Play asks for.** What the app stores and the three ways data can leave it |
| `terms.html` | Free plan, subscription, early access, training sense |
| `support.html` | Contact, backups, moving phones, subscription questions |
| `style.css` | Shared styling for the six pages below Home and Try it |
| `REGOL.dc.html` | The app prototype every phone on the site is mounted from |
| `overload-core.js` | Its data, view model and simplified engine |
| `support.js` | The runtime that renders the `.dc.html` pages in the browser |

All eight pages are meant to be indexed. The only `noindex` tags on the site are in
`404.html` (because a direct request to /404.html returns 200, even though GitHub Pages
serves the file with a 404 status for unmatched paths) and in
`REGOL.dc.html` (because GitHub Pages serves it as a page of its own).
`robots.txt` blocks only `/README.md`, which has no `<head>` to put a tag in. Never disallow
`/REGOL.dc.html`, `/support.js`, `/overload-core.js` or `/fonts/`: they are the resources
`index.html` and `try.html` render from, and blocking them leaves Googlebot looking at an
empty page.


## Next (October 2026)

- `index.html` and `try.html` are Design Component pages: a `<x-dc>` template plus a logic class,
  rendered in the browser by `support.js`. There is no build step. Most repeated copy (feature
  cards, pricing rows, FAQ, tour steps) lives in the arrays in the logic class at the bottom of
  each file, not in the markup.
- The other six pages keep their markup and copy; their look comes from `style.css`. Bump
  `style.css?v=` in all seven files that link it (the six plus `404.html`) whenever it changes.
- Every phone on the site is the real app prototype, `REGOL.dc.html`, mounted with
  `<dc-import name="REGOL" ...>` and started in a scene. It resolves to the sibling file, so
  `REGOL.dc.html`, `overload-core.js` and `support.js` must stay in the repo root next to the
  pages.
- **Only `try.html` is interactive.** Every phone on `index.html` carries `inert`,
  `aria-hidden="true"`, `pointer-events:none` and `still`, so it looks live but cannot be tapped,
  focused or read by a screen reader. Keep that rule if you add phones anywhere else.
- `images/` now holds only the metadata images: `og.jpg` (the Play feature graphic, used as the
  `og:image` on every page) and `screenshots/01-08` (the Play screenshots, referenced by the
  JSON-LD `screenshot` array). No page loads them.
- To regenerate any of it after a design change, re-export from the design project:
  `REGOL Site Home.dc.html`, `REGOL Site Try.dc.html`, `REGOL.dc.html`,
  `REGOL Play Store.dc.html`.

## The app component and fonts

`REGOL.dc.html` declares its own five `@font-face` rules with relative `fonts/...` URLs. The
component runtime resolves a mounted component's relative URLs against the origin root rather
than the page, and the site is served from the origin root of `regolapp.be`, so they reach
`/fonts/...` and resolve. That was not true on the old `github.io/overload-site/` project page,
which is why the previous app file declared no faces and `try.html` built absolute URLs from
`document.baseURI` instead. If the site ever moves back under a path prefix, that problem
returns and the `document.baseURI` approach is the fix. Never hard-code a prefix.

## CNAME is load-bearing for SEO

`CNAME` is what makes GitHub Pages 301 every old
`filipmonbaillieu24-prog.github.io/overload-site/...` URL to its exact counterpart on
regolapp.be. The redirect preserves the path, which is the ideal case: every old URL maps to
its own counterpart rather than dumping everything on the home page, so Google transfers the
signals and drops the old URLs over a few weeks with nothing else to do. Deleting `CNAME`, or
renaming the repository, silently breaks that redirect and the old links start 404ing instead
of pointing anywhere. There is no warning when that happens.

Two things deliberately not done: no Change of Address in Search Console (it needs both
properties verified, and the old one can no longer be verified because a verification file
placed in the repo would itself be 301'd), and no removal request for the old github.io URLs
(they drop out on their own, and a removal request can suppress the destination URL too).


## Changes made to the prototype files here

`REGOL.dc.html` and `overload-core.js` come from the design project, so every re-sync overwrites
them. Three changes were made here on top of the October 2026 handover and need re-applying after
the next one. All three are in place today. Check them against `design_handoff_regol_site/site/`
before you push.

1. **`meta robots noindex` in the app file's head.** `REGOL.dc.html` is a complete HTML document,
   so GitHub Pages serves it at `/REGOL.dc.html` as a page. Its head carries
   `<meta name="robots" content="noindex">` and a `<title>` for that reason. Losing this one is
   silent: nothing breaks, the file just quietly becomes indexable again. **Re-applied.**
2. **No rest timer after the last set.** The handover's `lv.log` in `overload-core.js` set `rest`
   unconditionally, including on the set that ends the workout. It now starts rest only while a set
   is still unlogged, so the dock offers Finish instead of counting down two minutes at someone
   already putting their shoes on. Mirrors the `anythingLeft` branch of `Repo.check` in the Android
   app.
3. **The step is sized from the session.** The handover's `outlook` in `overload-core.js` took
   `avg - target` steps of `l.step`, which is 5% on a barbell and 50% on a light dumbbell, so the
   demo proposed jumps the app does not make. It now separates what the reserve reading asks for
   from what the ladder allows: the session's best set implies a one-rep max (Epley, counting
   reserve as reps), that says how many reps the candidate weight would allow at the reserve being
   aimed for, and the step is taken only while that stays within `SLACK` reps of the bottom of the
   range. A step earned by clearing the rep range is never sized away, because there is no rep left
   to add once you are past the top of it. Mirrors `Engine.earned` and the `sized` flag in the
   Android app, which is the source of truth, **including `SLACK = 2`**: an earlier version of this
   patch demanded the full rep range and so was stricter than the engine, which quietly turns the
   reserve rule into double progression on an 8-10 range.

   This one is load-bearing for honesty: `try.html`'s "How the next weight is chosen" describes the
   earned-step rule in so many words ("will not take a step that would drop your reps out of their
   range ... one easy session on a 10 kg dumbbell is never answered with 12.5 kg"), so without it
   the page describes an engine the demo does not run.

A fourth change, stripping the app file's `@font-face` block, is no longer needed: see "The app
component and fonts" above.

## Structured data: the dated fields

`index.html` carries a JSON-LD `@graph` that declares the app entity once, as
`https://regolapp.be/#app`. Every other page references it by `@id`, so these values are edited
in one file only. Five of them go stale on known triggers and nothing checks them
automatically, so they are listed here.

| Value | Where | Trigger | New value |
|---|---|---|---|
| `softwareVersion` | `#app` | every app release | the new `versionName` from `app-android/app/build.gradle.kts` (1.5 today) |
| `priceValidUntil` | first Offer | 1 January 2027 | remove the early-access Offer; the Subscription Offer takes over |
| `isAccessibleForFree` | `#app` | 1 January 2027 | `false` (charts, records, the weekly debrief and notes become paid) |
| `availability` / `downloadUrl` | first Offer, `#app` | public Play launch | `InStock` plus the public listing URL, and add `installUrl` back |
| `dateModified` | privacy.html, terms.html | any edit to those pages | the same date as their "Last updated" line |

While the app is in closed testing, `downloadUrl` is the opt-in link
`https://play.google.com/apps/testing/app.overload` and the early-access Offer is
`LimitedAvailability`, because that is the only way a stranger can actually get the app and it
is the only Play URL the site links. `sameAs` still points at the store listing, because that
is an identity statement, not an availability claim.

Never add `aggregateRating`, `review`, `reviewCount`, an `award` or a download count. The app
has almost no ratings; inventing them is false and is one of the specific things Google issues
a structured-data manual action for. There is no honest placeholder either: `ratingCount` 0 and
`ratingValue` "0.0" are both validator errors. Add a real `aggregateRating` only when the Play
figure is live, the listing is public, and the same number is visible to a human on
`index.html`, and then update both together or neither.

The `#developer` node is an `Organization` named "REGOL" rather than a `Person`, because the
personal name appears nowhere in human-readable text on the site. Swapping it for a `Person`
is a one-node change, since every reference is by `@id`.
