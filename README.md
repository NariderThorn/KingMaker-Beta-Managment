# Kingdom Ledger

A kingdom-management tracker for Pathfinder Second Edition's *Kingmaker*
Adventure Path — kingdom creation, computed ability scores, leadership roles,
commodities, an interactive hex map, and a level-up flow, all in one app.

It's a plain web app (no build step, no framework) that also ships as an
Android APK via a thin WebView wrapper — the same `web/` folder runs either
way.

Unofficial fan project. Not affiliated with or endorsed by Paizo Inc.
"Pathfinder" and "Kingmaker" are trademarks of Paizo Inc. — see
[NOTICE.md](NOTICE.md) before you redistribute this publicly.

## Install the app

Grab the latest APK from this repo's **[Releases](../../releases)** page,
download it to your Android phone, and open it. You'll need to allow
"install from unknown sources" for your browser or file manager the first
time — that's expected for anything not from the Play Store, not a sign of a
problem.

Every push to `main` also builds automatically (see the **Actions** tab) so
you can grab an in-progress build as a workflow artifact even between
tagged releases.

## Run it as a website instead

No install needed — `web/` is a static site. Either:

- Open `web/index.html` directly in a browser, or
- Serve the folder locally, e.g. `python3 -m http.server` from inside `web/`,
  then visit `http://localhost:8000`

Your kingdom is saved in the browser's local storage, per-device — there's no
account or server. Use the in-app **Export** button on Overview to back up a
kingdom to a file, or move it to another device.

## Project layout

```
web/               the actual app — HTML/CSS/JS, no build step
  index.html
  style.css
  app.js
  manifest.json
  assets/          map art + app icons
android/            a thin native wrapper: one Activity, one WebView,
                     pointed at a bundled copy of web/
  app/src/main/assets/    copy of web/ — see "Editing the app" below
.github/workflows/  CI: builds the APK on every push, publishes it to
                     Releases when you push a version tag
```

## Editing the app

`web/` is the source of truth. If you change it, copy those same changes into
`android/app/src/main/assets/` before building the APK — the Android project
bundles its *own* copy rather than reading `web/` directly, since that's what
actually ends up inside the APK:

```bash
cp web/index.html web/style.css web/app.js web/manifest.json android/app/src/main/assets/
cp web/assets/* android/app/src/main/assets/assets/
```

## Building the APK yourself

You'll need a JDK (17+) and either Android Studio or a standalone Gradle
install.

**Android Studio (easiest):** File → Open → select the `android/` folder.
Studio will offer to generate the Gradle wrapper for you the first time —
accept it, then Build → Build APK.

**Command line:** if you have Gradle installed separately,
```bash
cd android
gradle wrapper          # one-time: generates gradlew for this project
./gradlew assembleDebug
```
The APK lands at `android/app/build/outputs/apk/debug/app-debug.apk`.

This repo doesn't commit a `gradlew` wrapper (its jar is a binary file), so
CI installs Gradle directly instead — see `.github/workflows/build-apk.yml`.

## What it does

- **Kingdom creation** — Charter, Heartland, Government, and bonus ability
  boosts, walked through step by step, each choice actually affecting your
  computed ability scores (with a breakdown of what's contributing what).
- **Abilities & Skills** — computed scores, Ruin tracks, and skills grouped
  by governing ability, with a marker for skills trained via your government.
- **Leadership** — 8 roles, invested-role bonuses, a quick-pick roster of
  Kingmaker NPCs with a custom-name fallback.
- **Level-up** — Kingdom Feats and Skill Increases on the correct schedule
  (feat at even levels from 2, skill increase at odd levels from 3), with a
  popup at the moment you level up.
- **Map** — pinch/drag/scroll to zoom and pan, tap a hex to add a marker or
  note, confirm-before-committing when placing your capital or a settlement.
- **Backup** — export/import to a JSON file; no account, no server, all
  local.

## License

Original code is MIT-licensed — see [LICENSE](LICENSE). The map artwork and
Pathfinder/Kingmaker terminology are not covered by that license — see
[NOTICE.md](NOTICE.md).
