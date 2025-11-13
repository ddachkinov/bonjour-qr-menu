import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import type { Order, OrderStatus } from '@qrmenu/shared-types';

export default function Orders() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    fetchOrders();

    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, filter, router]);

  const fetchOrders = async () => {
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const response = await api.get('/orders', { params });
      setOrders(response.data);
    } catch (error: any) {
      toast.error('Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      await api.patch(`/orders/${orderId}/status`, { status });
      toast.success('Order status updated');
      fetchOrders();
    } catch (error: any) {
      toast.error('Failed to update order status');
    }
  };

  const getStatusColor = (status: OrderStatus) => {
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-indigo-600 hover:text-indigo-500 mr-4 flex items-center"
              >
                ← Back
              </button>
              <h1 className="text-xl font-bold flex items-center">Orders</h1>
            </div>
          </div>
        </div>
      </nav>

      <div className="py-10">
        <main className="max-w-7xl mx-auto sm:px-6 lg:px-8">
          <div className="mb-6">
            <div className="flex space-x-2">
              {['all', 'new', 'acknowledged', 'in_progress', 'completed'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status as OrderStatus | 'all')}
                  className={`px-4 py-2 rounded ${
                    filter === status
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {orders.length === 0 ? (
            <div className="bg-white p-6 rounded-lg shadow text-center">
              <p className="text-gray-500">No orders found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold">Order #{order.id.substring(0, 8)}</h3>
                      <p className="text-sm text-gray-500">
                        {new Date(order.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                        order.status
                      )}`}
                    >
                      {order.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <h4 className="font-medium mb-2">Items:</h4>
                    <ul className="space-y-2">
                      {order.items.map((item: any, index: number) => (
                        <li key={index} className="flex justify-between text-sm">
                          <span>
                            {item.quantity}x Item {item.item_id.substring(0, 8)}
                          </span>
                          <span className="font-medium">
                            ${(item.computed_price / 100).toFixed(2)}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="border-t border-gray-200 mt-4 pt-4 flex justify-between font-bold">
                      <span>Total:</span>
                      <span>${(order.total_amount / 100).toFixed(2)}</span>
                    </div>
                  </div>

                  {order.notes && (
                    <div className="mt-4 p-3 bg-gray-50 rounded">
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Notes:</span> {order.notes}
                      </p>
                    </div>
                  )}

                  <div className="mt-4 flex space-x-2">
                    {order.status === 'new' && (
                      <button
                        onClick={() => updateOrderStatus(order.id, 'acknowledged')}
                        className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded text-sm"
                      >
                        Acknowledge
                      </button>
                    )}
                    {order.status === 'acknowledged' && (
                      <button
                        onClick={() => updateOrderStatus(order.id, 'in_progress')}
                        className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded text-sm"
                      >
                        Start Preparing
                      </button>
                    )}
                    {order.status === 'in_progress' && (
                      <button
                        onClick={() => updateOrderStatus(order.id, 'completed')}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm"
                      >
                        Complete
                      </button>
                    )}
                    {order.status !== 'cancelled' && order.status !== 'completed' && (
                      <button
                        onClick={() => updateOrderStatus(order.id, 'cancelled')}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
