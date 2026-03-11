import { useState, useEffect } from 'react';
import { Clock, ChefHat, CheckCircle, Truck, RefreshCw, Bell } from 'lucide-react';
import { kitchenAPI } from '../../lib/api';
import { getSocket, joinRoleRoom } from '../../lib/socket';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';

const KitchenDashboard = () => {
  const [dineInItems, setDineInItems] = useState([]);
  const [onlineOrders, setOnlineOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchData();

    const socket = getSocket();
    joinRoleRoom('kitchen');

    socket.on('new_dine_in_items', () => {
      fetchData();
      playNotificationSound();
    });

    socket.on('new_order', () => {
      fetchData();
      playNotificationSound();
    });

    // Auto refresh every 30 seconds
    let interval;
    if (autoRefresh) {
      interval = setInterval(fetchData, 30000);
    }

    return () => {
      socket.off('new_dine_in_items');
      socket.off('new_order');
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const playNotificationSound = () => {
    // You can add a sound notification here
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('New Order!', { body: 'Check the kitchen display' });
    }
  };

  const fetchData = async () => {
    try {
      const [ordersRes, statsRes] = await Promise.all([
        kitchenAPI.getAllOrders(),
        kitchenAPI.getStats(),
      ]);
      setDineInItems(ordersRes.data.dineIn || []);
      setOnlineOrders(ordersRes.data.online || []);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateDineInItemStatus = async (itemId, status) => {
    try {
      await kitchenAPI.updateDineInItemStatus(itemId, status);
      toast.success(`Item marked as ${status}`);
      fetchData();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const updateOnlineOrderStatus = async (orderId, status) => {
    try {
      await kitchenAPI.updateOnlineOrderStatus(orderId, status);
      toast.success(`Order marked as ${status}`);
      fetchData();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const getTimeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ${mins % 60}m ago`;
  };

  const getTimerColor = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 10) return 'text-green-400';
    if (mins < 20) return 'text-yellow-400';
    return 'text-red-400';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="text-white">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Kitchen Display System</h1>
          <p className="text-gray-400">Real-time order management</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              autoRefresh ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300'
            }`}
          >
            <RefreshCw className={`w-5 h-5 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto Refresh {autoRefresh ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
            Refresh Now
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
        <div className="bg-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.dineIn?.pending || 0}</p>
              <p className="text-xs text-gray-400">Dine-In Pending</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <ChefHat className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.dineIn?.preparing || 0}</p>
              <p className="text-xs text-gray-400">Dine-In Preparing</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.dineIn?.ready || 0}</p>
              <p className="text-xs text-gray-400">Dine-In Ready</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Truck className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.online?.pending || 0}</p>
              <p className="text-xs text-gray-400">Online Pending</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
              <ChefHat className="w-5 h-5 text-cyan-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.online?.preparing || 0}</p>
              <p className="text-xs text-gray-400">Online Preparing</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
              <Bell className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.activeTables || 0}</p>
              <p className="text-xs text-gray-400">Active Tables</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'all' ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          All Orders
        </button>
        <button
          onClick={() => setActiveTab('dinein')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'dinein' ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          Dine-In ({dineInItems.length})
        </button>
        <button
          onClick={() => setActiveTab('online')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'online' ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          Online ({onlineOrders.length})
        </button>
      </div>

      {/* Orders Grid */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* Dine-In Items */}
        {(activeTab === 'all' || activeTab === 'dinein') && dineInItems.map(item => (
          <div
            key={item.id}
            className={`bg-gray-800 rounded-xl p-4 border-l-4 ${
              item.status === 'pending' ? 'border-yellow-500' :
              item.status === 'preparing' ? 'border-blue-500' :
              'border-green-500'
            }`}
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-orange-500/20 text-orange-400 px-2 py-1 rounded text-xs font-medium">
                    DINE-IN
                  </span>
                  <span className="bg-gray-700 px-2 py-1 rounded text-xs font-medium">
                    Table {item.table_number}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">#{item.order_number}</p>
              </div>
              <span className={`text-sm font-medium ${getTimerColor(item.created_at)}`}>
                <Clock className="w-4 h-4 inline mr-1" />
                {getTimeAgo(item.created_at)}
              </span>
            </div>

            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-3 h-3 rounded-full ${item.is_veg ? 'bg-green-500' : 'bg-red-500'}`}></span>
                <span className="font-semibold text-lg">{item.item_name}</span>
                <span className="text-gray-400">× {item.quantity}</span>
              </div>
              {item.special_instructions && (
                <p className="text-sm text-yellow-400 bg-yellow-500/10 px-2 py-1 rounded">
                  📝 {item.special_instructions}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              {item.status === 'pending' && (
                <button
                  onClick={() => updateDineInItemStatus(item.id, 'preparing')}
                  className="flex-1 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
                >
                  Start Preparing
                </button>
              )}
              {item.status === 'preparing' && (
                <button
                  onClick={() => updateDineInItemStatus(item.id, 'ready')}
                  className="flex-1 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
                >
                  Mark Ready
                </button>
              )}
              {item.status === 'ready' && (
                <button
                  onClick={() => updateDineInItemStatus(item.id, 'served')}
                  className="flex-1 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-500 transition-colors"
                >
                  Mark Served
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Online Orders */}
        {(activeTab === 'all' || activeTab === 'online') && onlineOrders.map(order => (
          <div
            key={order.id}
            className={`bg-gray-800 rounded-xl p-4 border-l-4 ${
              order.order_status === 'confirmed' ? 'border-purple-500' :
              order.order_status === 'preparing' ? 'border-cyan-500' :
              'border-green-500'
            }`}
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-purple-500/20 text-purple-400 px-2 py-1 rounded text-xs font-medium">
                    ONLINE
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    order.order_status === 'confirmed' ? 'bg-purple-500/20 text-purple-400' :
                    order.order_status === 'preparing' ? 'bg-cyan-500/20 text-cyan-400' :
                    'bg-green-500/20 text-green-400'
                  }`}>
                    {order.order_status?.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">#{order.order_number}</p>
              </div>
              <span className={`text-sm font-medium ${getTimerColor(order.created_at)}`}>
                <Clock className="w-4 h-4 inline mr-1" />
                {getTimeAgo(order.created_at)}
              </span>
            </div>

            <div className="mb-4 space-y-2">
              {order.items?.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${item.is_veg ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <span className="font-medium">{item.item_name}</span>
                  <span className="text-gray-400">× {item.quantity}</span>
                </div>
              ))}
              {order.order_instructions && (
                <p className="text-sm text-yellow-400 bg-yellow-500/10 px-2 py-1 rounded">
                  📝 {order.order_instructions}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              {order.order_status === 'confirmed' && (
                <button
                  onClick={() => updateOnlineOrderStatus(order.id, 'preparing')}
                  className="flex-1 py-2 bg-cyan-500 text-white rounded-lg font-medium hover:bg-cyan-600 transition-colors"
                >
                  Start Preparing
                </button>
              )}
              {order.order_status === 'preparing' && (
                <button
                  onClick={() => updateOnlineOrderStatus(order.id, 'ready')}
                  className="flex-1 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
                >
                  Mark Ready
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {dineInItems.length === 0 && onlineOrders.length === 0 && (
        <div className="text-center py-12">
          <ChefHat className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-400">No pending orders</h3>
          <p className="text-gray-500">New orders will appear here automatically</p>
        </div>
      )}
    </div>
  );
};

export default KitchenDashboard;
