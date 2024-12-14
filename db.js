const mysql = require('mysql2/promise');

// Print environment variables for debugging
console.log("DB_HOST:", process.env.DB_HOST);
console.log("DB_USER:", process.env.DB_USER);
console.log("DB_PASSWORD:", process.env.DB_PASSWORD);
console.log("DB_NAME:", process.env.DB_NAME);
console.log("DB_PORT:", process.env.DB_PORT);

// Create a connection pool to the PostgreSQL database
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'Rama',
    password: process.env.DB_PASSWORD || 'Ramasalah',
    database: process.env.DB_NAME || 'food-donation',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});
module.exports = pool.promise();
