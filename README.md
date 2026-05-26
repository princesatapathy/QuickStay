# QuickStay — Full-Stack Hotel Booking Platform

A full-featured hotel booking application built with Spring Boot 3 and React, showcasing real-world engineering patterns.

**Live Demo:** _add Vercel URL after deploy_  
**Backend API Docs:** _add Railway URL_/api/v1/swagger-ui.html

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Java 21, Spring Boot 3.4, Spring Security (JWT), JPA/Hibernate |
| Database | PostgreSQL, Flyway migrations |
| Payments | Razorpay Orders + signature verification |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Deployment | Railway (backend), Vercel (frontend) |

---

## Key Features

### Guest Flow
- **Search** — find hotels by city, date range, guest count with real-time min-price display
- **Dynamic Pricing** — decorator chain (surge, occupancy, urgency, holiday pricing) recalculates hourly
- **Booking** — pessimistic-locked inventory prevents double-booking
- **Guest Management** — save/manage guest profiles, attach to bookings
- **Booking Lifecycle** — `RESERVED → GUESTS_ADDED → CONFIRMED / CANCELLED`

### Admin (Hotel Manager) Flow
- Create/edit/activate hotels with star ratings and contact info
- Add room types with base price, count, and amenities
- 365-day inventory auto-initialized per room on creation
- Per-day surge charge editing on inventory table

### Engineering Highlights
- **Pessimistic Write Locking** on inventory rows — prevents race conditions under high concurrency
- **Inventory-backed Search** — only returns hotels when one room is available for every requested date
- **Decorator Pattern** — pricing strategies wrap each other; new strategies added without touching existing code (Open/Closed)
- **JWT + HttpOnly Refresh Cookie** — access token in localStorage, refresh token in cookie for XSS protection
- **Abandoned Booking Cleanup** — RESERVED bookings older than 10 min auto-expire, releasing inventory
- **Flyway** migrations for safe, versioned DB schema evolution
- **Testcontainers** for integration tests with real PostgreSQL

---

## Local Development

### Prerequisites
- Java 21, Maven
- Node.js 18+, npm
- PostgreSQL on port 5432 (DB: `airbnb`, user: `postgres`)

### Backend
```bash
# Required local environment
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/airbnb
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=your_local_password
JWT_SECRET_KEY=replace_with_a_32_plus_character_secret
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=your_razorpay_test_secret
MANAGER_SIGNUP_CODE=local-manager-invite
FRONTEND_URL=http://localhost:3000

# Build
./mvnw clean package -DskipTests

# Run (dev profile)
java -jar target/AirBnb-0.0.1-SNAPSHOT.jar --spring.profiles.active=dev
```

Base URL: `http://localhost:8080/api/v1`  
Swagger UI: `http://localhost:8080/api/v1/swagger-ui.html`

### Frontend
```bash
cd frontend
npm install
npm run dev
```

App: `http://localhost:3000`

---

## Docker Compose

Run the full app behind one published frontend port:

```bash
docker compose up --build
```

Open: `http://localhost:3000`

Compose starts:
- `frontend`: nginx serving the React build and proxying `/api` to the backend
- `backend`: Spring Boot API, internal-only on the Docker network
- `db`: PostgreSQL with a persistent `postgres_data` volume

The backend is not published to the host by default. API calls go through the frontend container at `http://localhost:3000/api/v1`.

Useful commands:

```bash
docker compose logs -f backend
docker compose down
docker compose down -v
```

Default local manager invite code in Compose: `local-manager`

---

## Deployment

### Backend → Railway
1. Push to GitHub
2. New Railway project → Deploy from GitHub → select this repo
3. Railway auto-detects Dockerfile (multi-stage Maven + JRE build)
4. Add PostgreSQL plugin → Railway injects `DATABASE_URL`
5. Set env vars:
   ```
   SPRING_PROFILES_ACTIVE=prod
   SPRING_DATASOURCE_URL=jdbc:postgresql://...
   SPRING_DATASOURCE_USERNAME=...
   SPRING_DATASOURCE_PASSWORD=...
   JWT_SECRET_KEY=replace_with_a_32_plus_character_secret
   FRONTEND_URL=https://your-frontend.vercel.app
   MANAGER_SIGNUP_CODE=generate_a_private_invite_code
   RAZORPAY_KEY_ID=rzp_test_or_live_key_from_dashboard
   RAZORPAY_KEY_SECRET=secret_from_razorpay_dashboard
   ```

### Frontend → Vercel
1. New Vercel project → import `frontend/` as root directory
2. Set env var:
   ```
   VITE_API_BASE_URL=https://your-app.railway.app/api/v1
   ```
3. Deploy — Vercel detects Vite automatically

---

## API Endpoints

| Group | Endpoints |
|---|---|
| Auth | `POST /auth/signup`, `/auth/signup-manager`, `/auth/login`, `/auth/refresh`, `/auth/logout` |
| Hotels | `GET /hotels/search`, `GET /hotels/{id}/info` |
| Booking | `GET /bookings/{id}`, `POST /bookings/init`, `/bookings/{id}/addGuests`, `/bookings/{id}/payments`, `/bookings/{id}/verify-payment`, `/bookings/{id}/mock-confirm`, `/bookings/{id}/cancel` |
| User | `GET /users/profile`, `/users/myBookings`, `GET/POST/PUT/DELETE /users/guests` |
| Admin Hotels | `GET/POST /admin/hotels`, `GET/PUT/DELETE /admin/hotels/{id}`, `PATCH /admin/hotels/{id}/activate` |
| Admin Rooms | `GET/POST /admin/hotels/{id}/rooms`, `PUT/DELETE /admin/hotels/{id}/rooms/{roomId}` |
| Admin Inventory | `GET/PATCH /admin/inventory/rooms/{roomId}` |

---

## Architecture

```
┌─────────────┐    JWT     ┌─────────────────────────────┐
│  React SPA  │◄──────────►│  Spring Boot API            │
│  (Vercel)   │  REST/JSON │  (Railway)                  │
└─────────────┘            │                             │
                           │  ┌─────────┐ ┌──────────┐  │
                           │  │ Service │ │ Security │  │
                           │  └────┬────┘ └──────────┘  │
                           │       │                     │
                           │  ┌────▼──────────────────┐  │
                           │  │ PostgreSQL (Railway)  │  │
                           │  │ + Flyway migrations   │  │
                           │  └───────────────────────┘  │
                           └─────────────────────────────┘
```
