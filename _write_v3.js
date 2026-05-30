const fs = require('fs');
const path = require('path');
const root = 'C:\\Users\\ASUS\\Documents\\project_scorpio';

function w(rel, content) {
  const p = path.join(root, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content, 'utf8');
  console.log('WROTE', rel);
}

w('backend/config.js', `require('dotenv').config();
module.exports = {
  port: Number(process.env.PORT) || 5000,
  jwtSecret: process.env.JWT_SECRET || 'scorpio_v3_dev_secret_change_in_production',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
  publicUrl: process.env.PUBLIC_URL || \`http://localhost:\${Number(process.env.PORT) || 5000}\`,
  db: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'qaiser',
    database: process.env.DB_NAME || 'steam_clone',
  },
};
`);

w('backend/.env.example', `PORT=5000
JWT_SECRET=change_me
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=steam_clone
CLIENT_ORIGIN=http://localhost:3000
PUBLIC_URL=http://localhost:5000
`);

w('backend/middleware.js', `const jwt = require('jsonwebtoken');
const config = require('./config');

function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = jwt.verify(token, config.jwtSecret);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

function authorizeSelf(req, res, next) {
  const targetId = req.params.userId;
  if (targetId != null && String(req.user.id) !== String(targetId)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

module.exports = { authenticate, authorizeSelf };
`);

const databaseJs = `const mysql = require('mysql2');
const config = require('./config');

const db = mysql.createConnection(config.db);

const TABLE_QUERIES = [
  \`CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    security_answer VARCHAR(255),
    balance DECIMAL(10,2) DEFAULT 0.00,
    profile_pic VARCHAR(500),
    bio TEXT,
    theme VARCHAR(10) DEFAULT 'dark',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )\`,
  \`CREATE TABLE IF NOT EXISTS library (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    game_name VARCHAR(200) NOT NULL,
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    playtime_minutes INT DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )\`,
  \`CREATE TABLE IF NOT EXISTS friends (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    friend_id INT NOT NULL,
    status ENUM('pending','accepted') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (friend_id) REFERENCES users(id)
  )\`,
  \`CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_id VARCHAR(100) NOT NULL,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    message_text TEXT NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_read TINYINT DEFAULT 0,
    FOREIGN KEY (sender_id) REFERENCES users(id),
    FOREIGN KEY (receiver_id) REFERENCES users(id)
  )\`,
  \`CREATE TABLE IF NOT EXISTS gift_cards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    is_used TINYINT DEFAULT 0,
    used_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )\`,
  \`CREATE TABLE IF NOT EXISTS reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    game_name VARCHAR(200) NOT NULL,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_review (user_id, game_name),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )\`,
  \`CREATE TABLE IF NOT EXISTS wishlist (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    game_name VARCHAR(200) NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_wishlist (user_id, game_name),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )\`,
  \`CREATE TABLE IF NOT EXISTS achievements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    achievement_key VARCHAR(100) NOT NULL,
    achievement_name VARCHAR(200) NOT NULL,
    description TEXT,
    icon VARCHAR(10),
    unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_achievement (user_id, achievement_key),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )\`,
  \`CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT,
    is_read TINYINT DEFAULT 0,
    related_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )\`,
];

const GIFT_CARD_SEEDS = [
  { code: 'WELCOME50', amount: 50 },
  { code: 'SCORPIO100', amount: 100 },
  { code: 'DEMO25', amount: 25 },
  { code: 'GAMER75', amount: 75 },
];

const ACHIEVEMENTS_DEF = [
  { key: 'first_purchase', name: 'First Buy', description: 'Purchased your first game', icon: '🎮' },
  { key: 'collector_5', name: 'Collector', description: 'Own 5 or more games', icon: '📚' },
  { key: 'social_butterfly', name: 'Social Butterfly', description: 'Accepted your first friend', icon: '🦋' },
  { key: 'reviewer', name: 'Critic', description: 'Wrote your first review', icon: '✍️' },
  { key: 'wishlist_10', name: 'Dream Big', description: 'Added 10 games to wishlist', icon: '⭐' },
  { key: 'wallet_100', name: 'High Roller', description: 'Wallet balance reached $100', icon: '💰' },
  { key: 'chat_master', name: 'Chatterbox', description: 'Sent 50 messages', icon: '💬' },
  { key: 'veteran', name: 'Veteran', description: 'Member for over 30 days', icon: '🏅' },
];

function seedGiftCards() {
  GIFT_CARD_SEEDS.forEach(({ code, amount }) => {
    db.query(
      'INSERT IGNORE INTO gift_cards (code, amount) VALUES (?, ?)',
      [code, amount],
      (err) => { if (err) console.error('Gift card seed error:', err.message); }
    );
  });
}

function initializeDatabase() {
  TABLE_QUERIES.forEach((q) => {
    db.query(q, (err) => {
      if (err) console.error('Table init error:', err.message);
    });
  });
  seedGiftCards();
  console.log('Database tables initialized.');
}

function checkAndGrantAchievement(userId, key) {
  const def = ACHIEVEMENTS_DEF.find((a) => a.key === key);
  if (!def) return;
  const sql =
    'INSERT IGNORE INTO achievements (user_id, achievement_key, achievement_name, description, icon) VALUES (?, ?, ?, ?, ?)';
  db.query(sql, [userId, def.key, def.name, def.description, def.icon], (err, result) => {
    if (!err && result.affectedRows > 0) {
      db.query(
        'INSERT INTO notifications (user_id, type, title, message) VALUES (?, "achievement", ?, ?)',
        [userId, \`Achievement Unlocked: \${def.name}\`, \`\${def.icon} \${def.description}\`]
      );
    }
  });
}

function connectDatabase(onReady) {
  db.connect((err) => {
    if (err) {
      console.error('MySQL Error: ' + err.stack);
      return;
    }
    console.log('MySQL connected.');
    initializeDatabase();
    if (typeof onReady === 'function') onReady();
  });
}

module.exports = {
  db,
  TABLE_QUERIES,
  GIFT_CARD_SEEDS,
  ACHIEVEMENTS_DEF,
  initializeDatabase,
  checkAndGrantAchievement,
  connectDatabase,
};
`;
w('backend/database.js', databaseJs);

w('my-app/src/api/client.js', `const BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export async function api(path, options = {}) {
  const token = localStorage.getItem('scorpio_token');
  const res = await fetch(\`\${BASE}\${path}\`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: \`Bearer \${token}\` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data, status: res.status };
}

export { BASE };
`);

w('my-app/src/data/games.js', `export const GAMES = [
  { name: 'Cyberpunk 2077', price: 60, image: '/cyberpunk.jpg', genre: 'RPG', tags: ['RPG', 'Open World'] },
  { name: 'The Witcher 3', price: 40, image: '/witcher.jpg', genre: 'RPG', tags: ['RPG', 'Story-Rich'] },
  { name: 'Elden Ring', price: 55, image: '/elden.jpg', genre: 'Action', tags: ['Action', 'Souls-like'] },
  { name: 'Ghost of Tsushima', price: 50, image: '/ghost.jpg', genre: 'Action', tags: ['Action', 'Open World'] },
  { name: 'Hollow Knight', price: 15, image: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=400&h=225&fit=crop', genre: 'Indie', tags: ['Indie', 'Platformer'] },
  { name: 'Hades', price: 25, image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&h=225&fit=crop', genre: 'Roguelike', tags: ['Roguelike', 'Action'] },
  { name: 'Red Dead Redemption 2', price: 45, image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&h=225&fit=crop', genre: 'Action', tags: ['Open World', 'Story-Rich'] },
  { name: 'Disco Elysium', price: 30, image: 'https://images.unsplash.com/photo-1493711662062-fa541f87e26e?w=400&h=225&fit=crop', genre: 'RPG', tags: ['RPG', 'Detective'] },
];
`);

w('my-app/.env.example', 'REACT_APP_API_URL=http://localhost:5000\n');

console.log('done batch 1');
