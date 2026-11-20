# gta6-trophy-guide

[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?referral_code=26tnw136)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/roymaster46/gta6-trophy-guide/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?referral_code=26tnw136)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/roymaster46/gta6-trophy-guide/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?referral_code=26tnw136)

**Leonida Trophy Guide** — an offline guide and tracker for all 55 Grand Theft Auto VI trophies on PlayStation 5. Every trophy is shown with its official name, description and grade exactly as PlayStation publishes them (1 platinum, 2 gold, 6 silver, 46 bronze, 28 hidden), plus a numbered guide in our own words — every step carries a citation to one of 5 numbered sources, and steps that rest on a single source are tagged "1 source" — a 6-stage roadmap to the platinum, and 10 missable trophies flagged with why they can be missed. The front page is a research dashboard: an audit strip with counts computed live from the data (55 official, grades, hidden, missable, 55/55 guides cited, 145/145 steps cited, 5 sources), a compact checklist on the left, the selected trophy's cited guide in the middle, and a Sources panel with a "How sure are we?" box, roadmap summary and progress on the right. The tracker saves progress in the browser (localStorage), exports it to a file and imports it back, filters by story / missable / collectibles / activities / online, and has a spoiler mode that hides story trophy names and descriptions until they are earned. This game's list has no online trophies — the platinum needs no multiplayer.

Built for the [GTA 6 trophy guide bounty](https://make.fun/bounty/gta6-trophy-guide-01?referral_code=26tnw136) on make.fun.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

Or serve `app/` with any static server. The app is static files with no build step and makes no network requests — it works with the network off.

To hand the entry in (writes `out/`):

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Layout

- `app/index.html`, `app/app.js`, `app/style.css` — the guide and tracker: a 3-column research dashboard (checklist | cited guide | sources & roadmap) with a live audit strip under the header
- `app/data/trophies.json` — all 55 trophies (official name/description/grade, guide, numbered cited `steps`, sources, kind, missable flag, hidden flag) plus the 6-stage roadmap and the 5 global sources
- `screenshots/` — real renders of the app in a browser
- `main.ts` — copies `app/` + `screenshots/` to `/output` and writes `dossier.json`
- `serve.ts` — tiny static server for local testing

---

<sub>Entered in the make.fun GTA 6 trophy guide bounty. Unofficial fan-made guide, not affiliated with Rockstar Games or PlayStation. No Rockstar logos or artwork are used.</sub>
