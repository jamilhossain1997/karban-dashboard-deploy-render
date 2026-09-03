# Mini Kanban Board

A full-stack Kanban board with token-based auth, board sharing/access control, and
drag-and-drop task management with stable, conflict-free ordering.

**Stack:** Next.js (TypeScript, Tailwind, App Router) · NestJS (TypeScript) · PostgreSQL + Prisma · Docker

```
kanban-board/
├── backend/    NestJS API (auth, boards, columns, tasks)
├── frontend/   Next.js app (login, boards list, board view with drag-and-drop)
└── docker-compose.yml
```

---

## Quick start (Docker — recommended)

Requires Docker + Docker Compose.

```bash
git clone <this-repo>
cd kanban-board
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:4000/api
- Postgres: localhost:5432 (user `kanban` / password `kanban` / db `kanban`)

The backend container runs `prisma migrate deploy` automatically on boot, so the schema
is created for you — no manual migration step needed. Register a new account at
http://localhost:3000/register to get started.

To reset the database entirely: `docker compose down -v`.

---

## Using a managed Postgres provider (e.g. Aiven) instead of local/Docker Postgres

If you'd rather point the app at a managed Postgres instance (Aiven, Supabase, RDS,
etc.) instead of the `db` container:

1. Save the provider's CA certificate to `backend/certs/<name>.pem` (this path is
   gitignored, so it's safe to keep the real cert there locally).
2. Set `DATABASE_URL` to include `sslmode=verify-ca` and `sslrootcert=<path-to-cert>`,
   e.g. for Aiven:
   ```
   DATABASE_URL="postgresql://avnadmin:<password>@<host>:<port>/defaultdb?sslmode=verify-ca&sslrootcert=./certs/aiven-ca.pem"
   ```
   See `backend/.env.example` for the exact commented-out example.
3. **Without Docker:** put that `DATABASE_URL` in `backend/.env`, then run
   `npx prisma generate && npx prisma migrate deploy && npm run start:dev` as normal
   (the `sslrootcert` path is relative to `backend/`, where these commands run).
4. **With Docker:** create a `.env` file in the project root (same folder as
   `docker-compose.yml`) containing `DATABASE_URL=...` with `sslrootcert=/app/certs/aiven-ca.pem`
   (the container path), then start with both compose files:
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.aiven.yml up --build backend frontend
   ```
   `docker-compose.aiven.yml` skips the local `db` container, mounts `backend/certs`
   into the backend container, and overrides `DATABASE_URL` with your value.

**Never commit a real password or connection string** — `backend/.env`, the
project-root `.env`, and `backend/certs/*.pem` are all gitignored already.

---

## Running locally without Docker

### 1. Database

Start a local PostgreSQL instance (or use Docker just for the DB: `docker compose up db`).

### 2. Backend

```bash
cd backend
cp .env.example .env      # edit DATABASE_URL / JWT_SECRET if needed
npm install
npx prisma migrate deploy # creates the schema
npm run start:dev         # http://localhost:4000/api
```

**Sample `.env`:**
```
DATABASE_URL="postgresql://kanban:kanban@localhost:5432/kanban?schema=public"
JWT_SECRET="replace-with-a-long-random-string"
JWT_EXPIRES_IN="7d"
PORT=4000
CORS_ORIGIN="http://localhost:3000"
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env      # points at the backend API
npm install
npm run dev                # http://localhost:3000
```

**Sample `.env`:**
```
NEXT_PUBLIC_API_URL="http://localhost:4000/api"
```

---

## Architecture & design decisions

### Data model

```
User ──< BoardMember >── Board ──< Column ──< Task
```

- **`Board`** has a single `ownerId`, but access is checked through **`BoardMember`**
  (a join table with `role: OWNER | EDITOR | VIEWER`). The owner is also materialized
  as a `BoardMember` row so every authorization check — for boards, columns, *and*
  tasks — is a single query against one table, rather than special-casing "is this
  the owner" everywhere.
- **`Column`** and **`Task`** each carry a `position: Float` instead of an integer
  index.

### Task/column ordering — fractional indexing

Reordering is implemented with **fractional indexing**: a new position is the
midpoint between its two new neighbors (`(prev + next) / 2`), with a gap of 1000
used when inserting at an end. This means:

- Moving or reordering an item only ever writes **that one row** — siblings are
  never renumbered.
- Two people dragging *different* tasks at the same time can't produce a corrupted
  order, since neither write touches the other's row.
- The read-neighbors-then-write step for task moves runs inside a Prisma
  `$transaction`, so a single move is atomic even under concurrent requests.

See `backend/src/common/position.util.ts` and `backend/src/tasks/tasks.service.ts`.

### Task movement API

A single endpoint handles both cases the assessment calls out:

```
PATCH /api/tasks/:id/move
Body: { "targetColumnId": "<column-id>", "targetIndex": 0 }
```

Reordering within a column and moving across columns are the same operation —
"place this task at index N in column X" — so one endpoint (and one code path)
covers both, rather than a separate reorder-in-place endpoint.

### Authorization

`BoardAccessService` (`backend/src/boards/board-access.service.ts`) centralizes every
access check:

- `requireViewAccess` — any member (owner/editor/viewer) can read.
- `requireEditAccess` — owner/editor only; viewers are blocked from mutations.
- `requireOwnerAccess` — owner only (deleting a board, sharing/unsharing members).

Columns and tasks resolve their parent board (`boardIdForColumn` / `boardIdForTask`)
and run the same checks, so there's no separate authorization logic per resource.
Boards a user has no membership in return **404**, not 403, so their existence isn't
leaked to unauthorized users.

### Frontend

- `@dnd-kit/core` + `@dnd-kit/sortable` power drag-and-drop for both column reordering
  (horizontal) and task reordering/cross-column moves (vertical, per column).
- Moves are applied **optimistically** to local state on drop, then persisted via the
  move API; on failure the board is re-fetched to resync.
- A lightweight `AuthProvider` (`frontend/src/lib/auth-context.tsx`) stores the JWT in
  `localStorage` and attaches it to every API request via an axios interceptor; a 401
  response clears the session and redirects to `/login`.

---

## API summary

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | Create an account, returns a JWT |
| POST | `/api/auth/login` | Log in, returns a JWT |
| GET | `/api/boards` | List boards you own or are a member of |
| POST | `/api/boards` | Create a board (you become `OWNER`) |
| GET | `/api/boards/:id` | Get a board with its columns & tasks |
| PATCH | `/api/boards/:id` | Update title/description (editor+) |
| DELETE | `/api/boards/:id` | Delete a board (owner only) |
| POST | `/api/boards/:id/share` | Invite a registered user by email (owner only) |
| DELETE | `/api/boards/:id/members/:userId` | Remove a collaborator (owner only) |
| POST | `/api/boards/:boardId/columns` | Create a column |
| PATCH | `/api/columns/:id` | Rename a column |
| PATCH | `/api/columns/:id/reorder` | Move a column to index N on the board |
| DELETE | `/api/columns/:id` | Delete a column |
| POST | `/api/columns/:columnId/tasks` | Create a task |
| PATCH | `/api/tasks/:id` | Edit a task's title/description |
| PATCH | `/api/tasks/:id/move` | Move a task (same-column reorder or cross-column) |
| DELETE | `/api/tasks/:id` | Delete a task |
| GET | `/api/users/search?q=` | Search users by name/email (for sharing UI) |

All routes except `/api/auth/*` require `Authorization: Bearer <token>`.

---

## Notes / possible follow-ups

- No refresh-token rotation — the JWT is long-lived (7 days) for simplicity; a
  production version would add short-lived access tokens + refresh tokens.
- No real-time sync (WebSockets) between simultaneous viewers of the same board —
  each client reflects only its own optimistic updates until it reloads.
- No automated test suite is included given the 4-day scope; `tsc --noEmit` is clean
  on both apps and the frontend has a verified production build.
