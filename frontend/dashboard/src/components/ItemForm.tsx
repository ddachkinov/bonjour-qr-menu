import { useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../lib/api';
import toast from 'react-hot-toast';
import type { Item } from '@qrmenu/shared-types';

interface ItemFormProps {
  categoryId: string;
  menuId: string;
  item?: Item;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function ItemForm({ categoryId, menuId, item, onSuccess, onCancel }: ItemFormProps) {
  const { register, handleSubmit, formState: { errors }, watch } = useForm({
    defaultValues: item ? {
      title: item.title,
      description: item.description,
      price: item.price / 100,
      currency: item.currency,
      sku: item.sku || '',
      dietary_flags: item.dietary_flags?.join(', ') || '',
    } : {
      title: '',
      description: '',
      price: 0,
      currency: 'USD',
      sku: '',
      dietary_flags: '',
    },
  });

  const [isUploading, setIsUploading] = useState(false);
  const [photoUrls, setPhotoUrls] = useState<string[]>(item?.photos || []);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setIsUploading(true);

    try {
      // Get presigned URL
      const presignResponse = await api.post('/uploads/presign', {
        filename: file.name,
        mime_type: file.type,
        intended_use: 'menu-items',
      });

      const { upload_url, public_url } = presignResponse.data;

      // Upload directly to S3
      await fetch(upload_url, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      setPhotoUrls([...photoUrls, public_url]);
      toast.success('Photo uploaded!');
    } catch (error: any) {
      toast.error('Failed to upload photo');
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const removePhoto = (index: number) => {
    setPhotoUrls(photoUrls.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: any) => {
    try {
      const payload = {
        category_id: categoryId,
        title: data.title,
        description: data.description,
        price: Math.round(parseFloat(data.price) * 100),
        currency: data.currency,
        photos: photoUrls,
        sku: data.sku || undefined,
        dietary_flags: data.dietary_flags
          ? data.dietary_flags.split(',').map((s: string) => s.trim()).filter(Boolean)
          : [],
      };

      if (item) {
        await api.put(`/menus/${menuId}/items/${item.id}`, payload);
        toast.success('Item updated!');
      } else {
        await api.post(`/menus/${menuId}/items`, payload);
        toast.success('Item created!');
      }

      onSuccess();
    } catch (error: any) {
      toast.error(item ? 'Failed to update item' : 'Failed to create item');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold">{item ? 'Edit Item' : 'New Item'}</h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              {...register('title', { required: 'Title is required' })}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {errors.title && (
              <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <textarea
              {...register('description', { required: 'Description is required' })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {errors.description && (
              <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price ($) *
              </label>
              <input
                {...register('price', {
                  required: 'Price is required',
                  min: { value: 0, message: 'Price must be positive' },
                })}
                type="number"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {errors.price && (
                <p className="text-red-500 text-xs mt-1">{errors.price.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SKU
              </label>
              <input
                {...register('sku')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dietary Flags (comma-separated)
            </label>
            <input
              {...register('dietary_flags')}
              type="text"
              placeholder="vegan, gluten-free, spicy"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Examples: vegan, vegetarian, gluten-free, dairy-free, spicy, nuts
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Photos
            </label>

            {photoUrls.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {photoUrls.map((url, index) => (
                  <div key={index} className="relative">
                    <img
                      src={url}
                      alt={`Item photo ${index + 1}`}
                      className="w-full h-24 object-cover rounded"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <label className="cursor-pointer">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-indigo-500 transition-colors">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <p className="mt-2 text-sm text-gray-600">
                  {isUploading ? 'Uploading...' : 'Click to upload a photo'}
                </p>
                <p className="text-xs text-gray-500">PNG, JPG, WEBP up to 5MB</p>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                disabled={isUploading}
                className="hidden"
              />
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              {item ? 'Update Item' : 'Create Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
