# Scorpio backend — integration policy

**Do not add** Steam Web API, Steam OpenID, Steamworks, or any client that touches the user's installed Steam application.

Allowed: HTTP routes served by this Express app, MySQL, JWT auth, Socket.io chat, local file uploads in `uploads/`.
