// Base URL for API calls
const BASE_URL = "https://damp-gorge-80419.herokuapp.com";

// Logout Function
function logout() {
    localStorage.removeItem('token'); // Remove the authentication token
    alert('You have been logged out.');
    window.location.href = 'index.html'; // Redirect to the home page
}

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', () => {
    setupSignupForm();
    setupLoginForm();
    setupFoodPostForm();

    const token = localStorage.getItem('token');
    const dashboardLink = document.getElementById('Dashboard');

    // Show dashboard link only if the user is authenticated
    if (token && dashboardLink) {
        dashboardLink.style.display = 'block';
    }

    if (window.location.pathname.includes('dashboared.html')) {
        loadUserFoodPosts();
    }
    if (window.location.pathname.includes('index.html')) {
        loadFeaturedFood();
    }

    loadFoodPosts();
});

// Load User Food Posts
async function loadUserFoodPosts() {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('You must be logged in to access this page.');
        window.location.href = 'login.html'; 
        return;
    }

    try {
        const response = await fetch(`${BASE_URL}/api/user_food_posts`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });

        if (response.ok) {
            const foodPosts = await response.json();
            const feedSection = document.getElementById('food-feed');
            if (feedSection) {
                feedSection.innerHTML = ''; // Clear existing content
                foodPosts.forEach(post => {
                    const postElement = document.createElement('div');
                    postElement.classList.add('food-post');
                    postElement.innerHTML = `
                        <h3>${post.food_type}</h3>
                        <p>Quantity: ${post.quantity}</p>
                        <p>Pickup Time: ${new Date(post.pickup_time).toLocaleString()}</p>
                        <p>Contact: ${post.contact_info}</p>
                    `;
                    feedSection.appendChild(postElement);
                });
            } else {
                console.error('Element with id "food-feed" not found.');
            }
        } else {
            console.error('Error fetching user food posts:', await response.text());
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// Setup Signup Form
function setupSignupForm() {
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const username = document.getElementById('username').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            try {
                const response = await fetch(`${BASE_URL}/api/signup`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, email, password }),
                });

                if (response.ok) {
                    alert('Sign up successful! You can now log in.');
                    window.location.href = 'login.html';
                } else {
                    const error = await response.json();
                    alert(`Sign up failed: ${error.message}`);
                }
            } catch (error) {
                console.error('Error signing up:', error);
                alert('An unexpected error occurred.');
            }
        });
    }
}

// Setup Login Form
function setupLoginForm() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            try {
                const response = await fetch(`${BASE_URL}/api/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password }),
                });

                if (response.ok) {
                    const data = await response.json();
                    localStorage.setItem('token', data.token);
                    alert('Login successful!');
                    window.location.href = 'dashboared.html';
                } else {
                    alert('Login failed. Please check your credentials.');
                }
            } catch (error) {
                console.error('Error logging in:', error);
                alert('An unexpected error occurred.');
            }
        });
    }
}

// Setup Food Post Form
function setupFoodPostForm() {
    const foodPostForm = document.getElementById('foodPostForm');
    if (foodPostForm) {
        foodPostForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const token = localStorage.getItem('token');
            if (!token) {
                alert('You must be logged in to post food.');
                return;
            }

            const foodType = document.getElementById('food-type').value;
            const quantity = document.getElementById('quantity').value;
            const pickupTime = document.getElementById('pickup-time').value;
            const contactInfo = document.getElementById('contact-info').value;

            try {
                const response = await fetch(`${BASE_URL}/api/food_posts`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({ food_type: foodType, quantity, pickup_time: pickupTime, contact_info: contactInfo }),
                });

                if (response.ok) {
                    alert('Food posted successfully!');
                    loadUserFoodPosts(); // Reload the user's food posts
                } else {
                    alert('Error posting food.');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('An unexpected error occurred.');
            }
        });
    }
}

// Load All Food Posts
async function loadFoodPosts() {
    try {
        const response = await fetch(`${BASE_URL}/api/food_posts`);
        if (!response.ok) throw new Error('Failed to fetch food posts.');

        const foodPosts = await response.json();
        const feedSection = document.getElementById('food-feed');

        if (feedSection) {
            feedSection.innerHTML = ''; // Clear previous content
            foodPosts.forEach(post => {
                const postElement = document.createElement('div');
                postElement.classList.add('food-post');
                postElement.innerHTML = `
                    <h3>${post.food_type}</h3>
                    <p>Quantity: ${post.quantity}</p>
                    <p>Pickup Time: ${new Date(post.pickup_time).toLocaleString()}</p>
                    <p>Contact: ${post.contact_info}</p>
                    <button onclick="reserveFood(${post.post_id})">Reserve</button>
                `;
                feedSection.appendChild(postElement);
            });
        } else {
            console.error("Element with id 'food-feed' not found.");
        }
    } catch (error) {
        console.error('Error while loading food posts:', error);
        alert('An error occurred while fetching food posts.');
    }
}

// Reserve Food
async function reserveFood(postId) {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('You must be logged in to reserve food.');
        return;
    }

    try {
        const response = await fetch(`${BASE_URL}/api/food_posts/${postId}/reserve`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        });

        if (response.ok) {
            alert('Food reserved successfully!');
            loadFoodPosts(); // Refresh food posts after reservation
        } else {
            const error = await response.json();
            console.error('Failed to reserve food:', error);
            alert(`Error: ${error.message}`);
        }
    } catch (error) {
        console.error('Error while reserving food:', error);
        alert('An unexpected error occurred. Please try again.');
    }
}






