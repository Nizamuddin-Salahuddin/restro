import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, ChevronRight, Clock } from 'lucide-react';
import { orderAPI } from '../../lib/api';
import LoadingSpinner from '../../components/LoadingSpinner';

const MyOrders = () => {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetchOrders = async () => {
      setIsLoading(true);
      try {
        const params = filter !== 'all' ? { status: filter } : {};
        const response = await orderAPI.getOrders(params);
        setOrders(response.data.data);
      } catch (error) {
        console.error('Failed to fetch orders:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [filter]);

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
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const formatStatus = (status) => {
    return status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <div className="min-h-screen bg-accent py-6">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-secondary mb-6">My Orders</h1>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto hide-scrollbar pb-2">
          {['all', 'pending', 'preparing', 'on_the_way', 'delivered', 'cancelled'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filter === f
                  ? 'bg-primary text-white'
                  : 'bg-white text-secondary hover:bg-gray-100'
              }`}
            >
              {f === 'all' ? 'All Orders' : formatStatus(f)}
            </button>
          ))}
        </div>

        {/* Orders List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-10 h-10 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-secondary mb-2">No orders found</h2>
            <p className="text-gray-500 mb-6">
              {filter === 'all' 
                ? "You haven't placed any orders yet" 
                : `No ${formatStatus(filter).toLowerCase()} orders`}
            </p>
            <Link
              to="/menu"
              className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-full font-semibold hover:bg-primary-dark transition-colors"
            >
              Browse Menu
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Link
                key={order.id}
                to={`/orders/${order.order_number}`}
                className="block bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-bold text-secondary">
                        #{order.order_number}
                      </span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          order.status
                        )}`}
                      >
                        {formatStatus(order.status)}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-500 mb-2">
                      {order.items?.slice(0, 2).map((item, i) => (
                        <span key={i}>
                          {item.item_name} × {item.quantity}
                          {i < Math.min(order.items.length - 1, 1) ? ', ' : ''}
                        </span>
                      ))}
                      {order.items?.length > 2 && (
                        <span> +{order.items.length - 2} more</span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>
                          {new Date(order.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <span className="font-semibold text-secondary">
                        ₹{order.total_amount}
                      </span>
                    </div>
                  </div>

                  <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyOrders;
