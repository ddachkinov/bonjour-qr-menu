# Project Plan — QR Menu SaaS: Milestones, Technology Stack & Ownership

## Milestones & Iterations

### Milestone 0 — Prep & Infra (week 0)

- Set up code repo, branching strategy, CI pipeline skeleton.
- Provision dev/staging cloud accounts and DNS wildcard.
- Create basic IaC skeleton (Terraform modules for core infra).
- Setup basic logging and monitoring (centralized).

### Milestone 1 — MVP (public menu + owner dashboard) (iteration 1–3)

- Auth and tenant onboarding.
- Menu builder (menu/category/item CRUD).
- Image upload with presigned flow and background processing.
- Publishing flow to subdomain and QR generation.
- Public menu SPA with table-session & cart.
- Order submission and basic order management on dashboard.
- Waiter token/QR generation and scan flow (dashboard view).
- Basic analytics and email/webhook notification on order creation.

### Milestone 2 — Hardening & Beta Features

- Rate limiting & anti-abuse.
- Redis-backed session store and cart resilience.
- Kitchen/print view (order print).
- Enhanced analytics.

### Milestone 3 — Premium & Scale

- Custom domains and SSL automation.
- POS integration webhooks.
- Payment tooling (tips, split bill).
- Advanced role management and staff app.

## Top-level todo lists (per milestone)

### Infra & DevOps

- IaC: VPC, subnets, DB, Redis, S3, CDN, Load Balancer.
- CI/CD: build, test, deploy to staging, manual gate to production.
- Secrets management.
- Logging & monitoring (Prometheus, Grafana, alert rules).
- DNS wildcard + ACME cert automation.

### Backend

- Authentication service (JWT + refresh).
- Tenant model + tenancy middleware.
- Menu API and content publish flow.
- Upload presign API + worker to process images.
- Session & cart management (Redis + fallback).
- Order API + waiter token generator.
- Webhook infrastructure for premium tenants.

### Frontend (Owner)

- Dashboard SPA with pages: Login, Onboarding, Restaurant profile, Menu builder, Orders, Settings.
- Integration with uploads, publish, and order views.

### Frontend (Public)

- Minimal SPA for public menu optimized for mobile.
- Session creation and cart UX.
- Order confirmation and waiter QR display.

### Testing

- Unit tests for business logic.
- Integration tests for API endpoints and flows.
- End-to-end tests for public menu order flow.
- Load tests for public menu reads and order writes.

## Recommended technology stack (with justification)

### Frontend

**Next.js (React)** for owner dashboard and public menu (SSR/static options), **Tailwind CSS** for rapid UI.

**Justification**: developer productivity, mature ecosystem, easy to host on Vercel/Cloud.

### Backend

**Node.js with NestJS or Express + TypeScript**.

**Justification**: fast iteration, strong community, TypeScript for maintainability.

### Database

**PostgreSQL** (managed).

**Justification**: relational modeling fits menus/orders; ACID for orders.

### Cache/Session

**Redis**.

**Justification**: fast ephemeral storage for sessions, rate limiting.

### Object Storage

**AWS S3** (or compatible like DigitalOcean Spaces).

### Queue/Workers

**RabbitMQ or AWS SQS** + worker fleet (Node.js).

### CI/CD

**GitHub Actions / GitLab CI**.

### IaC

**Terraform**.

### CDN

**CloudFront / Fastly / Cloudflare**.

### Monitoring

**Prometheus + Grafana + Sentry** for error reporting.

### Auth

**JSON Web Tokens (JWT)** + refresh tokens; OAuth optional for staff.

## Anticipated file tree

```
frontend/
  dashboard/               # Owner dashboard Next.js app
    pages/
    components/
    styles/
    public/
  public-menu/             # Public-facing Next.js or static SPA
    pages/
    components/
    services/

api/                       # Backend API (TypeScript)
  src/
    controllers/
    services/
    models/
    workers/
    tests/

libs/
  shared-types/            # Shared TypeScript types (DTOs)
  ui-kit/                  # Shared UI components (if mono-repo)

infra/
  terraform/
  k8s/                     # optional Kubernetes manifests
  scripts/
    deploy/
    db/

config/
  env-templates/

docs/
  architecture.md
  operations.md

tests/
  e2e/
  load/
  integration/

ci/
  pipelines/

docker/
  Dockerfile.api
  docker-compose.dev.yml

deployment/
  helm-charts/             # optional
  nomad/                   # optional

observability/
  grafana/
    dashboards/
    alerts/

LICENSE
README.md
```

## Team responsibilities (example small team)

| Role | Responsibilities |
|------|------------------|
| **Product Owner / PM** | Requirements, acceptance criteria, prioritization, staging acceptance. |
| **Tech Lead / Senior Architect** | Architecture, code review, security & compliance sign-off. |
| **Backend Engineer(s)** | API, DB schema, workers, infra hooks. |
| **Frontend Engineer(s)** | Owner dashboard, public menu UX, responsive design. |
| **DevOps Engineer** | IaC, CI/CD, monitoring, DNS/cert provisioning, scaling. |
| **QA / Test Engineer** | Automated tests, e2e, load testing. |
| **Support / Ops** | Dashboard for support, runbooks, incident responses. |

## CI/CD and deployment plan

### Branching Strategy

- **main** for production
- **develop** for staging
- **feature/*** for features

### CI Pipeline

1. Lint
2. Unit tests
3. Build
4. Integration tests
5. Deploy to staging

### Manual Approval

- Staging → Production

### Deployment Strategy

- Use canary deploys and feature flags for larger changes.
- Database migrations via scripted migration tool (e.g., Flyway, Prisma Migrate).
- CI must run migrations in a controlled job.

## Acceptance criteria per milestone (high-level)

### MVP

Owners can create and publish menus; diners can scan QR, create a session, add items, and submit an order; owners can view orders and acknowledge them.

### Beta

Basic analytics exist and anti-abuse rate-limits are in place; capacity tests pass target load.

### v1

Custom domain support and POS webhooks available; billing and premium features integrated.
