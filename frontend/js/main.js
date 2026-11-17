const API_BASE = (window.FOOD_API_BASE || 'http://localhost:3000').replace(/\/$/, '');

function logout() {
  localStorage.removeItem('token');
  window.location.href = 'index.html';
}

function makeElement(tag, content, className) {
  const el = document.createElement(tag);
  if (content !== undefined) el.textContent = String(content);
  if (className) el.className = className;
  return el;
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `Request failed (${response.status})`);
  return data;
}

function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function renderPost(post, container, allowReserve = false) {
  const item = makeElement('article', undefined, 'food-post');
  item.append(
    makeElement('h3', post.food_type),
    makeElement('p', `Quantity: ${post.quantity}`),
    makeElement('p', `Pickup: ${new Date(post.pickup_time).toLocaleString()}`)
  );
  // Contact details are only shown to the original owner on their dashboard.
  if (post.contact_info) item.append(makeElement('p', `Contact: ${post.contact_info}`));
  if (allowReserve && !post.reserved) {
    const button = makeElement('button', 'Reserve');
    button.type = 'button';
    button.addEventListener('click', () => reserveFood(post.post_id));
    item.append(button);
  }
  container.append(item);
}

async function loadFoodPosts() {
  const container = document.getElementById('food-feed');
  if (!container || window.location.pathname.includes('dashboared.html')) return;
  try {
    const posts = await apiRequest('/api/food_posts');
    container.replaceChildren();
    posts.forEach(post => renderPost(post, container, true));
    if (!posts.length) container.append(makeElement('p', 'No available listings right now.'));
  } catch (error) {
    container.replaceChildren(makeElement('p', error.message));
  }
}

async function loadUserFoodPosts() {
  const container = document.getElementById('food-feed');
  if (!container) return;
  if (!localStorage.getItem('token')) {
    window.location.href = 'login.html';
    return;
  }
  try {
    const posts = await apiRequest('/api/user_food_posts', { headers: authHeaders() });
    container.replaceChildren();
    posts.forEach(post => {
      renderPost(post, container);
      if (post.reserved) container.append(makeElement('p', 'Reserved'));
    });
    if (!posts.length) container.append(makeElement('p', 'You have not posted food yet.'));
  } catch (error) {
    container.replaceChildren(makeElement('p', error.message));
  }
}

async function reserveFood(postId) {
  if (!localStorage.getItem('token')) {
    window.location.href = 'login.html';
    return;
  }
  try {
    await apiRequest(`/api/food_posts/${encodeURIComponent(postId)}/reserved`, {
      method: 'PUT', headers: authHeaders()
    });
    alert('Food reserved successfully.');
    await loadFoodPosts();
  } catch (error) {
    alert(error.message);
  }
}

function setupSignupForm() {
  const form = document.getElementById('signupForm');
  if (!form) return;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    try {
      await apiRequest('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: document.getElementById('username').value,
          email: document.getElementById('email').value,
          password: document.getElementById('password').value
        })
      });
      alert('Account created. Please sign in.');
      window.location.href = 'login.html';
    } catch (error) {
      alert(error.message);
    }
  });
}

function setupLoginForm() {
  const form = document.getElementById('loginForm');
  if (!form) return;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    try {
      const data = await apiRequest('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: document.getElementById('email').value,
          password: document.getElementById('password').value
        })
      });
      localStorage.setItem('token', data.token);
      window.location.href = 'dashboared.html';
    } catch (error) {
      alert(error.message);
    }
  });
}

function setupFoodPostForm() {
  const form = document.getElementById('foodPostForm');
  if (!form) return;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!localStorage.getItem('token')) {
      window.location.href = 'login.html';
      return;
    }
    try {
      await apiRequest('/api/food_posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          food_type: document.getElementById('food-type').value,
          quantity: Number(document.getElementById('quantity').value),
          pickup_time: document.getElementById('pickup-time').value,
          contact_info: document.getElementById('contact-info').value
        })
      });
      form.reset();
      alert('Food posted successfully.');
      await loadUserFoodPosts();
    } catch (error) {
      alert(error.message);
    }
  });
}

function loadFeaturedFood() {
  const listing = document.getElementById('food-listing');
  if (!listing) return;
  const demo = [
    ['Fresh Vegetables', 'Browse available listings in the food feed.'],
    ['Canned Goods', 'Reserve donations that suit your needs.'],
    ['Bread and Bakery Items', 'Connect with local food donors.']
  ];
  listing.replaceChildren();
  demo.forEach(([title, description]) => {
    const el = makeElement('article', undefined, 'food-item');
    el.append(makeElement('h3', title), makeElement('p', description));
    listing.append(el);
  });
}
function performSearch() {
  window.location.href = 'feed.html';
}
function viewDetails() {
  window.location.href = 'feed.html';
}

document.addEventListener('DOMContentLoaded', () => {
  setupSignupForm();
  setupLoginForm();
  setupFoodPostForm();
  if (window.location.pathname.includes('dashboared.html')) {
    loadUserFoodPosts();
  } else {
    loadFoodPosts();
  }
  loadFeaturedFood();
});
