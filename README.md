# Monthly Spend

A small, offline-first budget app: enter your monthly salary and expenses (per month or per day) and see what's left.

- Works on phones, tablets and desktop
- Installable on Android (and iPhone) as an app, works offline
- Light / dark / system theme
- English (default), French and Arabic (right-to-left)
- Tick expenses as paid; ticks clear automatically when a new month starts
- Any currency: pick DH (default), $, €, £… or type your own
- Data stays on your device (browser storage)

## Install on an Android phone

The app has to be served over **HTTPS** to be installable. It is hosted on Netlify
(`netlify.toml`), which publishes the `master` branch:

1. Open https://monthlly.netlify.app/ in **Chrome on Android**.
2. Tap the install button in the app header
   (or Chrome menu ⋮ → **Install app** / **Add to Home screen**).

It now opens full screen from your home screen, with its own icon, and keeps working offline.

> Want a real `.apk` for the Play Store? Paste your Netlify URL into
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
| `app.js` | App logic, currency, theme, language, install prompt |
| `i18n.js` | English / French / Arabic text |
| `manifest.webmanifest` | Makes the app installable (name, icons, colors) |
| `sw.js` | Service worker for offline use — bump `VERSION` when you change files |
| `icons/` | Logo (`logo.svg`) and generated PNG icons |
