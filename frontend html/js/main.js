document.getElementById('foodPostForm').addEventListener('submit', async (event) => {
    event.preventDefault();

    const foodType = document.getElementById('food_type').value;
    const quantity = document.getElementById('quantity').value;
    const pickupTime = document.getElementById('pickup_time').value;
    const contactInfo = document.getElementById('contact_info').value;

    const postData = { food_type: foodType, quantity, pickup_time: pickupTime, contact_info: contactInfo };

    const response = await fetch('http://localhost:3000/api/food-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData)
    });

    if (response.ok) {
        alert('Food posted successfully!');
        document.getElementById('foodPostForm').reset();
    } else {
        alert('Error posting food.');
    }
});
async function loadFoodPosts() {
    const response = await fetch('http://localhost:3000/api/food-posts');
    const foodPosts = await response.json();

    const feedSection = document.getElementById('food-feed');
    feedSection.innerHTML = '';

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
}

async function reserveFood(postId) {
    const response = await fetch(`http://localhost:3000/api/food-posts/${postId}/reserve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_name: "User", contact_info: "123-456-7890" })
    });

    if (response.ok) {
        alert('Food reserved successfully!');
        loadFoodPosts();
    } else {
        alert('Error reserving food.');
    }
}

loadFoodPosts();
