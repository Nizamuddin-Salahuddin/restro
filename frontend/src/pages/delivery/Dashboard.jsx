import { useState, useEffect } from 'react';
import { Package, CheckCircle, Clock, TrendingUp, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { deliveryAPI } from '../../lib/api';
import { getSocket, joinRoleRoom } from '../../lib/socket';
import { useAuthStore } from '../../store/authStore';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';

const DeliveryDashboard = () => {
  const { user } = useAuthStore();
  const [stats, setStats] = useState({
    activeOrders: 0,
    todayDeliveries: 0,
    totalDeliveries: 0,
  });
  const [availableOrders, setAvailableOrders] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();

    const socket = getSocket();
    joinRoleRoom('delivery');

    socket.on('order_assigned', (data) => {
      toast.success(`New order assigned: ${data.orderNumber}`);
      fetchData();
    });

    socket.on('order_picked', () => {
      fetchData();
    });

    socket.on('new_order_ready', () => {
      toast.success('New order ready for pickup!');
      fetchData();
    });

    // Refresh data every 30 seconds
    const refreshInterval = setInterval(fetchData, 30000);

    return () => {
      socket.off('order_assigned');
      socket.off('order_picked');
      socket.off('new_order_ready');
      clearInterval(refreshInterval);
    };
  }, []);

  const fetchData = async () => {
    try {
      const [availableRes, ordersRes, statsRes] = await Promise.all([
        deliveryAPI.getAvailableOrders(),
        deliveryAPI.getMyOrders({ status: 'active' }),
        deliveryAPI.getStats()
      ]);
      
      setAvailableOrders(availableRes.data.data);
      setActiveOrders(ordersRes.data.data);
      
      const statsData = statsRes.data.data;
      setStats({
        activeOrders: statsData.activeOrders || 0,
        todayDeliveries: statsData.todayDeliveries || 0,
        totalDeliveries: statsData.totalDeliveries || 0,
      });
    } catch (error) {
      toast.error('Failed to load dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      picked_up: 'bg-indigo-100 text-indigo-700',
      on_the_way: 'bg-cyan-100 text-cyan-700',
      delivered: 'bg-green-100 text-green-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
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
        <h1 className="text-2xl font-bold text-secondary">
          Hello, {user?.name?.split(' ')[0]}! 👋
        </h1>
        <p className="text-gray-500">Here's your delivery overview</p>
      </div>

      {/* Available Orders Alert */}
      {availableOrders.length > 0 && (
        <Link
          to="/delivery/orders"
          className="block bg-purple-500 text-white rounded-xl p-4 mb-4 animate-pulse hover:bg-purple-600 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6" />
            <div>
              <p className="font-semibold">{availableOrders.length} orders available for pickup!</p>
              <p className="text-sm text-white/80">Tap to view and pick up orders</p>
            </div>
          </div>
        </Link>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 text-center">
          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <Package className="w-5 h-5 text-orange-600" />
          </div>
          <p className="text-2xl font-bold text-secondary">{stats.activeOrders}</p>
          <p className="text-xs text-gray-500">Active</p>
        </div>
        <div className="bg-white rounded-xl p-4 text-center">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-secondary">{stats.todayDeliveries}</p>
          <p className="text-xs text-gray-500">Today</p>
        </div>
        <div className="bg-white rounded-xl p-4 text-center">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-secondary">{stats.totalDeliveries}</p>
          <p className="text-xs text-gray-500">Total</p>
        </div>
      </div>

      {/* Quick Action */}
      <Link
        to="/delivery/orders"
        className="block bg-primary text-white rounded-xl p-6 mb-6 hover:bg-primary-dark transition-colors"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">View All Orders</h3>
            <p className="text-white/80 text-sm">
              {availableOrders.length} available • {activeOrders.length} active
            </p>
          </div>
          <Package className="w-8 h-8" />
        </div>
      </Link>

      {/* Active Orders Preview */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-bold text-secondary">My Active Deliveries</h2>
        </div>

        {activeOrders.length === 0 ? (
          <div className="p-8 text-center">
            <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No active deliveries</p>
            <p className="text-sm text-gray-400">Pick up an order to get started!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {activeOrders.slice(0, 3).map((order) => (
              <Link
                key={order.id}
                to={`/delivery/orders`}
                className="p-4 flex items-center justify-between hover:bg-gray-50"
              >
                <div>
                  <p className="font-medium text-secondary">#{order.order_number}</p>
                  <p className="text-sm text-gray-500">{order.customer_name}</p>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                    order.status
                  )}`}
                >
                  {order.status.replace('_', ' ')}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DeliveryDashboard;
