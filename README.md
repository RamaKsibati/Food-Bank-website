Food Donation Website
Project Overview
The Food Donation Website is a web-based application that connects food donors with recipients, helping reduce food waste and support those in need. Users can post food donations, view available posts, and reserve food through a clean and user-friendly interface.

This project uses a Node.js backend with Express.js for the API and MySQL as the database. The frontend is built using HTML, CSS, and JavaScript.

Features
Key Features
User Authentication

Secure signup and login functionality using JWT (JSON Web Tokens).
Passwords are securely hashed with bcrypt.
Post Food Donations

Authenticated users can create food donation posts with details like:
Food type
Quantity
Pickup time
Contact information
View and Reserve Food

Users can view all available food posts.
Food posts can only be reserved by the user who created them.
User Dashboard

Users can view and manage their own food posts.
Dynamic UI

A responsive interface to browse, manage, and interact with food posts.
Technologies Used
Backend:
Node.js: JavaScript runtime environment.
Express.js: Web framework for creating RESTful APIs.
MySQL: Relational database to store users and food posts.
bcryptjs: Secure password hashing.
jsonwebtoken: User authentication using JWT.
CORS: Handles cross-origin requests.
dotenv: Manages environment variables.
Frontend:
HTML, CSS, JavaScript: For the client-side interface.
Fetch API: To interact with backend endpoints.
Installation
Follow the steps to set up the project on your local machine:

Prerequisites
Make sure the following tools are installed:

Node.js (v18+)
XAMPP or MySQL server
npm (Node Package Manager)
Steps to Run Locally:
Clone the Repository

bash
Copy code
git clone https://github.com/your-repository/food-donation.git
cd food-donation
Install Dependencies Install all required packages:

bash
Copy code
npm install
Set Up MySQL Database

Start XAMPP and open phpMyAdmin.
Create a new database named food-donation.
Import the following SQL structure:
sql
Copy code
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50),
    email VARCHAR(100) UNIQUE,
    password VARCHAR(255)
);

CREATE TABLE food_posts (
    post_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    food_type VARCHAR(100),
    quantity INT,
    pickup_time DATETIME,
    contact_info VARCHAR(100),
    reserved BOOLEAN DEFAULT 0
);

CREATE TABLE reservations (
    reservation_id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT,
    user_id INT,
    reserved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
Environment Variables

Create a .env file in the project root and add your database credentials:
env
Copy code
DB_HOST=localhost
DB_USER=your-mysql-username
DB_PASSWORD=your-mysql-password
DB_NAME=food-donation
DB_PORT=3306
SECRET_KEY=your-secret-key
Run the Server Start the backend server:

bash
Copy code
npm start
The server will run at: http://localhost:3000

Run the Frontend Open index.html in your browser to interact with the application.

API Endpoints
Authentication
Method	Endpoint	Description
POST	/api/signup	User registration
POST	/api/login	User login
Food Posts
Method	Endpoint	Description
GET	/api/food_posts	Retrieve all food posts
POST	/api/food_posts	Create a new food post
PUT	/api/food_posts/:id/reserve	Reserve a food post
User Dashboard
Method	Endpoint	Description
GET	/api/user_food_posts	Retrieve user's own food posts
Directory Structure
bash
Copy code
food-donation/
│
├── frontend/
│   ├── CSS/             # Stylesheets
│   ├── img/             # Images
│   └── js/              # Frontend scripts
│       └── main.js
│   ├── index.html       # Home page
│   ├── login.html       # Login page
│   ├── signup.html      # Signup page
│   ├── dashboard.html   # User dashboard
│   └── feed.html        # Food posts feed
│
├── db.js                # MySQL database connection
├── server.js            # Backend server
├── package.json         # Project dependencies
├── .env                 # Environment variables
├── .gitignore           # Ignore node_modules and sensitive files
└── README.md            # Project documentation
Testing
Manual Testing:
Using Postman:

Test all API endpoints (e.g., /api/signup, /api/login, /api/food_posts).
Verify user authentication and food reservation logic.

Automated Testing:
Run all Mocha tests with:

```bash
npm test
```
Frontend Testing:

Use a browser to test:
User signup and login.
Creating and viewing food posts.
Reserving food posts.
Deployment
Deployment on Localhost:
Run the server using npm start.
Open the frontend files (index.html) in your browser.
Deployment to Vercel/Heroku:
Host the frontend on Vercel.
Deploy the backend to Heroku or any Node.js hosting provider.
Update the API URLs in main.js to match your backend deployment URL.
Future Improvements
Add search and filter functionality for food posts.
Notify donors via email when food is reserved.
Improve frontend UI with frameworks like Bootstrap or Tailwind CSS.
Add geolocation to locate nearby food donations.
Author
Rama Ksibati
Computer Science Student
Email: your-email@example.com

License
This project is licensed under the MIT License.

