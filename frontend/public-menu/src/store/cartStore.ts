import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import publicApi from '../lib/api';
import type { Cart, CartItem } from '@qrmenu/shared-types';

interface CartState {
  sessionId: string | null;
  cart: Cart | null;
  isLoading: boolean;
  createSession: (menuId: string, tableId?: string) => Promise<void>;
  fetchCart: (sessionId: string) => Promise<void>;
  addToCart: (sessionId: string, item: CartItem) => Promise<void>;
  updateCartItem: (sessionId: string, itemId: string, quantity: number) => Promise<void>;
  submitOrder: (sessionId: string, notes?: string) => Promise<any>;
  clearCart: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      sessionId: null,
      cart: null,
      isLoading: false,

      createSession: async (menuId: string, tableId?: string) => {
        set({ isLoading: true });
        try {
          const response = await publicApi.post(`/menus/${menuId}/session`, {
            table_id: tableId,
          });
          const { session_id } = response.data;
          set({ sessionId: session_id, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      fetchCart: async (sessionId: string) => {
        set({ isLoading: true });
        try {
          const response = await publicApi.get(`/session/${sessionId}/cart`);
          set({ cart: response.data, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      addToCart: async (sessionId: string, item: CartItem) => {
        set({ isLoading: true });
        try {
          const response = await publicApi.post(`/session/${sessionId}/cart/items`, item);
          set({ cart: response.data, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      updateCartItem: async (sessionId: string, itemId: string, quantity: number) => {
        set({ isLoading: true });
        try {
          const response = await publicApi.put(
            `/session/${sessionId}/cart/items/${itemId}`,
            { quantity }
          );
          set({ cart: response.data, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      submitOrder: async (sessionId: string, notes?: string) => {
        set({ isLoading: true });
        try {
          const response = await publicApi.post(`/session/${sessionId}/order`, { notes });
          set({ cart: null, isLoading: false });
          return response.data;
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      clearCart: () => {
        set({ sessionId: null, cart: null });
      },
    }),
    {
      name: 'cart-storage',
      partialize: (state) => ({ sessionId: state.sessionId }),
    }
  )
);
