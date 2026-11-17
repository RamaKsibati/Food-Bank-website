require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be set to a random secret at least 32 characters long');
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '20kb' }));

const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET;
const validId = value => /^\d+$/.test(String(value)) && Number.isSafeInteger(Number(value)) && Number(value) > 0;
const validText = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max;

function authenticateToken(req, res, next) {
  const match = /^Bearer (.+)$/i.exec(req.get('authorization') || '');
  if (!match) return res.status(401).json({ message: 'Authentication required' });
  try {
    const claims = jwt.verify(match[1], JWT_SECRET, { algorithms: ['HS256'] });
    if (!validId(claims.userId)) return res.status(401).json({ message: 'Invalid token' });
    req.user = { userId: Number(claims.userId) };
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

app.post('/api/signup', async (req, res) => {
  const { username, email, password } = req.body || {};
  if (!validText(username, 50) || !validText(email, 100) ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      typeof password !== 'string' || password.length < 8 || password.length > 128) {
    return res.status(400).json({ message: 'Provide a username, valid email and password of 8–128 characters' });
  }
  const normalizedEmail = email.trim().toLowerCase();
  try {
    const hash = await bcrypt.hash(password, 12);
    const [result] = await db.query(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username.trim(), normalizedEmail, hash]
    );
    return res.status(201).json({ message: 'Account created', userId: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Email already registered' });
    console.error('Signup failed:', err.code || err.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!validText(email, 100) || typeof password !== 'string') {
    return res.status(400).json({ message: 'Email and password required' });
  }
  try {
    const [users] = await db.query(
      'SELECT user_id, password FROM users WHERE email = ?', [email.trim().toLowerCase()]
    );
    const user = users[0];
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    const token = jwt.sign({ userId: user.user_id }, JWT_SECRET, {
      algorithm: 'HS256', expiresIn: '1h'
    });
    return res.json({ token });
  } catch (err) {
    console.error('Login failed:', err.code || err.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/api/user_food_posts', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT post_id, food_type, quantity, pickup_time, contact_info, reserved FROM food_posts WHERE user_id = ? ORDER BY pickup_time',
      [req.user.userId]
    );
    return res.json(rows);
  } catch (err) {
    console.error('Listing owned posts failed:', err.code || err.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/api/food_posts', authenticateToken, async (req, res) => {
  const { food_type, quantity, pickup_time, contact_info } = req.body || {};
  if (!validText(food_type, 100) || !Number.isInteger(Number(quantity)) ||
      Number(quantity) <= 0 || Number(quantity) > 100000 ||
      !validText(pickup_time, 35) || !Number.isFinite(Date.parse(pickup_time)) ||
      !validText(contact_info, 100)) {
    return res.status(400).json({ message: 'Valid food type, quantity, pickup time and contact are required' });
  }
  try {
    const [result] = await db.query(
      'INSERT INTO food_posts (food_type, quantity, pickup_time, contact_info, user_id) VALUES (?, ?, ?, ?, ?)',
      [food_type.trim(), Number(quantity), pickup_time, contact_info.trim(), req.user.userId]
    );
    return res.status(201).json({ message: 'Food posted', postId: result.insertId });
  } catch (err) {
    console.error('Post creation failed:', err.code || err.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/api/food_posts', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT post_id, food_type, quantity, pickup_time, reserved FROM food_posts WHERE reserved = FALSE ORDER BY pickup_time'
    );
    return res.json(rows);
  } catch (err) {
    console.error('Listing food failed:', err.code || err.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Atomic update prevents two recipients from reserving the same listing.
// Owners cannot reserve their own listings.
async function reserveFood(req, res) {
  const id = req.params.id;
  if (!validId(id)) return res.status(400).json({ message: 'Invalid post ID' });
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();
    const [posts] = await connection.query(
      'SELECT post_id, user_id, reserved FROM food_posts WHERE post_id = ? FOR UPDATE', [id]
    );
    if (!posts.length) {
      await connection.rollback();
      return res.status(404).json({ message: 'Food post not found' });
    }
    if (Number(posts[0].user_id) === req.user.userId) {
      await connection.rollback();
      return res.status(403).json({ message: 'You cannot reserve your own post' });
    }
    if (posts[0].reserved) {
      await connection.rollback();
      return res.status(409).json({ message: 'This food has already been reserved' });
    }
    await connection.query('UPDATE food_posts SET reserved = TRUE WHERE post_id = ?', [id]);
    await connection.query(
      'INSERT INTO reservations (post_id, user_id) VALUES (?, ?)', [id, req.user.userId]
    );
    await connection.commit();
    return res.json({ message: 'Food reserved successfully', postId: Number(id) });
  } catch (err) {
    if (connection) await connection.rollback().catch(() => {});
    console.error('Reservation failed:', err.code || err.message);
    return res.status(500).json({ message: 'Internal server error' });
  } finally {
    if (connection) connection.release();
  }
}

app.put('/api/food_posts/:id/reserved', authenticateToken, reserveFood);
app.put('/api/food_posts/:id/reserve', authenticateToken, reserveFood);

if (require.main === module) {
  app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
}
module.exports = app;
