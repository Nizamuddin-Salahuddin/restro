import { useState, useEffect } from 'react';
import { Calendar, Receipt, Clock, CheckCircle, XCircle } from 'lucide-react';
import { waiterAPI } from '../../lib/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';

const WaiterHistory = () => {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchOrders();
  }, [selectedDate, statusFilter]);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const params = { date: selectedDate };
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      const response = await waiterAPI.getMyOrders(params);
      setOrders(response.data);
    } catch (error) {
      toast.error('Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'cancelled':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-yellow-100 text-yellow-700';
    }
  };

  const totalRevenue = orders
    .filter(o => o.status === 'completed')
    .reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-secondary">My Orders</h1>
        <p className="text-gray-500">View your order history</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <div className="ml-auto text-right">
            <p className="text-sm text-gray-500">Total Revenue</p>
            <p className="text-xl font-bold text-primary">₹{totalRevenue.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Orders List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-xl p-8 shadow-sm text-center">
          <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600">No orders found</h3>
          <p className="text-gray-400">No orders for the selected date and filters</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <div key={order.id} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {getStatusIcon(order.status)}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg">Table {order.table_number}</span>
                      <span className="text-sm text-gray-400">#{order.order_number}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span>{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span>•</span>
                      <span>{order.item_count} items</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-secondary">₹{parseFloat(order.total_amount || 0).toFixed(2)}</p>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                    {order.status?.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {orders.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm mt-6">
          <h3 className="font-semibold mb-4">Day Summary</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-secondary">{orders.length}</p>
              <p className="text-sm text-gray-500">Total Orders</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-500">
                {orders.filter(o => o.status === 'completed').length}
              </p>
              <p className="text-sm text-gray-500">Completed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">₹{totalRevenue.toFixed(0)}</p>
              <p className="text-sm text-gray-500">Revenue</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WaiterHistory;
