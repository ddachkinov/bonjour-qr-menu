# Testing Guide

## Automated E2E Testing

The project includes a comprehensive end-to-end testing script that simulates all user roles:
- 👨‍💼 **Owner** - Restaurant management
- 🍽️ **Waiter** - Order handling and delivery with real-time updates
- 👤 **Customer** - Menu browsing and ordering with live status tracking
- 👨‍🍳 **Kitchen** - Kitchen Display System with real-time order queue ✨ NEW
- 🍹 **Bar** - Drink orders (future)

### Prerequisites

1. **Services running:**
```bash
npm run dev
```

2. **Database seeded:**
```bash
cd scripts
npm install
npm run seed
```

3. **Get your tenant ID:**
```bash
./scripts/get-tenant-id.sh demo@restaurant.com
```

This will output:
```
✅ Tenant ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### Running the Tests

```bash
cd scripts

# Install dependencies (first time only)
npm install

# Run all tests
TENANT_ID=your-tenant-id-here npm test
```

### What Gets Tested

#### 1. Owner Flow ✅
- Login with email/password
- Create waiter accounts with PINs
- List all waiters
- Retrieve published menus

#### 2. Waiter Flow ✅
- Login with name and 4-digit PIN
- Receive 8-hour JWT token
- Scan order QR codes
- Claim orders
- Mark items as delivered
- View active orders
- Track delivery progress

#### 3. Customer Flow ✅
- Create table session
- Browse menu with categories
- View item details and photos
- Add items to cart
- View cart with totals
- Place order with special notes
- Receive waiter QR code
- View order history
- Track delivery status in real-time

#### 4. Order Lifecycle ✅
- Order placed → Status: "new"
- Waiter scans QR → Can claim
- Waiter claims → Status: "acknowledged"
- Items delivered progressively
- All items delivered → Status: "completed"

### Test Output Example

```
🧪 QR Menu SaaS - Comprehensive E2E Testing

============================================================
Testing Owner Authentication
============================================================
✓ Owner logged in successfully: demo@restaurant.com

============================================================
Testing Waiter Creation
============================================================
✓ Created waiter: Alice Johnson (ID: xxx)
✓ Created waiter: Bob Smith (ID: xxx)

============================================================
Testing Waiter Authentication
============================================================
✓ Waiter logged in: Alice Johnson
ℹ   Token expires in: 8 hours
✓ Waiter logged in: Bob Smith
ℹ   Token expires in: 8 hours

... (continued)

============================================================
Test Summary
============================================================
✓ All tests completed!

📊 Test Results:
  ✓ Owner authentication
  ✓ Waiter management
  ✓ Waiter authentication
  ✓ Customer session management
  ✓ Menu browsing
  ✓ Cart operations
  ✓ Order placement
  ✓ Waiter order claiming
  ✓ Item delivery tracking
  ✓ Customer order history
```

## Manual Testing

### Test as Owner

1. Go to `http://localhost:3000`
2. Login: `demo@restaurant.com` / `Demo123!`
3. Create/edit menus
4. Add menu items with photos
5. Publish menu
6. Download QR code

### Test as Customer

1. Go to `http://localhost:3002/menu/[menu-id]?table=T-1`
2. Browse menu
3. Add items to cart
4. Place order
5. View waiter QR code
6. Check order history at `/orders/history`
7. **NEW - Real-time updates**: Watch order status change live when waiter claims/delivers
8. **NEW**: See toast notifications when waiter claims order or delivers items

### Test as Waiter

1. Get tenant ID: `./scripts/get-tenant-id.sh demo@restaurant.com`
2. Go to `http://localhost:3002/waiter/login?tenant_id=[tenant-id]`
3. Login with:
   - Name: Alice Johnson
   - PIN: 1234
4. Scan order QR (use customer's waiter QR code)
5. Claim order
6. Mark items as delivered
7. View your orders at `/waiter/my-orders`
8. **NEW - Real-time updates**: Orders update instantly without refreshing
9. **NEW**: See "Live" indicator showing WebSocket connection status

### Test Kitchen Display System

1. Get tenant ID: `./scripts/get-tenant-id.sh demo@restaurant.com`
2. Open kitchen display: `http://localhost:3002/kitchen?tenant_id=[tenant-id]`
3. Place an order as a customer (in another browser window/tab)
4. **Real-time**: See order appear instantly in "New Orders" column with sound alert
5. Have waiter claim the order
6. **Real-time**: Watch order move to "In Progress" column automatically
7. Have waiter mark items as delivered
8. **Real-time**: Watch order move to "Ready" column when all items delivered
9. Verify connection status indicator shows "Connected" with green pulse

### Test Order Flow End-to-End

**Step 1: Customer places order**
```bash
curl -X POST http://localhost:3001/api/v1/public/session \
  -H "Content-Type: application/json" \
  -d '{
    "menu_id": "your-menu-id",
    "table_number": "T-5"
  }'

# Note the session_id
SESSION_ID="..."

# Add items to cart
curl -X POST http://localhost:3001/api/v1/public/session/$SESSION_ID/cart/items \
  -H "Content-Type: application/json" \
  -d '{
    "item_id": "your-item-id",
    "quantity": 2,
    "unit_price": 1299,
    "computed_price": 2598
  }'

# Place order
curl -X POST http://localhost:3001/api/v1/public/session/$SESSION_ID/order \
  -H "Content-Type: application/json" \
  -d '{"notes": "Extra spicy!"}'

# Note the order_token
```

**Step 2: Waiter claims order**
```bash
# Scan order
curl -X POST http://localhost:3001/api/v1/orders/scan \
  -H "Content-Type: application/json" \
  -d '{"order_token": "your-order-token"}'

# Claim order
curl -X POST http://localhost:3001/api/v1/orders/claim \
  -H "Content-Type: application/json" \
  -d '{
    "order_token": "your-order-token",
    "waiter_id": "your-waiter-id"
  }'
```

**Step 3: Waiter delivers items**
```bash
# Mark first item as delivered
curl -X POST http://localhost:3001/api/v1/orders/items/delivered \
  -H "Content-Type: application/json" \
  -d '{
    "order_token": "your-order-token",
    "item_indices": [0]
  }'

# Mark all remaining items
curl -X POST http://localhost:3001/api/v1/orders/items/delivered \
  -H "Content-Type: application/json" \
  -d '{
    "order_token": "your-order-token",
    "item_indices": [1, 2]
  }'
```

## Performance Testing

### Load Testing with Apache Bench

```bash
# Test menu endpoint
ab -n 1000 -c 10 http://localhost:3001/api/v1/public/menus/[menu-id]

# Test order creation
ab -n 100 -c 5 -p order.json -T application/json \
  http://localhost:3001/api/v1/public/session/[session-id]/order
```

### Database Query Performance

```sql
-- Find slow queries
SELECT query, mean_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check missing indexes
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname = 'public'
  AND n_distinct > 100
  AND correlation < 0.1;
```

## Debugging Tips

### Enable Debug Logging

```bash
# API
DEBUG=* npm run dev

# Specific module
DEBUG=express:* npm run dev
```

### Check Database Connections

```sql
SELECT
  pid,
  usename,
  application_name,
  client_addr,
  state,
  query
FROM pg_stat_activity
WHERE datname = 'qrmenu_dev';
```

### Monitor Redis

```bash
redis-cli MONITOR
```

### Check API Health

```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-17T..."
}
```

## Common Issues

### Issue: "Waiter not found"
**Solution:** Make sure waiter was created first:
```bash
curl -X POST http://localhost:3001/api/v1/waiters \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice Johnson", "pin": "1234"}'
```

### Issue: "Session expired"
**Solution:** Create new session. Sessions expire after 1 hour of inactivity.

### Issue: "Invalid PIN"
**Solution:** PIN must be exactly 4 digits. Reset PIN:
```bash
curl -X PATCH http://localhost:3001/api/v1/waiters/[waiter-id] \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"pin": "1234"}'
```

### Issue: "Cannot claim order - already claimed"
**Solution:** Orders can only be claimed once. Check order status first.

## Test Data Cleanup

### Reset specific tenant
```sql
DELETE FROM orders WHERE tenant_id = 'your-tenant-id';
DELETE FROM items WHERE tenant_id = 'your-tenant-id';
DELETE FROM categories WHERE tenant_id = 'your-tenant-id';
DELETE FROM menus WHERE tenant_id = 'your-tenant-id';
DELETE FROM waiters WHERE tenant_id = 'your-tenant-id';
```

### Reset all data
```bash
./scripts/dev-setup.sh
```

## CI/CD Testing

### GitHub Actions (Future)

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
      redis:
        image: redis:7
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run test:e2e
```

## Next Steps

1. Add unit tests for services
2. Add integration tests for API routes
3. Add frontend component tests (Jest + React Testing Library)
4. Add visual regression tests (Percy/Chromatic)
5. Add load testing (k6)
6. Add security testing (OWASP ZAP)

---

**Questions?** Check the main README or open an issue on GitHub.
