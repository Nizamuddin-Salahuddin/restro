import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket = null;

export const connectSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      console.log('🔌 Socket connected');
    });

    socket.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = () => {
  if (!socket) {
    return connectSocket();
  }
  return socket;
};

// Join role-specific room
export const joinRoleRoom = (role) => {
  const s = getSocket();
  s.emit('join_role', role);
};

// Join delivery boy's personal room
export const joinDeliveryRoom = (userId) => {
  const s = getSocket();
  s.emit('join_delivery', userId);
};

// Track an order
export const trackOrder = (orderNumber) => {
  const s = getSocket();
  s.emit('track_order', orderNumber);
};

// Stop tracking an order
export const stopTracking = (orderNumber) => {
  const s = getSocket();
  s.emit('stop_tracking', orderNumber);
};

// Update delivery location
export const updateDeliveryLocation = (orderNumber, latitude, longitude) => {
  const s = getSocket();
  s.emit('update_location', { orderNumber, latitude, longitude });
};

export default { connectSocket, disconnectSocket, getSocket };
