// server.js

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const SECRET_KEY = "1993";
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, SECRET_KEY, (err, user) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
  });
};
app.get('/api/user_food_posts', authenticateToken, async (req, res) => {
  try {
      const [posts] = await db.query('SELECT * FROM food_posts WHERE user_id = ?', [req.user.userId]);
      res.json(posts);
  } catch (error) {
      console.error('Error fetching user food posts:', error);
      res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/api/signup', async (req, res) => {
  const { username, email, password } = req.body;

  try {
      // Query to check if the email already exists
      const [existingUser] = await db.query('SELECT * FROM users WHERE email = ?', [email]);

      if (existingUser.length > 0) {
          return res.status(400).json({ message: 'Email is already registered' });
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert the new user into the database
      const [result] = await db.query(
          'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
          [username, email, hashedPassword]
      );

      res.status(201).json({ message: 'User registered successfully', userId: result.insertId });
  } catch (error) {
      console.error('Error in /api/signup:', error);
      res.status(500).json({ message: 'Internal server error' });
  }
});




app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  try {
      // Query to find the user by email
      const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);

      if (users.length === 0) {
          return res.status(401).json({ message: 'Invalid email or password' });
      }

      const user = users[0];

      // Check if the password is valid
      const isValidPassword = await bcrypt.compare(password, user.password);

      if (!isValidPassword) {
          return res.status(401).json({ message: 'Invalid email or password' });
      }

      // Generate a JWT token
      const token = jwt.sign({ userId: user.id }, 'your_secret_key', { expiresIn: '1h' });

      res.json({ token });
  } catch (error) {
      console.error('Error in /api/login:', error);
      res.status(500).json({ message: 'Internal server error' });
  }
});



// Middleware
app.use(bodyParser.json());

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
// server.js (continued)

// Route to post new food
app.post('/api/food_posts', authenticateToken, async (req, res) => {
  const { food_type, quantity, pickup_time, contact_info } = req.body;

  const result = await db.query(
      'INSERT INTO food_posts (food_type, quantity, pickup_time, contact_info, user_id) VALUES (?, ?, ?, ?, ?)',
      [food_type, quantity, pickup_time, contact_info, req.user.userId]
  );

  res.status(201).json({ message: 'Food posted successfully', postId: result.insertId });
});

// server.js (continued)

// Route to get all food posts
app.get('/api/food_posts', (req, res) => {
    const query = 'SELECT * FROM Food_Posts WHERE reserved_status = false ORDER BY posted_at DESC';
    db.query(query, (err, results) => {
      if (err) {
        return res.status(500).send('Error retrieving food posts');
      }
      res.status(200).json(results);
    });
  });
// server.js (continued)

// Route to reserve food
app.put('/api/food_posts/:id/reserve', authenticateToken, async (req, res) => {
  const { id } = req.params;

  const post = await db.query('SELECT * FROM food_posts WHERE post_id = ?', [id]);
  if (post.length === 0 || post[0].user_id !== req.user.userId) {
      return res.status(403).json({ message: 'You are not authorized to reserve this food post' });
  }

  await db.query('UPDATE food_posts SET reserved = TRUE WHERE post_id = ?', [id]);
  res.json({ message: 'Food reserved successfully' });
});

  