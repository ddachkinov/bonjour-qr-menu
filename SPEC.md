# Technical Specification — QR Menu SaaS for Restaurants (MVP + Roadmap)

## Assumptions

- Each restaurant is a tenant in a SaaS multi-tenant system (separate logical data but shared application).
- Menus are authored by owners via a dashboard and published to subdomains (e.g., myrestaurant.appdomain.com/menu/{menuId}).
- Public diners access menus via QR codes; diners should have an isolated session per table to avoid cross-table mixing.
- For MVP we will not handle payment processing, advanced POS integration, or complex kitchen workflows; these are future enhancements.
- Owners will use modern browsers on desktop; diners and waiters use modern mobile browsers.
- Host has control over DNS or can create CNAME entries; wildcard DNS is available for the app domain.

## 1. System overview and user journeys

### Actors

**Restaurant Owner (Owner)** — registers, creates menus, uploads images, configures pricing, publishes menu to a subdomain, views orders and order history.

**Diner (Customer)** — scans QR, opens the menu on their phone, browses categories and items, adds items to cart, submits an order for their table, receives an order confirmation / order QR for waiter.

**Waiter** — scans waiter QR to pick up/acknowledge order and mark as collected or completed.

**System Administrator/Support** — manages tenants, handles billing (premium tiers), reviews abuse reports.

### Core user journeys (MVP)

#### Owner onboarding

1. Owner signs up and verifies email.
2. Creates a restaurant profile and a menu.
3. Adds categories and items (name, description, photos, price, optional modifiers).
4. Publishes the menu: system provisions menu at a subdomain and generates a QR for printing.

#### Diner experience

1. Diner scans QR which opens menu URL containing tenant & published menu ID and a table/session token parameter (optional, see session rules).
2. On first open, diner receives a short-lived unique session ID (table-session) tied to table location to isolate carts.
3. Diners browse categories, view item details, add quantities to cart, then place an order for the table.
4. On order submission, server creates an order record and returns a waiter QR for pickup.

#### Waiter pickup

1. Waiter scans waiter QR (or opens the waiter dashboard and scans via camera) which contains a secure order token.
2. Server verifies token and presents order details on waiter device/dashboard to confirm pickup and delivery.

## 2. Functional requirements (detailed, prioritized)

### MVP (priority 1)

- Owner authentication (email + password) and account management.
- Tenant creation & restaurant profile (name, address, timezone).
- Menu builder: create menu, categories, items with fields:
  - Item: title, description, price, currency, photos (one or more), SKU optional, tags, dietary labels (vegan, gluten-free).
  - Category: name, ordering.
- Media management: upload, resize, store images (S3-compatible).
- Menu publishing: create a public URL and QR code for a published menu.
- Public menu app (mobile-friendly single-page): browse categories, view item details, add to cart.
- Table session isolation: create a unique table/session ID when a client opens the menu; carts are scoped to that session.
- Cart and order submission: diners can place an order which creates an order entity attached to tenant, menu, table-session.
- Waiter QR generation per order: upon order, server returns a waiter-facing QR to be scanned by staff to acknowledge.
- Owner dashboard: view orders, change order status (new, acknowledged, completed), menu management.
- Basic rate limiting and anti-spam (per IP / per menu).
- Audit logs for orders and menu changes.

### Near-term features (priority 2)

- Modifiers/options for items (extra cheese, size) with price deltas.
- Guest vs identified diner differentiation (optional nickname).
- Simple notifications to owner (webhook, email) on new order.
- Order print / kitchen view (simple list view).
- Basic analytics (views, orders per menu, top items).
- Restaurant-specific branding: logo, color.

### Premium / future features (priority 3)

- Full POS integrations (webhooks, API connectors).
- Payment processing / tips / splitting bills.
- Table mapping and QR per table assignment (map table IDs to physical QR).
- Multi-menu support (breakfast/lunch/dinner).
- Role-based access: managers vs staff.
- Scheduled menu publishing (time-based).
- Offline caching for menu (service worker).
- White-label subdomain and custom domain per restaurant.
- Advanced fraud detection and moderation.
- Multi-language support and RTL.

## 3. Non-functional requirements (NFRs)

- **Availability**: Target 99.9% for public menu read paths; dashboard and admin 99.5%.
- **Scalability**: Support thousands of concurrent menu reads; support hundreds of writes (orders) per second regionally at peak.
- **Latency**: Public menu page load (first contentful paint) under 1.5s for 90% requests via CDN.
- **Consistency**: Strong consistency for orders and menu publishes.
- **Security**: TLS for all endpoints, secure upload handling, OWASP top 10 mitigations, rate limiting, input sanitization, CSRF protections for dashboard.
- **Data retention & compliance**: GDPR-ready (data deletion on request), backups retained per policy.
- **Monitoring & Alerting**: Application metrics, logs, SLO alerts for error rate and latency.
- **Backups**: Daily DB backups with at least 7-day retention; weekly full snapshots.
- **Observability**: Request tracing, structured logs, error reporting, business metrics (orders per minute).
- **Cost efficiency**: Use managed services where it reduces operational overhead.

## 4. High-level architecture

### Components

**Frontend - Owner Dashboard**
- SPA for owners to manage menus and view orders (React or Next.js).
- Authenticated, edits persisted via API.

**Public Menu Frontend**
- Lightweight performant SPA (React or static Next.js page) served via CDN, rendered client-side to support local session & offline improvements later.

**API Gateway / Backend API**
- Auth, tenant management, menu CRUD, image upload endpoints, order endpoints, QR generation.

**DB**
- Primary relational DB (PostgreSQL) for structured data (tenants, menus, items, orders).

**Cache / Session Store**
- Redis for ephemeral table session tokens, cart state, rate limiting.

**Object Storage**
- S3-compatible for images and static assets, with pre-signed upload support.

**CDN**
- Serve public menu assets and images close to diners.

**Worker queue**
- Background workers for image processing, sending notifications, and generating thumbnails.

**Admin tools**
- Support admin dashboard for tenants, logs, billing.

**Infrastructure as Code**
- Terraform/CloudFormation for infra provisioning.

**CI/CD**
- Pipeline for tests, build, staging deploys, production deploys.

### Multi-tenant model

- Use shared application instance with tenant_id column on tenant-scoped tables.
- Isolate tenant data at application layer (row-level). Optionally use separate schemas for larger tenants in future.

## 5. Data model (entities & key fields)

Describe key entities and their important fields (field: brief description). Do not include raw SQL.

### Tenant (Restaurant)

- id: unique tenant identifier
- owner_user_id: reference to account
- name: restaurant name
- subdomain: tenant-specific subdomain fragment
- timezone: timezone string
- locale: language/currency defaults
- branding: logo URL, primary color
- created_at, updated_at

### User (Owner / Staff)

- id
- tenant_id
- email
- password_hash
- role: owner/manager/staff
- display_name
- created_at

### Menu

- id
- tenant_id
- title
- published: boolean
- slug
- public_url (subdomain + path)
- created_at, updated_at

### Category

- id
- menu_id
- tenant_id
- name
- position

### Item

- id
- menu_id
- category_id
- tenant_id
- title
- description
- price (minor currency unit)
- currency
- photos: list of image URLs
- tags: list
- sku
- dietary_flags: set (vegan, vegetarian, contains_nuts)
- created_at, updated_at

### ModifierGroup & ModifierOption (for future)

- modifier_group_id, tenant_id, title, required, selection_limit
- modifier_option_id, title, price_delta

### Table Session (Cart Session)

- session_id (short, unguessable)
- menu_id
- tenant_id
- created_at, last_activity
- expires_at
- ephemeral_cart: either stored in Redis or DB reference

### CartItem

- item_id, quantity, selected_modifiers, unit_price, computed_price

### Order

- id
- tenant_id
- menu_id
- session_id
- order_token (secure random token)
- items: list with quantities and modifiers
- total_amount
- currency
- status: new, acknowledged, in_progress, completed, cancelled
- created_at, updated_at
- waiter_ack_user_id (optional)

### AuditLog

- id, tenant_id, actor_id, action, details, created_at

### Upload / Media

- id, tenant_id, original_filename, storage_url, width/height, mime_type, created_at

## 6. API contracts (high-level)

For each endpoint show purpose, HTTP method, URL pattern, auth and key request/response fields.

### Auth / Accounts

**POST /api/v1/auth/signup**
- Purpose: register owner account and tenant creation flow.
- Request: email, password, restaurant_name, subdomain_preference.
- Response: success, user_id, tenant_id, email_verification_sent.

**POST /api/v1/auth/login**
- Purpose: authenticate owner/staff.
- Request: email, password.
- Response: access_token (JWT), refresh_token, user profile.

**POST /api/v1/auth/refresh**
- Purpose: refresh tokens.
- Request: refresh_token.
- Response: new access_token.

### Tenant & Menu

**POST /api/v1/tenants**
- Create tenant (admin/backoffice). Request: name, owner info. Response: tenant_id.

**GET /api/v1/menus/{menuId}**
- Purpose: fetch published menu data for public consumption.
- Auth: none for published menus.
- Response: menu metadata, categories, items (with public image URLs).

**POST /api/v1/menus**
- Purpose: create a menu (dashboard).
- Auth: tenant owner.
- Request: title, draft settings.
- Response: menu_id.

**PUT /api/v1/menus/{menuId}**
- Purpose: update menu details, publish/unpublish.
- Auth: tenant owner.
- Request: fields to update; publish flag triggers provisioning.
- Response: updated menu.

### Category & Item

**POST /api/v1/menus/{menuId}/categories**
**PUT /api/v1/menus/{menuId}/categories/{categoryId}**
**DELETE /api/v1/menus/{menuId}/categories/{categoryId}**

**POST /api/v1/menus/{menuId}/items**
**PUT /api/v1/menus/{menuId}/items/{itemId}**
**DELETE /api/v1/menus/{menuId}/items/{itemId}**

- Purpose: menu editing endpoints.
- Auth: tenant owner.
- Request fields: item title, description, price, photos (IDs), dietary flags.
- Response: created/updated item object.

### Image Upload

**POST /api/v1/uploads/presign**
- Purpose: obtain pre-signed URL for direct client upload to storage.
- Auth: tenant owner.
- Request: filename, mime_type, intended_use.
- Response: upload_url, object_key, public_url (or URL after processing).

### Table session & Cart

**POST /api/v1/public/{tenantSubdomain}/menus/{menuId}/session**
- Purpose: create a table session for public menu visits.
- Auth: none.
- Request: optional: table_id (if encoded in QR), guests_count.
- Response: session_id, expires_at.

**GET /api/v1/public/session/{sessionId}/cart**
- Purpose: fetch current cart for session.
- Auth: session token in cookie or header.

**POST /api/v1/public/session/{sessionId}/cart/items**
- Purpose: add item to cart.
- Request: item_id, quantity, modifiers.
- Response: updated cart.

**POST /api/v1/public/session/{sessionId}/order**
- Purpose: submit order for the table/session.
- Request: cart snapshot, optional notes, contact info (optional).
- Response: order_id, order_token, waiter_qr_data, estimated_time.

### Order & Waiter

**GET /api/v1/orders/{orderId}**
**PATCH /api/v1/orders/{orderId}/status**
- Purpose: view and update order status.
- Auth: tenant staff (dashboard) or authorized waiter endpoint when scanning waiter QR (token-based).
- Request: status change, waiter id.
- Response: updated order.

**POST /api/v1/orders/scan**
- Purpose: endpoint used by waiter scanning app to claim order via scanned token.
- Request: order_token (scanned), staff_auth (if required).
- Response: order details and allowed actions.

### Admin / Analytics

**GET /api/v1/tenants/{tenantId}/analytics**
- Purpose: basic analytics (views, orders, revenue).
- Auth: tenant owner.

### Webhooks

**POST /api/v1/webhooks/order-created**
- Purpose: for premium tenants to receive order notifications.
- Auth: webhook secret.

### Authentication & Authorization

- Dashboard endpoints require JWT with tenant_id embedded and role claims.
- Public endpoints: session token stored in short-lived cookie or localStorage and validated via session store.

## 7. UI/UX constraints and behavioral rules

### Public menu load flow

- When a diner scans QR, URL includes menu identifier and optionally a table_id param.
- On first load, create session_id (unguessable, short) and store in secure SameSite cookie; fall back to localStorage if cookies blocked.
- Session expires after configurable idle time (default 60 minutes).
- Cart is scoped to session_id; multiple diners on same table should share same session if they open from the same table QR. If personal sessions are desired, the QR needs to encode a table id and a session handshake flow must merge sessions.

### Cart merging

- If multiple clients on the same table create sessions but they opt-in to share (via table_id encoded in QR), server can merge carts by table_id when order is submitted. For MVP, prefer single-session-per-table via encoded table_id in QR.

### Order submission

- Order submission must be atomic. Once submitted, cart snapshots are persisted and any subsequent changes create new order only.
- On success provide waiter QR and order token; show user friendly confirmation with order id/time.

### Waiter flow

- Waiter QR contains secure short-lived token referencing the order (e.g., HMAC over order id + timestamp).
- Scanning must require staff auth or be restricted by token lifetime.

### Image handling

- Uploaded images must be resized and optimized in background. Cache control headers applied. Serve via CDN.

### Responsiveness & accessibility

- Public menu should be fully responsive and usable with one hand.
- Provide semantic HTML structure and basic ARIA attributes for accessibility.

## 8. Operational concerns

### Image storage & processing

- Accept uploads via pre-signed URL to S3-compatible storage.
- Background worker creates thumbnails, webp conversions and stores metadata.

### CDN

- Use CDN to cache public menu pages and images. Public menu API responses can have short cache TTL and depend on menu publish/unpublish events to invalidate caches.

### DNS & Subdomains

Support two options:
- Wildcard subdomain: *.appdomain.com points to app; tenant uses subdomain fragment (tile.appdomain.com).
- Custom domain (premium): owner points CNAME and app provisions SSL.

Provision TLS certificates automatically via ACME/Let's Encrypt.

### Scaling

- Architect read-heavy (public menus) to be served by CDN and a set of stateless API nodes behind a load balancer.
- Orders and writes go to primary DB and use background queues for non-critical work.

### Monitoring & SLOs

- Track 5xx rate, request latency, queue lengths, worker failures, storage errors.

## 9. Risk & mitigation

**Risk**: Cross-table session collision (neighbors interfering).
**Mitigation**: Encode table_id in printed QR; session created includes menu_id + table_id and is unguessable; recommend printing QR with table_id visible.

**Risk**: Image/asset abuse (large uploads).
**Mitigation**: Limit upload sizes, scan mime type, use signed uploads, process in worker to validate.

**Risk**: High read traffic for popular tenant.
**Mitigation**: Use CDN, autoscaling, and cache invalidation on publish.

**Risk**: Fraud orders or spam.
**Mitigation**: Rate limiting per IP and per menu, captcha during suspicious behavior, order confirmation via owner webhook/push.
