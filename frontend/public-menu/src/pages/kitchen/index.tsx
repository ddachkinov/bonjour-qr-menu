import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { useSocket } from '../../hooks/useSocket';
import toast, { Toaster } from 'react-hot-toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface OrderItem {
  item_id: string;
  quantity: number;
  unit_price: number;
  computed_price: number;
  delivered?: boolean;
}

interface Order {
  id: string;
  order_token: string;
  items: string | OrderItem[];
  total_amount: number;
  currency: string;
  status: string;
  notes?: string;
  waiter_id?: string;
  created_at: string;
  tenant_id: string;
}

export default function KitchenDisplay() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [tenantId, setTenantId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const { socket, isConnected } = useSocket(tenantId);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Get tenant ID from URL or localStorage
    const params = new URLSearchParams(window.location.search);
    const tid = params.get('tenant_id') || localStorage.getItem('kitchen_tenant_id') || '';
    if (tid) {
      setTenantId(tid);
      localStorage.setItem('kitchen_tenant_id', tid);
    }
  }, []);

  useEffect(() => {
    if (tenantId) {
      fetchOrders();
    }
  }, [tenantId]);

  useEffect(() => {
    if (!socket || !isConnected || !tenantId) return;

    // Join kitchen room
    socket.emit('join_kitchen', tenantId);

    // Listen for real-time updates
    socket.on('order:created', (order: Order) => {
      setOrders((prev) => [order, ...prev]);
      playNotificationSound();
      toast.success(`New Order #${order.id.substring(0, 6).toUpperCase()}`, {
        duration: 5000,
        icon: '🔔',
      });
    });

    socket.on('order:updated', (order: Order) => {
      setOrders((prev) => prev.map((o) => (o.id === order.id ? order : o)));
    });

    socket.on('order:claimed', (order: Order) => {
      setOrders((prev) => prev.map((o) => (o.id === order.id ? order : o)));
    });

    socket.on('order:items_delivered', (order: Order) => {
      setOrders((prev) => prev.map((o) => (o.id === order.id ? order : o)));
    });

    return () => {
      socket.off('order:created');
      socket.off('order:updated');
      socket.off('order:claimed');
      socket.off('order:items_delivered');
    };
  }, [socket, isConnected, tenantId]);

  const fetchOrders = async () => {
    if (!tenantId) return;

    try {
      const response = await axios.get(`${API_URL}/api/v1/orders`, {
        headers: {
          // You'll need to pass authentication token from owner dashboard
          // For now, this is a limitation - kitchen needs auth
        },
      });

      // Filter for active orders only
      const activeOrders = response.data.filter(
        (o: Order) => ['new', 'acknowledged', 'in_progress'].includes(o.status)
      );
      setOrders(activeOrders);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const playNotificationSound = () => {
    try {
      // Create a beep sound programmatically
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800; // Hz
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.error('Failed to play sound:', error);
    }
  };

  const getOrderAge = (createdAt: string) => {
    const now = new Date().getTime();
    const created = new Date(createdAt).getTime();
    const diffMinutes = Math.floor((now - created) / 1000 / 60);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes === 1) return '1 min ago';
    return `${diffMinutes} mins ago`;
  };

  const getOrderItems = (order: Order): OrderItem[] => {
    return typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
  };

  // Filter orders by status
  const newOrders = orders.filter((o) => o.status === 'new');
  const inProgress = orders.filter((o) => o.status === 'acknowledged');
  const ready = orders.filter((o) => o.status === 'in_progress');

  if (!tenantId) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Kitchen Display System</h1>
          <p className="text-gray-400 mb-6">Please provide tenant_id in URL</p>
          <p className="text-sm text-gray-500">
            Example: /kitchen?tenant_id=your-tenant-id
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <p className="text-2xl">Loading orders...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <Toaster position="top-center" />

      <header className="mb-8">
        <div className="flex items-center justify-between">
          <h1 className="text-5xl font-bold">Kitchen Display</h1>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div
                className={`w-4 h-4 rounded-full ${
                  isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                }`}
              />
              <span className="text-lg text-gray-400">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <div className="text-3xl font-bold text-indigo-400">
              {orders.length} Active
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-6">
        {/* New Orders Column */}
        <div>
          <h2 className="text-3xl font-bold mb-6 text-blue-400 flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></span>
            New Orders ({newOrders.length})
          </h2>
          <div className="space-y-4">
            {newOrders.map((order) => {
              const items = getOrderItems(order);
              return (
                <div
                  key={order.id}
                  className="bg-blue-900 border-4 border-blue-500 rounded-lg p-5 shadow-xl animate-pulse-slow"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-3xl font-bold">
                        #{order.id.substring(0, 6).toUpperCase()}
                      </p>
                      <p className="text-lg text-blue-300 mt-1">
                        {getOrderAge(order.created_at)}
                      </p>
                    </div>
                    <p className="text-4xl font-bold">${(order.total_amount / 100).toFixed(2)}</p>
                  </div>

                  {order.notes && (
                    <div className="bg-red-900 border border-red-500 rounded-lg p-3 mb-4">
                      <p className="text-sm font-bold flex items-center gap-2">
                        <span className="text-2xl">⚠️</span>
                        SPECIAL REQUEST
                      </p>
                      <p className="text-base mt-1">{order.notes}</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    {items.map((item, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center p-3 bg-gray-800 rounded text-lg"
                      >
                        <span>
                          <span className="font-bold text-2xl">{item.quantity}x</span> Item
                        </span>
                        <span className="text-gray-400">
                          ${(item.unit_price / 100).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* In Progress Column */}
        <div>
          <h2 className="text-3xl font-bold mb-6 text-yellow-400 flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-yellow-500 animate-pulse"></span>
            In Progress ({inProgress.length})
          </h2>
          <div className="space-y-4">
            {inProgress.map((order) => {
              const items = getOrderItems(order);
              return (
                <div
                  key={order.id}
                  className="bg-yellow-900 border-4 border-yellow-500 rounded-lg p-5 shadow-xl"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-3xl font-bold">
                        #{order.id.substring(0, 6).toUpperCase()}
                      </p>
                      <p className="text-lg text-yellow-300 mt-1">
                        {getOrderAge(order.created_at)}
                      </p>
                    </div>
                    <p className="text-4xl font-bold">${(order.total_amount / 100).toFixed(2)}</p>
                  </div>

                  {order.notes && (
                    <div className="bg-red-900 border border-red-500 rounded-lg p-3 mb-4">
                      <p className="text-sm font-bold">⚠️ SPECIAL REQUEST</p>
                      <p className="text-base mt-1">{order.notes}</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    {items.map((item, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center p-3 bg-gray-800 rounded text-lg"
                      >
                        <span>
                          <span className="font-bold text-2xl">{item.quantity}x</span> Item
                        </span>
                        <span className="text-gray-400">
                          ${(item.unit_price / 100).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ready for Pickup Column */}
        <div>
          <h2 className="text-3xl font-bold mb-6 text-green-400 flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></span>
            Ready ({ready.length})
          </h2>
          <div className="space-y-4">
            {ready.map((order) => {
              const items = getOrderItems(order);
              return (
                <div
                  key={order.id}
                  className="bg-green-900 border-4 border-green-500 rounded-lg p-5 shadow-xl"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-3xl font-bold">
                        #{order.id.substring(0, 6).toUpperCase()}
                      </p>
                      <p className="text-lg text-green-300 mt-1">
                        {getOrderAge(order.created_at)}
                      </p>
                    </div>
                    <p className="text-4xl font-bold">${(order.total_amount / 100).toFixed(2)}</p>
                  </div>

                  <div className="space-y-2">
                    {items.map((item, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center p-3 bg-gray-800 rounded text-lg"
                      >
                        <span>
                          <span className="font-bold text-2xl">{item.quantity}x</span> Item
                        </span>
                        <span className="text-gray-400">
                          ${(item.unit_price / 100).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse-slow {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.8;
          }
        }
        .animate-pulse-slow {
          animation: pulse-slow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  );
}
