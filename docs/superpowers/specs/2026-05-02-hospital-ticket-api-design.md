# Hospital Service Ticket API — Design

**Date:** 2026-05-02
**Stack:** Node.js, Express, JWT, bcryptjs, dotenv
**Storage:** in-memory arrays (per coding-standards.md)

---

## 1. Purpose

A REST API for hospital equipment service tickets. Staff raise tickets when equipment breaks; admins assign them to technicians; technicians update status as work progresses. Tracks a full timeline of events per ticket and enforces role-based permissions and legal status transitions.

---

## 2. Architecture

Standalone project at the repository root, following the layered pattern from `coding-standards.md`:

```
.
├── app.js                  (entry point, mounts routes + error handler)
├── package.json
├── .env                    (PORT, JWT_SECRET)
├── .gitignore
├── routes/
│   ├── userRoutes.js
│   └── ticketRoutes.js
├── controllers/
│   ├── userController.js
│   └── ticketController.js
├── services/
│   ├── userService.js      (auth + role logic)
│   └── ticketService.js    (status transitions, timeline events)
├── models/
│   ├── userModel.js        (in-memory users array, pre-seeded admin)
│   └── ticketModel.js      (in-memory tickets array)
└── middleware/
    ├── authMiddleware.js   (protect, requireRole)
    └── errorHandler.js
```

Each layer has one responsibility:
- **routes** map URL + method to a controller function
- **controllers** read request, call service, send response
- **services** hold business logic (validation, transitions, hashing, JWT)
- **models** hold the data (in-memory arrays + CRUD helpers)
- **middleware** runs before controllers (auth, role gate, error handler)

---

## 3. Data Model

### User
```js
{
  id: number,
  name: string,
  email: string,
  password: string,            // bcrypt hash
  role: 'admin' | 'technician' | 'staff'
}
```

**Seeding:** On startup, `userModel` pre-seeds one admin:
```
email: admin@hospital.com
password: admin123 (hashed at startup)
role: admin
```

**Self-registration:** `/register` accepts `role`, but only `'technician'` or `'staff'` are allowed. Any attempt to register with `role: 'admin'` returns 400.

### Ticket
```js
{
  id: number,
  title: string,
  description: string,
  priority: 'low' | 'medium' | 'high',
  category: 'ventilator' | 'monitor' | 'imaging' | 'other',
  equipmentId: string,         // free-text identifier
  hospitalLocation: string,    // e.g. "Ward 3B"
  status: 'open' | 'assigned' | 'in-progress' | 'resolved' | 'closed',
  reportedBy: number,          // user id, taken from JWT
  assigneeId: number | null,
  createdAt: ISOString,
  updatedAt: ISOString,
  events: [
    { type: 'created',        at: ISOString, by: userId },
    { type: 'assigned',       at: ISOString, by: userId, assigneeId: number },
    { type: 'status_changed', at: ISOString, by: userId, from: status, to: status }
  ]
}
```

The `events` array IS the timeline returned by `GET /api/tickets/:id`.

---

## 4. Endpoints

### Auth (public)

| Method | URL | Body | Response |
|---|---|---|---|
| POST | `/api/users/register` | `{ name, email, password, role? }` | `201 { message, userId }` |
| POST | `/api/users/login` | `{ email, password }` | `200 { token }` |

### Tickets (all require `Authorization: Bearer <token>`)

| Method | URL | Who can call | Body / Query | Response |
|---|---|---|---|---|
| POST | `/api/tickets` | any authenticated | `{ title, description, priority, category, equipmentId, hospitalLocation }` | `201 <ticket>` |
| GET | `/api/tickets` | any authenticated | optional `?status=`, `?assigneeId=` | `200 [<ticket>, ...]` |
| GET | `/api/tickets/:id` | any authenticated | — | `200 <ticket-with-events>` |
| PUT | `/api/tickets/:id/assign` | **admin only** | `{ assigneeId }` | `200 <ticket>` |
| PUT | `/api/tickets/:id/status` | **assigned technician** (admin for the `closed` step) | `{ status }` | `200 <ticket>` |

---

## 5. Permissions Matrix

| Action | admin | technician | staff |
|---|---|---|---|
| Register self | n/a (pre-seeded) | yes | yes |
| Login | yes | yes | yes |
| Create ticket | yes | yes | yes |
| List/view tickets | yes | yes | yes |
| Assign ticket | **yes** | no (403) | no (403) |
| Update status to `in-progress`, `resolved` | no (403) | **only if assigned to this ticket** | no (403) |
| Update status to `closed` | **yes** | no (403, even if assigned) | no (403) |

`authMiddleware` exports:
- `protect(req, res, next)` — decodes JWT, sets `req.user = { id, role }`, 401 on missing/invalid
- `requireRole(...roles)` — returns middleware that 403s if `req.user.role` not in allowed list

---

## 6. Status Transition Rules

```
open
  └─ (PUT /assign by admin) ──► assigned
                                  └─ (PUT /status by assigned tech) ──► in-progress
                                                                          └─ (PUT /status by assigned tech) ──► resolved
                                                                                                                 └─ (PUT /status by admin) ──► closed
```

**Validation rules in `ticketService`:**
- `/assign` is the *only* path from `open` to `assigned`. Setting `status: 'assigned'` via `/status` returns 400.
- Forward-only: any backward move (e.g., `resolved → in-progress`) is illegal — 400.
- Skipping steps (e.g., `assigned → resolved`) is illegal — 400.
- `closed` is terminal — no transitions out.
- Trying to assign a ticket whose status is not `open` returns 400 with `"ticket already assigned or beyond"`.

Error message format: `"illegal status transition: <from> → <to>"`.

---

## 7. Error Handling

All controllers wrap in `try/catch` and call `next(err)`. Service layer throws `Error` instances with a `.status` property. `errorHandler` middleware writes `{ message }` JSON with that status.

| Scenario | Status |
|---|---|
| Missing required field on create | 400 |
| Illegal status transition | 400 |
| Attempt to register as admin | 400 |
| Trying to assign non-`open` ticket | 400 |
| No/invalid/expired JWT | 401 |
| Wrong credentials on login | 401 |
| Non-admin calls `/assign` or sets `closed` | 403 |
| Non-assigned tech calls `/status` | 403 |
| Ticket not found | 404 |
| User (assignee) not found | 404 |
| Successful create | 201 |
| All other successes | 200 |

---

## 8. Project Setup

```bash
npm init -y
npm install express bcryptjs jsonwebtoken dotenv
```

`.env`:
```
PORT=3000
JWT_SECRET=<long_random_string>
```

`.gitignore`:
```
node_modules/
.env
.DS_Store
*.log
```

Run: `node app.js`. App pre-seeds the admin user, mounts `/api/users` and `/api/tickets`, attaches the error handler, listens on `PORT`.

---

## 9. Manual Test Plan

1. **Login as seeded admin** (`admin@hospital.com / admin123`) → save token.
2. **Register a technician** with `role: 'technician'`; **register a staff** with `role: 'staff'` (or omit role).
3. **Try registering as admin** → expect 400.
4. **Login as staff** → save staff token. Raise a ticket via `POST /api/tickets`. Confirm status `open` and one `created` event.
5. **Login as technician** → save tech token. Try `PUT /:id/assign` → expect 403.
6. **As admin**, `PUT /:id/assign` with technician's id → expect 200, status `assigned`, new `assigned` event.
7. **Try assigning the same ticket again** → expect 400.
8. **As staff**, `PUT /:id/status { status: 'in-progress' }` → expect 403.
9. **As technician** (assigned), `PUT /:id/status { status: 'resolved' }` (skip step) → expect 400.
10. **As technician**, `PUT /:id/status { status: 'in-progress' }` → 200. Then `resolved` → 200.
11. **As technician**, `PUT /:id/status { status: 'closed' }` → expect 403.
12. **As admin**, `PUT /:id/status { status: 'closed' }` → 200.
13. **As admin**, `PUT /:id/status { status: 'in-progress' }` (after closed) → expect 400.
14. **GET `/api/tickets/:id`** → confirm `events` array contains, in order: `created`, `assigned`, `status_changed (assigned→in-progress)`, `status_changed (in-progress→resolved)`, `status_changed (resolved→closed)`.
15. **GET `/api/tickets?status=closed&assigneeId=<techId>`** → confirm filter returns the closed ticket.

---

## 10. Out of Scope

- Persistence across restarts (in-memory only)
- Pagination on list endpoint
- Email notifications
- Multi-tenant / multi-hospital
- Soft delete / ticket archival
- Tests (manual curl-based test plan only, per 3-hour-exam scope)
