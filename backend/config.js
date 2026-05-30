require('dotenv').config();

const dbPassword = process.env.DB_PASSWORD ?? '';
const jwtSecret = process.env.JWT_SECRET ?? '';

if (!dbPassword || !jwtSecret) {
  console.warn(
    '[Scorpio] Missing DB_PASSWORD or JWT_SECRET. Copy backend/.env.example to backend/.env and set both values.'
  );
}

module.exports = {
  port: Number(process.env.PORT) || 5000,
  jwtSecret: jwtSecret || 'local-dev-only-set-JWT_SECRET-in-env',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
  publicUrl: process.env.PUBLIC_URL || `http://localhost:${Number(process.env.PORT) || 5000}`,
  db: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: dbPassword,
    database: process.env.DB_NAME || 'steam_clone',
  },
};
