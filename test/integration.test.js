// Integration tests use a REAL MySQL database created by npm run db:setup.
// Run only with a disposable database. Never point these tests at production.
const request = require('supertest');
const { expect } = require('chai');
const db = require('../db');
const app = require('../server');

const signup = (username, email) => request(app)
  .post('/api/signup')
  .send({ username, email, password: 'test-password-123!' });

const login = (email) => request(app)
  .post('/api/login')
  .send({ email, password: 'test-password-123!' });

async function createAuthenticatedAccount(username, email) {
  const created = await signup(username, email);
  expect(created.status, JSON.stringify(created.body)).to.equal(201);
  const signedIn = await login(email);
  expect(signedIn.status, JSON.stringify(signedIn.body)).to.equal(200);
  expect(signedIn.body.token).to.be.a('string');
  return {
    id: created.body.userId,
    header: { Authorization: 'Bearer ' + signedIn.body.token }
  };
}

async function createFood(owner, food_type = 'Bread') {
  const response = await request(app)
    .post('/api/food_posts')
    .set(owner.header)
    .send({
      food_type,
      quantity: 4,
      pickup_time: '2030-05-01 12:00:00',
      contact_info: 'Demo pickup contact'
    });
  expect(response.status, JSON.stringify(response.body)).to.equal(201);
  return response.body.postId;
}

describe('Food Bank live MySQL integration', function () {
  this.timeout(20000);
  let donor, recipient, secondRecipient;

  before(async () => {
    // This workflow provisions a one-use database for the job.
    // Clear it explicitly so failed/retried test runs are deterministic.
    await db.query('DELETE FROM reservations');
    await db.query('DELETE FROM food_posts');
    await db.query('DELETE FROM users');
    donor = await createAuthenticatedAccount('Donor', 'donor@integration.example');
    recipient = await createAuthenticatedAccount('Recipient', 'recipient@integration.example');
    secondRecipient = await createAuthenticatedAccount('Other', 'other@integration.example');
  });

  after(async () => {
    await db.end();
  });

  it('stores hashed passwords and rejects invalid credentials', async () => {
    const [users] = await db.query('SELECT password FROM users WHERE user_id = ?', [donor.id]);
    expect(users).to.have.length(1);
    expect(users[0].password).not.to.equal('test-password-123!');
    expect(users[0].password).to.match(/^\$2[aby]\$/);
    const badLogin = await request(app)
      .post('/api/login')
      .send({ email: 'donor@integration.example', password: 'wrong-password' });
    expect(badLogin.status).to.equal(401);
    const duplicate = await signup('Duplicate', 'donor@integration.example');
    expect(duplicate.status).to.equal(409);
  });

  it('creates owned posts, displays available food without private contacts', async () => {
    const id = await createFood(donor, 'Fresh vegetables');
    const owned = await request(app).get('/api/user_food_posts').set(donor.header);
    expect(owned.status).to.equal(200);
    expect(owned.body.some(post => post.post_id === id && post.contact_info === 'Demo pickup contact')).to.equal(true);
    const publicFeed = await request(app).get('/api/food_posts');
    expect(publicFeed.status).to.equal(200);
    const listing = publicFeed.body.find(post => post.post_id === id);
    expect(listing).to.exist;
    expect(listing).not.to.have.property('contact_info');
    expect(listing).not.to.have.property('user_id');
  });

  it('rejects owner reservation and invalid/nonexistent posts', async () => {
    const id = await createFood(donor, 'Rice');
    const self = await request(app).put('/api/food_posts/' + id + '/reserved').set(donor.header);
    expect(self.status).to.equal(403);
    const missing = await request(app).put('/api/food_posts/9999999/reserved').set(recipient.header);
    expect(missing.status).to.equal(404);
    const invalid = await request(app).put('/api/food_posts/not-an-id/reserved').set(recipient.header);
    expect(invalid.status).to.equal(400);
    const unauthorized = await request(app).put('/api/food_posts/' + id + '/reserved');
    expect(unauthorized.status).to.equal(401);
  });

  it('records one reservation and prevents a second recipient from claiming the post', async () => {
    const id = await createFood(donor, 'Fruit');
    const reserved = await request(app).put('/api/food_posts/' + id + '/reserved').set(recipient.header);
    expect(reserved.status, JSON.stringify(reserved.body)).to.equal(200);

    const history = await request(app).get('/api/reservations').set(recipient.header);
    expect(history.status).to.equal(200);
    expect(history.body.some(row => row.post_id === id && row.food_type === 'Fruit')).to.equal(true);
    expect(history.body.find(row => row.post_id === id)).not.to.have.property('contact_info');
    const otherHistory = await request(app).get('/api/reservations').set(secondRecipient.header);
    expect(otherHistory.status).to.equal(200);
    expect(otherHistory.body).to.have.length(0);
    const anon = await request(app).get('/api/reservations');
    expect(anon.status).to.equal(401);

    const duplicate = await request(app).put('/api/food_posts/' + id + '/reserved').set(secondRecipient.header);
    expect(duplicate.status).to.equal(409);

    const [rows] = await db.query('SELECT post_id, user_id FROM reservations WHERE post_id = ?', [id]);
    expect(rows).to.have.length(1);
    expect(rows[0].user_id).to.equal(recipient.id);

    const [posts] = await db.query('SELECT reserved FROM food_posts WHERE post_id = ?', [id]);
    expect(posts[0].reserved).to.equal(1);

    const feed = await request(app).get('/api/food_posts');
    expect(feed.body.some(post => post.post_id === id)).to.equal(false);
  });

  it('serializes competing reservations through the database row lock', async () => {
    const id = await createFood(donor, 'Canned goods');
    const responses = await Promise.all([
      request(app).put('/api/food_posts/' + id + '/reserved').set(recipient.header),
      request(app).put('/api/food_posts/' + id + '/reserved').set(secondRecipient.header)
    ]);
    expect(responses.map(r => r.status).sort()).to.deep.equal([200, 409]);
    const [rows] = await db.query('SELECT user_id FROM reservations WHERE post_id = ?', [id]);
    expect(rows).to.have.length(1);
  });
  it('allows only the recipient to cancel, returning food to the feed', async () => {
    const id = await createFood(donor, 'Cancel test rice');
    const reserved = await request(app).put('/api/food_posts/' + id + '/reserved').set(recipient.header);
    expect(reserved.status).to.equal(200);
    const history = await request(app).get('/api/reservations').set(recipient.header);
    const booking = history.body.find(row => row.post_id === id);
    expect(booking).to.exist;
    expect((await request(app).delete('/api/reservations/' + booking.reservation_id)).status).to.equal(401);
    expect((await request(app).delete('/api/reservations/' + booking.reservation_id).set(secondRecipient.header)).status).to.equal(403);
    expect((await request(app).delete('/api/reservations/' + booking.reservation_id).set(recipient.header)).status).to.equal(200);
    const [rows] = await db.query('SELECT reserved FROM food_posts WHERE post_id = ?', [id]);
    expect(rows[0].reserved).to.equal(0);
    const feed = await request(app).get('/api/food_posts');
    expect(feed.body.some(row => row.post_id === id)).to.equal(true);
    expect((await request(app).delete('/api/reservations/' + booking.reservation_id).set(recipient.header)).status).to.equal(404);
  });

  it('only permits a donor to mark reserved food picked up; then prevents cancellation', async () => {
    const id = await createFood(donor, 'Pickup test bread');
    expect((await request(app).put('/api/food_posts/' + id + '/picked-up').set(donor.header)).status).to.equal(409);
    expect((await request(app).put('/api/food_posts/' + id + '/picked-up').set(recipient.header)).status).to.equal(403);
    expect((await request(app).put('/api/food_posts/' + id + '/reserved').set(recipient.header)).status).to.equal(200);
    expect((await request(app).put('/api/food_posts/' + id + '/picked-up').set(donor.header)).status).to.equal(200);
    const history = await request(app).get('/api/reservations').set(recipient.header);
    const booking = history.body.find(row => row.post_id === id);
    expect(Number(booking.picked_up)).to.equal(1);
    expect((await request(app).delete('/api/reservations/' + booking.reservation_id).set(recipient.header)).status).to.equal(409);
    expect((await request(app).put('/api/food_posts/' + id + '/picked-up').set(donor.header)).status).to.equal(409);
  });

  it('permits a donor to remove an unreserved post without affecting reservations', async () => {
    const id = await createFood(donor, 'Removable test item');
    expect((await request(app).delete('/api/food_posts/' + id).set(secondRecipient.header)).status).to.equal(403);
    expect((await request(app).delete('/api/food_posts/' + id).set(donor.header)).status).to.equal(200);
    expect((await request(app).delete('/api/food_posts/' + id).set(donor.header)).status).to.equal(404);
    const reservedId = await createFood(donor, 'Protected test item');
    expect((await request(app).put('/api/food_posts/' + reservedId + '/reserved').set(recipient.header)).status).to.equal(200);
    expect((await request(app).delete('/api/food_posts/' + reservedId).set(donor.header)).status).to.equal(409);
  });

  it('reports scoped donor statistics and recipient pickups using SQL aggregates', async () => {
    const before = await request(app).get('/api/analytics').set(donor.header);
    expect(before.status).to.equal(200);
    const postId = await createFood(donor, 'Analytics example squash');
    const initial = await request(app).get('/api/analytics').set(donor.header);
    expect(initial.status).to.equal(200);
    expect(initial.body.donor.totalPosts).to.equal(before.body.donor.totalPosts + 1);
    expect(initial.body.donor.available).to.equal(before.body.donor.available + 1);
    expect(initial.body.donor.unitsListed).to.equal(before.body.donor.unitsListed + 4);
    expect(initial.body.categories.some(category => category.name === 'Analytics example squash' && category.count === 1)).to.equal(true);
    expect(initial.body).not.to.have.property('contact_info');

    const other = await request(app).get('/api/analytics').set(secondRecipient.header);
    expect(other.status).to.equal(200);
    expect(other.body.donor.totalPosts).to.equal(0);
    expect(other.body.categories.some(category => category.name === 'Analytics example squash')).to.equal(false);
    expect((await request(app).get('/api/analytics')).status).to.equal(401);

    expect((await request(app).put('/api/food_posts/' + postId + '/reserved').set(recipient.header)).status).to.equal(200);
    const afterReservation = await request(app).get('/api/analytics').set(donor.header);
    expect(afterReservation.body.donor.available).to.equal(initial.body.donor.available - 1);
    expect(afterReservation.body.donor.reserved).to.equal(initial.body.donor.reserved + 1);
    const beforePickup = await request(app).get('/api/analytics').set(recipient.header);
    expect((await request(app).put('/api/food_posts/' + postId + '/picked-up').set(donor.header)).status).to.equal(200);
    const afterPickup = await request(app).get('/api/analytics').set(donor.header);
    expect(afterPickup.body.donor.pickedUp).to.equal(afterReservation.body.donor.pickedUp + 1);
    expect(afterPickup.body.donor.unitsCollected).to.equal(afterReservation.body.donor.unitsCollected + 4);
    const recipientResult = await request(app).get('/api/analytics').set(recipient.header);
    expect(recipientResult.body.recipient.pickedUp).to.equal(beforePickup.body.recipient.pickedUp + 1);
  });

});
