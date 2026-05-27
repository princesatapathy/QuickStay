# QuickStay - Full-Stack Hotel Booking Platform

QuickStay is a hotel booking application built with Spring Boot 3 and React. It includes guest booking flows, manager/admin hotel management, inventory locking, JWT auth, Razorpay payments, Flyway migrations, and PostgreSQL persistence.

**Live Demo:** https://quickstay-web-princesatapathy.onrender.com
**Backend API Docs:** https://quickstay-api-princesatapathy.onrender.com/api/v1/swagger-ui.html

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Java 21, Spring Boot 3.4, Spring Security, JPA/Hibernate |
| Database | PostgreSQL, Flyway |
| Payments | Razorpay Orders + signature verification |
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| Deployment | Render Blueprint: API, static frontend, PostgreSQL |

## Key Features

- Hotel search by city, dates, and guest count.
- Dynamic pricing with surge, occupancy, urgency, and holiday strategies.
- Pessimistic inventory locking to prevent double booking.
- Guest profile management and booking guest assignment.
- JWT access token plus HttpOnly refresh token auth flow.
- Hotel manager admin flows for hotels, rooms, activation, inventory, and reports.
- Flyway-managed schema and Testcontainers integration tests.

## Local Development

### Prerequisites

- Java 21
- Node.js 18+
- PostgreSQL on port 5432

### Backend

```bash
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/airbnb
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=your_local_password
JWT_SECRET_KEY=replace_with_a_32_plus_character_secret
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=your_razorpay_test_secret
MANAGER_SIGNUP_CODE=local-manager-invite
FRONTEND_URL=http://localhost:3000

./mvnw clean package -DskipTests
./mvnw spring-boot:run
```

Base URL: http://localhost:8080/api/v1
Swagger UI: http://localhost:8080/api/v1/swagger-ui.html

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:3000

## Docker Compose

Run the full app behind one published frontend port:

```bash
docker compose up --build
```

Open: http://localhost:3000

Compose starts:

- `frontend`: nginx serving the React build and proxying `/api` to backend
- `backend`: Spring Boot API on the Docker network
- `db`: PostgreSQL with a persistent `postgres_data` volume

Useful commands:

```bash
docker compose logs -f backend
docker compose down
docker compose down -v
```

Default local manager invite code in Compose: `local-manager`

## Render Deployment

This repo uses `render.yaml` to create three Render resources:

- `quickstay-api-princesatapathy`: Spring Boot API from the root Dockerfile
- `quickstay-web-princesatapathy`: React static site from `frontend/dist`
- `quickstay-db`: Render PostgreSQL

The Blueprint uses Render free tier by default. Free web services can sleep when idle, and free Postgres is suitable for demos/testing only.

### Deploy

1. Commit and push this repo to GitHub.
2. Open the Blueprint:
   https://dashboard.render.com/blueprint/new?repo=https://github.com/princesatapathy/QuickStay
3. Fill the secret values Render prompts for:
   ```env
   RAZORPAY_KEY_ID=rzp_test_or_live_key_from_dashboard
   RAZORPAY_KEY_SECRET=secret_from_razorpay_dashboard
   ```
4. Apply the Blueprint.
5. Verify:
   ```bash
   curl https://quickstay-api-princesatapathy.onrender.com/api/v1/actuator/health
   ```

If Render assigns different service URLs, update these environment variables in Render:

- API service: `FRONTEND_URL`
- Frontend service: `VITE_API_BASE_URL`

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

## Notes

- `Dockerfile`, `compose.yaml`, `frontend/Dockerfile`, and `frontend/nginx.conf` are intentionally kept for local Docker workflows.
- Render injects `DATABASE_URL`; the Docker startup command converts it into the JDBC URL Spring Boot expects.
- Flyway runs automatically on backend startup.
