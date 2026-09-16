# FixNow

FixNow is an Expo/TypeScript MVP for a local home-services marketplace. It supports **secure customer accounts**, AI-assisted problem triage, evidence upload, location-based technician matching, technician verification and availability, controlled job progression, request chat, cash-payment confirmation, reviews, and a responsive administration surface.

> **MVP safety statement:** The diagnosis assistant is an estimate, not a professional inspection. The interface and server prompt direct users to emergency services for fire, smoke, sparking, gas smell, flooding, shocks, or immediate danger.

## Included MVP capabilities

| Role | Implemented capabilities |
|---|---|
| Customer | Secure sign-in, service catalogue, GPS service location, optional photos/video, AI preliminary diagnosis, scored technician comparison, request status tracking, request chat, cash payment confirmation, review and service history. |
| Technician | Secure profile creation, service selection, verification-evidence upload, approval-gated availability, foreground location sharing, assigned-job queue, job acceptance, and safe status updates. |
| Administrator | Platform metrics, technician verification queue, active-request monitor, and review visibility moderation. |

The mobile application uses Expo Router. Its `/admin` route is responsive in the web build and provides the initial administrator dashboard. The managed backend is a TypeScript tRPC service backed by Drizzle/MySQL and secure S3-compatible storage.

## Architecture

The full architecture, entity relationships, state machine, matching rules, route map, and phased delivery plan are documented in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

```text
Expo mobile / web client
        │ tRPC with authenticated session
        ▼
TypeScript API ── Drizzle ORM ── Managed MySQL/TiDB
        │              │
        │              ├── marketplace records and notifications
        ├── built-in LLM diagnosis service
        └── S3-compatible secure media storage
```

## Project structure

```text
app/                    Expo Router screens and tab navigation
  (tabs)/               Customer, jobs, technician and profile tabs
  request/              Request composer and live detail
  chat/                 Request-linked customer/technician chat
  diagnosis.tsx         AI preliminary diagnosis
  admin.tsx             Responsive administrator surface
components/             Reusable accessible cards, controls and layouts
hooks/                  Authentication, theme, and media-upload hooks
server/                 tRPC procedures, storage layer and database helpers
drizzle/                Drizzle schema and generated migrations
shared/                 State machine, matching utility and shared domain types
tests/                  State-machine, matching and authentication tests
docs/                   Architecture and operational documentation
```

## Installation

### Prerequisites

Install Node.js 22+ and pnpm 9+. The hosted Manus project already provides its managed database, OAuth, secure server credentials, LLM proxy, and storage proxy. For local work, you need an equivalent MySQL-compatible `DATABASE_URL` and an authentication configuration.

```bash
pnpm install
```

### Configure environment values

The managed environment injects these server-side values; do **not** bundle secrets into the Expo client.

| Value | Scope | Purpose |
|---|---|---|
| `DATABASE_URL` | Server only | MySQL/TiDB database connection |
| `JWT_SECRET` | Server only | Secure session signing |
| `BUILT_IN_FORGE_API_URL` / `BUILT_IN_FORGE_API_KEY` | Server only | Built-in LLM and secure object storage |
| `EXPO_PUBLIC_API_BASE_URL` | Client safe | API base URL for tRPC |
| `EXPO_PUBLIC_APP_ID` / OAuth URLs | Client safe | OAuth entry configuration |

The platform manages environment configuration through the project secrets interface, so an `.env.example` file is intentionally not committed. Use the table above as the configuration template and never add an LLM, storage, payment, or map secret under an `EXPO_PUBLIC_*` name.

### Database setup

The current hosted project already has the reviewed migration applied. For a new MySQL-compatible environment, generate and apply the migration before starting the API:

```bash
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

The migration in `drizzle/0001_curly_gabe_jones.sql` creates the marketplace entities and extends users with customer/technician profile fields. Service categories are idempotently initialized by the catalogue helper when the catalogue is first read.

Populate four realistic, verified, online local technician profiles for matching and administrator testing with:

```bash
pnpm seed
```

The seed is idempotent and deliberately uses `*.local` development identities; it never creates real customer accounts or production credentials.

## Run the app

```bash
# Start the Expo web client and API server together
pnpm dev

# Type-check
pnpm check

# Run unit tests
pnpm test

# Open the native bundle on a connected device/emulator
pnpm android
# or
pnpm ios
```

The client supports Android, iOS, and web. Device photo selection and live GPS require user consent. In Expo Go, foreground location and local UI flows work; production remote push setup and background location require a development or release build plus platform credentials.

## Authentication

FixNow currently uses **Manus OAuth** for secure account sessions:

1. The customer or technician taps **Continue securely**.
2. OAuth authenticates in the system browser and returns to the native callback/deep link or web session.
3. Native session tokens live in `expo-secure-store`; web sessions use secure HTTP-only cookies.
4. All personal marketplace writes use an authenticated tRPC procedure and perform ownership checks.

Email/password, forgot-password, and phone OTP have not been imitated in the app. Add them only through an approved identity provider that supports hashing, abuse prevention, consent, and recovery; the current OAuth boundary keeps the first release safer.

## API structure

All API traffic is type-safe tRPC at `/api/trpc`. Key routers are:

| Router | Procedures |
|---|---|
| `catalog` | List active categories; administrator category creation |
| `profile` | Current user profile, addresses, in-app notifications |
| `uploads` | Authenticated size- and type-bounded request/verification media upload |
| `diagnosis` | Server-only preliminary AI assessment with image context support |
| `technicians` | Profile registration, availability, foreground location, matching and job queue |
| `requests` | Create, list, select technician, accept, transition, cancel and get a request |
| `messages` | Request access-controlled list and send operations |
| `payments` | Cash payment record and confirmation; card/wallet integration boundary |
| `reviews` | Paid-job review creation and rating aggregation |
| `admin` | Metrics, verification actions, request monitoring and review moderation |

### Controlled request lifecycle

```text
PENDING → TECHNICIAN_ASSIGNED → TECHNICIAN_ACCEPTED → ON_THE_WAY
        → ARRIVED → IN_PROGRESS → COMPLETED → PAID → REVIEWED

CANCELLED and DISPUTED are terminal exception states.
```

The API rejects invalid transitions. Customers control technician selection, cancellation before completion, payment, and review. Only the selected technician can accept or advance field-work statuses.

## Matching

A new request filters verified, online technicians by the requested service and service radius. It returns up to five candidates using a weighted score based on **distance, rating, availability, and completed-job experience**. The score prevents an automatic “highest rating wins” selection and provides the customer with several relevant options.

## Payments

Cash payment is operational in this MVP: the customer creates a cash payment record after completion and confirms payment, which advances the request to `PAID`. The schema supports card and wallet methods but deliberately refuses those methods until a PCI-aware processor adapter is configured. Add a server-side processor integration (for example, Stripe payment intents) before enabling card collection; never collect raw card data in the mobile application.

## Location and updates

FixNow requests **foreground-only** GPS permission when the customer needs technician matching or when a technician explicitly updates their location. Location updates refresh in the client while the app is open. Technician and customer status/messages synchronize with short foreground polling and query invalidation.

A managed autoscaling deployment does not guarantee durable in-memory Socket.IO connections across instances. For production push-grade realtime, use a managed pub/sub service or deploy a websocket gateway with persistent hosting; do not rely on this MVP's foreground polling for critical emergency dispatch.

## Security controls

- No secrets are exposed in Expo client code.
- OAuth sessions protect personal procedures.
- Zod validates every mutable API body.
- Ownership and role checks guard requests, messages, payments, reviews, technician functions, and administrator functions.
- Uploads restrict extension-safe filenames, MIME type, request rate, and decoded size; media bytes are stored outside the database.
- Diagnosis calls run server-side with safety constraints and an explicit disclaimer.
- The state-machine policy blocks invalid request status escalation.

Before an external launch, add a shared rate limiter, malware scanning for uploads, consent/audit logs, retention policy, privacy disclosures, verified emergency escalation, payment-processor webhooks, immutable admin audit trails, and a complaint/dispute workflow.

## Deployment

1. Configure the managed server secrets and client-safe OAuth/API values.
2. Generate and apply the Drizzle migration to the target database.
3. Build the server and run type checks/tests.
4. Create a project checkpoint, then publish the web build and produce native development/release builds.
5. Configure store assets, OAuth redirect URIs, app privacy metadata, remote notification credentials, and an approved payment processor before public distribution.

The initial service is intentionally scoped for a supervised pilot: local geography, cash payment, foreground location, and verified technician onboarding.
