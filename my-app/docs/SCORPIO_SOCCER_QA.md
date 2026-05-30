# Scorpio Soccer — QA checklist

**Last self-check (code audit):** 2026-05-23 — Cursor agent  
**Your pass:** test the final build with Xbox + keyboard before release.

---

## Session save (2026-05-23 — interrupted for PC restart)

Work-in-progress was **saved in source files** (not committed). After restart, run from `my-app`:

```bash
npm start
```

Open: `http://localhost:3000/?play=scorpio-soccer&soccerDebug=1` (F3 toggles input overlay).

### Done this session (in code)

| Area | Files | What changed |
|------|--------|----------------|
| Stadium load | `stadiumGlb.js` | 5s GLB timeout → built-in fallback; play bounds from turf/markings |
| Fallback pitch | `stadiumActors.js` | Stripes, white lines, penalty boxes, walls, tiers; clutter/sky-column hide; GLB goal meshes hidden |
| Runtime goals | `matchGoals.js`, `SoccerGame.jsx` | White posts + net aligned to `defendLineY` (fixes wireframe GLB goals) |
| Referee | `refereeAI.js`, `SoccerGame.jsx` | Follows ball along touchline |
| Player stacking | `playerSeparation.js`, `SoccerGame.jsx` | Push apart overlapping outfielders each frame |
| Away press | `soccerAI.js` | Defenders/mids chase when human is dribbling |
| Menu lighting | `SoccerGame.jsx` | Brighter sun/ambient on menu; night mode respected in play |
| GKs | `matchVisuals.js` | Brighter kit, scale, yellow tag plane |
| HUD copy | `SoccerHud.jsx`, `soccerInputActions.js` | RB = switch only; LB combos for driven/finesse |
| Bugfix | `stadiumActors.js` | `hasTurf` typo in `hidePitchClutterMeshes` (was broken `hit` variable) |

### Completed (resume pass 2026-05-23)

- **Throw-ins / set pieces:** `awardSetPiece` uses world coords with pitch origin; throw/corner placement fixed in `setPieces.js`.
- **AI:** Away presses only when **opponent** dribbles; away can pass/shoot while dribbling; home CPU skips only when **you** control the ball.
- **Touchline:** Slightly wider out detection; fallback stadium seat **decks removed** (they covered the pitch).
- **Build:** Run `npm run build` locally if the agent build was interrupted.

### Optional asset

Copy `ground.glb` → `public/games/soccer/stadium.glb` (see `public/games/soccer/README.txt`). Fallback pitch works without it.

### Launch

```bash
cd my-app
npm start
```

`http://localhost:3000/?play=scorpio-soccer&soccerDebug=1`

---

## Camera

| Item | Self-check | Notes |
|------|------------|--------|
| Behind player (not broadcast in play) | **PASS** | `fifaCamera.js` chase: `cx = px - cos(yaw)*15`, camera on −forward side |
| Stick up = into screen | **PASS** | `movementFromCameraView` uses camera look (fixed; no inverted forward) |
| Stick down = own goal | **PASS** | Inverse of forward on pitch Y |
| Left/right strafe | **PASS** | `right = up × forward` on XZ |
| LS does not spin camera | **PASS** | No orbit; RS only used in defend for switch |
| Camera after goals | **PASS** | Same chase on kickoff taker (home controlled) |

## Movement & controls

| Item | Self-check | Notes |
|------|------------|--------|
| LS = player only (attack) | **PASS** | Axes 0/1 only for move |
| RS = switch (defend) | **PASS** | `POSSESSION.DEFEND` + RS magnitude |
| RT sprint / LT jockey | **PASS** | Buttons 7 / 6 |
| A pass / B shoot / Y through / X lob | **PASS** | `soccerInputActions.js` |
| Yellow arrow on active | **PASS** | `createPlayerIndicator` + `syncPlayerIndicator` |

## Match flow

| Item | Self-check | Notes |
|------|------------|--------|
| Kick off → play | **PASS** | `tickMatchPhase` timer or **A/E** (home) |
| Goal kick not stuck | **PASS** (fixed) | `setPieces.js` + resume; removed broken `goalY` ref |
| Corner / throw-in | **PASS** | Same restart pipeline |
| Goal → kickoff → play | **PASS** | `setupSetPiece` after goal |
| Half-time → 2nd half | **PASS** | Kickoff + timer |
| Full time rematch | **PASS** | `onStart` → `startMatch` |

## Ball & physics

| Item | Self-check | Notes |
|------|------------|--------|
| Ball visible size | **PASS** | `BALL_RADIUS = 0.22` |
| Arc / bounce | **PASS** | Force loop gravity + drag + ground restitution |
| No goal-line freeze | **PASS** | Out → set piece, not permanent `goal_kick` lock |

## AI

| Item | Self-check | Notes |
|------|------------|--------|
| One red chaser | **PASS** | `awayTeamAI.js` nearest only |
| Home teammates hold shape | **PASS** | `applyFormationAI` when not controlled |

## Stadium

| Item | Self-check | Notes |
|------|------------|--------|
| ground.glb / stadium.glb | **WARN** | `public/games/soccer/stadium.glb` **not in repo** — fallback striped pitch added |
| No centre flicker (GLB) | **PASS** | `fixGrassStripeSeams` when GLB loads |
| Fallback pitch | **PASS** | `createFallbackStadium` if GLB missing |

---

## Before you ship

1. Copy `ground.glb` → `my-app/public/games/soccer/stadium.glb`
2. Hard refresh (Ctrl+F5), play `?play=scorpio-soccer`
3. Confirm **one** goal kick and **one** full half in your build

## Known limits (not FIFA-complete)

- No career / FUT / full 11v11 / licensed teams
- Simplified offside / fouls
- AI is basic 7v7
- No online multiplayer
