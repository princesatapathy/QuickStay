# AGENTS.md: QuickStay

Hotel booking app. Spring Boot REST API (`src/`, package `com.quickstay`) plus a React SPA (`frontend/`).
Java 21, Maven, PostgreSQL, Flyway, JWT, Razorpay (Stripe is NOT used). Deployed on Render.

Read this before changing anything. Keep it current: if you learn something non-obvious, add it here.

## Repository layout

```
pom.xml, mvnw, src/        Spring Boot backend (kept at the repo root on purpose, see "Deploy")
frontend/                  React 19 + Vite + Tailwind v4 SPA (own Dockerfile, nginx.conf)
docs/DEPLOY.md             Render deployment guide
render.yaml                Render blueprint (API as Docker, SPA as static site from frontend/)
compose.yaml, Dockerfile   Local full-stack Docker run (separate Postgres 16, not your local one)
.github/workflows/         keepalive.yml pings the free Render service
.env.example               Placeholders only. NEVER put real secrets here, it is tracked by git.
```

Do not add screenshots, logs, `hs_err_pid*.log` or scratch scripts to the repo. `.gitignore` covers them.

## Run it locally

Backend, from the repo root, **on port 8081** (the Vite dev proxy targets 8081; the default 8080 will not be found):

```powershell
./mvnw spring-boot:run "-Dspring-boot.run.arguments=--server.port=8081"
```

Frontend (Vite dev server on port 3000, proxies `/api` to the backend):

```powershell
cd frontend; pnpm install; pnpm dev
```

- API base: `http://localhost:8081/api/v1` (context path `/api/v1`). Swagger UI: `/api/v1/swagger-ui.html`.
- Default profile is `dev` (`spring.profiles.default=dev`). `ddl-auto=update` in dev, `validate` in prod.
- Tests: `./mvnw verify` runs unit tests (Surefire, `*Test`) and integration tests (Failsafe, `*IT`) and writes a JaCoCo report to `target/site/jacoco/index.html`. Database tests need a real Postgres and **fail, never skip**, if none is available: either start Docker (Testcontainers), or set `TEST_DATABASE_URL=jdbc:postgresql://localhost:5432/airbnb_test` (plus `TEST_DATABASE_USER`, default `postgres`, and `TEST_DATABASE_PASSWORD`). The external database's schema is **wiped before each run**, so its name must contain `test`; the harness refuses anything else. Never point it at `airbnb`.
- Frontend checks: `pnpm test` (Vitest + Testing Library, jsdom, threads pool because the forks pool fails to start on Windows with recent Node), `pnpm typecheck`, `pnpm build` (runs `tsc -b` first). Put tests next to the code as `*.test.tsx`.

## Environment variables (names only, values are secrets)

| Variable | Used for |
|---|---|
| `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD` | Database. URL defaults to `jdbc:postgresql://localhost:5432/airbnb`. The password has **no default**: unset means "no password provided" and the app fails on start. |
| `JWT_SECRET_KEY` | JWT signing (`jwt.secretKey`). `render.yaml` generates one. |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Payments. Test keys locally. |
| `MANAGER_SIGNUP_CODE` | Blank disables public hotel-manager signup. |
| `FRONTEND_URL` | CORS origin. |
| `PORT` | Server port (prod). |
| `VITE_API_BASE_URL` | Frontend API base (build time). |

## Local database gotchas

- Local DB is PostgreSQL on `localhost:5432`, database `airbnb`, user `postgres`. Do not assume the password; ask the user. Never commit it, never print it.
- **Flyway is strict.** Migrations live in `src/main/resources/db/migration/`. **Never edit a migration that has already been applied**: Flyway stores a checksum and refuses to start ("Migration checksum mismatch"). Add `V2__...sql` instead. `V1__init.sql` was edited after some databases were created (four `hotel` columns renamed from `contact_info_*` to `address`, `phone_number`, `email`, `location`); a database created before that needs its stored checksum for version 1 updated (what `flyway repair` does) before the app will start. Back up first and do not drop a database that holds data.
- `Invalid method Code length 0 in class file ...` on startup means `target/` is corrupted (an interrupted or overlapping build). Run `./mvnw clean compile` and do not run two Maven builds at once.
- Windows PowerShell: quote `-D...` arguments as in the command above.
- The dev machine's C: drive is low on space. Keep the pnpm store on D: (`pnpm install --store-dir D:/pnpm-store`) so `node_modules` hard-links from it instead of copying.

## Backend architecture (what matters)

```
Controller/  Service/(Interfaces, *Impl)  Repositories/  Entities/  Dto/  Enums/  Security/  Strategy/  Config/  Advice/  Utils/
```

- **Inventory = room x date.** `InventoryEntity` has one row per room per day; `initializeRoomForAYear()` creates 365 on room creation or hotel activation.
- **Search reads `HotelMinPriceEntity`** (min price per hotel per day), refreshed hourly by `PricingUpdateService`. Bookings write to `InventoryRepository`. Keeps read load off the big table.
- **Dynamic pricing** is a decorator chain in `PricingService`: Base, Surge, Occupancy, Urgency, Holiday. Add a new strategy by implementing `PricingStrategy` and wrapping it there.
- **No double booking:** `findAndLockAvailableInventory()` uses `PESSIMISTIC_WRITE`. Do not replace it with optimistic locking.
- **Responses:** `GlobalResponseHandler` wraps every success in `ApiResponse<T>`; errors come from the `@RestControllerAdvice` as `ApiError`. No try/catch in controllers. The frontend reads `res.data.data`.
- **Prices are `BigDecimal`.** DTO mapping uses ModelMapper (`MapperConfig`). DI is `@RequiredArgsConstructor` with `final` fields.
- **Roles:** `GUEST`, `HOTEL_MANAGER`. `/admin/**` is manager-only; `/bookings/**` and `/users/**` need auth; the rest is public. Access token in the response body, refresh token in an HttpOnly cookie; stateless.

### Booking flow

`RESERVED -> GUESTS_ADDED -> PAYMENTS_PENDING -> CONFIRMED` (or `CANCELLED`).

1. `POST /bookings/init` locks inventory and creates the booking as `RESERVED` (the 10-minute hold).
2. `POST /bookings/{id}/addGuests`
3. `POST /bookings/{id}/payments` creates the Razorpay order, then `POST /bookings/{id}/verify-payment` checks the signature.
4. `POST /webhook/payment` is the server-to-server confirmation.
5. `POST /bookings/{id}/cancel` releases inventory.

`BookingServiceImpl.hasBookingExpired()` invalidates stale bookings; expired bookings throw "Booking has already expired".
`POST /bookings/{id}/mock-confirm` is meant to be dev-only, but the `@Profile("dev")` on that controller method has no effect (Spring only honours `@Profile` on classes and `@Bean` methods), so today it is reachable in every profile: a known blocker, fixed on `fix/payment-security` (it will be gated by `app.mock-payments.enabled`). Never call it outside dev. The backend adds **no fees or taxes**: `amount` is the final total. Refunds are manual via the Razorpay dashboard. Do not show fake fees or promise "free cancellation" in the UI.

## Frontend (`frontend/`)

- **Package manager is pnpm** (pinned in `package.json` `packageManager`). Never run `npm install` or commit a `package-lock.json`.
- React 19, Vite, Tailwind v4, `motion/react`, `@phosphor-icons/react`, `date-fns`, axios, react-router.
- Layout: `src/pages/` (Home, Search, HotelDetail, BookingDetail, Login, Register, Profile, AdminPanel), `src/components/ui|layout|motion|home`, `src/api/` (typed axios wrappers, token refresh in `client.ts`), `src/context/AuthContext.tsx`, `src/lib/` (`images.ts`, `dates.ts`).
- `AdminPanel` is a single file driven by local `page` state, not router routes. Some admin calls use the raw axios client because no wrapper exists.
- Navbar is transparent over the Home hero and solid white elsewhere. The search icon opens `SearchDrawer` (calendar range picker). `Home` uses `SearchForm` in the hero.

### Design system

- **Tokens live in `src/index.css` `@theme`.** Use utilities (`bg-night`, `text-ink`, `bg-accent`, `text-star`), never raw hex in components. Palette: neutral white and slate, near-black actions, orange stars only. Fonts: Playfair Display (headings) and Outfit (body), self-bundled via Fontsource (Latin only).
- Type scale classes `.t-display`, `.t-h2`, `.t-h3`, `.t-label`. Root font size is fluid (`clamp`), so use `rem` and the scale classes, not fixed px.
- **Radii:** controls (buttons, inputs, chips) `rounded-lg`, cards `rounded-xl`. Do not mix other radii.
- Shared kit: `Button`/`ButtonLink`, `Input`/`Select`/`PasswordInput`/`CheckboxGrid`, `Card`, `Banner`, `StatusPill`, `Stars`, `Skeleton`, `EmptyState`, `Dialog`, `Logo`, `Reveal`/`CountUp`/`PageTransition`. Reuse them; do not copy class strings between pages.
- **CSS layering trap:** plain (unlayered) CSS beats Tailwind utilities. Never add `margin: 0` resets, or global `h1`/`p`/`a`/`img` rules, outside `@layer base`. This once silently disabled every `mb-*` on the site, and an unlayered `a { color: inherit }` made anchor-based buttons (`ButtonLink`) render black text on a black background.
- Motion respects reduced motion (`MotionConfig reducedMotion="user"`; scroll drift is disabled when `useReducedMotion()` is true). Animate only `transform` and `opacity`.
- **No fake content.** No invented ratings, "Best Seller" badges, offers with dates, testimonials, review counts or newsletter forms that do nothing. Show real API data or hide the section. No em-dashes in visible copy.
- A mouse wheel over a focused number input changes its value; `Input` blurs it on wheel. Keep that.

## Deploy

Render auto-deploys on every commit to `main` (`render.yaml`, `autoDeployTrigger: commit`). Do not push breaking changes casually. The backend stays at the repo root because `render.yaml`, `Dockerfile` and `compose.yaml` assume it. The SPA builds with `corepack enable && pnpm --dir frontend install --frozen-lockfile && pnpm --dir frontend build`, so **`frontend/pnpm-lock.yaml` must stay in sync with `package.json`**. Details: `docs/DEPLOY.md`.

## Rules for agents

- Do not commit or push unless asked. Do not commit secrets or real values in `.env.example`.
- Do not recreate, drop or reset the local database without asking: it holds real test data.
- Do not edit applied Flyway migrations (see above).
- Verify UI changes in a browser at desktop and phone width, and run `npx tsc -b` before saying a frontend change is done.
