# QR Menu SaaS Platform

A complete SaaS platform for restaurants to create, manage, and publish QR code-based digital menus. Enables contactless ordering with real-time order management.

## Features

### MVP Features

- Multi-tenant architecture with isolated restaurant data
- Owner dashboard for menu and order management
- Menu builder with categories and items
- Image upload with S3 integration
- QR code generation for published menus
- Public-facing mobile-optimized menu viewer
- Table session isolation for cart management
- Order submission with waiter QR codes
- Waiter order claiming and management
- Item-level delivery tracking
- Customer order history with real-time updates
- Real-time order status tracking
- JWT-based authentication
- Rate limiting and security middleware

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend Layer                       │
├──────────────────────┬──────────────────────────────────────┤
│  Owner Dashboard     │     Public Menu SPA                  │
│  (Next.js)           │     (Next.js)                        │
│  Port: 3000          │     Port: 3002                       │
└──────────────────────┴──────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       API Gateway                            │
│                  (Express + TypeScript)                      │
│                       Port: 3001                             │
├─────────────────────────────────────────────────────────────┤
│  Auth │ Menus │ Orders │ Sessions │ Uploads                 │
└─────────────────────────────────────────────────────────────┘
           ▼                ▼                 ▼
┌──────────────────┬──────────────────┬────────────────┐
│   PostgreSQL     │      Redis       │   AWS S3       │
│   (Relational)   │   (Sessions)     │   (Images)     │
└──────────────────┴──────────────────┴────────────────┘
```

## Technology Stack

### Backend
- Node.js 18+ with TypeScript
- Express.js for API server
- PostgreSQL for relational data
- Redis for session management
- AWS SDK for S3 uploads
- JWT for authentication
- bcrypt for password hashing

### Frontend
- Next.js 14 with React 18
- TypeScript for type safety
- Tailwind CSS for styling
- Zustand for state management
- Axios for API calls
- react-hook-form for forms
- QRCode.react for QR generation

### DevOps
- Docker & Docker Compose
- Multi-stage Dockerfile builds
- npm workspaces for monorepo

## Project Structure

```
qr-menu-saas/
├── api/                          # Backend API
│   ├── src/
│   │   ├── config/               # Configuration
│   │   ├── db/                   # Database and Redis
│   │   ├── middleware/           # Auth, rate limiting, errors
│   │   ├── routes/               # API routes
│   │   ├── services/             # Business logic
│   │   └── utils/                # Utilities
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── dashboard/                # Owner dashboard
│   │   ├── src/
│   │   │   ├── lib/              # API client
│   │   │   ├── pages/            # Next.js pages
│   │   │   ├── store/            # State management
│   │   │   └── styles/           # Global styles
│   │   ├── Dockerfile
│   │   └── package.json
│   └── public-menu/              # Public menu SPA
│       ├── src/
│       │   ├── lib/              # API client
│       │   ├── pages/            # Next.js pages
│       │   ├── store/            # Cart state
│       │   └── styles/           # Global styles
│       ├── Dockerfile
│       └── package.json
├── libs/
│   └── shared-types/             # Shared TypeScript types
│       └── src/index.ts
├── scripts/                      # Setup and utility scripts
├── docker-compose.yml            # Development environment
├── docker-compose.prod.yml       # Production environment
├── .env.example                  # Environment template
└── package.json                  # Root workspace config
```

## Getting Started

### Prerequisites

- Node.js 18 or higher
- Docker and Docker Compose
- npm or yarn
- AWS account (for S3) or S3-compatible storage

### Installation

1. Clone the repository:

```bash
git clone https://github.com/your-org/qr-menu-saas.git
cd qr-menu-saas
```

2. Run the setup script:

```bash
./scripts/dev-setup.sh
```

This will:
- Create .env file from template
- Install dependencies
- Build shared types
- Start PostgreSQL and Redis via Docker
- Initialize database schema

3. Update environment variables in `.env`:

```bash
# Required: Update these values
JWT_SECRET=your-secure-secret
JWT_REFRESH_SECRET=your-secure-refresh-secret
S3_ACCESS_KEY=your-s3-access-key
S3_SECRET=your-s3-secret-key
S3_BUCKET=your-bucket-name
```

4. Start the development servers:

```bash
npm run dev
```

This starts all services concurrently:
- API: http://localhost:3001
- Dashboard: http://localhost:3000
- Public Menu: http://localhost:3002

5. (Optional) Seed sample data:

```bash
# Install seed script dependencies
cd scripts
npm install

# Run the seed script
npm run seed
```

This creates a sample restaurant "Bonjour Bistro" with a complete menu (appetizers, main courses, desserts, beverages). Perfect for testing and demos!

Login credentials will be displayed after seeding completes.

**Note:** Make sure to run `npm install` in the scripts directory before running the seed script.

### Using Docker Compose

Start all services with Docker:

```bash
docker-compose up
```

For production build:

```bash
docker-compose -f docker-compose.prod.yml up
```

## Development

### Running Individual Services

```bash
# API only
npm run dev:api

# Dashboard only
npm run dev:dashboard

# Public menu only
npm run dev:public
```

### Building for Production

```bash
# Build all workspaces
npm run build

# Build specific workspace
npm run build --workspace=api
```

### Testing

```bash
# Run all tests
npm test

# Run tests for specific workspace
npm test --workspace=api
```

### Database Management

Initialize or reset database:

```bash
docker-compose exec postgres psql -U postgres -d qrmenu_dev -f /docker-entrypoint-initdb.d/schema.sql
```

Access PostgreSQL:

```bash
docker-compose exec postgres psql -U postgres -d qrmenu_dev
```

Access Redis:

```bash
docker-compose exec redis redis-cli
```

## API Documentation

### Authentication Endpoints

#### POST /api/v1/auth/signup
Create new owner account and tenant.

Request:
```json
{
  "email": "owner@restaurant.com",
  "password": "securepassword",
  "restaurant_name": "My Restaurant",
  "subdomain": "my-restaurant"
}
```

Response:
```json
{
  "access_token": "jwt-token",
  "refresh_token": "refresh-token",
  "user": {
    "id": "uuid",
    "email": "owner@restaurant.com",
    "tenant_id": "uuid",
    "role": "owner"
  }
}
```

#### POST /api/v1/auth/login
Authenticate existing user.

### Menu Endpoints

All menu endpoints require authentication via Bearer token.

#### POST /api/v1/menus
Create a new menu.

#### GET /api/v1/menus
List all menus for authenticated tenant.

#### GET /api/v1/menus/:menuId
Get menu details.

#### POST /api/v1/menus/:menuId/publish
Publish menu and generate public URL and QR code.

#### POST /api/v1/menus/:menuId/categories
Add category to menu.

#### POST /api/v1/menus/:menuId/items
Add item to menu.

### Public Endpoints

No authentication required.

#### GET /api/v1/public/menus/:menuId
Get published menu with categories and items.

#### POST /api/v1/public/menus/:menuId/session
Create table session for cart.

#### POST /api/v1/public/session/:sessionId/cart/items
Add item to cart.

#### POST /api/v1/public/session/:sessionId/order
Submit order and receive waiter QR.

#### GET /api/v1/public/session/:sessionId/orders
Get all orders for a customer session.

### Order Endpoints

#### Public Waiter Endpoints (No Authentication)

##### POST /api/v1/orders/scan
Scan order QR code to view order details.

##### POST /api/v1/orders/claim
Claim an order by entering waiter name.

##### POST /api/v1/orders/items/delivered
Mark specific items as delivered.

##### GET /api/v1/orders/waiter/:waiterName
Get all active orders for a specific waiter.

#### Protected Endpoints (Require Authentication)

##### GET /api/v1/orders
List orders for tenant.

##### PATCH /api/v1/orders/:orderId/status
Update order status.

## Usage Guide

### For Restaurant Owners

1. Sign up at http://localhost:3000/signup
2. Create your restaurant profile
3. Create a menu
4. Add categories (e.g., Appetizers, Main Course, Desserts)
5. Add items to each category with prices and descriptions
6. Publish the menu
7. Download and print the QR code
8. Place QR codes on tables

### For Diners

1. Scan the QR code on your table
2. Browse the menu with photos and descriptions
3. Add items to cart
4. Submit order with optional special instructions
5. Receive waiter QR code - show this to the waiter
6. View order history to track all your orders
7. See real-time delivery progress as items are brought to your table
8. Monitor order status: New → In Kitchen → Delivering → Completed

### For Waiters

1. Scan customer's waiter QR code from the order screen
2. Enter your name to claim the order
3. View order details and special instructions
4. Mark individual items as delivered by checking them off
5. View all your active orders at /waiter/my-orders
6. Track delivery progress in real-time
7. Order automatically completes when all items are delivered

## Configuration

### Environment Variables

See `.env.example` for all available configuration options.

Key variables:

- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `JWT_SECRET`: Secret for access tokens
- `JWT_REFRESH_SECRET`: Secret for refresh tokens
- `S3_BUCKET`: S3 bucket name for uploads
- `S3_ACCESS_KEY`: AWS access key
- `S3_SECRET`: AWS secret key
- `RATE_LIMIT_PER_MINUTE`: API rate limit (default: 60)

### Database Schema

The PostgreSQL schema includes:

- tenants: Restaurant accounts
- users: Owner and staff accounts
- menus: Published menus
- categories: Menu categories
- items: Menu items
- orders: Customer orders
- uploads: Media files
- audit_logs: Audit trail
- refresh_tokens: JWT refresh tokens

## Deployment

### Production Checklist

- [ ] Update all secrets in environment variables
- [ ] Configure production database (managed PostgreSQL recommended)
- [ ] Configure production Redis (managed Redis recommended)
- [ ] Set up S3 bucket with proper CORS
- [ ] Configure CDN for static assets
- [ ] Set up SSL certificates
- [ ] Configure DNS wildcard for tenant subdomains
- [ ] Set up monitoring and logging
- [ ] Configure database backups
- [ ] Review and adjust rate limits
- [ ] Enable HTTPS-only mode

### Docker Production Deployment

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Start production services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop services
docker-compose -f docker-compose.prod.yml down
```

### Scaling Considerations

- API: Stateless, can scale horizontally behind load balancer
- Frontend: Static builds, serve via CDN
- PostgreSQL: Use managed service with read replicas for reads
- Redis: Use Redis Cluster for high availability
- S3: Automatically scales

## Security

- Passwords hashed with bcrypt
- JWT tokens with expiration
- Refresh token rotation
- Rate limiting on all endpoints
- CORS configured
- Helmet.js for HTTP headers
- Input validation on all endpoints
- SQL injection protection via parameterized queries
- XSS protection via React

## Troubleshooting

### Port Already in Use

```bash
# Find and kill process on port 3001
lsof -ti:3001 | xargs kill -9
```

### Database Connection Failed

```bash
# Restart PostgreSQL
docker-compose restart postgres

# Check logs
docker-compose logs postgres
```

### Redis Connection Failed

```bash
# Restart Redis
docker-compose restart redis

# Check logs
docker-compose logs redis
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- GitHub Issues: https://github.com/your-org/qr-menu-saas/issues
- Documentation: See SPEC.md and PROJECT_PLAN.md

## Roadmap

See TASKS.md for detailed implementation roadmap.

Upcoming features:
- Payment processing integration
- POS system integrations
- Custom domain support
- Multi-language menus
- Analytics dashboard
- Kitchen display system
- Waiter mobile app
- Menu modifiers and options
