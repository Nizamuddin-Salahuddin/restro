import { useState, useEffect } from 'react';
import { Package, MapPin, Phone, Navigation, CheckCircle, Clock, HandMetal } from 'lucide-react';
import { deliveryAPI } from '../../lib/api';
import { getSocket } from '../../lib/socket';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';

const DeliveryOrders = () => {
  const [availableOrders, setAvailableOrders] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingOrder, setUpdatingOrder] = useState(null);
  const [activeTab, setActiveTab] = useState('available'); // 'available' | 'myorders'

  useEffect(() => {
    fetchOrders();

    const socket = getSocket();
    socket.on('order_assigned', () => {
      fetchOrders();
    });
    socket.on('order_picked', () => {
      fetchOrders();
    });
    socket.on('new_order_ready', () => {
      fetchOrders();
      toast.success('New order is ready for pickup!');
    });

    // Refresh available orders periodically
    const refreshInterval = setInterval(fetchOrders, 30000);

    return () => {
      socket.off('order_assigned');
      socket.off('order_picked');
      socket.off('new_order_ready');
      clearInterval(refreshInterval);
    };
  }, []);

  const fetchOrders = async () => {
    try {
      const [availableRes, myOrdersRes] = await Promise.all([
        deliveryAPI.getAvailableOrders(),
        deliveryAPI.getMyOrders({ status: 'active' })
      ]);
      setAvailableOrders(availableRes.data.data);
      setMyOrders(myOrdersRes.data.data);
    } catch (error) {
      toast.error('Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePickupOrder = async (orderNumber) => {
    setUpdatingOrder(orderNumber);
    try {
      await deliveryAPI.pickupOrder(orderNumber);
      toast.success('Order picked up! Start your delivery.');
      fetchOrders();
      setActiveTab('myorders');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to pickup order');
    } finally {
      setUpdatingOrder(null);
    }
  };

  const handleStatusUpdate = async (orderNumber, status) => {
    setUpdatingOrder(orderNumber);
    try {
      await deliveryAPI.updateOrderStatus(orderNumber, { status });
      toast.success(`Order marked as ${status.replace('_', ' ')}`);
      fetchOrders();
    } catch (error) {
      toast.error('Failed to update order');
    } finally {
      setUpdatingOrder(null);
    }
  };

  const openMaps = (address) => {
    const encodedAddress = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
  };

  const callCustomer = (phone) => {
    window.open(`tel:${phone}`, '_self');
  };

  const getStatusColor = (status) => {
    const colors = {
      ready: 'bg-purple-100 text-purple-700',
      picked_up: 'bg-indigo-100 text-indigo-700',
      on_the_way: 'bg-cyan-100 text-cyan-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getNextStatus = (currentStatus) => {
    const flow = {
      picked_up: 'on_the_way',
      on_the_way: 'delivered',
    };
    return flow[currentStatus] || null;
  };

  const getNextStatusLabel = (currentStatus) => {
    const labels = {
      picked_up: 'Start Delivery',
      on_the_way: 'Mark Delivered',
    };
    return labels[currentStatus] || 'Update';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-secondary">Orders</h1>
        <p className="text-gray-500">Pick up and manage your deliveries</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('available')}
          className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
            activeTab === 'available'
              ? 'bg-purple-500 text-white shadow-lg'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Package className="w-5 h-5 inline mr-2" />
          Available ({availableOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('myorders')}
          className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
            activeTab === 'myorders'
              ? 'bg-primary text-white shadow-lg'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          <HandMetal className="w-5 h-5 inline mr-2" />
          My Orders ({myOrders.length})
        </button>
      </div>

      {/* Available Orders Tab */}
      {activeTab === 'available' && (
        <>
          {availableOrders.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center">
              <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">No orders available for pickup</p>
              <p className="text-sm text-gray-400">
                Orders will appear here when they're ready
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {availableOrders.map((order) => (
                <div key={order.id} className="bg-white rounded-xl shadow-sm overflow-hidden border-l-4 border-purple-500">
                  {/* Header */}
                  <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-secondary">#{order.order_number}</h3>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                          Ready for Pickup
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {new Date(order.created_at).toLocaleString()}
                      </p>
                    </div>
                    <p className="text-xl font-bold text-primary">₹{order.total_amount}</p>
                  </div>

                  {/* Customer & Address */}
                  <div className="p-4 border-b border-gray-100">
                    <div className="mb-3">
                      <p className="font-medium text-secondary">{order.customer_name}</p>
                    </div>
                    <div className="flex items-start gap-3 bg-gray-50 rounded-lg p-3">
                      <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-secondary flex-1">{order.delivery_address}</p>
                    </div>
                  </div>

                  {/* Order Items */}
                  {order.items && order.items.length > 0 && (
                    <div className="p-4 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-500 mb-2">
                        {order.item_count || order.items.length} Items
                      </p>
                      <div className="space-y-1">
                        {order.items.map((item, index) => (
                          <div key={index} className="text-sm text-secondary">
                            {item.quantity}x {item.item_name}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pickup Button */}
                  <div className="p-4">
                    <button
                      onClick={() => handlePickupOrder(order.order_number)}
                      disabled={updatingOrder === order.order_number}
                      className="w-full py-3 bg-purple-500 text-white rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-purple-600 transition-colors"
                    >
                      {updatingOrder === order.order_number ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <>
                          <HandMetal className="w-5 h-5" />
                          Pick Up This Order
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* My Orders Tab */}
      {activeTab === 'myorders' && (
        <>
          {myOrders.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">No active deliveries</p>
              <p className="text-sm text-gray-400">
                Pick up an order from the Available tab
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {myOrders.map((order) => (
                <div key={order.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                  {/* Header */}
                  <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-secondary">#{order.order_number}</h3>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            order.status
                          )}`}
                        >
                          {order.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {new Date(order.created_at).toLocaleString()}
                      </p>
                    </div>
                    <p className="text-xl font-bold text-primary">₹{order.total_amount}</p>
                  </div>

                  {/* Customer Info */}
                  <div className="p-4 border-b border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-medium text-secondary">{order.customer_name}</p>
                        <p className="text-sm text-gray-500">{order.customer_phone}</p>
                      </div>
                      <button
                        onClick={() => callCustomer(order.customer_phone)}
                        className="p-3 bg-green-100 text-green-600 rounded-full hover:bg-green-200 transition-colors"
                      >
                        <Phone className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Address */}
                    <div className="flex items-start gap-3 bg-gray-50 rounded-lg p-3">
                      <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-secondary">{order.delivery_address}</p>
                      </div>
                      <button
                        onClick={() => openMaps(order.delivery_address)}
                        className="p-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                      >
                        <Navigation className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Order Items */}
                  {order.items && order.items.length > 0 && (
                    <div className="p-4 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-500 mb-2">Order Items</p>
                      <div className="space-y-1">
                        {order.items.map((item, index) => (
                          <div key={index} className="flex justify-between text-sm">
                            <span className="text-secondary">
                              {item.quantity}x {item.item_name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="p-4">
                    {getNextStatus(order.status) && (
                      <button
                        onClick={() =>
                          handleStatusUpdate(order.order_number, getNextStatus(order.status))
                        }
                        disabled={updatingOrder === order.order_number}
                        className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors ${
                          order.status === 'on_the_way'
                            ? 'bg-green-500 text-white hover:bg-green-600'
                            : 'bg-primary text-white hover:bg-primary-dark'
                        }`}
                      >
                        {updatingOrder === order.order_number ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          <>
                            <CheckCircle className="w-5 h-5" />
                            {getNextStatusLabel(order.status)}
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DeliveryOrders;
