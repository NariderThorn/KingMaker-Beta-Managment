# Kingdom Ledger

A kingdom-management tracker for Pathfinder Second Edition's *Kingmaker*
Adventure Path — kingdom creation, computed ability scores, leadership roles,
commodities, an interactive hex map, and a level-up flow, all in one app.

Unofficial fan project. Not affiliated with or endorsed by Paizo Inc.
"Pathfinder" and "Kingmaker" are trademarks of Paizo Inc. — see
[NOTICE.md](NOTICE.md).

## Install

Grab the APK from this repo's **[Releases](../../releases)** page, download
it to your Android phone, and open it. You'll need to allow "install from
unknown sources" for your browser or file manager the first time — that's
expected for anything not from the Play Store.

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
  local to your device.

## Source

The full source is in this repo — `web/` for the app itself, `android/` for
the thin native wrapper it ships in. No build steps needed to just read it.

## License

Original code is MIT-licensed — see [LICENSE](LICENSE). The map artwork and
Pathfinder/Kingmaker terminology are not covered by that license — see
[NOTICE.md](NOTICE.md).
