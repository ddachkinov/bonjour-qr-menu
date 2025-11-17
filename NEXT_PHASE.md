# Next Phase Implementation - Real-time Features

## ✅ Completed (Current State)

### WebSocket Infrastructure
- ✅ Socket.io installed and integrated
- ✅ Tenant-based room isolation
- ✅ Event emitters created
- ✅ HTTP server with Socket.io
- ✅ Waiter token expiry configurable (default: 30d)

### What's Working
- Full order lifecycle (place → claim → deliver)
- Waiter PIN authentication
- Customer sessions and ordering
- Item-level delivery tracking
- Order history
- Photo uploads
- Menu management

## 🚀 Next Implementation Steps

### Phase 1: Complete WebSocket Integration (2-3 hours)

#### 1.1 Emit Socket Events from OrderService

```typescript
// File: api/src/services/orderService.ts

import { socketEvents } from '../socket';

// In createOrder method after order creation:
socketEvents.orderCreated(order.tenant_id, order);

// In claimOrder method after claiming:
socketEvents.orderClaimed(order.tenant_id, order, waiterId);

// In markItemsDelivered method after update:
socketEvents.itemsDelivered(order.tenant_id, order);

// In updateOrderStatus method after status change:
socketEvents.orderUpdated(order.tenant_id, order);
```

#### 1.2 Create React Socket Hook

```typescript
// File: frontend/public-menu/src/hooks/useSocket.ts

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function useSocket(room?: string) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Initialize socket connection
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
    });

    socketRef.current.on('connect', () => {
      setIsConnected(true);
      if (room) {
        socketRef.current?.emit('join_tenant', room);
      }
    });

    socketRef.current.on('disconnect', () => {
      setIsConnected(false);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [room]);

  return { socket: socketRef.current, isConnected };
}
```

#### 1.3 Update Waiter Pages to Use WebSockets

```typescript
// File: frontend/public-menu/src/pages/waiter/my-orders.tsx

import { useSocket } from '../../hooks/useSocket';

// In component:
const { socket, isConnected } = useSocket(tenantId);

useEffect(() => {
  if (!socket || !isConnected) return;

  // Join waiter room
  socket.emit('join_waiter', { tenantId, waiterId });

  // Listen for order updates
  socket.on('order:created', (order) => {
    // Add new order to list
    setOrders(prev => [order, ...prev]);
  });

  socket.on('order:updated', (order) => {
    // Update order in list
    setOrders(prev => prev.map(o => o.id === order.id ? order : o));
  });

  socket.on('order:items_delivered', (order) => {
    // Update delivery progress
    setOrders(prev => prev.map(o => o.id === order.id ? order : o));
  });

  return () => {
    socket.off('order:created');
    socket.off('order:updated');
    socket.off('order:items_delivered');
  };
}, [socket, isConnected, waiterId, tenantId]);

// Remove polling interval - WebSocket handles updates now!
```

#### 1.4 Update Customer Order History

```typescript
// File: frontend/public-menu/src/pages/orders/history.tsx

const { socket, isConnected } = useSocket();

useEffect(() => {
  if (!socket || !isConnected || !sessionId) return;

  // Join session room
  socket.emit('join_session', sessionId);

  // Listen for order updates
  socket.on('order:updated', (order) => {
    setOrders(prev => prev.map(o => o.id === order.id ? order : o));
  });

  socket.on('order:items_delivered', (order) => {
    setOrders(prev => prev.map(o => o.id === order.id ? order : o));
    toast.success('Item delivered!');
  });

  return () => {
    socket.off('order:updated');
    socket.off('order:items_delivered');
  };
}, [socket, isConnected, sessionId]);

// Remove polling interval
```

### Phase 2: Kitchen Display System (4-5 hours)

#### 2.1 Create Kitchen Display Frontend App

```bash
# Create new Next.js app
cd frontend
npx create-next-app@latest kitchen-display --typescript --tailwind --app
cd kitchen-display
npm install socket.io-client react-hot-toast axios
```

#### 2.2 Main Kitchen Display Page

```typescript
// File: frontend/kitchen-display/src/app/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { useSocket } from '../hooks/useSocket';
import OrderCard from '../components/OrderCard';

interface Order {
  id: string;
  items: any[];
  total_amount: number;
  status: string;
  created_at: string;
  notes?: string;
}

export default function KitchenDisplay() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [tenantId, setTenantId] = useState<string>('');
  const { socket, isConnected } = useSocket(tenantId);

  useEffect(() => {
    // Get tenant ID from URL or localStorage
    const params = new URLSearchParams(window.location.search);
    const tid = params.get('tenant_id') || localStorage.getItem('kitchen_tenant_id') || '';
    setTenantId(tid);
    if (tid) localStorage.setItem('kitchen_tenant_id', tid);
  }, []);

  useEffect(() => {
    if (!socket || !isConnected || !tenantId) return;

    // Join kitchen room
    socket.emit('join_kitchen', tenantId);

    // Fetch initial orders
    fetchOrders();

    // Listen for real-time updates
    socket.on('order:created', (order: Order) => {
      setOrders(prev => [order, ...prev]);
      playNotificationSound();
    });

    socket.on('order:updated', (order: Order) => {
      setOrders(prev => prev.map(o => o.id === order.id ? order : o));
    });

    socket.on('order:claimed', (order: Order) => {
      setOrders(prev => prev.map(o => o.id === order.id ? order : o));
    });

    return () => {
      socket.off('order:created');
      socket.off('order:updated');
      socket.off('order:claimed');
    };
  }, [socket, isConnected, tenantId]);

  const fetchOrders = async () => {
    // Fetch active orders from API
    // Filter: status IN ('new', 'acknowledged', 'in_progress')
  };

  const playNotificationSound = () => {
    const audio = new Audio('/notification.mp3');
    audio.play().catch(e => console.error('Failed to play sound:', e));
  };

  // Filter orders by status
  const newOrders = orders.filter(o => o.status === 'new');
  const inProgress = orders.filter(o => o.status === 'acknowledged');
  const ready = orders.filter(o => o.status === 'in_progress');

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <header className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Kitchen Display</h1>
        <div className="flex items-center gap-4">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-gray-400">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-6">
        {/* New Orders */}
        <div>
          <h2 className="text-2xl font-bold mb-4 text-blue-400">
            New Orders ({newOrders.length})
          </h2>
          <div className="space-y-4">
            {newOrders.map(order => (
              <OrderCard key={order.id} order={order} variant="new" />
            ))}
          </div>
        </div>

        {/* In Progress */}
        <div>
          <h2 className="text-2xl font-bold mb-4 text-yellow-400">
            In Progress ({inProgress.length})
          </h2>
          <div className="space-y-4">
            {inProgress.map(order => (
              <OrderCard key={order.id} order={order} variant="progress" />
            ))}
          </div>
        </div>

        {/* Ready for Pickup */}
        <div>
          <h2 className="text-2xl font-bold mb-4 text-green-400">
            Ready ({ready.length})
          </h2>
          <div className="space-y-4">
            {ready.map(order => (
              <OrderCard key={order.id} order={order} variant="ready" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

#### 2.3 Order Card Component

```typescript
// File: frontend/kitchen-display/src/components/OrderCard.tsx

import { formatDistanceToNow } from 'date-fns';

interface OrderCardProps {
  order: any;
  variant: 'new' | 'progress' | 'ready';
}

export default function OrderCard({ order, variant }: OrderCardProps) {
  const items = JSON.parse(order.items);
  const orderAge = formatDistanceToNow(new Date(order.created_at), { addSuffix: true });

  const bgColor = {
    new: 'bg-blue-900 border-blue-500',
    progress: 'bg-yellow-900 border-yellow-500',
    ready: 'bg-green-900 border-green-500',
  }[variant];

  return (
    <div className={`${bgColor} border-4 rounded-lg p-4`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="text-2xl font-bold">#{order.id.substring(0, 6).toUpperCase()}</p>
          <p className="text-sm text-gray-400">{orderAge}</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold">${(order.total_amount / 100).toFixed(2)}</p>
        </div>
      </div>

      {order.notes && (
        <div className="bg-red-900 border border-red-500 rounded p-2 mb-3">
          <p className="text-sm font-bold">⚠️ SPECIAL REQUEST</p>
          <p className="text-sm">{order.notes}</p>
        </div>
      )}

      <div className="space-y-2">
        {items.map((item: any, index: number) => (
          <div key={index} className="flex justify-between items-center p-2 bg-gray-800 rounded">
            <span className="text-lg">
              <span className="font-bold">{item.quantity}x</span> Item
            </span>
            <span className="text-sm text-gray-400">
              ${(item.unit_price / 100).toFixed(2)}
            </span>
          </div>
        ))}
      </div>

      <button className="w-full mt-4 bg-white text-gray-900 py-3 rounded-lg font-bold hover:bg-gray-200">
        Mark Ready
      </button>
    </div>
  );
}
```

#### 2.4 Add Sound Notification

```bash
# Add public/notification.mp3 (kitchen bell sound)
# Use royalty-free sound from freesound.org or similar
```

### Phase 3: Analytics Dashboard (3-4 hours)

#### 3.1 Create Analytics Service

```typescript
// File: api/src/services/analyticsService.ts

import { query } from '../db';
import { logger } from '../utils/logger';

export class AnalyticsService {
  static async getRevenueMetrics(tenantId: string, days: number = 30) {
    const result = await query(
      `SELECT
        DATE(created_at) as date,
        COUNT(*) as order_count,
        SUM(total_amount) as revenue,
        AVG(total_amount) as avg_order_value
       FROM orders
       WHERE tenant_id = $1
         AND created_at > NOW() - INTERVAL '${days} days'
         AND status != 'cancelled'
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [tenantId]
    );

    return result.rows;
  }

  static async getPopularItems(tenantId: string, limit: number = 10) {
    const result = await query(
      `SELECT
        items->>'item_id' as item_id,
        SUM((items->>'quantity')::int) as total_quantity,
        COUNT(*) as order_count
       FROM orders,
       jsonb_array_elements(items::jsonb) as items
       WHERE tenant_id = $1
         AND status != 'cancelled'
       GROUP BY items->>'item_id'
       ORDER BY total_quantity DESC
       LIMIT $2`,
      [tenantId, limit]
    );

    return result.rows;
  }

  static async getWaiterPerformance(tenantId: string) {
    const result = await query(
      `SELECT
        w.id,
        w.name,
        COUNT(o.id) as total_orders,
        AVG(EXTRACT(EPOCH FROM (o.updated_at - o.created_at))) as avg_completion_time,
        SUM(o.total_amount) as total_revenue
       FROM waiters w
       LEFT JOIN orders o ON o.waiter_id = w.id
       WHERE w.tenant_id = $1
         AND w.active = true
       GROUP BY w.id, w.name
       ORDER BY total_orders DESC`,
      [tenantId]
    );

    return result.rows;
  }

  static async getPeakHours(tenantId: string, days: number = 30) {
    const result = await query(
      `SELECT
        EXTRACT(HOUR FROM created_at) as hour,
        COUNT(*) as order_count,
        SUM(total_amount) as revenue
       FROM orders
       WHERE tenant_id = $1
         AND created_at > NOW() - INTERVAL '${days} days'
         AND status != 'cancelled'
       GROUP BY EXTRACT(HOUR FROM created_at)
       ORDER BY hour ASC`,
      [tenantId]
    );

    return result.rows;
  }
}
```

#### 3.2 Create Analytics Routes

```typescript
// File: api/src/routes/analytics.ts

import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { apiLimiter } from '../middleware/rateLimit';
import { AnalyticsService } from '../services/analyticsService';

const router = Router();

router.use(authenticate);
router.use(apiLimiter);

router.get('/revenue', async (req: AuthRequest, res, next) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const data = await AnalyticsService.getRevenueMetrics(req.user!.tenant_id, days);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.get('/popular-items', async (req: AuthRequest, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const data = await AnalyticsService.getPopularItems(req.user!.tenant_id, limit);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.get('/waiter-performance', async (req: AuthRequest, res, next) => {
  try {
    const data = await AnalyticsService.getWaiterPerformance(req.user!.tenant_id);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.get('/peak-hours', async (req: AuthRequest, res, next) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const data = await AnalyticsService.getPeakHours(req.user!.tenant_id, days);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

export default router;
```

#### 3.3 Analytics Dashboard Page

```typescript
// File: frontend/dashboard/src/pages/analytics.tsx

import { useState, useEffect } from 'react';
import { Line, Bar, Pie } from 'react-chartjs-2';
import api from '../lib/api';

export default function Analytics() {
  const [revenueData, setRevenueData] = useState([]);
  const [popularItems, setPopularItems] = useState([]);
  const [waiterPerformance, setWaiterPerformance] = useState([]);
  const [peakHours, setPeakHours] = useState([]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    const [revenue, items, waiters, hours] = await Promise.all([
      api.get('/analytics/revenue?days=30'),
      api.get('/analytics/popular-items?limit=10'),
      api.get('/analytics/waiter-performance'),
      api.get('/analytics/peak-hours?days=30'),
    ]);

    setRevenueData(revenue.data);
    setPopularItems(items.data);
    setWaiterPerformance(waiters.data);
    setPeakHours(hours.data);
  };

  // Chart configurations...

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Analytics Dashboard</h1>

      <div className="grid grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Revenue Trend</h2>
          <Line data={/* ... */} />
        </div>

        {/* Popular Items */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Popular Items</h2>
          <Bar data={/* ... */} />
        </div>

        {/* Waiter Performance */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Waiter Performance</h2>
          {/* Table or chart */}
        </div>

        {/* Peak Hours */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Peak Hours</h2>
          <Line data={/* ... */} />
        </div>
      </div>
    </div>
  );
}
```

### Phase 4: Table Management (4-5 hours)

#### 4.1 Create Tables Database Schema

```sql
-- File: api/src/db/migrations/002_add_tables.sql

CREATE TABLE IF NOT EXISTS tables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  table_number VARCHAR(50) NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 4,
  status VARCHAR(50) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved', 'cleaning')),
  position_x INTEGER,
  position_y INTEGER,
  waiter_id UUID REFERENCES waiters(id) ON DELETE SET NULL,
  current_session_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, table_number)
);

CREATE INDEX idx_tables_tenant ON tables(tenant_id);
CREATE INDEX idx_tables_status ON tables(status);
CREATE INDEX idx_tables_waiter ON tables(waiter_id);

CREATE TRIGGER update_tables_updated_at BEFORE UPDATE ON tables
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

#### 4.2 Table Service

```typescript
// File: api/src/services/tableService.ts

export class TableService {
  static async createTable(tenantId: string, data: CreateTableInput) {
    const result = await query(
      `INSERT INTO tables (tenant_id, table_number, capacity, position_x, position_y)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [tenantId, data.table_number, data.capacity, data.position_x, data.position_y]
    );

    return result.rows[0];
  }

  static async updateTableStatus(tableId: string, tenantId: string, status: string) {
    const result = await query(
      `UPDATE tables
       SET status = $1
       WHERE id = $2 AND tenant_id = $3
       RETURNING *`,
      [status, tableId, tenantId]
    );

    const table = result.rows[0];

    // Emit socket event
    socketEvents.tableStatusChanged(tenantId, table);

    return table;
  }

  static async assignWaiter(tableId: string, tenantId: string, waiterId: string) {
    const result = await query(
      `UPDATE tables
       SET waiter_id = $1
       WHERE id = $2 AND tenant_id = $3
       RETURNING *`,
      [waiterId, tableId, tenantId]
    );

    return result.rows[0];
  }

  static async listTables(tenantId: string) {
    const result = await query(
      `SELECT t.*, w.name as waiter_name
       FROM tables t
       LEFT JOIN waiters w ON w.id = t.waiter_id
       WHERE t.tenant_id = $1
       ORDER BY t.table_number ASC`,
      [tenantId]
    );

    return result.rows;
  }
}
```

#### 4.3 Floor Plan Editor

```typescript
// File: frontend/dashboard/src/pages/tables.tsx

// Interactive drag-and-drop floor plan
// Click to add table
// Drag to reposition
// Real-time status updates via WebSocket
// Color coding: green (available), red (occupied), yellow (reserved), gray (cleaning)
```

## 📦 Package Updates Needed

```bash
# Backend
cd api
npm install socket.io @types/socket.io

# Frontend - Dashboard
cd frontend/dashboard
npm install socket.io-client chart.js react-chartjs-2 react-beautiful-dnd date-fns

# Frontend - Public Menu
cd frontend/public-menu
npm install socket.io-client date-fns

# Frontend - Kitchen Display (new app)
# Create separately as shown above
```

## 🎯 Testing Checklist

- [ ] WebSocket connection established
- [ ] Orders appear in kitchen display in real-time
- [ ] Waiter sees order updates instantly (no refresh)
- [ ] Customer sees delivery progress in real-time
- [ ] Sound alerts play for new orders
- [ ] Analytics charts render correctly
- [ ] Table status updates in real-time
- [ ] Multiple devices stay in sync
- [ ] Reconnection works after disconnect

## 📝 Environment Variables to Add

```env
# .env
WAITER_TOKEN_EXPIRY=30d  # or 8h for shift-based
```

## 🚀 Run Commands

```bash
# Start API with WebSocket
cd api
npm run dev

# Start Dashboard
cd frontend/dashboard
npm run dev

# Start Public Menu
cd frontend/public-menu
npm run dev

# Start Kitchen Display (after creation)
cd frontend/kitchen-display
npm run dev
```

## 🎨 UI/UX Improvements

### Kitchen Display
- Full-screen mode
- Large, readable fonts (for distance viewing)
- Color-coded status
- Auto-scroll for long order lists
- "Bump" button to complete orders
- Timer showing order age

### Analytics Dashboard
- Date range picker
- Export to CSV/PDF
- Real-time metrics ticker
- Comparison with previous periods
- Goal tracking

### Table Management
- Visual floor plan (drag and drop)
- Section assignment
- Table combining
- Reservation calendar
- Guest count tracking

---

**Ready to implement?** Start with Phase 1 (WebSocket Integration) as it's the foundation for everything else!
