const mysql = require('mysql2');
const config = require('./config');

const db = mysql.createConnection(config.db);

const TABLE_QUERIES = [
  `CREATE TABLE IF NOT EXISTS users (
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
  )`,
  `CREATE TABLE IF NOT EXISTS library (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    game_name VARCHAR(200) NOT NULL,
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    playtime_minutes INT DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS friends (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    friend_id INT NOT NULL,
    status ENUM('pending','accepted') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (friend_id) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_id VARCHAR(100) NOT NULL,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    message_text TEXT NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_read TINYINT DEFAULT 0,
    FOREIGN KEY (sender_id) REFERENCES users(id),
    FOREIGN KEY (receiver_id) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS gift_cards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    is_used TINYINT DEFAULT 0,
    used_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    game_name VARCHAR(200) NOT NULL,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_review (user_id, game_name),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS wishlist (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    game_name VARCHAR(200) NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_wishlist (user_id, game_name),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS achievements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    achievement_key VARCHAR(100) NOT NULL,
    achievement_name VARCHAR(200) NOT NULL,
    description TEXT,
    icon VARCHAR(10),
    unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_achievement (user_id, achievement_key),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT,
    is_read TINYINT DEFAULT 0,
    related_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`,
];

const GIFT_CARD_SEEDS = [
  { code: 'WELCOME50', amount: 50 },
  { code: 'SCORPIO100', amount: 100 },
  { code: 'DEMO25', amount: 25 },
  { code: 'GAMER75', amount: 75 },
];

const ACHIEVEMENTS_DEF = [
  { key: 'first_purchase', name: 'First Buy', description: 'Purchased your first game', icon: '\uD83C\uDFAE' },
  { key: 'collector_5', name: 'Collector', description: 'Own 5 or more games', icon: '\uD83D\uDCDA' },
  { key: 'social_butterfly', name: 'Social Butterfly', description: 'Accepted your first friend', icon: '\uD83E\uDD8B' },
  { key: 'reviewer', name: 'Critic', description: 'Wrote your first review', icon: '\u270D\uFE0F' },
  { key: 'wishlist_10', name: 'Dream Big', description: 'Added 10 games to wishlist', icon: '\u2B50' },
  { key: 'wallet_100', name: 'High Roller', description: 'Wallet balance reached $100', icon: '\uD83D\uDCB0' },
  { key: 'chat_master', name: 'Chatterbox', description: 'Sent 50 messages', icon: '\uD83D\uDCAC' },
  { key: 'veteran', name: 'Veteran', description: 'Member for over 30 days', icon: '\uD83C\uDFC5' },
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

/** Add columns that older DBs created before v3 schema (CREATE TABLE IF NOT EXISTS does not alter). */
const SCHEMA_MIGRATIONS = [
  { table: 'users', column: 'bio', sql: 'ALTER TABLE users ADD COLUMN bio TEXT' },
  { table: 'users', column: 'theme', sql: "ALTER TABLE users ADD COLUMN theme VARCHAR(10) DEFAULT 'dark'" },
  { table: 'users', column: 'created_at', sql: 'ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP' },
  { table: 'library', column: 'purchased_at', sql: 'ALTER TABLE library ADD COLUMN purchased_at TIMESTAMP NULL' },
  { table: 'library', column: 'playtime_minutes', sql: 'ALTER TABLE library ADD COLUMN playtime_minutes INT DEFAULT 0' },
  { table: 'friends', column: 'created_at', sql: 'ALTER TABLE friends ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP' },
];

function columnExists(table, column, cb) {
  db.query(
    `SELECT COUNT(*) AS c FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column],
    (err, rows) => {
      if (err) return cb(err, false);
      cb(null, Number(rows[0].c) > 0);
    }
  );
}

function backfillLibraryPurchasedAt(done) {
  columnExists('library', 'purchase_date', (err, hasLegacy) => {
    if (err || !hasLegacy) return done?.();
    columnExists('library', 'purchased_at', (err2, hasNew) => {
      if (err2 || !hasNew) return done?.();
      db.query(
        'UPDATE library SET purchased_at = purchase_date WHERE purchased_at IS NULL AND purchase_date IS NOT NULL',
        (updateErr) => {
          if (updateErr) console.error('Library date backfill:', updateErr.message);
          else console.log('Backfilled library.purchased_at from purchase_date');
          done?.();
        }
      );
    });
  });
}

function migrateSchema(done) {
  let pending = SCHEMA_MIGRATIONS.length;
  if (pending === 0) return backfillLibraryPurchasedAt(done);

  SCHEMA_MIGRATIONS.forEach(({ table, column, sql }) => {
    columnExists(table, column, (err, exists) => {
      if (err) console.error('Schema check error:', err.message);
      else if (!exists) {
        db.query(sql, (alterErr) => {
          if (alterErr) console.error(`Migration ${table}.${column}:`, alterErr.message);
          else console.log(`Migrated ${table}.${column}`);
        });
      }
      pending -= 1;
      if (pending === 0) backfillLibraryPurchasedAt(done);
    });
  });
}

function initializeDatabase() {
  TABLE_QUERIES.forEach((q) => {
    db.query(q, (err) => {
      if (err) console.error('Table init error:', err.message);
    });
  });
  migrateSchema(() => {
    seedGiftCards();
    console.log('Database tables initialized.');
  });
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
        [userId, `Achievement Unlocked: ${def.name}`, `${def.icon} ${def.description}`]
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
