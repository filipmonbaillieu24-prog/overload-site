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

## Contact address

The pages point at **support.overload@gmail.com**. Use the same address for the contact email in
the Play Console listing, so people always land in one inbox.

## Publishing on GitHub Pages

1. Create a repository on GitHub — `overload-site` is a fine name. Public.
2. From this folder:

   ```bash
   git init
   git add .
   git commit -m "Overload site: home, privacy, terms, support"
   git branch -M main
   git remote add origin https://github.com/<your-username>/overload-site.git
   git push -u origin main
   ```

3. In the repository: **Settings → Pages → Source: Deploy from a branch → `main` / `(root)` → Save.**
4. A minute later the site is at `https://<your-username>.github.io/overload-site/`.

## The URLs Play needs

| Console field | URL |
|---|---|
| Privacy policy | `https://<you>.github.io/overload-site/privacy.html` |
| Store listing website (optional) | `https://<you>.github.io/overload-site/` |
| Support (in the listing, optional) | `https://<you>.github.io/overload-site/support.html` |

Updating is `git commit` and `git push`; Pages redeploys by itself.
