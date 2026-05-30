# Project Scorpio — visual showcase

Full **1920×1080** screenshots captured from **Microsoft Edge** at `http://localhost:3000`.

## Platform (this repo)

| Login & auth UI | Store — Project Scorpio originals |
|-----------------|-----------------------------------|
| ![Auth login](screenshots/01-auth-login.png) | ![Store originals](screenshots/02-store-originals.png) |

The storefront includes accounts, library, friends, chat, wallet, and gift codes — all local demo only.

## Project Scorpio: Aim Lab

| Difficulty menu | In-game HUD |
|-----------------|-------------|
| ![Aim Lab menu](screenshots/03-aim-lab-menu.png) | ![Aim Lab gameplay](screenshots/04-aim-lab-gameplay.png) |

Standalone repo: [project_scorpio-aim-lab](https://github.com/faridali2003/project_scorpio-aim-lab)

## Project Scorpio: Soccer Stadium

| Pre-match | 7v7 match |
|-----------|-----------|
| ![Soccer menu](screenshots/05-soccer-menu.png) | ![Soccer match](screenshots/05-soccer-match.png) |

Standalone repo: [project_scorpio-soccer](https://github.com/faridali2003/project_scorpio-soccer)

## Re-capture locally

```bash
# Start platform first (backend + my-app), then:
node tools/capture-screenshots.mjs
```

Uses Playwright with the installed **Microsoft Edge** channel at desktop resolution.

## What each repo demonstrates

| Repo | Skills shown |
|------|----------------|
| **project_scorpio** | Full-stack app, REST API, MySQL, JWT auth, Socket.io, Steam-style UX |
| **project_scorpio-aim-lab** | Three.js FPS, collision, pointer lock, procedural assets |
| **project_scorpio-soccer** | Three.js sports sim, AI, stadium GLB, gamepad input |
