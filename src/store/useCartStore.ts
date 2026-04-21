import { create } from 'zustand';

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

interface CartState {
  storeId: string | null;
  items: CartItem[];
  addItem: (item: CartItem, storeId: string) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  storeId: null,
  items: [],
  addItem: (item, storeId) => set((state) => {
    // If adding from a different store, clear cart first
    if (state.storeId && state.storeId !== storeId) {
      if (!window.confirm('Adding items from a new store will clear your current cart. Continue?')) {
        return state;
      }
      return { storeId, items: [item] };
    }

    const existingItem = state.items.find(i => i.productId === item.productId);
    if (existingItem) {
      return {
        storeId,
        items: state.items.map(i => 
          i.productId === item.productId 
            ? { ...i, quantity: i.quantity + item.quantity }
            : i
        )
      };
    }
    return { storeId, items: [...state.items, item] };
  }),
  removeItem: (productId) => set((state) => {
    const newItems = state.items.filter(i => i.productId !== productId);
    return {
      items: newItems,
      storeId: newItems.length === 0 ? null : state.storeId
    };
  }),
  updateQuantity: (productId, quantity) => set((state) => {
    if (quantity <= 0) {
      const newItems = state.items.filter(i => i.productId !== productId);
      return {
        items: newItems,
        storeId: newItems.length === 0 ? null : state.storeId
      };
    }
    return {
      items: state.items.map(i => 
        i.productId === productId ? { ...i, quantity } : i
      )
    };
  }),
  clearCart: () => set({ storeId: null, items: [] }),
  getTotal: () => {
    const state = get();
    return state.items.reduce((total, item) => total + (item.price * item.quantity), 0);
  }
}));
