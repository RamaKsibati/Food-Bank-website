require('dotenv').config();
const pool = require('./db');

const statements = [
  `CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS food_posts (
    post_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    food_type VARCHAR(100) NOT NULL,
    quantity INT NOT NULL,
    pickup_time DATETIME NOT NULL,
    contact_info VARCHAR(100) NOT NULL,
    reserved BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_food_owner FOREIGN KEY (user_id) REFERENCES users(user_id)
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS reservations (
    reservation_id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL UNIQUE,
    user_id INT NOT NULL,
    reserved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_reservation_post FOREIGN KEY (post_id) REFERENCES food_posts(post_id),
    CONSTRAINT fk_reservation_user FOREIGN KEY (user_id) REFERENCES users(user_id)
  ) ENGINE=InnoDB`
];

async function main() {
  try {
    for (const sql of statements) await pool.query(sql);
    console.log('Database tables are ready.');
  } finally {
    await pool.end();
  }
}
main().catch(err => {
  console.error('Database setup failed:', err.code || err.message);
  process.exitCode = 1;
});
