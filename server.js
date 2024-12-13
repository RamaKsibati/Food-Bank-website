// server.js

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db'); // Make sure `db.js` is updated for PostgreSQL

const app = express();

// Middleware
app.use(cors({
    origin: 'https://damp-gorge-80419.herokuapp.com', // Replace '*' with your frontend URL for production (e.g., 'https://damp-gorge-80419.herokuapp.com')
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
app.use(bodyParser.json());
app.use(express.json());

// Constants
const SECRET_KEY = process.env.SECRET_KEY || '1993'; // Use environment variable for Heroku
const PORT = process.env.PORT || 3000;

const path = require('path');

// Serve static files (if you have a front-end build)
app.use(express.static(path.join(__dirname, 'frontend')));

// Root route handler
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Authentication Middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Extract token

    if (!token) return res.status(403).send('Access denied. No token provided.');

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).send('Invalid or expired token.');
        req.user = user; // Attach user info to request
        next();
    });
}

// Routes
// Route: Signup
app.post('/api/signup', async (req, res) => {
    const { username, email, password } = req.body;

    try {
        // Check if email already exists
        const existingUserQuery = 'SELECT * FROM users WHERE email = $1';
        const { rows: existingUser } = await db.query(existingUserQuery, [email]);

        if (existingUser.length > 0) {
            return res.status(400).json({ message: 'Email is already registered' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert new user
        const insertUserQuery = 'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING user_id';
        const { rows } = await db.query(insertUserQuery, [username, email, hashedPassword]);

        res.status(201).json({ message: 'User registered successfully', userId: rows[0].user_id });
    } catch (error) {
        console.error('Error in /api/signup:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Route: Login
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Find user by email
        const { rows: users } = await db.query('SELECT * FROM users WHERE email = $1', [email]);

        if (users.length === 0) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const user = users[0];

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Generate JWT token
        const token = jwt.sign({ userId: user.user_id }, SECRET_KEY, { expiresIn: '1h' });

        res.json({ token });
    } catch (error) {
        console.error('Error in /api/login:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Route: Get User Food Posts
app.get('/api/user_food_posts', authenticateToken, async (req, res) => {
    try {
        const { rows: posts } = await db.query('SELECT * FROM food_posts WHERE user_id = $1', [req.user.userId]);
        res.json(posts);
    } catch (error) {
        console.error('Error fetching user food posts:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Route: Post New Food
app.post('/api/food_posts', authenticateToken, async (req, res) => {
    const { food_type, quantity, pickup_time, contact_info } = req.body;

    try {
        const insertFoodQuery = `
            INSERT INTO food_posts (food_type, quantity, pickup_time, contact_info, user_id)
            VALUES ($1, $2, $3, $4, $5) RETURNING post_id
        `;
        const { rows } = await db.query(insertFoodQuery, [food_type, quantity, pickup_time, contact_info, req.user.userId]);

        res.status(201).json({ message: 'Food posted successfully', postId: rows[0].post_id });
    } catch (error) {
        console.error('Error posting new food:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Route: Get All Food Posts
app.get('/api/food_posts', async (req, res) => {
    try {
        const { rows: posts } = await db.query('SELECT * FROM food_posts');
        res.json(posts);
    } catch (error) {
        console.error('Error fetching food posts:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Route: Reserve Food
app.put('/api/food_posts/:id/reserve', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        const postQuery = 'SELECT * FROM food_posts WHERE post_id = $1';
        const { rows: post } = await db.query(postQuery, [id]);

        if (post.length === 0) {
            return res.status(404).json({ message: 'Food post not found' });
        }

        const updateQuery = 'UPDATE food_posts SET reserved = TRUE WHERE post_id = $1';
        await db.query(updateQuery, [id]);

        res.json({ message: 'Food reserved successfully' });
    } catch (error) {
        console.error('Error in reserve API:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'frontend', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
