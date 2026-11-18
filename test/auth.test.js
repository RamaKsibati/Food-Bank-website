const request = require('supertest');
const { expect } = require('chai');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-only-local-secret-at-least-32-characters';
const users = [];
const posts = [];
const reservations = [];
let nextUser = 1;
let nextPost = 1;
let locked = false;

const mockDb = {
  query: async (sql, params = []) => {
    if (sql.startsWith('INSERT INTO users')) {
      if (users.some(u => u.email === params[1])) {
        const error = new Error('Duplicate');
        error.code = 'ER_DUP_ENTRY';
        throw error;
      }
      const user = { user_id: nextUser++, username: params[0], email: params[1], password: params[2] };
      users.push(user);
      return [{ insertId: user.user_id }];
    }
    if (sql.startsWith('SELECT user_id, password FROM users')) {
      return [users.filter(u => u.email === params[0])];
    }
    if (sql.startsWith('INSERT INTO food_posts')) {
      const post = {
        post_id: nextPost++, food_type: params[0], quantity: params[1],
        pickup_time: params[2], contact_info: params[3], user_id: params[4],
        reserved: false
      };
      posts.push(post);
      return [{ insertId: post.post_id }];
    }
    if (sql.includes('FROM reservations AS r')) {
      return [reservations.filter(r => r.user_id === params[0]).map(r => {
        const post = posts.find(p => p.post_id === r.post_id);
        return { reservation_id: r.post_id, post_id: r.post_id, reserved_at: '2026-11-17T12:00:00Z',
          food_type: post.food_type, quantity: post.quantity, pickup_time: post.pickup_time };
      })];
    }
    if (sql.includes('FROM food_posts WHERE user_id = ?')) {
      return [posts.filter(p => p.user_id === params[0])];
    }
    if (sql.includes('FROM food_posts WHERE reserved = FALSE')) {
      return [posts.filter(p => !p.reserved).map(p => ({
        post_id: p.post_id, food_type: p.food_type, quantity: p.quantity,
        pickup_time: p.pickup_time, reserved: p.reserved
      }))];
    }
    throw new Error('Unsupported query: ' + sql);
  },
  getConnection: async () => ({
    beginTransaction: async () => {
      if (locked) throw new Error('Unexpected concurrent transaction in mock');
      locked = true;
    },
    query: async (sql, params) => {
      if (sql.includes('FOR UPDATE')) return [posts.filter(p => p.post_id === Number(params[0]))];
      if (sql.startsWith('UPDATE food_posts')) {
        posts.find(p => p.post_id === Number(params[0])).reserved = true;
        return [{ affectedRows: 1 }];
      }
      if (sql.startsWith('INSERT INTO reservations')) {
        reservations.push({ post_id: Number(params[0]), user_id: params[1] });
        return [{ insertId: reservations.length }];
      }
      throw new Error('Unsupported transaction query: ' + sql);
    },
    commit: async () => { locked = false; },
    rollback: async () => { locked = false; },
    release: () => {}
  })
};

require.cache[require.resolve('../db')] = { exports: mockDb };
const app = require('../server');
const tokenFor = userId => jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '1h' });

beforeEach(() => {
  users.length = 0;
  posts.length = 0;
  reservations.length = 0;
  nextUser = 1;
  nextPost = 1;
  locked = false;
});

describe('Food Bank API', () => {
  it('signs up, logs in and prevents duplicate accounts', async () => {
    const account = { username: 'Tester', email: 'TEST@example.com', password: 'strongpass123' };
    expect((await request(app).post('/api/signup').send(account)).status).to.equal(201);
    const duplicate = await request(app).post('/api/signup').send(account);
    expect(duplicate.status).to.equal(409);
    const login = await request(app).post('/api/login').send({
      email: 'test@example.com', password: account.password
    });
    expect(login.status).to.equal(200);
    expect(login.body.token).to.be.a('string');
    const wrong = await request(app).post('/api/login').send({email: account.email, password: 'incorrect'});
    expect(wrong.status).to.equal(401);
  });

  it('rejects invalid signup data and unauthenticated posting', async () => {
    expect((await request(app).post('/api/signup').send({
      username: 'A', email: 'bad', password: 'short'
    })).status).to.equal(400);
    expect((await request(app).post('/api/food_posts').send({
      food_type: 'Bread', quantity: 2, pickup_time: '2026-11-20T14:00', contact_info: '555-0100'
    })).status).to.equal(401);
  });

  it('allows recipient reservation only once and rejects owner reservations', async () => {
    const owner = { Authorization: 'Bearer ' + tokenFor(1) };
    const recipient = { Authorization: 'Bearer ' + tokenFor(2) };
    const otherRecipient = { Authorization: 'Bearer ' + tokenFor(3) };
    const created = await request(app).post('/api/food_posts').set(owner).send({
      food_type: 'Bread', quantity: 2, pickup_time: '2026-11-20T14:00', contact_info: '555-0100'
    });
    expect(created.status).to.equal(201);
    const id = created.body.postId;
    const ownerReservation = await request(app).put('/api/food_posts/' + id + '/reserved').set(owner);
    expect(ownerReservation.status).to.equal(403);
    const reserved = await request(app).put('/api/food_posts/' + id + '/reserved').set(recipient);
    expect(reserved.status).to.equal(200);
    expect(reservations.length).to.equal(1);
    const history = await request(app).get('/api/reservations').set(recipient);
    expect(history.status).to.equal(200);
    expect(history.body).to.have.length(1);
    expect(history.body[0].food_type).to.equal('Bread');
    expect(history.body[0]).not.to.have.property('contact_info');
    const otherHistory = await request(app).get('/api/reservations').set(otherRecipient);
    expect(otherHistory.body).to.have.length(0);
    expect((await request(app).get('/api/reservations')).status).to.equal(401);
    const again = await request(app).put('/api/food_posts/' + id + '/reserved').set(otherRecipient);
    expect(again.status).to.equal(409);
    expect(reservations.length).to.equal(1);
    const feed = await request(app).get('/api/food_posts');
    expect(feed.body).to.have.length(0);
  });

  it('returns 404 for missing reservation and keeps contact off the public feed', async () => {
    const recipient = { Authorization: 'Bearer ' + tokenFor(2) };
    const r = await request(app).put('/api/food_posts/999/reserved').set(recipient);
    expect(r.status).to.equal(404);
    posts.push({ post_id: 1, food_type: 'Bread', quantity: 1, pickup_time: '2026-11-20', contact_info: 'private', user_id: 1, reserved: false });
    const feed = await request(app).get('/api/food_posts');
    expect(feed.body[0]).not.to.have.property('contact_info');
  });
});
