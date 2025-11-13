import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import publicApi from '../../lib/api';
import { useCartStore } from '../../store/cartStore';
import toast from 'react-hot-toast';

interface OrderItem {
  item_id: string;
  quantity: number;
  unit_price: number;
  computed_price: number;
  delivered?: boolean;
}

interface Order {
  id: string;
  items: OrderItem[];
  total_amount: number;
  currency: string;
  status: string;
  notes?: string;
  created_at: string;
}

export default function OrderHistory() {
  const router = useRouter();
  const { sessionId } = useCartStore();

  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (sessionId) {
      fetchOrders();
      const interval = setInterval(fetchOrders, 15000); // Refresh every 15 seconds
      return () => clearInterval(interval);
    } else {
      setIsLoading(false);
    }
  }, [sessionId]);

  const fetchOrders = async () => {
    try {
      const response = await publicApi.get(`/session/${sessionId}/orders`);
      setOrders(response.data);
    } catch (error: any) {
      toast.error('Failed to load order history');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-800';
      case 'acknowledged':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
        return 'bg-orange-100 text-orange-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'new':
        return 'Order Placed';
      case 'acknowledged':
        return 'Preparing';
      case 'in_progress':
        return 'Being Delivered';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const getDeliveryProgress = (order: Order) => {
    const parsedItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
    const delivered = parsedItems.filter((item: OrderItem) => item.delivered).length;
    const total = parsedItems.length;
    return { delivered, total };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading order history...</p>
      </div>
    );
  }

  if (!sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Active Session</h2>
          <p className="text-gray-600 mb-4">Scan a QR code to start ordering</p>
          <button
            onClick={() => router.push('/')}
            className="bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center">
          <button
            onClick={() => router.back()}
            className="mr-4 text-gray-600 hover:text-gray-900"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Order History</h1>
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
            <p className="text-gray-600 mt-4 text-lg">No orders yet</p>
            <p className="text-sm text-gray-500 mt-2">Your orders will appear here</p>
            <button
              onClick={() => router.back()}
              className="mt-4 bg-indigo-600 text-white py-2 px-6 rounded-lg hover:bg-indigo-700"
            >
              Browse Menu
            </button>
          </div>
        ) : (
          orders.map((order) => {
            const parsedItems =
              typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
            const progress = getDeliveryProgress(order);
            const showProgress = order.status !== 'new' && order.status !== 'cancelled';

            return (
              <div key={order.id} className="bg-white rounded-lg shadow overflow-hidden">
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
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                      {getStatusText(order.status)}
                    </span>
                  </div>

                  {showProgress && progress.total > 0 && (
                    <div className="mt-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Items Delivered</span>
                        <span className="font-medium">
                          {progress.delivered}/{progress.total}
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
                  <h4 className="font-medium text-gray-900 mb-3">Items</h4>
                  <div className="space-y-2">
                    {parsedItems.map((item: OrderItem, index: number) => (
                      <div
                        key={index}
                        className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                      >
                        <div className="flex items-center flex-1">
                          {item.delivered && (
                            <svg
                              className="w-5 h-5 text-green-500 mr-2"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                          <div className="flex-1">
                            <p className="text-sm text-gray-900">
                              {item.quantity}x Item (${(item.unit_price / 100).toFixed(2)} each)
                            </p>
                          </div>
                        </div>
                        <p className="text-sm font-medium text-gray-900">
                          ${(item.computed_price / 100).toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>

                  {order.notes && (
                    <div className="mt-4 p-3 bg-gray-50 rounded">
                      <p className="text-sm font-medium text-gray-900">Notes:</p>
                      <p className="text-sm text-gray-700 mt-1">{order.notes}</p>
                    </div>
                  )}

                  <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-900">Total:</span>
                    <span className="text-2xl font-bold text-indigo-600">
                      ${(order.total_amount / 100).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
