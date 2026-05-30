require('dotenv').config();
module.exports = {
  port: Number(process.env.PORT) || 5000,
  jwtSecret: process.env.JWT_SECRET || 'scorpio_v3_dev_secret_change_in_production',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
  publicUrl: process.env.PUBLIC_URL || `http://localhost:${Number(process.env.PORT) || 5000}`,
  db: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'qaiser',
    database: process.env.DB_NAME || 'steam_clone',
  },
};
