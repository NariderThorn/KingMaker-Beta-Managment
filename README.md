# Kingdom Ledger

A kingdom-management tracker for Pathfinder Second Edition's *Kingmaker*
Adventure Path — kingdom creation, computed ability scores, leadership roles,
commodities, an interactive hex map, Kingdom Feats, and a level-up flow, all
in one app.

Unofficial fan project. Not affiliated with or endorsed by Paizo Inc.
"Pathfinder" and "Kingmaker" are trademarks of Paizo Inc. — see
[NOTICE.md](NOTICE.md) before you redistribute this publicly.

## Install

Grab the APK from this repo's **[Releases](../../releases)** page, download
it to your Android phone, and open it. You'll need to allow "install from
unknown sources" for your browser or file manager the first time — that's
expected for anything not from the Play Store.

Once installed, the app can update itself two ways from Overview → App
Version, without going back to GitHub each time:
- **Update app.js/style.css now** — pulls the latest logic/styling and
  applies it instantly, no reinstall.
- **Download & install full update** — for changes that need a real new
  APK (icon, permissions, native code). Downloads it and hands it to
  Android's installer directly, the same way non-Play-Store launchers like
  Epic's do it.

## What it does

- **Multiple kingdoms** — a picker on launch lists every kingdom saved on
  the device; open one, start a new one, or delete one you're done with.
- **Kingdom creation** — Charter, Heartland, Government, and bonus ability
  boosts, walked through step by step, each choice actually affecting your
  computed ability scores (with a breakdown of what's contributing what).
- **Abilities & Skills** — computed scores, Ruin tracks, and skills grouped
  by governing ability.
- **Leadership** — 8 roles, invested-role bonuses, a quick-pick roster of
  Kingmaker NPCs with a custom-name fallback.
- **Kingdom Feats** — a pickable list (levels 1–11, from the Player's
  Guide) filtered to what you actually qualify for, plus a freeform option
  for anything higher-level or homebrew. A few (Skill Training, Practical
  Magic, Insider Trading) actually apply their mechanical effect and show
  up as a tag on the affected stat; the rest log with a plain-language
  description of what they do.
- **Level-up** — Kingdom Feats and Skill Increases on the correct schedule
  (feat at even levels from 2, skill increase at odd levels from 3).
- **Map** — pinch/drag/scroll to zoom and pan, tap a hex to add a marker,
  note, or resources/features, confirm-before-committing when placing your
  capital or a settlement. Claiming hexes (Capital, Claimed Territory,
  Settlement) is what sets your kingdom's Size stat, same as the real rules.
- **Backup** — export/import to a JSON file; no account, no server, all
  local to your device.

## Run it as a website instead

No install needed — `web/` is a static site. Either open `web/index.html`
directly in a browser, or serve the folder locally (`python3 -m http.server`
from inside `web/`) and visit `http://localhost:8000`.

## Project layout

```
web/               the app itself — HTML/CSS/JS, no build step. Edit this.
  index.html
  style.css
  app.js
  manifest.json
  assets/          map art + app icons
android/            a thin native wrapper: one Activity, one WebView
  app/src/main/assets/   a copy of web/, generated automatically at build
                          time (see app/build.gradle) — never edit this
                          directly, it gets overwritten on every build
.github/workflows/  CI: builds the APK on every push, publishes it to
                     Releases when you push a version tag
```

**`web/` is the only thing you should ever hand-edit.** The Android build
copies it into place automatically — there's nothing to keep in sync by hand.

## Building the APK yourself

You'll need a JDK (17+) and either Android Studio or a standalone Gradle
install.

**Android Studio (easiest):** File → Open → select the `android/` folder.
Studio will offer to generate the Gradle wrapper the first time — accept
it, then Build → Build APK.

**Command line:**
```bash
cd android
gradle wrapper          # one-time: generates gradlew for this project
./gradlew assembleDebug
```
The APK lands at `android/app/build/outputs/apk/debug/app-debug.apk`.

This repo doesn't commit a `gradlew` wrapper (its jar is a binary file), so
CI installs Gradle directly instead — see `.github/workflows/build-apk.yml`.

## License

Original code is MIT-licensed — see [LICENSE](LICENSE). The map artwork and
Pathfinder/Kingmaker terminology are not covered by that license — see
[NOTICE.md](NOTICE.md).
