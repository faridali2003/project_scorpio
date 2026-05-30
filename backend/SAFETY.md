# Scorpio backend — integration policy

**Do not add** Steam Web API, Steam OpenID, Steamworks, or any client that touches the user's installed Steam application.

Allowed: HTTP routes served by this Express app, MySQL, JWT auth, Socket.io chat, local file uploads in `uploads/`.

## Public repo checklist

- Copy `backend/.env.example` → `backend/.env` locally; **never commit** `.env`.
- Set `DB_PASSWORD` and `JWT_SECRET` in `.env` (no defaults in source code).
- Profile uploads live in `backend/uploads/` and are gitignored — they stay on your machine only.
- Do not expose this backend to the public internet without hardening (HTTPS, strong secrets, rate limits).
