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


## Rework (September 2026)

- `style.css` restyles every page (Barlow, flat sections, engine-block highlights). `style.old.css` is the previous look.
- `index.html` was rebuilt in the new style; its phone images live in `images/` and are rendered from the prototype.
- `try.html` runs the whole app in the browser with a guided tour. It loads `app/support.js`, `app/Overload App.dc.html` and `app/overload-core.js`; the fonts come from `fonts/`. Nothing is stored. If `try.html` shows a blank phone, check that `app/` and `fonts/` were deployed alongside it.
- To regenerate the images or the try page after a design change, edit `Site Home.dc.html` / `Site Try.dc.html` in the design project and re-export.

## The try-it app and fonts

`app/Overload App.dc.html` deliberately declares no `@font-face`. It is mounted into
`try.html` by the component runtime, which resolves the component's relative URLs against the
origin root rather than the page — so `fonts/…` inside it reaches `/fonts/…` and 404s on a
project page like `/overload-site/`. `try.html` already declares the same five faces, with the
same family names, and the mounted app inherits them.

If the app file is re-synced from the design project, strip its `@font-face` block again.
