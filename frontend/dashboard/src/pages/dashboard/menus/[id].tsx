import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '../../../store/authStore';
import api from '../../../lib/api';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import type { Menu, Category, Item } from '@qrmenu/shared-types';

export default function MenuEditor() {
  const router = useRouter();
  const { id } = router.query;
  const { isAuthenticated } = useAuthStore();

  const [menu, setMenu] = useState<Menu | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (id) {
      fetchMenuData();
    }
  }, [id, isAuthenticated, router]);

  const fetchMenuData = async () => {
    try {
      const [menuRes, categoriesRes, itemsRes] = await Promise.all([
        api.get(`/menus/${id}`),
        api.get(`/menus/${id}/categories`),
        api.get(`/menus/${id}/items`),
      ]);

      setMenu(menuRes.data);
      setCategories(categoriesRes.data);
      setItems(itemsRes.data);
    } catch (error: any) {
      toast.error('Failed to load menu data');
    } finally {
      setIsLoading(false);
    }
  };

  const publishMenu = async () => {
    try {
      const response = await api.post(`/menus/${id}/publish`);
      setMenu(response.data);
      toast.success('Menu published!');
      setShowQR(true);
    } catch (error: any) {
      toast.error('Failed to publish menu');
    }
  };

  const addCategory = async () => {
    const name = prompt('Enter category name:');
    if (!name) return;

    try {
      await api.post(`/menus/${id}/categories`, { name });
      toast.success('Category added!');
      fetchMenuData();
    } catch (error: any) {
      toast.error('Failed to add category');
    }
  };

  const addItem = async (categoryId: string) => {
    const title = prompt('Enter item title:');
    if (!title) return;

    const description = prompt('Enter item description:') || '';
    const priceStr = prompt('Enter price in cents (e.g., 1500 for $15.00):');
    const price = parseInt(priceStr || '0', 10);

    if (price <= 0) {
      toast.error('Invalid price');
      return;
    }

    try {
      await api.post(`/menus/${id}/items`, {
        category_id: categoryId,
        title,
        description,
        price,
        currency: 'USD',
      });
      toast.success('Item added!');
      fetchMenuData();
    } catch (error: any) {
      toast.error('Failed to add item');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!menu) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Menu not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-indigo-600 hover:text-indigo-500 mr-4"
              >
                ← Back
              </button>
              <h1 className="text-xl font-bold">{menu.title}</h1>
            </div>
            <div className="flex items-center space-x-4">
              {!menu.published && (
                <button
                  onClick={publishMenu}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                >
                  Publish Menu
                </button>
              )}
              {menu.published && (
                <button
                  onClick={() => setShowQR(!showQR)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded"
                >
                  {showQR ? 'Hide QR' : 'Show QR'}
                </button>
              )}
              <button
                onClick={addCategory}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded"
              >
                Add Category
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="py-10">
        <main className="max-w-7xl mx-auto sm:px-6 lg:px-8">
          {showQR && menu.public_url && (
            <div className="bg-white p-6 rounded-lg shadow mb-6 text-center">
              <h2 className="text-xl font-bold mb-4">Menu QR Code</h2>
              <div className="flex justify-center">
                <QRCodeSVG value={menu.public_url} size={256} />
              </div>
              <p className="mt-4 text-sm text-gray-600">{menu.public_url}</p>
            </div>
          )}

          {categories.length === 0 ? (
            <div className="bg-white p-6 rounded-lg shadow text-center">
              <p className="text-gray-500">No categories yet. Add your first category to get started!</p>
            </div>
          ) : (
            <div className="space-y-6">
              {categories.map((category) => {
                const categoryItems = items.filter((item) => item.category_id === category.id);

                return (
                  <div key={category.id} className="bg-white rounded-lg shadow">
                    <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                      <h2 className="text-xl font-bold">{category.name}</h2>
                      <button
                        onClick={() => addItem(category.id)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded text-sm"
                      >
                        Add Item
                      </button>
                    </div>
                    <div className="px-6 py-4">
                      {categoryItems.length === 0 ? (
                        <p className="text-gray-500 text-sm">No items in this category</p>
                      ) : (
                        <div className="space-y-4">
                          {categoryItems.map((item) => (
                            <div key={item.id} className="flex justify-between items-start border-b border-gray-100 pb-4 last:border-0">
                              <div className="flex-1">
                                <h3 className="font-medium">{item.title}</h3>
                                <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                                {item.dietary_flags && item.dietary_flags.length > 0 && (
                                  <div className="mt-2 flex gap-2">
                                    {item.dietary_flags.map((flag) => (
                                      <span
                                        key={flag}
                                        className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded"
                                      >
                                        {flag}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="ml-4 text-right">
                                <p className="font-bold">${(item.price / 100).toFixed(2)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
