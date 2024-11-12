// server.js

const express = require('express');
const bodyParser = require('body-parser');
const db = require('./db');

const app = express();

// Middleware
app.use(bodyParser.json());

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
// server.js (continued)

// Route to post new food
app.post('/api/food_posts', (req, res) => {
    const { restaurant_id, food_type, quantity, pickup_time } = req.body;
  
    const query = 'INSERT INTO Food_Posts (restaurant_id, food_type, quantity, pickup_time, reserved_status) VALUES (?, ?, ?, ?, false)';
    db.query(query, [restaurant_id, food_type, quantity, pickup_time], (err, result) => {
      if (err) {
        console.error('Error saving food post:', err);
        return res.status(500).send('Error saving food post');
      }
      res.status(201).send('Food post created successfully');
    });
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
app.put('/api/food_posts/:post_id/reserve', (req, res) => {
    const post_id = req.params.post_id;
    const { user_name, contact_info } = req.body;
  
    const reserveQuery = 'UPDATE Food_Posts SET reserved_status = true WHERE post_id = ?';
    const reservationQuery = 'INSERT INTO Reservations (post_id, user_name, contact_info, reserved_at) VALUES (?, ?, ?, NOW())';
  
    db.query(reserveQuery, [post_id], (err) => {
      if (err) {
        return res.status(500).send('Error reserving food post');
      }
      db.query(reservationQuery, [post_id, user_name, contact_info], (err) => {
        if (err) {
          return res.status(500).send('Error creating reservation');
        }
        res.status(200).send('Food reserved successfully');
      });
    });
  });
  