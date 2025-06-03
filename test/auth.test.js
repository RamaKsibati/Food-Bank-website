const request = require('supertest');
const { expect } = require('chai');

// In-memory mock database
const users = [];
let nextId = 1;
let app;
const dbMock = {
  query: async (sql, params) => {
    if (sql.startsWith('SELECT * FROM users WHERE email')) {
      const email = params[0];
      const match = users.filter(u => u.email === email);
      return [match];
    }
    if (sql.startsWith('INSERT INTO users')) {
      const [username, email, password] = params;
      const user = { user_id: nextId++, username, email, password };
      users.push(user);
      return [{ insertId: user.user_id }];
    }
    throw new Error('Unsupported query in test: ' + sql);
  }
};

before(() => {
  // Replace the db module with the mock
  require.cache[require.resolve('../db')] = { exports: dbMock };
  // Require the server after mocking db
  app = require('../server');
});

beforeEach(() => {
  users.length = 0;
  nextId = 1;
});

describe('Auth API', () => {
  it('should sign up and log in successfully', async () => {
    const signupRes = await request(app)
      .post('/api/signup')
      .send({ username: 'test', email: 'test@example.com', password: 'pass123' });
    expect(signupRes.status).to.equal(201);

    const loginRes = await request(app)
      .post('/api/login')
      .send({ email: 'test@example.com', password: 'pass123' });
    expect(loginRes.status).to.equal(200);
    expect(loginRes.body).to.have.property('token');
  });

  it('should reject signup with existing email', async () => {
    await request(app)
      .post('/api/signup')
      .send({ username: 'one', email: 'dup@example.com', password: 'pass' });

    const dupRes = await request(app)
      .post('/api/signup')
      .send({ username: 'two', email: 'dup@example.com', password: 'pass' });
    expect(dupRes.status).to.equal(400);
  });
});
