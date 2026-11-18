const API_BASE = (window.FOOD_API_BASE || ((window.location.hostname === 'localhost' && !['3000', ''].includes(window.location.port)) ? 'http://localhost:3000' : window.location.origin)).replace(/\/$/, '');

function logout(event) {
  if (event) event.preventDefault();
  localStorage.removeItem('token');
  window.location.href = 'index.html';
}

function updateNavigation() {
  const signedIn = Boolean(localStorage.getItem('token'));
  document.querySelectorAll('[data-auth="signed-in"]').forEach(item => { item.hidden = !signedIn; });
  document.querySelectorAll('[data-auth="signed-out"]').forEach(item => { item.hidden = signedIn; });
  document.querySelectorAll('[data-action="logout"]').forEach(link => {
    link.addEventListener('click', logout);
  });
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

function formatPickup(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date not available' : date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

function renderPost(post, container, allowReserve = false) {
  const item = makeElement('article', undefined, 'food-post');
  const state = post.picked_up ? 'Picked up' : post.reserved ? 'Reserved' : 'Available';
  const badge = makeElement('span', state, post.reserved ? 'status status-reserved' : 'status');
  item.append(
    badge,
    makeElement('h3', post.food_type),
    makeElement('p', `Quantity: ${post.quantity}`),
    makeElement('p', `Pickup: ${formatPickup(post.pickup_time)}`)
  );
  // Contact details are only shown to the original owner on their dashboard.
  if (post.contact_info) item.append(makeElement('p', `Contact: ${post.contact_info}`));
  if (allowReserve && !post.reserved) {
    const button = makeElement('button', 'Reserve food →');
    button.type = 'button';
    button.addEventListener('click', async () => {
      button.disabled = true;
      try { await reserveFood(post.post_id); }
      finally { button.disabled = false; }
    });
    item.append(button);
  }
  container.append(item);
}

async function loadFoodPosts() {
  const container = document.getElementById('food-feed');
  if (!container || window.location.pathname.includes('dashboared.html')) return;
  try {
    const posts = await apiRequest('/api/food_posts');
    const search = document.getElementById('food-search');
    const clear = document.getElementById('clear-search');
    function display() {
      const query = (search ? search.value : '').trim().toLowerCase();
      const matching = posts.filter(post => post.food_type.toLowerCase().includes(query));
      container.replaceChildren();
      matching.forEach(post => renderPost(post, container, true));
      if (!matching.length) container.append(makeElement('div', query ? 'No food matches your search.' : 'No available listings right now.', 'empty-state'));
    }
    if (search) {
      search.addEventListener('input', display);
      if (clear) clear.addEventListener('click', () => { search.value = ''; display(); search.focus(); });
    }
    display();
  } catch (error) {
    container.replaceChildren(makeElement('div', error.message, 'empty-state'));
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
      const card = makeElement('div', undefined, 'managed-post');
      renderPost(post, card);
      const actions = makeElement('div', undefined, 'manage-actions');
      if (post.reserved && !post.picked_up) {
        const complete = makeElement('button', 'Mark as picked up');
        complete.addEventListener('click', () => updateDonation(post.post_id, 'pickup', complete));
        actions.append(complete);
      } else if (!post.reserved && !post.picked_up) {
        const remove = makeElement('button', 'Remove listing', 'danger-button');
        remove.addEventListener('click', () => updateDonation(post.post_id, 'delete', remove));
        actions.append(remove);
      }
      card.append(actions);
      container.append(card);
    });
    if (!posts.length) container.append(makeElement('p', 'You have not posted food yet.'));
  } catch (error) {
    container.replaceChildren(makeElement('p', error.message));
  }
}

async function loadReservations() {
  const container = document.getElementById('reservation-list');
  if (!container) return;
  if (!localStorage.getItem('token')) {
    container.replaceChildren(makeElement('p', 'Please sign in to view your reservations.'));
    const link = makeElement('a', 'Sign in');
    link.href = 'login.html';
    container.append(link);
    return;
  }
  try {
    const reservations = await apiRequest('/api/reservations', { headers: authHeaders() });
    container.replaceChildren();
    if (!reservations.length) {
      container.append(makeElement('p', "You haven't reserved any food yet."));
      return;
    }
    reservations.forEach(reservation => {
      const item = makeElement('article', undefined, 'food-post');
      item.append(
        makeElement('h3', reservation.food_type),
        makeElement('p', `Quantity: ${reservation.quantity}`),
        makeElement('p', `Pickup: ${formatPickup(reservation.pickup_time)}`),
        makeElement('p', `Reserved on: ${formatPickup(reservation.reserved_at)}`),
        makeElement('p', reservation.picked_up ? 'Status: Picked up' : 'Status: Reserved')
      );
      if (!reservation.picked_up) {
        const cancel = makeElement('button', 'Cancel reservation', 'danger-button');
        cancel.type = 'button';
        cancel.addEventListener('click', async () => {
          if (!window.confirm('Cancel this reservation? The food will become available to others.')) return;
          cancel.disabled = true;
          try {
            await apiRequest(`/api/reservations/${encodeURIComponent(reservation.reservation_id)}`, {
              method: 'DELETE', headers: authHeaders()
            });
            await loadReservations();
          } catch (error) { alert(error.message); cancel.disabled = false; }
        });
        item.append(cancel);
      }
      container.append(item);
    });
  } catch (error) {
    container.replaceChildren(makeElement('p', error.message));
  }
}

async function updateDonation(postId, action, button) {
  const pickup = action === 'pickup';
  if (!window.confirm(pickup ? 'Confirm that this reserved food was picked up?' : 'Remove this unreserved listing?')) return;
  button.disabled = true;
  try {
    await apiRequest(`/api/food_posts/${encodeURIComponent(postId)}${pickup ? '/picked-up' : ''}`, {
      method: pickup ? 'PUT' : 'DELETE', headers: authHeaders()
    });
    await loadUserFoodPosts();
  } catch (error) {
    alert(error.message);
    button.disabled = false;
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
    window.location.href = 'reservation.html';
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
  updateNavigation();
  setupSignupForm();
  setupLoginForm();
  loadReservations();
  setupFoodPostForm();
  if (window.location.pathname.includes('dashboared.html')) {
    loadUserFoodPosts();
  } else {
    loadFoodPosts();
  }
  loadFeaturedFood();
});
