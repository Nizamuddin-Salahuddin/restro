import { useState, useEffect } from 'react';
import { 
  Package, 
  DollarSign, 
  Users, 
  Clock,
  TrendingUp,
  ChevronRight,
  Calendar,
  ChevronLeft,
  UtensilsCrossed,
  Truck
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../../lib/api';
import { getSocket, joinRoleRoom } from '../../lib/socket';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchDashboard = async (date) => {
    try {
      setIsLoading(true);
      const response = await adminAPI.getDashboard({ date });
      setStats(response.data.data);
    } catch (error) {
      toast.error('Failed to load dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard(selectedDate);

    // Join admin room for real-time updates
    const socket = getSocket();
    joinRoleRoom('admin');

    socket.on('new_order', (data) => {
      toast.success(`New order received: ${data.orderNumber}`);
      fetchDashboard(selectedDate);
    });

    socket.on('payment_received', (data) => {
      toast(`Payment received for ${data.orderNumber}`, { icon: '💰' });
      fetchDashboard(selectedDate);
    });

    return () => {
      socket.off('new_order');
      socket.off('payment_received');
    };
  }, [selectedDate]);

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
  };

  const goToPreviousDay = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() - 1);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const goToNextDay = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + 1);
    const today = new Date().toISOString().split('T')[0];
    if (date.toISOString().split('T')[0] <= today) {
      setSelectedDate(date.toISOString().split('T')[0]);
    }
  };

  const goToToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  const formatDateLabel = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (dateStr === today.toISOString().split('T')[0]) {
      return "Today's";
    } else if (dateStr === yesterday.toISOString().split('T')[0]) {
      return "Yesterday's";
    } else {
      return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + "'s";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const statCards = [
    {
      label: `${formatDateLabel(selectedDate)} Online Orders`,
      value: stats?.todayOrders || 0,
      icon: Truck,
      color: 'bg-blue-500',
    },
    {
      label: `${formatDateLabel(selectedDate)} Dine-in Orders`,
      value: stats?.dineInOrders || 0,
      icon: UtensilsCrossed,
      color: 'bg-indigo-500',
    },
    {
      label: `${formatDateLabel(selectedDate)} Revenue`,
      value: `₹${((stats?.todayRevenue || 0) + (stats?.dineInRevenue || 0)).toFixed(0)}`,
      icon: DollarSign,
      color: 'bg-green-500',
      subtitle: `Online: ₹${stats?.todayRevenue?.toFixed(0) || 0} | Dine-in: ₹${stats?.dineInRevenue?.toFixed(0) || 0}`,
    },
    {
      label: 'Pending Online Orders',
      value: stats?.pendingOrders || 0,
      icon: Clock,
      color: 'bg-orange-500',
    },
  ];

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-700',
      confirmed: 'bg-blue-100 text-blue-700',
      preparing: 'bg-orange-100 text-orange-700',
      ready: 'bg-purple-100 text-purple-700',
      delivered: 'bg-green-100 text-green-700',
      active: 'bg-blue-100 text-blue-700',
      billing: 'bg-orange-100 text-orange-700',
      completed: 'bg-green-100 text-green-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary">Dashboard</h1>
          <p className="text-gray-500">Welcome back! Here's what's happening.</p>
        </div>
        
        {/* Date Picker */}
        <div className="flex items-center gap-2 bg-white rounded-lg p-2 shadow-sm">
          <button
            onClick={goToPreviousDay}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Previous day"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          
          <div className="flex items-center gap-2 px-2">
            <Calendar className="w-5 h-5 text-primary" />
            <input
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
              max={new Date().toISOString().split('T')[0]}
              className="border-none outline-none text-secondary font-medium bg-transparent"
            />
          </div>
          
          <button
            onClick={goToNextDay}
            disabled={isToday}
            className={`p-2 rounded-lg transition-colors ${
              isToday ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'
            }`}
            title="Next day"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
          
          {!isToday && (
            <button
              onClick={goToToday}
              className="px-3 py-1 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
            >
              Today
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => (
          <div
            key={index}
            className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
                <p className="text-2xl font-bold text-secondary">{stat.value}</p>
                {stat.subtitle && (
                  <p className="text-xs text-gray-400 mt-1">{stat.subtitle}</p>
                )}
              </div>
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <Link
          to="/admin/orders"
          className="bg-primary text-white rounded-xl p-6 flex items-center justify-between hover:bg-primary-dark transition-colors"
        >
          <div>
            <h3 className="text-lg font-semibold">Manage Orders</h3>
            <p className="text-white/80 text-sm">View and update order status</p>
          </div>
          <ChevronRight className="w-6 h-6" />
        </Link>

        <Link
          to="/admin/menu"
          className="bg-secondary text-white rounded-xl p-6 flex items-center justify-between hover:bg-secondary-light transition-colors"
        >
          <div>
            <h3 className="text-lg font-semibold">Manage Menu</h3>
            <p className="text-white/80 text-sm">Add or edit menu items</p>
          </div>
          <ChevronRight className="w-6 h-6" />
        </Link>
      </div>

      {/* Recent Orders - Two Columns */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Online Orders */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-500" />
                <h2 className="text-lg font-bold text-secondary">Recent Online Orders</h2>
              </div>
              <Link to="/admin/orders" className="text-primary text-sm font-medium hover:underline">
                View All
              </Link>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {stats?.recentOrders?.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No online orders yet
              </div>
            ) : (
              stats?.recentOrders?.map((order, index) => (
                <div key={index} className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Truck className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="font-medium text-secondary">#{order.order_number}</p>
                      <p className="text-sm text-gray-500">{order.customer_name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-secondary">₹{order.total_amount}</p>
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        order.status
                      )}`}
                    >
                      {order.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Dine-in Orders */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UtensilsCrossed className="w-5 h-5 text-indigo-500" />
                <h2 className="text-lg font-bold text-secondary">Recent Dine-in Orders</h2>
              </div>
              <Link to="/admin/orders" className="text-primary text-sm font-medium hover:underline">
                View All
              </Link>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {stats?.recentDineIn?.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No dine-in orders yet
              </div>
            ) : (
              stats?.recentDineIn?.map((order, index) => (
                <div key={index} className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                      <UtensilsCrossed className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div>
                      <p className="font-medium text-secondary">Table {order.table_number}</p>
                      <p className="text-sm text-gray-500">{order.customer_name} • {order.guest_count} guests</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-secondary">₹{order.total_amount || 0}</p>
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        order.status
                      )}`}
                    >
                      {order.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
