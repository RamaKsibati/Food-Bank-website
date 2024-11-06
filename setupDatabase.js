// setupDatabase.js
const connection = require('./db');

// Function to create Restaurants table
const createRestaurantsTable = `
  CREATE TABLE IF NOT EXISTS Restaurants (
    restaurant_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    contact_info VARCHAR(100),
    address VARCHAR(255)
  );
`;

// Function to create Food_Posts table
const createFoodPostsTable = `
  CREATE TABLE IF NOT EXISTS Food_Posts (
    post_id INT AUTO_INCREMENT PRIMARY KEY,
    restaurant_id INT,
    food_type VARCHAR(100) NOT NULL,
    quantity INT NOT NULL,
    pickup_time DATETIME NOT NULL,
    posted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reserved_status BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (restaurant_id) REFERENCES Restaurants(restaurant_id) ON DELETE CASCADE
  );
`;

// Function to create Reservations table
const createReservationsTable = `
  CREATE TABLE IF NOT EXISTS Reservations (
    reservation_id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT,
    user_name VARCHAR(100),
    contact_info VARCHAR(100),
    reserved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES Food_Posts(post_id) ON DELETE CASCADE
  );
`;

// Execute table creation queries one by one with specific error handling
connection.query(createRestaurantsTable, (err) => {
  if (err) {
    console.error('Error creating Restaurants table:', err);
    return;
  }
  console.log('Restaurants table created successfully');

  connection.query(createFoodPostsTable, (err) => {
    if (err) {
      console.error('Error creating Food_Posts table:', err);
      return;
    }
    console.log('Food_Posts table created successfully');

    connection.query(createReservationsTable, (err) => {
      if (err) {
        console.error('Error creating Reservations table:', err);
        return;
      }
      console.log('Reservations table created successfully');
      connection.end(); // Close the database connection
    });
  });
});
