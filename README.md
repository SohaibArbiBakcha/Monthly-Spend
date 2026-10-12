# Monthly Spend

A small, offline-first budget app: enter your monthly salary and expenses (per month or per day) and see what's left.

- Works on phones, tablets and desktop
- Installable on Android (and iPhone) as an app, works offline
- Light / dark / system theme
- Any currency: pick DH (default), $, €, £… or type your own
- Data stays on your device (browser storage)

## Install on an Android phone

The app has to be served over **HTTPS** to be installable. The easiest way is GitHub Pages:

1. Merge this branch into `main`.
2. On GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. The *Deploy to GitHub Pages* workflow publishes the site to
   `https://<your-username>.github.io/<repo-name>/`.
4. Open that link in **Chrome on Android**, then tap the install button in the app header
   (or Chrome menu ⋮ → **Install app** / **Add to Home screen**).

It now opens full screen from your home screen, with its own icon, and keeps working offline.

> Want a real `.apk` for the Play Store? Paste your GitHub Pages URL into
> [PWABuilder](https://www.pwabuilder.com/) and choose **Android** — it wraps this app
> as a Trusted Web Activity package.

**iPhone:** open the link in Safari → Share → **Add to Home Screen**.

## Run locally

```sh
npx http-server -p 8080
```

Then open http://localhost:8080 (the service worker only runs on `localhost` or HTTPS, not from `file://`).

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Page markup |
| `styles.css` | Styles, light/dark themes, responsive layout |
| `app.js` | App logic, currency, theme, install prompt |
| `manifest.webmanifest` | Makes the app installable (name, icons, colors) |
| `sw.js` | Service worker for offline use — bump `VERSION` when you change files |
| `icons/` | Logo (`logo.svg`) and generated PNG icons |
