const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const http = require('http'); 
const { Server } = require('socket.io'); 

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

app.use(express.json());
app.use(cors());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

if (!fs.existsSync('./uploads')) fs.mkdirSync('./uploads');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'qaiser', 
    database: 'steam_clone'
});

db.connect((err) => {
    if (err) console.error('MySQL Error: ' + err.stack);
});

// SOCKET.IO: REAL-TIME, ONLINE STATUS & PERMANENT CHAT
let usersOnline = {}; 
io.on('connection', (socket) => {
    socket.on('user_online', (userId) => {
        usersOnline[userId] = socket.id;
        io.emit('get_online_users', Object.keys(usersOnline));
    });

    socket.on('join_chat', (roomId) => socket.join(roomId));

    socket.on('send_message', (data) => {
        const { room, author, text, receiverId, senderId } = data;
        
        // 1. Save to Database
        const sql = "INSERT INTO messages (room_id, sender_id, receiver_id, message_text) VALUES (?, ?, ?, ?)";
        db.query(sql, [room, senderId, receiverId, text], (err) => {
            if (err) console.error("DB Error saving msg:", err);

            // 2. Prepare real-time payload with timestamp
            const messageWithTime = { 
                ...data, 
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
            };

            // 3. Emit to room and notification
            io.to(room).emit('receive_message', messageWithTime);
            io.emit('new_msg_notification', { to: receiverId, from: author });
        });
    });

    socket.on('disconnect', () => {
        for (let id in usersOnline) {
            if (usersOnline[id] === socket.id) { delete usersOnline[id]; break; }
        }
        io.emit('get_online_users', Object.keys(usersOnline));
    });
});

const upload = multer({ storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
})});

// --- NEW: FETCH CHAT HISTORY ---
app.get('/messages/:roomId', (req, res) => {
    const sql = `SELECT m.*, u.username as author 
                 FROM messages m 
                 JOIN users u ON m.sender_id = u.id 
                 WHERE room_id = ? ORDER BY sent_at ASC`;
    db.query(sql, [req.params.roomId], (err, results) => {
        if (err) return res.status(500).send(err);
        const formatted = results.map(msg => ({
            ...msg,
            text: msg.message_text,
            time: new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }));
        res.json(formatted);
    });
});

// --- AUTH & RESET ---
app.post('/register', async (req, res) => {
    const { username, email, password, securityAnswer } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    db.query('INSERT INTO users (username, email, password, security_answer) VALUES (?, ?, ?, ?)', [username, email, hashed, securityAnswer], (err) => {
        if (err) return res.status(500).send("User exists.");
        res.status(201).send("Created.");
    });
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
        if (results.length > 0) {
            if (await bcrypt.compare(password, results[0].password)) {
                res.json({ id: results[0].id, username: results[0].username, balance: results[0].balance, profile_pic: results[0].profile_pic, email: results[0].email });
            } else res.status(401).send("Wrong password.");
        } else res.status(404).send("Not found.");
    });
});

app.post('/reset-password', (req, res) => {
    const { email, securityAnswer, newPassword } = req.body;
    db.query('SELECT * FROM users WHERE email = ? AND security_answer = ?', [email, securityAnswer], async (err, results) => {
        if (results.length === 0) return res.status(401).send("Invalid details.");
        const hashed = await bcrypt.hash(newPassword, 10);
        db.query('UPDATE users SET password = ? WHERE email = ?', [hashed, email], () => res.send("Success."));
    });
});

// --- STORE & WALLET ---
app.get('/library/:userId', (req, res) => {
    db.query('SELECT game_name FROM library WHERE user_id = ?', [req.params.userId], (err, results) => res.json(results));
});

app.post('/purchase', (req, res) => {
    const { userId, gameName, price } = req.body;
    db.query('SELECT balance FROM users WHERE id = ?', [userId], (err, results) => {
        const currentBal = parseFloat(results[0].balance);
        if (currentBal >= price) {
            const newBalance = currentBal - price;
            // Update Database
            db.query('UPDATE users SET balance = ? WHERE id = ?', [newBalance, userId]);
            db.query('INSERT INTO library (user_id, game_name) VALUES (?, ?)', [userId, gameName]);
            
            // Send new balance back to React
            res.json({ success: true, newBalance: newBalance }); 
        } else {
            res.status(400).send("Insufficient funds.");
        }
    });
});

app.post('/redeem-code', (req, res) => {
    const { userId, code } = req.body;
    db.query('SELECT * FROM gift_cards WHERE code = ?', [code], (err, results) => {
        if (results.length === 0) return res.status(404).send("Invalid code.");
        if (results[0].is_used) return res.status(400).send("Already used.");
        
        const amountToAdd = parseFloat(results[0].amount);

        db.query('UPDATE gift_cards SET is_used = 1, used_by = ? WHERE id = ?', [userId, results[0].id], (err) => {
            if (err) return res.status(500).send("Database error.");
            
            db.query('UPDATE users SET balance = balance + ? WHERE id = ?', [amountToAdd, userId], (err) => {
                if (err) return res.status(500).send("Balance update failed.");
                
                // SEND JSON BACK TO REACT
                res.json({ success: true, amountAdded: amountToAdd });
            });
        });
    });
});
// --- FRIENDS ---
app.post('/add-friend', (req, res) => {
    const { userId, friendUsername } = req.body;
    db.query('SELECT id FROM users WHERE username = ?', [friendUsername], (err, results) => {
        if (results.length === 0) return res.status(404).send("User not found.");
        const fId = results[0].id;
        if (fId == userId) return res.status(400).send("Can't add self.");
        db.query('SELECT * FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)', [userId, fId, fId, userId], (err, ex) => {
            if (ex.length > 0) return res.status(400).send("Already exists.");
            db.query('INSERT INTO friends (user_id, friend_id, status) VALUES (?, ?, "pending")', [userId, fId], () => res.send("Sent."));
        });
    });
});

app.get('/friends/:userId', (req, res) => {
    const sql = `SELECT u.id, u.username, u.profile_pic FROM friends f JOIN users u ON (f.friend_id = u.id OR f.user_id = u.id) 
                 WHERE (f.user_id = ? OR f.friend_id = ?) AND f.status = 'accepted' AND u.id <> ?`;
    db.query(sql, [req.params.userId, req.params.userId, req.params.userId], (err, results) => res.json(results));
});

app.get('/friend-requests/:userId', (req, res) => {
    const sql = `SELECT f.id as requestId, u.username FROM users u JOIN friends f ON f.user_id = u.id WHERE f.friend_id = ? AND f.status = 'pending'`;
    db.query(sql, [req.params.userId], (err, reslt) => res.json(reslt));
});

app.post('/accept-friend', (req, res) => {
    db.query('UPDATE friends SET status = "accepted" WHERE id = ?', [req.body.requestId], () => res.send("Done."));
});

// --- PROFILE ACTIONS ---
app.post('/update-avatar', upload.single('avatar'), (req, res) => {
    const url = `http://localhost:5000/uploads/${req.file.filename}`;
    db.query('UPDATE users SET profile_pic = ? WHERE id = ?', [url, req.body.userId], () => res.json({ imageUrl: url }));
});

app.post('/remove-avatar', (req, res) => {
    db.query('SELECT profile_pic FROM users WHERE id = ?', [req.body.userId], (err, results) => {
        if (results[0]?.profile_pic) {
            const f = path.join(__dirname, 'uploads', results[0].profile_pic.split('/').pop());
            if (fs.existsSync(f)) fs.unlinkSync(f);
            db.query('UPDATE users SET profile_pic = NULL WHERE id = ?', [req.body.userId], () => res.send("Removed."));
        } else res.status(404).send("No pic.");
    });
});

app.post('/update-password', async (req, res) => {
    const hashed = await bcrypt.hash(req.body.newPassword, 10);
    db.query('UPDATE users SET password = ? WHERE id = ?', [hashed, req.body.userId], () => res.send("Changed."));
});

server.listen(5000, () => console.log("Server running with History & Timestamps"));