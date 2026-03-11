import { useState, useEffect } from 'react';
import { Users, Clock, Receipt, ChefHat } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { waiterAPI } from '../../lib/api';
import { getSocket, joinRoleRoom } from '../../lib/socket';
import { useAuthStore } from '../../store/authStore';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';

const WaiterTables = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [tables, setTables] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFloor, setSelectedFloor] = useState('all');

  useEffect(() => {
    fetchTables();

    const socket = getSocket();
    joinRoleRoom('waiter');

    socket.on('table_status_update', () => {
      fetchTables();
    });

    socket.on('dine_in_item_status_update', (data) => {
      toast.success(`Item ready for table!`);
      fetchTables();
    });

    return () => {
      socket.off('table_status_update');
      socket.off('dine_in_item_status_update');
    };
  }, []);

  const fetchTables = async () => {
    try {
      const response = await waiterAPI.getTables();
      setTables(response.data);
    } catch (error) {
      toast.error('Failed to load tables');
    } finally {
      setIsLoading(false);
    }
  };

  const floors = ['all', ...new Set(tables.map(t => t.floor))];

  const filteredTables = selectedFloor === 'all' 
    ? tables 
    : tables.filter(t => t.floor === selectedFloor);

  const getTableStatusColor = (status) => {
    const colors = {
      available: 'bg-green-100 border-green-400 hover:bg-green-200',
      occupied: 'bg-orange-100 border-orange-400 hover:bg-orange-200',
      reserved: 'bg-blue-100 border-blue-400 hover:bg-blue-200',
      billing: 'bg-purple-100 border-purple-400 hover:bg-purple-200',
    };
    return colors[status] || 'bg-gray-100 border-gray-400';
  };

  const getStatusText = (status) => {
    const text = {
      available: 'Available',
      occupied: 'Occupied',
      reserved: 'Reserved',
      billing: 'Billing',
    };
    return text[status] || status;
  };

  const handleTableClick = (table) => {
    if (table.status === 'available') {
      navigate(`/waiter/new-order/${table.id}`);
    } else if (table.active_order) {
      navigate(`/waiter/order/${table.active_order.order_id}`);
    }
  };

  const stats = {
    available: tables.filter(t => t.status === 'available').length,
    occupied: tables.filter(t => t.status === 'occupied').length,
    billing: tables.filter(t => t.status === 'billing').length,
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
          Welcome, {user?.name || 'Waiter'}! 👋
        </h1>
        <p className="text-gray-500">Select a table to take an order</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 rounded-xl p-4 border border-green-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-700">{stats.available}</p>
              <p className="text-sm text-green-600">Available</p>
            </div>
          </div>
        </div>
        <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
              <ChefHat className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-700">{stats.occupied}</p>
              <p className="text-sm text-orange-600">Occupied</p>
            </div>
          </div>
        </div>
        <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
              <Receipt className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-700">{stats.billing}</p>
              <p className="text-sm text-purple-600">Billing</p>
            </div>
          </div>
        </div>
      </div>

      {/* Floor Filter */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
        <div className="flex gap-2 flex-wrap">
          {floors.map(floor => (
            <button
              key={floor}
              onClick={() => setSelectedFloor(floor)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedFloor === floor
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {floor === 'all' ? 'All Floors' : floor}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-400"></div>
            <span>Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-orange-400"></div>
            <span>Occupied</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-400"></div>
            <span>Reserved</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-purple-400"></div>
            <span>Billing</span>
          </div>
        </div>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {filteredTables.map(table => (
          <button
            key={table.id}
            onClick={() => handleTableClick(table)}
            className={`relative p-4 rounded-xl border-2 transition-all transform hover:scale-105 ${getTableStatusColor(table.status)}`}
          >
            <div className="text-center">
              <p className="text-2xl font-bold text-secondary">{table.table_number}</p>
              <p className="text-sm text-gray-600 flex items-center justify-center gap-1">
                <Users className="w-4 h-4" />
                {table.capacity} seats
              </p>
              <span className={`inline-block mt-2 px-2 py-1 rounded-full text-xs font-medium ${
                table.status === 'available' ? 'bg-green-500 text-white' :
                table.status === 'occupied' ? 'bg-orange-500 text-white' :
                table.status === 'billing' ? 'bg-purple-500 text-white' :
                'bg-blue-500 text-white'
              }`}>
                {getStatusText(table.status)}
              </span>
              
              {table.active_order && (
                <div className="mt-2 text-xs text-gray-600">
                  <p className="flex items-center justify-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(table.active_order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="font-semibold text-primary">
                    ₹{parseFloat(table.active_order.total_amount || 0).toFixed(0)}
                  </p>
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      {filteredTables.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No tables found for this floor.
        </div>
      )}
    </div>
  );
};

export default WaiterTables;
