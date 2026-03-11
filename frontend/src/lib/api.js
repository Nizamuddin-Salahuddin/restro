import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only logout on 401 for non-payment routes and if it's a token issue
    const isPaymentRoute = error.config?.url?.includes('/payment');
    const isAuthRoute = error.config?.url?.includes('/auth');
    const errorMessage = error.response?.data?.message || '';
    const isTokenError = errorMessage.includes('token') || errorMessage.includes('Token');
    
    if (error.response?.status === 401 && !isPaymentRoute && !isAuthRoute && isTokenError) {
      // Token expired or invalid - logout only for actual auth issues
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getProfile: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/change-password', data),
  sendOTP: (phone) => api.post('/auth/send-otp', { phone }),
  verifyOTP: (data) => api.post('/auth/verify-otp', data),
};

// Menu API
export const menuAPI = {
  getCategories: () => api.get('/menu/categories'),
  getItems: (params) => api.get('/menu', { params }),
  getItem: (slug) => api.get(`/menu/${slug}`),
  getBestsellers: () => api.get('/menu/featured/bestsellers'),
};

// Cart API
export const cartAPI = {
  getCart: () => api.get('/cart'),
  addItem: (data) => api.post('/cart/add', data),
  updateItem: (id, data) => api.put(`/cart/update/${id}`, data),
  removeItem: (id) => api.delete(`/cart/remove/${id}`),
  clearCart: () => api.delete('/cart/clear'),
};

// Order API
export const orderAPI = {
  getOrders: (params) => api.get('/orders', { params }),
  getOrder: (orderNumber) => api.get(`/orders/${orderNumber}`),
  createOrder: (data) => api.post('/orders/create', data),
  cancelOrder: (orderNumber, reason) => api.put(`/orders/${orderNumber}/cancel`, { reason }),
};

// Payment API
export const paymentAPI = {
  createOrder: (orderNumber) => api.post('/payments/create-order', { orderNumber }),
  verifyPayment: (data) => api.post('/payments/verify', data),
  getStatus: (orderNumber) => api.get(`/payments/status/${orderNumber}`),
};

// Delivery API
export const deliveryAPI = {
  getAvailableOrders: () => api.get('/delivery/available'),
  pickupOrder: (orderNumber) => api.post(`/delivery/pickup/${orderNumber}`),
  getMyOrders: (params) => api.get('/delivery/orders', { params }),
  getOrders: (params) => api.get('/delivery/orders', { params }),
  getHistory: (params) => api.get('/delivery/history', { params }),
  updateOrderStatus: (orderNumber, data) => api.put(`/delivery/orders/${orderNumber}/status`, data),
  updateStatus: (orderNumber, data) => api.put(`/delivery/orders/${orderNumber}/status`, data),
  updateLocation: (data) => api.post('/delivery/location', data),
  getStats: () => api.get('/delivery/stats'),
};

// Admin API
export const adminAPI = {
  getDashboard: (params) => api.get('/admin/dashboard', { params }),
  // Menu
  getMenuItems: () => api.get('/admin/menu'),
  addMenuItem: (data) => api.post('/admin/menu', data),
  updateMenuItem: (id, data) => api.put(`/admin/menu/${id}`, data),
  deleteMenuItem: (id) => api.delete(`/admin/menu/${id}`),
  toggleMenuItem: (id) => api.patch(`/admin/menu/${id}/toggle`),
  // Categories
  getCategories: () => api.get('/admin/categories'),
  addCategory: (data) => api.post('/admin/categories', data),
  updateCategory: (id, data) => api.put(`/admin/categories/${id}`, data),
  // Orders - Online
  getOrders: (params) => api.get('/admin/orders', { params }),
  updateOrderStatus: (orderNumber, data) => api.put(`/admin/orders/${orderNumber}/status`, data),
  // Orders - Dine-in
  getDineInOrders: (params) => api.get('/admin/dine-in-orders', { params }),
  getDineInOrder: (orderId) => api.get(`/admin/dine-in-orders/${orderId}`),
  // Delivery boys
  getDeliveryBoys: () => api.get('/admin/delivery-boys'),
  addDeliveryBoy: (data) => api.post('/admin/delivery-boys', data),
  toggleDeliveryBoy: (id) => api.patch(`/admin/delivery-boys/${id}/toggle`),
  getAvailableDeliveryBoys: () => api.get('/admin/delivery-boys/available'),
};

// Waiter API
export const waiterAPI = {
  // Tables
  getTables: () => api.get('/waiter/tables'),
  getTable: (id) => api.get(`/waiter/tables/${id}`),
  // Menu
  getMenu: () => api.get('/waiter/menu'),
  getCategories: () => api.get('/waiter/categories'),
  // Orders
  createOrder: (data) => api.post('/waiter/orders', data),
  getOrderByTable: (tableId) => api.get(`/waiter/orders/table/${tableId}`),
  getOrder: (orderId) => api.get(`/waiter/orders/${orderId}`),
  addItems: (orderId, items) => api.post(`/waiter/orders/${orderId}/items`, { items }),
  removeItem: (orderId, itemId) => api.delete(`/waiter/orders/${orderId}/items/${itemId}`),
  generateBill: (orderId, discount) => api.post(`/waiter/orders/${orderId}/generate-bill`, { discount }),
  completeOrder: (orderId, paymentMethod) => api.post(`/waiter/orders/${orderId}/complete`, { paymentMethod }),
  cancelOrder: (orderId, reason) => api.post(`/waiter/orders/${orderId}/cancel`, { reason }),
  getMyOrders: (params) => api.get('/waiter/my-orders', { params }),
};

// Kitchen API
export const kitchenAPI = {
  // Get all orders
  getAllOrders: () => api.get('/kitchen/all-orders'),
  getDineInOrders: (params) => api.get('/kitchen/dine-in-orders', { params }),
  getOnlineOrders: (params) => api.get('/kitchen/online-orders', { params }),
  // Update status
  updateDineInItemStatus: (itemId, status) => api.patch(`/kitchen/dine-in-items/${itemId}/status`, { status }),
  updateOnlineOrderStatus: (orderId, status) => api.patch(`/kitchen/online-orders/${orderId}/status`, { status }),
  markDineInOrderReady: (orderId) => api.patch(`/kitchen/dine-in-orders/${orderId}/ready`),
  // Stats
  getStats: () => api.get('/kitchen/stats'),
};

export default api;
