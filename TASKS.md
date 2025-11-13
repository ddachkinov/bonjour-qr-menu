# Tasks — Granular Implementation Checklist

This file contains granular tasks. Each section is formatted as an issue-ready task: Title, Description, Implementation Details, Dependencies, Acceptance Tests, Caveats / Notes, Required Env Vars.

---

## Task 001 — Setup repository, monorepo layout and CI skeleton

### Description

Create mono-repo structure with folders for frontend (dashboard + public-menu), backend (api), libs, infra, and tests. Add CI pipeline skeleton to run lint and unit tests.

### Implementation details

- Choose monorepo tool (pnpm workspace or yarn workspaces) or keep separate repos; document reason.
- Commit initial README and environment templates (.env.example).
- Add ci/pipeline config with stages: lint → unit test → build.
- Add template for PRs and issue templates.

### Dependencies

None.

### Acceptance tests

- New developers can clone repo, run yarn install and the CI pipeline triggers on PR.
- Lint job passes on an empty codebase.

### Caveats

- Keep infra secrets out of repo; use secrets manager.

### Required env vars

CI variables for registry and secret scanning only.

---

## Task 002 — Infra: DNS wildcard and TLS provisioning

### Description

Provision DNS wildcard entry for app domain (e.g., *.appdomain.com) and automated TLS (Let's Encrypt). Provide documented steps for custom domains.

### Implementation details

- Create Terraform modules to provision DNS records (depending on provider).
- Automate ACME certificate issuance and renewal process (e.g., using cert-manager if Kubernetes or platform service).
- Configure load balancer to accept wildcard certificate.

### Dependencies

Cloud account and domain ownership.

### Acceptance tests

- Visit https://some-tenant.appdomain.com and receive valid TLS certificate.
- Provision and validate wildcard entry.

### Caveats

- Some DNS providers throttle API calls; include retries.

### Required env vars

- DNS_PROVIDER_API_CREDENTIALS

---

## Task 003 — Authentication & tenant onboarding

### Description

Implement signup flow for restaurant owner including tenant creation and email verification.

### Implementation details

- Admin API: POST /auth/signup creates user and tenant, sends verification email with token.
- JWT authentication with refresh tokens.
- Middleware to extract tenant_id and role from JWT.
- Secure password storage (bcrypt or argon2).

### Dependencies

- Email delivery provider (SendGrid or SES).
- DB provisioned.

### Acceptance tests

- Owner can sign up, receive verification email, and login.
- JWT includes tenant_id claim.
- Unauthorized access to tenant endpoints blocked.

### Caveats

- Rate-limit signups to prevent spam.

### Required env vars

- JWT_SECRET
- JWT_REFRESH_SECRET
- EMAIL_PROVIDER_API_KEY
- EMAIL_FROM_ADDRESS

---

## Task 004 — Menu CRUD API and data model

### Description

Implement Menu, Category and Item endpoints and DB tables. Add validation and basic ownership checks.

### Implementation details

- API endpoints per SPEC.
- Validation: price must be non-negative, item title required.
- When publish flag set, call publish job (background/listener) to provision public menu.

### Dependencies

- Auth/tenant middleware (Task 003).
- DB (Postgres).

### Acceptance tests

- Owner can create a menu with categories and items.
- Published menu appears in GET /menus/{menuId} for owner.
- Data persisted and retrievable.

### Caveats

- Publishing must trigger CDN invalidation or versioning to prevent stale caches.

### Required env vars

- DATABASE_URL

---

## Task 005 — Image upload & media processing worker

### Description

Implement presigned upload flow and a background worker to validate and generate thumbnails.

### Implementation details

- Endpoint returns presigned URL for S3 with expected object key.
- After upload, worker picks up message (via queue) to process image: validate mime, create thumbnail, generate webp, store metadata in DB.
- Public URLs are CDN URLs referencing S3.

### Dependencies

- S3 bucket and queue (SQS/RabbitMQ).

### Acceptance tests

- Owner can upload an image and see returned thumbnail URL within a short time.
- Worker rejects unsupported mime types and deletes bad objects.

### Caveats

- Ensure atomicity between DB entry and storage; use object metadata or notification.

### Required env vars

- S3_BUCKET
- S3_ACCESS_KEY
- S3_SECRET
- S3_REGION
- QUEUE_URL

---

## Task 006 — Public menu page & session creation

### Description

Build the public SPA for diners and implement session creation and persistence.

### Implementation details

- Public URL served at tenant subdomain; the page retrieves menu via GET /public/menus/{menuId}.
- On first load create session via POST /public/menus/{menuId}/session and store session_id in cookie (SameSite=Lax).
- Implement UI for browsing categories, item details, add-to-cart flows.

### Dependencies

- Menu API (Task 004).
- Session API (Task 007).

### Acceptance tests

- Scanning QR with menu URL creates a session cookie.
- Cart actions update ephemeral server-stored cart and reflect across reloads.

### Caveats

- If cookies blocked fallback to localStorage; document pros/cons.

### Required env vars

- PUBLIC_API_BASE_URL

---

## Task 007 — Session & cart store (Redis-backed)

### Description

Implement session creation and cart persistence using Redis smartly falling back to DB.

### Implementation details

- POST /session creates session_id (unguessable, e.g. 128-bit) stored in Redis with TTL (configurable).
- Cart items stored in Redis under session key; snapshot saved to DB at order submission.
- Add locks for concurrent updates to a session.

### Dependencies

- Redis cluster.

### Acceptance tests

- Multiple rapid cart updates maintain consistency.
- Session expires after TTL and cart removed.

### Caveats

- Set sensible memory limits, use eviction policies and fallbacks.

### Required env vars

- REDIS_URL
- SESSION_TTL_SECONDS

---

## Task 008 — Order submission and waiter QR generation

### Description

Implement atomic order creation, persistence and waiter QR/token generation.

### Implementation details

- POST /public/session/{sessionId}/order validates cart, computes totals, persists order in DB in a single transaction.
- Generate an order_token with HMAC(order_id + expires_at, ORDER_TOKEN_SECRET) and embed in waiter QR payload (URL or token).
- After order creation, push notification to tenant webhook, owner dashboard, and optionally email.

### Dependencies

- Cart/session (Task 007), DB, webhook infra.

### Acceptance tests

- Submitting order creates DB record, returns order_id and waiter_qr_data.
- Scanning waiter QR allows retrieving order details only if token valid and unexpired.

### Caveats

- Token expiry: short window (configurable). If staff need long-lived links implement authenticated staff endpoints.

### Required env vars

- ORDER_TOKEN_SECRET
- WEBHOOK_SECRET

---

## Task 009 — Owner dashboard order view & status updates

### Description

Dashboard page where owners view orders in real-time and update status.

### Implementation details

- WebSocket or Server-Sent Events for near-real-time updates.
- Order list with filters and search.
- Status change endpoint that updates order status and optionally notifies diners.

### Dependencies

- Order API (Task 008), dashboard frontend.

### Acceptance tests

- New orders appear in dashboard within 2 seconds.
- Owner can update status and it persists.

### Caveats

- Watch scaling of WebSocket connections. Use pub/sub or push gateway.

### Required env vars

- REALTIME_PROVIDER_CONFIG

---

## Task 010 — Rate limiting and anti-abuse

### Description

Implement rate limiting on public APIs and dashboard endpoints.

### Implementation details

- Use Redis token bucket per IP and per menu_id.
- Identify suspicious patterns (many orders from same IP) and flag or require CAPTCHA.

### Dependencies

- Redis.

### Acceptance tests

- Excessive requests receive 429.
- Legitimate flows within limits succeed.

### Caveats

- Balance not to block legitimate customers behind NAT.

### Required env vars

- RATE_LIMIT_PER_MINUTE

---

## Task 011 — Analytics & basic reports

### Description

Collect essential analytics: menu views, orders, top items.

### Implementation details

- Use event pipeline: events logged to Kafka or lightweight queue, worker aggregates to time-series DB or store.
- Provide owner dashboard endpoint to fetch analytics for last 7/30/90 days.

### Dependencies

- Event queue, time-series DB or aggregated tables.

### Acceptance tests

- Analytics reflect recent events and are consistent with order history.

### Caveats

- Sampling strategy for high-volume tenants to reduce cost.

### Required env vars

- ANALYTICS_RETENTION_DAYS

---

## Task 012 — E2E tests for full order flow

### Description

Write E2E tests: owner creates menu, publishes, diner scans QR, creates session, adds items, submits order, owner sees order.

### Implementation details

- Use Playwright or Cypress against staging environment seeded test tenant.
- Test network resilience and retries.

### Dependencies

- Running staging infra.

### Acceptance tests

- Test scenario completes end-to-end without manual intervention.

### Caveats

- Flaky tests due to timing; use retries and stable selectors.

### Required env vars

- E2E_BASE_URL
- E2E_TEST_TENANT_CREDENTIALS

---

## Task 013 — Billing & premium tier gating (initial)

### Description

Add billing hooks and feature gating for premium capabilities (custom domain, webhooks).

### Implementation details

- Integrate with Stripe for subscriptions; store tenant billing info.
- Feature flags for premium features enforced in middleware.

### Dependencies

- Stripe account.

### Acceptance tests

- Premium tenant enabled for webhooks after subscription.
- Non-paid tenant not allowed to add custom domain.

### Caveats

- Avoid charging customers before verifying custom domain ownership.

### Required env vars

- STRIPE_API_KEY
- STRIPE_WEBHOOK_SECRET

---

## Task 014 — QR code generation service

### Description

Implement QR code generation for published menus and waiter order pickup.

### Implementation details

- Use library (e.g., qrcode npm package) to generate QR images or SVG.
- For menu QR: encode URL with menu_id and optional table_id.
- For waiter QR: encode order_token with expiry.
- Store generated QR as image in S3 or generate on-the-fly.

### Dependencies

- Menu publish flow (Task 004).
- Order submission (Task 008).

### Acceptance tests

- Published menu returns a downloadable QR code image/SVG.
- Scanning QR with phone camera opens correct URL.
- Waiter QR encodes valid token and can be scanned to retrieve order.

### Caveats

- QR must be high-contrast and sized appropriately for print.

### Required env vars

- QR_BASE_URL

---

## Task 015 — Table session isolation and multi-client handling

### Description

Ensure multiple diners at the same table share the same cart session without conflicts.

### Implementation details

- Encode table_id in menu QR.
- On session creation, if table_id provided, check for existing active session for that table and reuse.
- Use optimistic locking or Redis locks to handle concurrent cart updates.

### Dependencies

- Session store (Task 007).

### Acceptance tests

- Two clients scanning same table QR see shared cart.
- Concurrent add-to-cart operations from different clients merge correctly.

### Caveats

- Avoid race conditions; test with multiple simultaneous clients.

### Required env vars

None additional.

---

## Task 016 — Owner dashboard: menu builder UI

### Description

Build rich UI for menu editing: add/edit categories and items, drag-and-drop reordering, inline image upload.

### Implementation details

- Use React state management (Context or Redux).
- Integrate with menu CRUD API (Task 004) and upload API (Task 005).
- Provide inline validation and error messages.

### Dependencies

- Menu API (Task 004).
- Upload API (Task 005).

### Acceptance tests

- Owner can create a menu with multiple categories and items.
- Drag-and-drop reorders categories and persists order.
- Image upload shows progress and thumbnail preview.

### Caveats

- Large menus may slow UI; implement pagination or virtualization.

### Required env vars

None additional.

---

## Task 017 — Subdomain provisioning and routing

### Description

Dynamically route requests based on subdomain to correct tenant and serve appropriate menu.

### Implementation details

- Parse subdomain from request Host header.
- Middleware looks up tenant by subdomain.
- Return 404 if tenant not found or menu not published.

### Dependencies

- Tenant model (Task 003).
- DNS wildcard (Task 002).

### Acceptance tests

- Request to tenant1.appdomain.com serves tenant1 menu.
- Request to nonexistent.appdomain.com returns 404.

### Caveats

- Handle edge cases: www prefix, apex domain, case sensitivity.

### Required env vars

- APP_BASE_DOMAIN

---

## Task 018 — Order status workflow and notifications

### Description

Implement state machine for order status transitions and trigger notifications on status change.

### Implementation details

- Define allowed transitions: new → acknowledged → in_progress → completed.
- Validate transitions in API.
- On status change, send webhook to tenant (if configured) and optional push/email to diner.

### Dependencies

- Order API (Task 008).
- Notification service (email/webhook).

### Acceptance tests

- Owner can transition order through all valid states.
- Invalid transition returns error.
- Webhook triggered on status change with correct payload.

### Caveats

- Handle retries for webhook failures; log failures for support.

### Required env vars

- WEBHOOK_RETRY_COUNT

---

## Task 019 — Audit logging for compliance

### Description

Log all critical actions (menu publish, order creation, status change) for audit and compliance.

### Implementation details

- Write to AuditLog table on each relevant action.
- Include actor (user_id), action type, timestamp, details (JSON).
- Provide admin endpoint to query logs.

### Dependencies

- DB schema for AuditLog.

### Acceptance tests

- All menu and order actions logged.
- Admin can retrieve logs filtered by tenant and date range.

### Caveats

- High write volume; consider async logging or batching.

### Required env vars

None additional.

---

## Task 020 — CDN integration and cache invalidation

### Description

Configure CDN to cache public menu pages and images; implement cache invalidation on menu publish/unpublish.

### Implementation details

- Set cache-control headers on public API responses and S3 objects.
- On menu publish, trigger CDN invalidation for relevant paths.
- Use versioned URLs or query params to bust cache if needed.

### Dependencies

- CDN provisioned (CloudFront, Fastly, or Cloudflare).

### Acceptance tests

- Public menu page cached; subsequent requests served from CDN.
- After menu update and cache invalidation, new content served within seconds.

### Caveats

- CDN invalidation may have propagation delay; document SLA.

### Required env vars

- CDN_DISTRIBUTION_ID
- CDN_API_KEY

---

## Task 021 — Kitchen view / order print layout

### Description

Provide a print-friendly view of orders for kitchen staff.

### Implementation details

- Create a dedicated route/page rendering order details in simplified layout.
- Optimize for thermal printer paper width.
- Include order id, items, quantities, modifiers, timestamp.

### Dependencies

- Order API (Task 008).

### Acceptance tests

- Kitchen view page renders correctly.
- Print from browser produces readable output on standard receipt printer.

### Caveats

- Test with actual thermal printers if available.

### Required env vars

None additional.

---

## Task 022 — Custom domain support (premium feature)

### Description

Allow premium tenants to use custom domains instead of subdomain.

### Implementation details

- Tenant provides CNAME pointing to app.
- System verifies CNAME via DNS lookup.
- Provision SSL certificate via ACME for custom domain.
- Route requests from custom domain to tenant.

### Dependencies

- DNS verification service.
- ACME/Let's Encrypt integration.

### Acceptance tests

- Tenant adds custom domain and verification succeeds.
- Custom domain serves menu over HTTPS.

### Caveats

- DNS propagation and cert issuance take time; provide status UI.

### Required env vars

- ACME_ACCOUNT_EMAIL

---

## Task 023 — Modifiers and item options

### Description

Support item modifiers (e.g., size, toppings) with price adjustments.

### Implementation details

- Add ModifierGroup and ModifierOption entities.
- Menu builder UI for adding modifiers to items.
- Public menu shows modifiers as selectable options.
- Cart and order store selected modifiers and adjust price.

### Dependencies

- Menu and Item API (Task 004).

### Acceptance tests

- Owner can create item with modifiers.
- Diner can select modifiers and see updated price in cart.
- Order includes selected modifiers.

### Caveats

- Complex pricing logic; ensure accuracy with unit tests.

### Required env vars

None additional.

---

## Task 024 — Multi-language and localization support

### Description

Support multiple languages for public menu and dashboard.

### Implementation details

- Use i18n library (e.g., react-i18next).
- Store translations in JSON files or database.
- Menu items can have translations for title/description.
- Detect browser locale and default to it.

### Dependencies

- Menu data model extended for translations.

### Acceptance tests

- Menu displays in user's browser language if available.
- Owner can provide translations for menu items.

### Caveats

- RTL languages require additional CSS adjustments.

### Required env vars

- DEFAULT_LOCALE

---

## Task 025 — Load testing and performance benchmarking

### Description

Conduct load tests to validate system handles target concurrency and latency.

### Implementation details

- Use tool like k6 or Apache JMeter.
- Simulate thousands of concurrent menu reads and hundreds of order writes.
- Measure response times, error rates, database load.

### Dependencies

- Staging environment with production-like config.

### Acceptance tests

- Public menu load: 1000 concurrent users, 90th percentile latency under 1.5s.
- Order submission: 100 concurrent orders, no failures.

### Caveats

- Coordinate with DevOps to avoid impacting production.

### Required env vars

- LOAD_TEST_TARGET_URL

---

## Task 026 — Monitoring dashboards and alerting

### Description

Set up Grafana dashboards and Prometheus alerts for key metrics.

### Implementation details

- Instrument code with metrics (request count, duration, error rate).
- Create Grafana dashboards for API performance, order volume, error rates.
- Configure alerts for high error rate, slow response, queue backlog.

### Dependencies

- Prometheus and Grafana deployed.

### Acceptance tests

- Dashboards display live metrics.
- Trigger test alert and verify notification received.

### Caveats

- Avoid alert fatigue; tune thresholds carefully.

### Required env vars

- PROMETHEUS_URL
- GRAFANA_API_KEY

---

## Task 027 — Backup and disaster recovery procedures

### Description

Implement automated database backups and document restore procedures.

### Implementation details

- Configure daily DB snapshots with 7-day retention.
- Store backups in separate region/account.
- Document step-by-step restore process and RTO/RPO targets.

### Dependencies

- Cloud provider backup service or custom script.

### Acceptance tests

- Backup runs daily and snapshots appear in storage.
- Restore test: restore from backup to test DB and verify data integrity.

### Caveats

- Test restore regularly; backups are useless if restore fails.

### Required env vars

- BACKUP_STORAGE_BUCKET

---

## Task 028 — Security hardening and penetration testing

### Description

Conduct security review and penetration test; fix identified vulnerabilities.

### Implementation details

- Review OWASP Top 10: injection, XSS, CSRF, auth issues.
- Run automated security scanner (e.g., OWASP ZAP).
- Engage external pentest firm or internal security team.
- Remediate findings and re-test.

### Dependencies

- All core features implemented.

### Acceptance tests

- No high or critical vulnerabilities remain.
- Pentest report approved by security team.

### Caveats

- Budget time for remediation; findings may require architectural changes.

### Required env vars

None additional.

---

## Task 029 — GDPR compliance and data deletion

### Description

Implement user data export and deletion endpoints per GDPR requirements.

### Implementation details

- Endpoint for tenant to request data export (JSON dump of all tenant data).
- Endpoint to delete tenant account and cascade-delete related data.
- Document data retention policies and user rights.

### Dependencies

- All data models finalized.

### Acceptance tests

- Tenant can export data and receives complete archive.
- Tenant deletion removes all associated records (audit log may be retained per policy).

### Caveats

- Ensure compliance with legal team; may require additional consent flows.

### Required env vars

None additional.

---

## Task 030 — Documentation and runbooks

### Description

Write comprehensive documentation for developers, operators, and end users.

### Implementation details

- Developer docs: architecture, API reference, local setup.
- Operator runbooks: deployment, rollback, incident response, scaling.
- User docs: owner onboarding, menu publishing, troubleshooting.

### Dependencies

- System stable and feature-complete.

### Acceptance tests

- New developer can onboard using docs alone.
- Operator can follow runbook to recover from common incidents.

### Caveats

- Keep docs updated as system evolves.

### Required env vars

None additional.
