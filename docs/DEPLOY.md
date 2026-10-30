# QuickStay Deployment Guide

## Architecture

```
GitHub (main branch)
  │
  ├─► Render Backend  (Docker, Spring Boot)  → quickstay-5ro8.onrender.com
  ├─► Render Frontend (Static, Vite/React)   → quickstay-web-princesatapathy.onrender.com
  └─► Render PostgreSQL                      → internal hostname only
```

---

## Part 1 — First-Time Render Setup

### Step 1 — Create PostgreSQL Database

1. Render dashboard → **New** → **PostgreSQL**
2. Name: `quickstay-db`  |  Plan: Free  |  DB name: `quickstay`  |  User: `quickstay`
3. Click **Create Database**
4. Wait ~1 min for it to provision
5. Click into the DB service → **Info** tab → copy **Internal Database URL**
   - Format: `postgres://quickstay:PASSWORD@HOST.render.com:5432/quickstay`
   - Save this — you'll need it in Step 2

---

### Step 2 — Create Backend Service

1. Render dashboard → **New** → **Web Service**
2. Connect your GitHub repo
3. Settings:
   | Field | Value |
   |-------|-------|
   | Name | `quickstay-api` (or keep `quickstay-5ro8`) |
   | Runtime | **Docker** |
   | Branch | `main` |
   | Plan | Free |
   | Health Check Path | `/api/v1/actuator/health` |

4. **Environment Variables** — add all of these:

   | Key | Value |
   |-----|-------|
   | `DATABASE_URL` | paste Internal Database URL from Step 1 |
   | `SPRING_PROFILES_ACTIVE` | `prod` |
   | `JWT_SECRET_KEY` | any random 64-char string (generate: `openssl rand -base64 64`) |
   | `MANAGER_SIGNUP_CODE` | any secret code |
   | `RAZORPAY_KEY_ID` | your Razorpay key |
   | `RAZORPAY_KEY_SECRET` | your Razorpay secret |
   | `FRONTEND_URL` | `https://quickstay-web-princesatapathy.onrender.com` |

5. Click **Create Web Service**

> The Dockerfile CMD auto-converts `DATABASE_URL` → `SPRING_DATASOURCE_URL` on startup.
> You do NOT need to set `SPRING_DATASOURCE_URL` manually.

---

### Step 3 — Create Frontend Service

1. Render dashboard → **New** → **Static Site**
2. Connect same GitHub repo
3. Settings:
   | Field | Value |
   |-------|-------|
   | Name | `quickstay-web-princesatapathy` |
   | Branch | `main` |
   | Build Command | `npm --prefix frontend ci && npm --prefix frontend run build` |
   | Publish Directory | `./frontend/dist` |

4. **Environment Variables**:

   | Key | Value |
   |-----|-------|
   | `VITE_API_BASE_URL` | `https://quickstay-5ro8.onrender.com/api/v1` |

5. **Redirects/Rewrites** tab → Add rule:
   - Source: `/*`  |  Destination: `/index.html`  |  Type: Rewrite

6. Click **Create Static Site**

---

## Part 2 — Auto-Deploy (already working)

Render auto-deploys on every push to `main`. Nothing extra needed.

To **disable** auto-deploy: service → Settings → **Auto-Deploy** → Off.

To **manual deploy**: service → top-right → **Manual Deploy** → Deploy latest commit.

---

## Part 3 — GitHub Actions CI/CD

### Workflow A — Run tests on every PR (build validation)

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  backend-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Java 21
        uses: actions/setup-java@v4
        with:
          java-version: '21'
          distribution: 'temurin'
          cache: maven

      - name: Run backend tests
        run: ./mvnw test -q
        # Note: tests use Testcontainers — Docker is available on ubuntu-latest

  frontend-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install & build frontend
        run: |
          npm --prefix frontend ci
          npm --prefix frontend run build
```

---

### Workflow B — Trigger Render deploy after tests pass

Render exposes a **Deploy Hook URL** per service.

**Get the deploy hook:**
1. Render dashboard → backend service → **Settings** → scroll to **Deploy Hook**
2. Copy the URL (looks like `https://api.render.com/deploy/srv-xxx?key=yyy`)
3. Add to GitHub: repo → **Settings** → **Secrets and variables** → **Actions** → **New secret**
   - Name: `RENDER_DEPLOY_HOOK`
   - Value: paste the URL

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Render

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Render deploy
        run: |
          curl -X POST "${{ secrets.RENDER_DEPLOY_HOOK }}" \
            --fail \
            --max-time 30
        # Render picks up the latest main commit and redeploys
```

Or combine test + deploy in one file:

```yaml
name: CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          java-version: '21'
          distribution: 'temurin'
          cache: maven
      - run: ./mvnw test -q

  deploy:
    needs: test                   # only runs if tests pass
    if: github.ref == 'refs/heads/main'   # only on push to main, not PRs
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Render deploy
        run: curl -X POST "${{ secrets.RENDER_DEPLOY_HOOK }}" --fail
```

---

## Part 4 — Diagnosing Deployment Failures

### Backend won't start — checklist

1. **Render dashboard → backend service → Logs tab**
   - Look for `Caused by:` lines — that's the real error

2. **`Connection to localhost:5432 refused`**
   - `DATABASE_URL` env var missing or empty
   - Fix: Environment tab → verify `DATABASE_URL` is set and not blank

3. **`password authentication failed`**
   - Wrong DB credentials in `DATABASE_URL`
   - Fix: Go to DB service → Info → copy fresh Internal Database URL → update env var

4. **`relation "xxx" does not exist`**
   - Flyway migrations haven't run (or DB is fresh/empty)
   - Fix: Usually auto-fixed on next deploy — Flyway runs on startup. If not, check Flyway migration files in `src/main/resources/db/migration/`

5. **`FlywayException: Validate failed`**
   - DB has migrations that don't match current migration files
   - Fix: Check if someone deleted/renamed a migration file

6. **Frontend shows blank page / 404**
   - Missing rewrite rule `/* → /index.html`
   - Fix: Render → frontend service → Redirects/Rewrites → add rule

7. **Frontend can't reach backend (CORS or network error)**
   - `VITE_API_BASE_URL` wrong or missing
   - Fix: frontend service → Environment → check value matches backend URL exactly

---

## Part 5 — Environment Variables Reference

### Backend (Render)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | YES | Full postgres:// URL from Render DB internal URL |
| `SPRING_PROFILES_ACTIVE` | YES | `prod` |
| `JWT_SECRET_KEY` | YES | Secret key for signing JWTs |
| `MANAGER_SIGNUP_CODE` | YES | Code required to register as hotel manager |
| `RAZORPAY_KEY_ID` | YES | Razorpay API key ID |
| `RAZORPAY_KEY_SECRET` | YES | Razorpay API secret |
| `FRONTEND_URL` | YES | Full URL of frontend (for CORS) |

### Frontend (Render)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_BASE_URL` | YES | Backend URL + `/api/v1` e.g. `https://quickstay-5ro8.onrender.com/api/v1` |

---

## Part 6 — Free Tier Gotchas

| Problem | Cause | Fix |
|---------|-------|-----|
| Backend sleeps after 15 min | Render free plan spins down idle services | Keepalive workflow in `.github/workflows/keepalive.yml` pings every 5 min |
| DB deleted after 30–90 days | Render free PostgreSQL expires | Create new DB, update `DATABASE_URL` in backend env vars |
| Cold start takes 60–90s | First request after sleep wakes the service | Normal — keepalive reduces frequency |
| Build timeout | Maven download on cold build | First build slow (~10 min). Subsequent builds faster |

---

## Quick Reference — Common URLs

| Service | URL |
|---------|-----|
| Backend API | `https://quickstay-5ro8.onrender.com/api/v1` |
| Backend Health | `https://quickstay-5ro8.onrender.com/api/v1/actuator/health` |
| Swagger UI | `https://quickstay-5ro8.onrender.com/api/v1/swagger-ui.html` |
| Frontend | `https://quickstay-web-princesatapathy.onrender.com` |
