# Overload — the public site

Four static pages, no build step, no dependencies. They exist because Google Play requires a
privacy policy at a public URL, and because a paid app needs somewhere to explain itself.

| File | What it is |
|---|---|
| `index.html` | What Overload is, what it costs, early access |
| `privacy.html` | **The URL Play asks for.** What the app stores and the three ways data can leave it |
| `terms.html` | Free plan, subscription, early access, training sense |
| `support.html` | Contact, backups, moving phones, subscription questions |
| `style.css` | Shared styling |

All eight pages are meant to be indexed. The only `noindex` tags on the site are in
`404.html` (because a direct request to /404.html returns 200, even though GitHub Pages
serves the file with a 404 status for unmatched paths) and in
`app/Overload App.dc.html` (because GitHub Pages serves it as a page and it has no title).
`robots.txt` blocks only `/README.md`, which has no `<head>` to put a tag in. Never disallow
`/app/` or `/fonts/`: they are the resources `try.html` renders from, and blocking them leaves
Googlebot looking at an empty phone.


## Rework (September 2026)

- `style.css` restyles every page (Barlow, flat sections, engine-block highlights). `style.old.css` is the previous look.
- `index.html` was rebuilt in the new style; its phone images live in `images/` and are rendered from the prototype.
- `try.html` runs the whole app in the browser with a guided tour. It loads `app/support.js`, `app/Overload App.dc.html` and `app/overload-core.js`; the fonts come from `fonts/`. Nothing is stored. If `try.html` shows a blank phone, check that `app/` and `fonts/` were deployed alongside it.
- To regenerate the images or the try page after a design change, edit `Site Home.dc.html` / `Site Try.dc.html` in the design project and re-export.

## The try-it app and fonts

`app/Overload App.dc.html` deliberately declares no `@font-face`. It is mounted into
`try.html` by the component runtime, which resolves the component's relative URLs against the
origin root rather than the page, so `fonts/…` inside it reaches `/fonts/…`. That 404s on a
project page like `/overload-site/`. `try.html` already declares the same five faces, with the
same family names, and the mounted app inherits them.

The fix was deliberately built from `document.baseURI` rather than a hard-coded `/overload-site/`
prefix, so it survived the move to the `overload.icu` custom domain, where the site is served from
the origin root and the prefix is gone. Keep it that way: a hard-coded prefix would have to be
found and removed again at the next domain change.

If the app file is re-synced from the design project, strip its `@font-face` block again.

## CNAME is load-bearing for SEO

`CNAME` is what makes GitHub Pages 301 every old
`filipmonbaillieu24-prog.github.io/overload-site/...` URL to its exact counterpart on
overload.icu. The redirect preserves the path, which is the ideal case: every old URL maps to
its own counterpart rather than dumping everything on the home page, so Google transfers the
signals and drops the old URLs over a few weeks with nothing else to do. Deleting `CNAME`, or
renaming the repository, silently breaks that redirect and the old links start 404ing instead
of pointing anywhere. There is no warning when that happens.

Two things deliberately not done: no Change of Address in Search Console (it needs both
properties verified, and the old one can no longer be verified because a verification file
placed in the repo would itself be 301'd), and no removal request for the old github.io URLs
(they drop out on their own, and a removal request can suppress the destination URL too).


## Changes made to the prototype files here

`app/overload-core.js` and `app/Overload App.dc.html` come from the design project, so a re-sync
will overwrite them. Five changes were made after the handoff and need re-applying if that
happens (they are also in `design_handoff_overload_site/site/app/`):

1. **No `@font-face` in the app file** — see above.
2. **No rest timer after the last set.** `log:` set `rest` unconditionally, including on the set
   that ends the workout. It now only starts rest when a set is still unlogged.
3. **Edit mode keeps the set rows.** The session screen dropped to wrapped chips while editing,
   and a chip has no room for the NEW BEST badge — so correcting a typo hid the records. Edit mode
   now rings the same rows and adds a pencil. `rows` gained the `tap` the chips had.
4. **The step is sized from the session.** `outlook` in `overload-core.js` took `avg - target`
   steps of `l.step`, which is 5% on a barbell and 50% on a light dumbbell — so the demo proposed
   jumps the app no longer makes. It now refuses a step that its own numbers say would drop the
   reps out of their range, and says so, mirroring `Engine.propose`'s `earned`. This one is
   load-bearing for honesty: `try.html`'s "How the next weight is chosen" describes the new rule,
   so a re-sync that dropped this would leave the page describing an engine the demo does not run.
5. **`meta robots noindex` in the app file's head.** `app/Overload App.dc.html` is a complete HTML
   document, so GitHub Pages serves it at `/app/Overload%20App.dc.html` as a page with no title.
   Its head carries `<meta name="robots" content="noindex">` and a `<title>` for that reason.
   Unlike the others, losing this one is silent: nothing breaks, the file just quietly becomes
   indexable again.

Changes 2, 3 and 4 match the Android app, which is the source of truth.

## Structured data: the dated fields

`index.html` carries a JSON-LD `@graph` that declares the app entity once, as
`https://overload.icu/#app`. Every other page references it by `@id`, so these values are edited
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

The `#developer` node is an `Organization` named "Overload" rather than a `Person`, because the
personal name appears nowhere in human-readable text on the site. Swapping it for a `Person`
is a one-node change, since every reference is by `@id`.
