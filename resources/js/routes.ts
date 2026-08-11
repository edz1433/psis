import { route } from 'ziggy-js';

export { route };

export const routes = {
  login: () => route('login'),
  loginPost: () => route('login.post'),
  logoutPost: () => route('logout.post'),

  dashboard: () => route('dashboard'),
  settings: () => route('settings'),

  shop: {
    index: () => route('shop.index'),
    store: () => route('shop.store'),
    update: (id: number) => route('shop.orders.update', id),
    cancel: (id: number) => route('shop.orders.cancel', id),
    orders: () => route('shop.orders'),
  },

  pos: {
    index: () => route('pos.index'),  
    store: () => route('pos.store'),
  },

  products: {
    index:   () => route('products.index'),
    store:   () => route('products.store'),
    update:  (id: number | string) => route('products.update', id),
    destroy: (id: number | string) => route('products.destroy', id),
  },

  categories: {
    index: () => route('products.categories.index'),
    store: () => route('products.categories.store'),
    update: (categoryId: number | string) => route('products.categories.update', categoryId),
    destroy: (categoryId: number | string) => route('products.categories.destroy', categoryId),
  },

  users: {
    index: () => route('users.index'),
    store: () => route('users.store'),
    update: (userId: number | string) => route('users.update', userId),
    destroy: (userId: number | string) => route('users.destroy', userId),
  },

  suppliers: {
    index: () => route('suppliers.index'),
    store: () => route('suppliers.store'),
    update: (supplierId: number | string) => route('suppliers.update', supplierId),
    destroy: (supplierId: number | string) => route('suppliers.destroy', supplierId),
  },

  supplier: {
    orders: {
      index:    () => route('supplier.orders.index'),
      show:     (id: number) => route('supplier.orders.show', id),
      confirm:  (id: number) => route('supplier.orders.confirm', id),
      reject:   (id: number) => route('supplier.orders.reject', id),
      shipped:  (id: number) => route('supplier.orders.shipped', id),
      complete: (id: number) => route('supplier.orders.complete', id),
      receipt:  (id: number) => route('supplier.orders.receipt', id),
    },
  },

  logs: () => route('logs'),
};