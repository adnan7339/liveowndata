# ACAG Admin Backend (Node.js + Express + MongoDB)

Matches this architecture:

```
GitHub Pages (frontend) → Node.js Backend (JWT, bcrypt, role auth, API security) → MongoDB
```

## 1. Install

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env`:
- `MONGODB_URI` — get a free cluster at https://www.mongodb.com/cloud/atlas (or use a local MongoDB)
- `JWT_SECRET` — any long random string
- `CORS_ORIGIN` — your GitHub Pages URL, e.g. `https://your-username.github.io`
- `DEFAULT_ADMIN_USERNAME` / `DEFAULT_ADMIN_PASSWORD` — first admin login

## 2. Seed the database (roles, permissions, default admin)

```bash
npm run seed
```

## 3. Run

```bash
npm start          # production
npm run dev         # with nodemon, auto-restart
```

Server starts on `PORT` (default 5000).

## 4. Deploy

GitHub Pages only serves static files — it cannot run this backend. Deploy it somewhere that runs Node.js, for example:
- **Render** (render.com) — free tier, connect this repo, set env vars, done
- **Railway** (railway.app)
- **Fly.io**
- Any VPS with Node 18+ and PM2

After deploying, copy the live URL (e.g. `https://acag-backend.onrender.com`) and paste it into the frontend's `API_BASE_URL` constant (in `frontend/index.html`), as `https://acag-backend.onrender.com/api`.

## 5. Import member records

The `Member` collection is empty until you import data. Use the bulk import endpoint (admin token required):

```
POST /api/members/bulk
Body: { "rows": [ ["CNIC","Name","Sector","Bank"], ... ] }
```

You can script this from your existing Google Sheet export, or write a one-off script using `mongoimport` / a small Node script that reads a CSV and calls this endpoint.

## API Overview

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/auth/login` | POST | none | Login, returns JWT |
| `/api/auth/me` | GET | JWT | Current user info |
| `/api/auth/logout` | POST | JWT | Logs the logout event |
| `/api/users` | GET/POST | admin | List / create users |
| `/api/users/:id/role` | PUT | admin | Change a user's role |
| `/api/users/:id/reset-password` | POST | admin | Reset a user's password |
| `/api/users/:id/block` `/unblock` | POST | admin | Block / unblock a user |
| `/api/users/:id` | DELETE | admin | Delete a user |
| `/api/roles` | GET/POST | admin | List / create roles |
| `/api/roles/:name/permissions` | PUT | admin | Update a role's permissions |
| `/api/roles/:name` | DELETE | admin | Delete a (non-system) role |
| `/api/permissions` | GET | admin | List all permission keys |
| `/api/members/search?cnic=` | GET | JWT | Search a member by CNIC |
| `/api/members/bulk` | POST | admin | Bulk import member records |
| `/api/activity` | GET/DELETE | admin | View / clear activity logs |
| `/api/status/database` | GET | admin | MongoDB connection + collection stats |
| `/api/status/health` | GET | none | Lightweight health check |

## Security features implemented

- **JWT Authentication** — stateless tokens, `Authorization: Bearer <token>`, configurable expiry
- **Password Hashing** — bcrypt (10 salt rounds), plaintext passwords never stored
- **Role Authorization** — `authorizeRoles()` / `authorizePermission()` middleware guard every admin route
- **API Security** — `helmet` headers, CORS allow-list, global + login-specific rate limiting, input validation (`express-validator`)
