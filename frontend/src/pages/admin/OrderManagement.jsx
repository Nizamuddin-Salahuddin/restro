import { useState, useEffect } from 'react';
import { Package, ChevronDown, Phone, MapPin, User, Truck, UtensilsCrossed, Users } from 'lucide-react';
import { adminAPI } from '../../lib/api';
import { getSocket } from '../../lib/socket';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';

const OrderManagement = () => {
  const [orders, setOrders] = useState([]);
  const [dineInOrders, setDineInOrders] = useState([]);
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [activeTab, setActiveTab] = useState('online'); // 'online' | 'dinein'

  useEffect(() => {
    if (activeTab === 'online') {
      fetchOrders();
    } else {
      fetchDineInOrders();
    }
    fetchDeliveryBoys();

    const socket = getSocket();
    socket.on('new_order', () => {
      fetchOrders();
    });

    return () => {
      socket.off('new_order');
    };
  }, [statusFilter, activeTab]);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const params = statusFilter ? { status: statusFilter } : {};
      const response = await adminAPI.getOrders(params);
      setOrders(response.data.data);
    } catch (error) {
      toast.error('Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDineInOrders = async () => {
    try {
      setIsLoading(true);
      const params = statusFilter ? { status: statusFilter } : {};
      const response = await adminAPI.getDineInOrders(params);
      setDineInOrders(response.data.data);
    } catch (error) {
      toast.error('Failed to load dine-in orders');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDeliveryBoys = async () => {
    try {
      const response = await adminAPI.getAvailableDeliveryBoys();
      setDeliveryBoys(response.data.data);
    } catch (error) {
      console.error('Failed to load delivery boys');
    }
  };

  const handleStatusUpdate = async (orderNumber, status, deliveryBoyId = null) => {
    try {
      await adminAPI.updateOrderStatus(orderNumber, { 
        status, 
        deliveryBoyId: deliveryBoyId || undefined 
      });
      toast.success(`Order status updated to ${status}`);
      fetchOrders();
      setSelectedOrder(null);
    } catch (error) {
      toast.error('Failed to update order');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-700',
      confirmed: 'bg-blue-100 text-blue-700',
      preparing: 'bg-orange-100 text-orange-700',
      ready: 'bg-purple-100 text-purple-700',
      picked_up: 'bg-indigo-100 text-indigo-700',
      on_the_way: 'bg-cyan-100 text-cyan-700',
      delivered: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700',
      active: 'bg-blue-100 text-blue-700',
      billing: 'bg-orange-100 text-orange-700',
      completed: 'bg-green-100 text-green-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const statusOptions = [
    { value: 'confirmed', label: 'Confirm' },
    { value: 'preparing', label: 'Start Preparing' },
    { value: 'ready', label: 'Ready for Pickup' },
    { value: 'cancelled', label: 'Cancel' },
  ];

  const onlineFilterOptions = [
    { value: '', label: 'All Orders' },
    { value: 'pending', label: 'Pending' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'preparing', label: 'Preparing' },
    { value: 'ready', label: 'Ready' },
    { value: 'on_the_way', label: 'On the Way' },
    { value: 'delivered', label: 'Delivered' },
  ];

  const dineInFilterOptions = [
    { value: '', label: 'All Orders' },
    { value: 'active', label: 'Active' },
    { value: 'billing', label: 'Billing' },
    { value: 'completed', label: 'Completed' },
  ];

  const filterOptions = activeTab === 'online' ? onlineFilterOptions : dineInFilterOptions;

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
        <h1 className="text-2xl font-bold text-secondary">Order Management</h1>
        <p className="text-gray-500">Manage and track customer orders</p>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => { setActiveTab('online'); setStatusFilter(''); }}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
            activeTab === 'online'
              ? 'bg-blue-500 text-white shadow-lg'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Truck className="w-5 h-5" />
          Online Orders
        </button>
        <button
          onClick={() => { setActiveTab('dinein'); setStatusFilter(''); }}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
            activeTab === 'dinein'
              ? 'bg-indigo-500 text-white shadow-lg'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          <UtensilsCrossed className="w-5 h-5" />
          Dine-in Orders
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto hide-scrollbar pb-2">
        {filterOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => setStatusFilter(option.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              statusFilter === option.value
                ? 'bg-primary text-white'
                : 'bg-white text-secondary hover:bg-gray-100'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Online Orders List */}
      {activeTab === 'online' && (
        <>
          {orders.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center">
              <Truck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No online orders found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="bg-white rounded-xl shadow-sm relative">
                  <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Truck className="w-6 h-6 text-blue-500" />
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-bold text-secondary">#{order.order_number}</h3>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                              order.status
                            )}`}
                          >
                            {order.status.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                          <User className="w-4 h-4" />
                          <span>{order.customer_name}</span>
                          {order.customer_phone && (
                            <>
                              <Phone className="w-4 h-4 ml-2" />
                              <span>{order.customer_phone}</span>
                            </>
                          )}
                        </div>
                        <div className="flex items-start gap-2 text-sm text-gray-500">
                          <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <span className="line-clamp-1">{order.delivery_address}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xl font-bold text-secondary">₹{order.total_amount}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(order.created_at).toLocaleString()}
                        </p>
                      </div>

                      {!['delivered', 'cancelled'].includes(order.status) && (
                        <div className="relative">
                          <button
                            onClick={() => setSelectedOrder(selectedOrder === order.id ? null : order.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                          >
                            Update
                            <ChevronDown className="w-4 h-4" />
                          </button>

                          {selectedOrder === order.id && (
                            <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-100 py-2 z-50 animate-fade-in">
                              {/* Status options */}
                              {statusOptions.map((option) => {
                                // Only show relevant next status options
                                const canShow = () => {
                                  if (option.value === 'cancelled') return true;
                                  if (order.status === 'pending' && option.value === 'confirmed') return true;
                                  if (order.status === 'confirmed' && option.value === 'preparing') return true;
                                  if (order.status === 'preparing' && option.value === 'ready') return true;
                                  return false;
                                };

                                if (!canShow()) return null;

                                return (
                                  <button
                                    key={option.value}
                                    onClick={() => handleStatusUpdate(order.order_number, option.value)}
                                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                                      option.value === 'cancelled' ? 'text-red-600' : 'text-secondary'
                                    }`}
                                  >
                                    {option.label}
                                  </button>
                                );
                              })}

                              {/* Assign delivery boy (only when ready) */}
                              {order.status === 'ready' && (
                                <div className="border-t border-gray-100 mt-2 pt-2">
                                  <p className="px-4 py-2 text-xs text-gray-500 font-medium">
                                    Assign Delivery Partner
                                  </p>
                                  {deliveryBoys.map((boy) => (
                                    <button
                                      key={boy.id}
                                      onClick={() => handleStatusUpdate(order.order_number, 'picked_up', boy.id)}
                                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between"
                                    >
                                      <span>{boy.name}</span>
                                      <span className="text-xs text-gray-400">
                                        {boy.active_orders} active
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Dine-in Orders List */}
      {activeTab === 'dinein' && (
        <>
          {dineInOrders.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center">
              <UtensilsCrossed className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No dine-in orders found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {dineInOrders.map((order) => (
                <div key={order.id} className="bg-white rounded-xl shadow-sm relative">
                  <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <UtensilsCrossed className="w-6 h-6 text-indigo-500" />
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-bold text-secondary">Table {order.table_number}</h3>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                              order.status
                            )}`}
                          >
                            {order.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                          <User className="w-4 h-4" />
                          <span>{order.customer_name}</span>
                          {order.customer_phone && (
                            <>
                              <Phone className="w-4 h-4 ml-2" />
                              <span>{order.customer_phone}</span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Users className="w-4 h-4" />
                          <span>{order.guest_count} guests</span>
                          <span className="mx-2">•</span>
                          <span>Waiter: {order.waiter_name || 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xl font-bold text-secondary">₹{order.total_amount || 0}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(order.created_at).toLocaleString()}
                        </p>
                        {order.items_count > 0 && (
                          <p className="text-xs text-gray-400 mt-1">{order.items_count} items</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Order Items (if any) */}
                  {order.items && order.items.length > 0 && (
                    <div className="px-4 pb-4">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs font-medium text-gray-500 mb-2">Order Items:</p>
                        <div className="flex flex-wrap gap-2">
                          {order.items.map((item, idx) => (
                            <span 
                              key={idx}
                              className={`text-xs px-2 py-1 rounded-full ${
                                item.status === 'ready' 
                                  ? 'bg-green-100 text-green-700'
                                  : item.status === 'preparing'
                                  ? 'bg-orange-100 text-orange-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {item.quantity}x {item.item_name} ({item.status})
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default OrderManagement;
