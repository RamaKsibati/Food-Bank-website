function logout() {
    localStorage.removeItem('token'); // Remove the authentication token
    alert('You have been logged out.');
    window.location.href = 'index.html'; // Redirect to the home page
}
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

async function loadUserFoodPosts() {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('You must be logged in to access this page.');
    window.location.href = 'login.html'; 
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/api/user_food_posts', {
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

/**
 * Handles the sign-up form submission.
 */
function setupSignupForm() {
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const username = document.getElementById('username').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            try {
                const response = await fetch('http://localhost:3000/api/signup', {
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

/**
 * Handles the login form submission.
 */
function setupLoginForm() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            try {
                const response = await fetch('http://localhost:3000/api/login', {
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

/**
 * Handles the food post form submission.
 */
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
                const response = await fetch('http://localhost:3000/api/food_posts', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({ food_type: foodType, quantity, pickup_time: pickupTime, contact_info: contactInfo }),
                });
                console.log('Response:', response);
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

/**
 * Loads all food posts from the server and populates the feed.
 */
async function loadFoodPosts() {
    try {
        const response = await fetch('http://localhost:3000/api/food_posts');
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

/**
 * Loads featured food data (placeholder).
 */
function loadFeaturedFood() {
    const foodData = [
        { id: 1, title: 'Fresh Vegetables', description: 'Available until 4 PM', image: 'img/vegetables.jpg' },
        { id: 2, title: 'Canned Goods', description: 'Available all day', image: 'img/canned goods.jpg' },
        { id: 3, title: 'Bread and Bakery Items', description: 'Available until 6 PM', image: 'img/bread.jpg' },
    ];

    const foodListing = document.getElementById('food-listing');
    if (foodListing) {
        foodListing.innerHTML = ''; // Clear previous content
        foodData.forEach(food => {
            const foodItem = document.createElement('div');
            foodItem.classList.add('food-item');
            foodItem.innerHTML = `
                <img src="${food.image}" alt="${food.title}">
                <h3>${food.title}</h3>
                <p>${food.description}</p>
                <button onclick="viewDetails(${food.id})">View Details</button>
            `;
            foodListing.appendChild(foodItem);
        });
    } else {
        console.error("Element with id 'food-listing' not found.");
    }
}
async function reserveFood(postId) {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('You must be logged in to reserve food.');
        return;
    }

    try {
        const response = await fetch(`http://localhost:3000/api/food_posts/${postId}/reserve`, {
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





