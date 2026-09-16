# FixNow MVP Architecture

## Product boundary

FixNow is implemented as an Expo mobile application backed by a TypeScript API and a relational database. The initial release supports the core marketplace path: authenticated customer account, problem diagnosis, a service request, ranked technician choices, an accepted job, secure status progression, message exchange, payment record, and review. It also contains technician onboarding/availability controls and administrative endpoints that can be consumed by a responsive web-oriented route in the Expo app.

The service uses **Manus OAuth** for its initial authentication provider. It avoids storing passwords on the device or server. Phone/OTP and traditional email/password screens are intentionally represented as future authentication-provider extensions; they must be wired to an approved identity provider before release rather than implemented as an insecure imitation.

## System architecture

| Layer | Responsibility | MVP implementation |
|---|---|---|
| Mobile client | Customer, technician, and admin journeys; local interaction state; permissions | Expo Router, React Native, NativeWind, TanStack Query and tRPC |
| Identity | Session creation and authorization context | Manus OAuth with native secure token storage and web HTTP-only session cookies |
| Application API | Input validation, role checks, matching, state transitions, AI and upload boundaries | TypeScript Express/tRPC procedures with Zod |
| Data | Durable marketplace records | Drizzle ORM and managed MySQL/TiDB tables |
| Files | Problem photos and technician documents | Server-side S3-compatible storage helper; database stores only keys/URLs |
| Diagnosis | Explainable preliminary categorization | Server-only built-in LLM, strict safety prompt, structured fallback |
| Location | Current position, technician updates and navigation handoff | Foreground Expo Location permission and coordinates; external navigation is opened with a generated map URL |
| Updates | Job status, messages and in-app notices | Query invalidation and 12-second foreground polling; native local notification capability is enabled. Production multi-instance realtime sockets require Reserved Hosting or a managed realtime broker. |

> **Safety rule:** AI output is a preliminary estimate. It must not diagnose dangerous electrical, gas, structural, fire, or health issues as safe to self-repair, and it always directs the customer to emergency services where appropriate.

## Data relationships

| Entity | Principal relationships | Notes |
|---|---|---|
| `users` | One customer/technician identity; one optional technician profile | Manus OAuth identity. `accountRole` holds marketplace role, separate from system `role`. |
| `serviceCategories` | Referenced by requests and technician specialisms | Admin-manageable active category catalogue. |
| `technicianProfiles` | Belongs to one user; matches requests through category IDs | Stores availability, service radius, rating aggregates and location. |
| `serviceRequests` | Belongs to customer; may be assigned to a technician; belongs to category | Stores immutable request context, price estimates and controlled status. |
| `requestMatches` | Joins a request and technician profile | Holds score, distance, ETA and quote presented to a customer. |
| `messages` | Belongs to a request and sender/receiver | Customer and assigned technician can exchange messages. |
| `reviews` | One review per customer/request | Created after paid completion and updates technician aggregates in a transaction-ready follow-up. |
| `payments` | One payment attempt per request | Records cash/card intent and server-confirmed state; card capture requires a payment processor. |
| `notifications` | Belongs to a recipient user | In-app notification feed for request and messaging events. |

## Service request state machine

The server has the authority over transitions. It rejects both unknown states and invalid edges.

```text
PENDING → TECHNICIAN_ASSIGNED → TECHNICIAN_ACCEPTED → ON_THE_WAY
        → ARRIVED → IN_PROGRESS → COMPLETED → PAID → REVIEWED

PENDING, TECHNICIAN_ASSIGNED, TECHNICIAN_ACCEPTED, ON_THE_WAY, ARRIVED, IN_PROGRESS
  └── CANCELLED
COMPLETED, PAID
  └── DISPUTED
```

A technician may only accept an assigned request; customers may cancel before work starts; only an assigned technician can advance field-work statuses; and payment/review actions are owned by the customer. Administrators can inspect all records, moderate reviews and resolve disputes through a separate controlled workflow.

## Matching method

For each new request, the service filters verified, online technicians with the required service category and sufficient service radius. Remaining candidates receive an explainable score that weights distance, rating, completed jobs, and recent availability. The API returns the best several candidates and their factor breakdown; it never auto-assigns the single highest-rated technician.

## API contract

| Router | Principal procedures |
|---|---|
| `catalog` | `list`, `create`, `update`, `setActive` |
| `profile` | `me`, `update`, `addresses` |
| `uploads` | `create` with filename, MIME type and bounded base64 payload |
| `diagnosis` | `analyze` preliminary description/photo analysis |
| `technicians` | `register`, `availability`, `updateLocation`, `nearby`, `myProfile`, `jobs` |
| `requests` | `create`, `listMine`, `get`, `matches`, `chooseTechnician`, `accept`, `transition`, `cancel` |
| `messages` | `list`, `send` |
| `payments` | `create`, `confirmCash` |
| `reviews` | `create`, `forTechnician` |
| `admin` | `overview`, `technicians`, `setVerification`, `requests`, `users`, `reviews` |

All mutable procedures validate request bodies with Zod, use authenticated context where personal data is involved, and verify resource ownership. Diagnosis and upload endpoints add lightweight instance-level rate/size limits. A full production deployment should add a shared Redis rate limiter, malware scanning, audit logging and processor-issued payment intents.

## Navigation structure

```text
(tabs)
├── Home                         Customer catalogue, nearby technicians, AI entry
├── Jobs                         Request history and live request cards
├── Technician                   Registration, availability, incoming/active jobs
└── Profile                      Account, saved address, notifications, sign-in

Modals / detail routes
├── /diagnosis                   AI preliminary assessment
├── /request/new                 Service-request composer
├── /request/[id]                Match selection and tracked job lifecycle
├── /chat/[id]                   Customer-technician messages
├── /auth                        Manus OAuth entry
└── /admin                       Responsive administration surface
```

## Delivery phases

| Phase | Scope | Definition of done |
|---|---|---|
| 1. Foundation | Theme, routing, auth boundary, domain model | App has no dead navigation and server compiles. |
| 2. Marketplace | Catalogue, request composer, matching and lifecycle | A signed-in customer can create, select, and track a job. |
| 3. Technician | Registration, availability, job acceptance/location | An eligible technician can accept and progress an assigned job. |
| 4. Completion | Message, payment record, review, notifications | Completion, cash confirmation and review are permission checked. |
| 5. Operations | Admin read model and technician verification | Admin actions are protected by marketplace role. |
| 6. Hardening | Tests, docs, error/loading states and validation | State transitions and matching are unit tested; setup is documented. |
