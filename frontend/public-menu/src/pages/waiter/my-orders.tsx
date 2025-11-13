import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import toast from 'react-hot-toast';

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
  items: OrderItem[];
  total_amount: number;
  currency: string;
  status: string;
  notes?: string;
  waiter_ack_user_id?: string;
  created_at: string;
}

export default function MyOrders() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [waiterName, setWaiterName] = useState<string | null>(null);

  useEffect(() => {
    const savedName = localStorage.getItem('waiter_name');
    if (!savedName) {
      toast.error('Please claim an order first to see your orders');
      return;
    }
    setWaiterName(savedName);
    fetchOrders(savedName);
    const interval = setInterval(() => fetchOrders(savedName), 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchOrders = async (name: string) => {
    try {
      const response = await axios.get(`${API_URL}/api/v1/orders/waiter/${encodeURIComponent(name)}`);
      setOrders(response.data);
    } catch (error: any) {
      toast.error('Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  };

  const getDeliveryProgress = (order: Order) => {
    const parsedItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
    const delivered = parsedItems.filter((item: OrderItem) => item.delivered).length;
    const total = parsedItems.length;
    return { delivered, total };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'acknowledged':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
        return 'bg-orange-100 text-orange-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'acknowledged':
        return 'In Kitchen';
      case 'in_progress':
        return 'Delivering';
      case 'completed':
        return 'Completed';
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading your orders...</p>
      </div>
    );
  }

  if (!waiterName) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Active Session</h2>
          <p className="text-gray-600">Scan an order QR code to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
          <p className="text-sm text-gray-600 mt-1">Waiter: {waiterName}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {orders.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <svg
              className="mx-auto h-16 w-16 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-gray-600 mt-4 text-lg">No active orders</p>
            <p className="text-sm text-gray-500 mt-2">Orders you claim will appear here</p>
          </div>
        ) : (
          orders.map((order) => {
            const parsedItems =
              typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
            const progress = getDeliveryProgress(order);

            return (
              <div
                key={order.id}
                onClick={() => router.push(`/waiter/order/${order.order_token}`)}
                className="bg-white rounded-lg shadow overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
              >
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-gray-900">
                        Order #{order.id.substring(0, 8).toUpperCase()}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {new Date(order.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                        order.status
                      )}`}
                    >
                      {getStatusText(order.status)}
                    </span>
                  </div>

                  {progress.total > 0 && (
                    <div className="mt-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Delivery Progress</span>
                        <span className="font-medium">
                          {progress.delivered}/{progress.total} items
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${(progress.delivered / progress.total) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      {parsedItems.length} {parsedItems.length === 1 ? 'item' : 'items'}
                    </span>
                    <span className="text-lg font-bold text-indigo-600">
                      ${(order.total_amount / 100).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {orders.length > 0 && (
          <button
            onClick={() => fetchOrders(waiterName!)}
            className="w-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold py-3 rounded-lg transition-colors"
          >
            Refresh Orders
          </button>
        )}
      </div>
    </div>
  );
}
