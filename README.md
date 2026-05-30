# Scorpio v3.0 — Standalone School Demo

A **local-only** gaming storefront demo (React + Node + MySQL). It mimics a Steam-style UI for learning/portfolio purposes only.

## Safety — no real Steam, VAC-safe

This project **must never**:

- Call Valve Steam Web API, Steamworks, or OpenID login to Steam
- Read, write, or hook the installed Steam client, game files, or registry
- Run as an overlay, injector, or companion to real games

It only talks to **your own** Express server (`localhost:5000`) and **your own** MySQL database. You can keep the Steam client closed while developing.

The database name `steam_clone` is historical (tutorial naming) — it is **not** connected to Valve.

## Stack (same as v1 — run in VS Code terminals)

| Part | Folder | Command | URL |
|------|--------|---------|-----|
| API | `backend/` | `npm run dev` | http://localhost:5000 |
| Web app | `my-app/` | `npm start` | http://localhost:3000 |
| DB | MySQL | Create DB from `.env` | local |

## Setup

1. **MySQL** — create database (default name in `.env.example`: `steam_clone`)
2. **Backend**
   ```bash
   cd backend
   copy .env.example .env
   # Edit DB_PASSWORD and JWT_SECRET (never commit .env)
   npm install
   npm run dev
   ```
3. **Frontend**
   ```bash
   cd my-app
   copy .env.example .env
   npm install
   npm start
   ```

## Project Scorpio — playable originals

These two titles appear as **standalone products** in the Store (`project_scorpio__*` slugs):

| Store name | Slug | Play |
|------------|------|------|
| **Project Scorpio: Aim Lab** | `project_scorpio__aim_lab` | Store → Play, or `http://localhost:3000/?play=speedrun-shooter` |
| **Project Scorpio: Soccer Stadium** | `project_scorpio__soccer` | Store → Play, or `http://localhost:3000/?play=scorpio-soccer` |

## Demo gift codes

`WELCOME50` · `SCORPIO100` · `DEMO25` · `GAMER75`

## Version

- **v3.0** — modular backend, API fixes, shared frontend client, env config
- **Not affiliated with Valve or Steam**
