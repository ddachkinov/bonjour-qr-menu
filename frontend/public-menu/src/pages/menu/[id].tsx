import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import publicApi from '../../lib/api';
import { useCartStore } from '../../store/cartStore';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import type { Menu, Category, Item } from '@qrmenu/shared-types';

export default function PublicMenu() {
  const router = useRouter();
  const { id, table } = router.query;

  const [menu, setMenu] = useState<Menu | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCart, setShowCart] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [waiterQR, setWaiterQR] = useState<string | null>(null);

  const { sessionId, cart, createSession, fetchCart, addToCart, submitOrder } = useCartStore();

  useEffect(() => {
    if (id) {
      loadMenu();
    }
  }, [id]);

  useEffect(() => {
    if (menu && !sessionId) {
      initializeSession();
    }
  }, [menu, sessionId]);

  useEffect(() => {
    if (sessionId) {
      fetchCart(sessionId);
    }
  }, [sessionId]);

  const loadMenu = async () => {
    try {
      const response = await publicApi.get(`/menus/${id}`);
      setMenu(response.data.menu);
      setCategories(response.data.categories);
      setItems(response.data.items);
    } catch (error: any) {
      toast.error('Failed to load menu');
    } finally {
      setIsLoading(false);
    }
  };

  const initializeSession = async () => {
    if (!menu) return;

    try {
      await createSession(menu.id, table as string | undefined);
    } catch (error: any) {
      toast.error('Failed to initialize session');
    }
  };

  const handleAddToCart = async (item: Item) => {
    if (!sessionId) {
      toast.error('Session not initialized');
      return;
    }

    try {
      await addToCart(sessionId, {
        item_id: item.id,
        quantity: 1,
        unit_price: item.price,
        computed_price: item.price,
      });
      toast.success(`${item.title} added to cart!`);
    } catch (error: any) {
      toast.error('Failed to add to cart');
    }
  };

  const handleSubmitOrder = async () => {
    if (!sessionId) {
      toast.error('No session');
      return;
    }

    if (!cart || cart.items.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    try {
      const result = await submitOrder(sessionId);
      setWaiterQR(result.waiter_qr);
      setOrderComplete(true);
      toast.success('Order placed successfully!');
      setShowCart(false);
    } catch (error: any) {
      toast.error('Failed to submit order');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading menu...</p>
      </div>
    );
  }

  if (!menu) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Menu not found</p>
      </div>
    );
  }

  if (orderComplete && waiterQR) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="mb-6">
            <svg
              className="mx-auto h-16 w-16 text-green-500"
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
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Order Placed!</h2>
          <p className="text-gray-600 mb-6">
            Show this QR code to the waiter when your order is ready
          </p>
          <div className="flex justify-center mb-6">
            <img src={waiterQR} alt="Waiter QR Code" className="w-64 h-64" />
          </div>
          <div className="space-y-3">
            <button
              onClick={() => router.push('/orders/history')}
              className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200"
            >
              View Order History
            </button>
            <button
              onClick={() => {
                setOrderComplete(false);
                setWaiterQR(null);
                initializeSession();
              }}
              className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-700"
            >
              Order More
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{menu.title}</h1>
            {table && (
              <p className="text-sm text-gray-500 mt-1">Table: {table}</p>
            )}
          </div>
          <button
            onClick={() => router.push('/orders/history')}
            className="text-indigo-600 hover:text-indigo-700 p-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
        {categories.map((category) => {
          const categoryItems = items.filter((item) => item.category_id === category.id);

          if (categoryItems.length === 0) return null;

          return (
            <div key={category.id} className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4 border-b-2 border-gray-200 pb-2">
                {category.name}
              </h2>
              <div className="space-y-4">
                {categoryItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-lg shadow overflow-hidden"
                  >
                    {item.photos && item.photos.length > 0 && (
                      <img
                        src={item.photos[0]}
                        alt={item.title}
                        className="w-full h-48 object-cover"
                      />
                    )}
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-gray-900 text-lg flex-1">{item.title}</h3>
                        <p className="text-xl font-bold text-indigo-600 ml-4">
                          ${(item.price / 100).toFixed(2)}
                        </p>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                      {item.dietary_flags && item.dietary_flags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {item.dietary_flags.map((flag) => (
                            <span
                              key={flag}
                              className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full"
                            >
                              {flag}
                            </span>
                          ))}
                        </div>
                      )}
                      <button
                        onClick={() => handleAddToCart(item)}
                        className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 font-medium active:bg-indigo-800 transition-colors"
                      >
                        Add to Cart
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {cart && cart.items.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">
                  {cart.items.length} item{cart.items.length !== 1 ? 's' : ''}
                </p>
                <p className="text-xl font-bold text-gray-900">
                  ${(cart.total / 100).toFixed(2)}
                </p>
              </div>
              <button
                onClick={() => setShowCart(true)}
                className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700"
              >
                View Cart
              </button>
            </div>
          </div>
        </div>
      )}

      {showCart && cart && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center sm:justify-center">
          <div className="bg-white w-full sm:max-w-lg sm:rounded-lg max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold">Your Cart</h2>
              <button
                onClick={() => setShowCart(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4 mb-6">
                {cart.items.map((item) => {
                  const itemData = items.find((i) => i.id === item.item_id);
                  return (
                    <div key={item.item_id} className="flex justify-between items-center">
                      <div className="flex-1">
                        <p className="font-medium">{itemData?.title || 'Item'}</p>
                        <p className="text-sm text-gray-600">
                          ${(item.unit_price / 100).toFixed(2)} × {item.quantity}
                        </p>
                      </div>
                      <p className="font-bold">${(item.computed_price / 100).toFixed(2)}</p>
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-gray-200 pt-4 mb-6">
                <div className="flex justify-between items-center text-xl font-bold">
                  <span>Total:</span>
                  <span>${(cart.total / 100).toFixed(2)}</span>
                </div>
              </div>
              <button
                onClick={handleSubmitOrder}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700"
              >
                Place Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
