import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { cartAPI } from '../lib/api';
import toast from 'react-hot-toast';

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      summary: {
        subtotal: 0,
        deliveryFee: 0,
        tax: 0,
        total: 0,
        itemCount: 0,
      },
      isLoading: false,

      // Fetch cart from server (for logged-in users)
      fetchCart: async () => {
        set({ isLoading: true });
        try {
          const response = await cartAPI.getCart();
          const { items, summary } = response.data.data;
          set({ items, summary, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          console.error('Failed to fetch cart:', error);
        }
      },

      // Add item to cart
      addItem: async (menuItemId, quantity = 1, specialInstructions = '') => {
        try {
          await cartAPI.addItem({ menuItemId, quantity, specialInstructions });
          await get().fetchCart();
          toast.success('Added to cart!');
        } catch (error) {
          toast.error(error.response?.data?.message || 'Failed to add item');
        }
      },

      // Update item quantity
      updateQuantity: async (cartItemId, quantity) => {
        try {
          if (quantity < 1) {
            await get().removeItem(cartItemId);
            return;
          }
          await cartAPI.updateItem(cartItemId, { quantity });
          await get().fetchCart();
        } catch (error) {
          toast.error('Failed to update quantity');
        }
      },

      // Remove item from cart
      removeItem: async (cartItemId) => {
        try {
          await cartAPI.removeItem(cartItemId);
          await get().fetchCart();
          toast.success('Item removed');
        } catch (error) {
          toast.error('Failed to remove item');
        }
      },

      // Clear cart
      clearCart: async () => {
        try {
          await cartAPI.clearCart();
          set({
            items: [],
            summary: {
              subtotal: 0,
              deliveryFee: 0,
              tax: 0,
              total: 0,
              itemCount: 0,
            },
          });
        } catch (error) {
          console.error('Failed to clear cart:', error);
        }
      },

      // Local cart operations (for guest users)
      addItemLocal: (item) => {
        const items = [...get().items];
        const existingIndex = items.findIndex((i) => i.item_id === item.id);

        if (existingIndex > -1) {
          items[existingIndex].quantity += 1;
        } else {
          items.push({
            id: Date.now(),
            item_id: item.id,
            name: item.name,
            price: item.price,
            image: item.image,
            is_veg: item.is_veg,
            quantity: 1,
          });
        }

        const summary = calculateSummary(items);
        set({ items, summary });
        toast.success('Added to cart!');
      },

      updateQuantityLocal: (cartItemId, quantity) => {
        if (quantity < 1) {
          get().removeItemLocal(cartItemId);
          return;
        }

        const items = get().items.map((item) =>
          item.id === cartItemId ? { ...item, quantity } : item
        );
        const summary = calculateSummary(items);
        set({ items, summary });
      },

      removeItemLocal: (cartItemId) => {
        const items = get().items.filter((item) => item.id !== cartItemId);
        const summary = calculateSummary(items);
        set({ items, summary });
        toast.success('Item removed');
      },

      clearCartLocal: () => {
        set({
          items: [],
          summary: {
            subtotal: 0,
            deliveryFee: 0,
            tax: 0,
            total: 0,
            itemCount: 0,
          },
        });
      },
    }),
    {
      name: 'dum-wok-cart',
      partialize: (state) => ({
        items: state.items,
        summary: state.summary,
      }),
    }
  )
);

// Helper function to calculate summary
const calculateSummary = (items) => {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = subtotal > 0 ? 30 : 0;
  const tax = Math.round(subtotal * 0.05 * 100) / 100;
  const total = subtotal + deliveryFee + tax;
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return { subtotal, deliveryFee, tax, total, itemCount };
};
