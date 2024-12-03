document.addEventListener('DOMContentLoaded', function () {
    // Attach form submit event listener
    const foodPostForm = document.getElementById('foodPostForm');
    if (foodPostForm) {
        foodPostForm.addEventListener('submit', handleFormSubmit);
    } else {
        console.error("Element with id 'foodPostForm' not found.");
    }

    // Load existing food posts
    loadFoodPosts();

    // Load featured food data (placeholder for now)
    loadFeaturedFood();
});

/**
 * Handles the submission of the food post form.
 */
async function handleFormSubmit(event) {
    event.preventDefault();

    // Gather form data
    const foodType = document.getElementById('food_type').value;
    const quantity = document.getElementById('quantity').value;
    const pickupTime = document.getElementById('pickup_time').value;
    const contactInfo = document.getElementById('contact_info').value;

    const postData = { food_type: foodType, quantity, pickup_time: pickupTime, contact_info: contactInfo };

    try {
        const response = await fetch('http://localhost:3000/api/food_posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(postData),
        });

        if (response.ok) {
            alert('Food posted successfully!');
            document.getElementById('foodPostForm').reset();
            loadFoodPosts(); // Refresh food posts after successful submission
        } else {
            console.error('Failed to post food:', await response.json());
            alert('Error posting food.');
        }
    } catch (error) {
        console.error('Error while posting food:', error);
        alert('An unexpected error occurred. Please try again.');
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
 * Reserves a specific food post by its ID.
 */
async function reserveFood(postId) {
    try {
        const response = await fetch(`http://localhost:3000/api/food_posts/${postId}/reserve`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_name: "User", contact_info: "123-456-7890" }),
        });

        if (response.ok) {
            alert('Food reserved successfully!');
            loadFoodPosts(); // Refresh food posts after reservation
        } else {
            console.error('Failed to reserve food:', await response.json());
            alert('Error reserving food.');
        }
    } catch (error) {
        console.error('Error while reserving food:', error);
        alert('An unexpected error occurred. Please try again.');
    }
}

/**
 * Loads placeholder featured food data.
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

/**
 * Simulates search functionality (placeholder).
 */
function performSearch() {
    const query = document.getElementById('search-input').value;
    alert(`Searching for: ${query}`);
    // Implement backend query for search functionality
}

/**
 * Simulates viewing detailed food item information.
 */
function viewDetails(foodId) {
    alert(`Viewing details for food item ID: ${foodId}`);
    // Redirect to details page or dynamically load details
}


