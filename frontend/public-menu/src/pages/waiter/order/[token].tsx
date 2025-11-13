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
  items: OrderItem[];
  total_amount: number;
  currency: string;
  status: string;
  notes?: string;
  waiter_ack_user_id?: string;
  created_at: string;
}

export default function WaiterOrderView() {
  const router = useRouter();
  const { token } = router.query;

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [waiterName, setWaiterName] = useState('');
  const [isClaiming, setIsClaiming] = useState(false);

  useEffect(() => {
    if (token) {
      fetchOrder();
      // Load saved waiter name
      const savedName = localStorage.getItem('waiter_name');
      if (savedName) {
        setWaiterName(savedName);
      }
    }
  }, [token]);

  const fetchOrder = async () => {
    try {
      const response = await axios.post(`${API_URL}/api/v1/orders/scan`, {
        order_token: token,
      });
      setOrder(response.data.order);
    } catch (error: any) {
      toast.error('Failed to load order');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClaim = async () => {
    if (!waiterName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    setIsClaiming(true);
    try {
      const response = await axios.post(`${API_URL}/api/v1/orders/claim`, {
        order_token: token,
        waiter_name: waiterName.trim(),
      });
      setOrder(response.data);
      localStorage.setItem('waiter_name', waiterName.trim());
      toast.success('Order claimed successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to claim order');
    } finally {
      setIsClaiming(false);
    }
  };

  const toggleItemDelivered = async (index: number) => {
    try {
      const response = await axios.post(`${API_URL}/api/v1/orders/items/delivered`, {
        order_token: token,
        item_indices: [index],
      });
      setOrder(response.data);

      const items = JSON.parse(response.data.items);
      const allDelivered = items.every((item: OrderItem) => item.delivered);

      if (allDelivered) {
        toast.success('All items delivered! Order completed.');
      } else {
        toast.success('Item marked as delivered');
      }
    } catch (error: any) {
      toast.error('Failed to update delivery status');
    }
  };

  const getDeliveryProgress = () => {
    if (!order) return { delivered: 0, total: 0 };
    const parsedItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
    const delivered = parsedItems.filter((item: OrderItem) => item.delivered).length;
    const total = parsedItems.length;
    return { delivered, total };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading order...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Order Not Found</h2>
          <p className="text-gray-600">This order may have expired or been completed.</p>
        </div>
      </div>
    );
  }

  const parsedItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
  const isClaimed = order.status !== 'new';
  const progress = getDeliveryProgress();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">
            {isClaimed ? 'Order Details' : 'New Order'}
          </h1>
          {isClaimed && order.waiter_ack_user_id && (
            <p className="text-sm text-gray-600 mt-1">
              Claimed by: {order.waiter_ack_user_id}
            </p>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow overflow-hidden mb-4">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900">
                  Order #{order.id.substring(0, 8).toUpperCase()}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {new Date(order.created_at).toLocaleString()}
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  order.status === 'new'
                    ? 'bg-blue-100 text-blue-800'
                    : order.status === 'acknowledged'
                    ? 'bg-yellow-100 text-yellow-800'
                    : order.status === 'in_progress'
                    ? 'bg-orange-100 text-orange-800'
                    : order.status === 'completed'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {order.status === 'new'
                  ? 'New'
                  : order.status === 'acknowledged'
                  ? 'In Kitchen'
                  : order.status === 'in_progress'
                  ? 'Delivering'
                  : order.status === 'completed'
                  ? 'Completed'
                  : order.status}
              </span>
            </div>

            {isClaimed && progress.total > 0 && (
              <div className="mt-4">
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
            <h4 className="font-medium text-gray-900 mb-3">Order Items</h4>
            <div className="space-y-2">
              {parsedItems.map((item: OrderItem, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                >
                  <div className="flex items-center flex-1">
                    {isClaimed && (
                      <button
                        onClick={() => toggleItemDelivered(index)}
                        className={`mr-3 w-6 h-6 rounded border-2 flex items-center justify-center ${
                          item.delivered
                            ? 'bg-green-500 border-green-500'
                            : 'border-gray-300 hover:border-green-500'
                        }`}
                      >
                        {item.delivered && (
                          <svg
                            className="w-4 h-4 text-white"
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
                      </button>
                    )}
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${item.delivered ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                        {item.quantity}x Item (${(item.unit_price / 100).toFixed(2)} each)
                      </p>
                    </div>
                  </div>
                  <p className={`text-sm font-medium ${item.delivered ? 'text-gray-500' : 'text-gray-900'}`}>
                    ${(item.computed_price / 100).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>

            {order.notes && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm font-medium text-gray-900">Special Instructions:</p>
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

        {!isClaimed && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Claim This Order</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="waiterName" className="block text-sm font-medium text-gray-700 mb-2">
                  Your Name
                </label>
                <input
                  type="text"
                  id="waiterName"
                  value={waiterName}
                  onChange={(e) => setWaiterName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <button
                onClick={handleClaim}
                disabled={isClaiming || !waiterName.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-bold py-3 rounded-lg transition-colors"
              >
                {isClaiming ? 'Claiming...' : 'Claim Order'}
              </button>
            </div>
          </div>
        )}

        {isClaimed && (
          <div className="flex space-x-3">
            <button
              onClick={() => router.push('/waiter/my-orders')}
              className="flex-1 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold py-3 rounded-lg transition-colors"
            >
              My Orders
            </button>
            <button
              onClick={fetchOrder}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition-colors"
            >
              Refresh
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
