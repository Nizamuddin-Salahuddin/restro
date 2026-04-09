import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Warehouse, 
  Plus, 
  Edit, 
  Package, 
  History, 
  Calendar,
  Search,
  X
} from 'lucide-react';
import { inventoryAPI } from '../../lib/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';

const InventoryManagement = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [editQuantity, setEditQuantity] = useState('');

  const fetchItems = async () => {
    try {
      setIsLoading(true);
      const response = await inventoryAPI.getItems();
      setItems(response.data.data);
    } catch (error) {
      toast.error('Failed to load inventory items');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleUpdateQuantity = async (id) => {
    if (editQuantity === '' || parseFloat(editQuantity) < 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    try {
      await inventoryAPI.updateItemQuantity(id, {
        current_quantity: parseFloat(editQuantity)
      });
      
      toast.success('Quantity updated successfully');
      setEditingItem(null);
      setEditQuantity('');
      fetchItems();
    } catch (error) {
      toast.error('Failed to update quantity');
    }
  };

  const startEdit = (item) => {
    setEditingItem(item.id);
    setEditQuantity(item.current_quantity.toString());
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setEditQuantity('');
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStockStatus = (quantity) => {
    if (quantity <= 0) return 'text-red-600 bg-red-50';
    if (quantity <= 10) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-secondary flex items-center gap-3">
              <Warehouse className="w-8 h-8 text-primary" />
              Inventory Management
            </h1>
            <p className="text-gray-500 mt-1">Manage stock levels and track inventory</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Link
            to="/admin/inventory/purchase"
            className="flex items-center gap-3 p-4 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">Add Purchase</span>
          </Link>
          
          <Link
            to="/admin/inventory/history"
            className="flex items-center gap-3 p-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
          >
            <History className="w-5 h-5" />
            <span className="font-medium">Purchase History</span>
          </Link>
          
          <Link
            to="/admin/inventory/daily"
            className="flex items-center gap-3 p-4 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
          >
            <Calendar className="w-5 h-5" />
            <span className="font-medium">Daily Stock Log</span>
          </Link>
        </div>
      </div>

      {/* Current Inventory */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-secondary flex items-center gap-2">
              <Package className="w-5 h-5" />
              Current Inventory Stock
            </h2>
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />
            </div>
          </div>
        </div>

        <div className="p-6">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <Warehouse className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No inventory items found</p>
              <p className="text-gray-400 mt-1">
                {searchTerm ? 'Try different search terms' : 'Add your first purchase to get started'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-secondary">Item Name</th>
                    <th className="text-right py-3 px-4 font-semibold text-secondary">Current Stock</th>
                    <th className="text-center py-3 px-4 font-semibold text-secondary">Unit</th>
                    <th className="text-center py-3 px-4 font-semibold text-secondary">Status</th>
                    <th className="text-center py-3 px-4 font-semibold text-secondary">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-4 px-4">
                        <div className="font-medium text-secondary">{item.name}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          Updated: {new Date(item.updated_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        {editingItem === item.id ? (
                          <div className="flex items-center justify-end gap-2">
                            <input
                              type="number"
                              value={editQuantity}
                              onChange={(e) => setEditQuantity(e.target.value)}
                              step="0.1"
                              min="0"
                              className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary focus:border-transparent outline-none text-right"
                            />
                            <button
                              onClick={() => handleUpdateQuantity(item.id)}
                              className="text-green-600 hover:text-green-700 text-sm font-medium"
                            >
                              Save
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="text-gray-500 hover:text-gray-600"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <span className={`text-lg font-bold ${getStockStatus(item.current_quantity).split(' ')[0]}`}>
                            {parseFloat(item.current_quantity).toFixed(1)}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm font-medium">
                          {item.unit}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStockStatus(item.current_quantity)}`}>
                          {item.current_quantity <= 0 ? 'Out of Stock' : 
                           item.current_quantity <= 10 ? 'Low Stock' : 'In Stock'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        {editingItem === item.id ? (
                          <div className="text-xs text-gray-500">Editing...</div>
                        ) : (
                          <button
                            onClick={() => startEdit(item)}
                            className="inline-flex items-center gap-1 px-3 py-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors text-sm font-medium"
                          >
                            <Edit className="w-3 h-3" />
                            Edit Qty
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InventoryManagement;