# Feed Dearborn — Food Donation & Reservation Platform

**Node.js · Express · MySQL · JavaScript · REST API · Automated Tests**

A student full-stack project connecting donors with people seeking food. Users can sign up, publish food listings, browse availability, and reserve a listing. This repository demonstrates relational schema design, authentication, authorization, defensive API validation, and transaction-safe reservation logic.

> **Project status:** Portfolio-ready documentation and security-focused refactor. End-to-end execution against a live MySQL instance has not yet been independently verified. This is a student demonstration, not a production food assistance service.

## Features

- Account registration with bcrypt password hashing and login with short-lived JWTs
- Authenticated users can create and view their own food posts
- Public listings show available food **without publishing donors' contact details**
- A logged-in recipient can reserve a post owned by someone else
- Transaction and row-level locking prevent two simultaneous reservations of the same post
- Duplicate registrations, invalid requests, nonexistent listings, and conflicts return meaningful HTTP statuses
- Automated API tests for registration, login, authorization, feed privacy, and reservation conflicts

## Architecture

```text
Browser (HTML/CSS/JavaScript)
     |
     | HTTP /api/*
     v
Express API + JWT authentication
     |
     | parameterized SQL / transactions
     v
MySQL
  users ─── food_posts ─── reservations
```

### Data model

| Table | Key fields | Purpose |
|---|---|---|
| `users` | `user_id` PK, unique `email`, password hash | Registered accounts |
| `food_posts` | `post_id` PK, `user_id` FK, food details, `reserved` | Donations and ownership |
| `reservations` | `reservation_id` PK, unique `post_id` FK, `user_id` FK | Which account reserved which post |

A unique `reservations.post_id` constraint prevents multiple reservations for the same listing. The reservation endpoint also locks a row with `SELECT ... FOR UPDATE` and updates/creates the reservation in a single transaction.

## Local setup

**Prerequisites:** Node.js (18+), npm, and MySQL 8+.

1. Clone this repo and run `npm install`.
2. In MySQL, create an empty database (for example `CREATE DATABASE food_donation;`) and a local DB user with permission to access it.
3. Copy `.env.example` to `.env`. Set `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT` and a **new random** `JWT_SECRET` of 32+ characters. Never commit the `.env` file.
4. Run `npm run db:setup` to initialize the three tables. **Note:** `CREATE TABLE IF NOT EXISTS` does not migrate existing incompatible schemas; use a fresh database or review migrations before applying this to old data.
5. Run `npm start` to serve the API at `http://localhost:3000`.
6. Serve the `frontend/` directory with a local static web server (for example `python -m http.server 8000 --directory frontend`) and open `http://localhost:8000`.

The frontend calls `http://localhost:3000` by default. Configure `window.FOOD_API_BASE` before loading `frontend/js/main.js` to point to another API base if required. The project currently uses permissive CORS for local development; restrict allowed origins before production deployment.

## API overview

| Method | Endpoint | Authentication | Description |
|---|---|---|---|
| POST | `/api/signup` | No | Create account |
| POST | `/api/login` | No | Get one-hour JWT |
| GET | `/api/food_posts` | No | Browse unreserved posts, without owner contacts |
| POST | `/api/food_posts` | Yes | Post food |
| GET | `/api/user_food_posts` | Yes | List your own posts with contact information |
| PUT | `/api/food_posts/:id/reserved` | Yes | Reserve someone else's post |
| PUT | `/api/food_posts/:id/reserve` | Yes | Alternate reserve route |

Requests with tokens must include `Authorization: Bearer <token>`. Signup requires a valid email and a password of 8–128 characters. Food-post requests require positive integer quantity and valid text/pickup date fields.

## Tests

Run `npm run test:unit` for mocked API tests without MySQL. Run `npm run test:integration` against a disposable MySQL database after `npm run db:setup`; **this suite clears the test tables** and checks real signup/login, privacy, ownership, duplicate reservations, and concurrent reservation attempts.

**No local installation required for online checks:** [GitHub Actions](https://github.com/RamaKsibati/Food-Bank-website/actions/workflows/api-tests.yml) starts a temporary MySQL 8 service and runs both test suites on each push or pull request. This tests the backend; it does not deploy an interactive website.

## Business and data opportunities

Once the service is tested with real or consented demonstration records, SQL dashboards could summarize:

- Number of food listings and successful reservations over time
- Categories with high demand versus available donations
- Reservation completion rate and frequently available food types
- Pick-up windows and operational patterns

These dashboards are **future extensions**, not completed claims in this repository.

## Security notes

- Passwords are bcrypt-hashed; database credentials and JWT secret are loaded from local environment settings.
- SQL queries use parameterized placeholders.
- Client-supplied listing text is inserted into the DOM using `textContent` rather than unsanitized HTML templates.
- Authentication is required to submit or reserve listings; owners cannot reserve their own posts.
- The original repository **historically committed configuration secrets**. Removing them from the latest tree does **not** erase earlier commits. Any real exposed database password and the old signing secret must be rotated, and repository history should be reviewed before production use.
- Browser-local token storage is a demonstration trade-off and is vulnerable if an XSS exploit occurs; production systems should consider secure cookie-based sessions, CSRF protection, rate limiting, logging controls, TLS, CORS allowlists, and stronger security reviews.
- Donor contact details are accessible on their own dashboard, not in the public API. A production pickup communication workflow would require additional work.

## Repository structure

```text
frontend/             # HTML, CSS, vanilla JavaScript
server.js             # Express routes and auth
db.js                 # MySQL connection pool
setupDatabase.js      # Schema setup (fresh database)
test/auth.test.js     # HTTP API tests with mock database
.env.example          # Safe configuration template
README.md
```

## Known limitations

The frontend is a demonstration, the pickup workflow is not complete, and a reservation does not automatically transmit pickup contact details. Existing installations with the old schema require a migration. A temporary MySQL integration workflow is configured; check the latest GitHub Actions run for results. Real-browser end-to-end testing and production deployment verification remain outstanding.

**Maintainer:** Rama Ksibati · Computer Information Science portfolio
