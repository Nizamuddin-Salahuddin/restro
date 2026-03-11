import { useState, useEffect } from 'react';
import { Package, Calendar, Filter } from 'lucide-react';
import { deliveryAPI } from '../../lib/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';

const DeliveryHistory = () => {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('all');

  useEffect(() => {
    fetchHistory();
  }, [dateFilter]);

  const fetchHistory = async () => {
    try {
      const params = {};
      if (dateFilter === 'today') {
        params.date = new Date().toISOString().split('T')[0];
      } else if (dateFilter === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        params.fromDate = weekAgo.toISOString().split('T')[0];
      }
      const response = await deliveryAPI.getHistory(params);
      setOrders(response.data.data);
    } catch (error) {
      toast.error('Failed to load history');
    } finally {
      setIsLoading(false);
    }
  };

  const filterOptions = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Calculate stats
  const totalEarnings = orders.reduce((acc, order) => {
    // Assuming delivery fee is 30
    return acc + 30;
  }, 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-secondary">Delivery History</h1>
        <p className="text-gray-500">View your past deliveries</p>
      </div>

      {/* Stats */}
      <div className="bg-gradient-to-r from-primary to-orange-400 rounded-xl p-6 text-white mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/80 text-sm">Total Deliveries</p>
            <p className="text-3xl font-bold">{orders.length}</p>
          </div>
          <div className="text-right">
            <p className="text-white/80 text-sm">Estimated Earnings</p>
            <p className="text-3xl font-bold">₹{totalEarnings}</p>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto hide-scrollbar">
        <Filter className="w-5 h-5 text-gray-400 flex-shrink-0" />
        {filterOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => setDateFilter(option.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              dateFilter === option.value
                ? 'bg-primary text-white'
                : 'bg-white text-secondary hover:bg-gray-100'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* History List */}
      {orders.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No delivery history</p>
          <p className="text-sm text-gray-400">
            Your completed deliveries will appear here
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-100">
            {orders.map((order) => (
              <div key={order.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <Package className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-secondary">#{order.order_number}</p>
                      <p className="text-sm text-gray-500">{order.customer_name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-secondary">₹{order.total_amount}</p>
                    <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                      Delivered
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>{order.delivery_address?.substring(0, 30)}...</span>
                  <span>{new Date(order.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryHistory;
