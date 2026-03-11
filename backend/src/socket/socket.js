export const initializeSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Join room based on user role
    socket.on('join_role', (role) => {
      if (role === 'admin') {
        socket.join('admin');
        console.log(`👤 Admin joined: ${socket.id}`);
      } else if (role === 'delivery') {
        socket.join('delivery');
      }
    });

    // Join specific order room for tracking
    socket.on('track_order', (orderNumber) => {
      socket.join(`order_${orderNumber}`);
      console.log(`📍 Tracking order: ${orderNumber}`);
    });

    // Leave order tracking
    socket.on('stop_tracking', (orderNumber) => {
      socket.leave(`order_${orderNumber}`);
    });

    // Delivery boy joins their personal room
    socket.on('join_delivery', (userId) => {
      socket.join(`delivery_${userId}`);
      console.log(`🛵 Delivery boy joined: ${userId}`);
    });

    // Handle delivery location updates
    socket.on('update_location', (data) => {
      const { orderNumber, latitude, longitude } = data;
      io.to(`order_${orderNumber}`).emit('delivery_location', { latitude, longitude });
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });
};
