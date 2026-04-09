import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Save, Package, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import { inventoryAPI } from '../../lib/api';
import toast from 'react-hot-toast';

const DailyStockLog = () => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [stockLog, setStockLog] = useState(null);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchInventoryItems = async () => {
    try {
      const response = await inventoryAPI.getInventory();
      setInventoryItems(response.data);
    } catch (error) {
      toast.error('Failed to fetch inventory items');
    }
  };

  const fetchStockLog = async (date) => {
    try {
      const response = await inventoryAPI.getDailyStockLog(date);
      if (response.data) {
        setStockLog(response.data);
      } else {
        // Initialize empty log for the date
        const emptyLog = inventoryItems.map(item => ({
          item_id: item.id,
          item_name: item.name,
          opening_stock: item.current_stock,
          purchased_today: 0,
          used_today: 0,
          closing_stock: item.current_stock,
          notes: ''
        }));
        setStockLog({
          date,
          items: emptyLog
        });
      }
    } catch (error) {
      toast.error('Failed to fetch stock log');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInventoryItems();
  }, []);

  useEffect(() => {
    if (inventoryItems.length > 0) {
      setIsLoading(true);
      fetchStockLog(selectedDate);
    }
  }, [selectedDate, inventoryItems]);

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
  };

  const handleItemChange = (itemIndex, field, value) => {
    const updatedLog = { ...stockLog };
    updatedLog.items[itemIndex][field] = field === 'notes' ? value : parseFloat(value) || 0;
    
    // Auto-calculate closing stock
    const item = updatedLog.items[itemIndex];
    item.closing_stock = item.opening_stock + item.purchased_today - item.used_today;
    
    setStockLog(updatedLog);
  };

  const handleSave = async () => {
    if (!stockLog) return;
    
    setIsSaving(true);
    try {
      await inventoryAPI.saveDailyStockLog(stockLog);
      toast.success('Daily stock log saved successfully!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save stock log');
    } finally {
      setIsSaving(false);
    }
  };

  const calculateTotals = () => {
    if (!stockLog?.items) return { totalUsed: 0, totalPurchased: 0, totalValue: 0 };
    
    return stockLog.items.reduce((acc, item) => ({
      totalUsed: acc.totalUsed + item.used_today,
      totalPurchased: acc.totalPurchased + item.purchased_today,
      totalValue: acc.totalValue + (item.closing_stock * 10) // Approximate value
    }), { totalUsed: 0, totalPurchased: 0, totalValue: 0 });
  };

  const totals = calculateTotals();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/admin/inventory')}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Inventory
        </button>
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-secondary flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-primary" />
              Daily Stock Log
            </h1>
            <p className="text-gray-500 mt-1">Track daily stock movements and consumption</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <input
                type="date"
                value={selectedDate}
                onChange={handleDateChange}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />
            </div>
            <button
              onClick={handleSave}
              disabled={isSaving || !stockLog}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Log
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Items</p>
              <p className="text-2xl font-bold text-secondary">{stockLog?.items?.length || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Purchased Today</p>
              <p className="text-2xl font-bold text-secondary">{totals.totalPurchased.toFixed(1)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Used Today</p>
              <p className="text-2xl font-bold text-secondary">{totals.totalUsed.toFixed(1)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <BarChart3 className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Est. Stock Value</p>
              <p className="text-2xl font-bold text-secondary">₹{totals.totalValue.toFixed(0)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stock Log Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-secondary flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Stock Movement for {new Date(selectedDate).toLocaleDateString()}
          </h2>
          <p className="text-gray-500 mt-1">
            Update stock movements and the system will auto-calculate closing stock
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          </div>
        ) : !stockLog?.items || stockLog.items.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No inventory items found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Opening Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Purchased Today
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Used Today
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Closing Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stockLog.items.map((item, index) => (
                  <tr key={item.item_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {item.item_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-semibold">
                        {item.opening_stock}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={item.purchased_today}
                        onChange={(e) => handleItemChange(index, 'purchased_today', e.target.value)}
                        className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={item.used_today}
                        onChange={(e) => handleItemChange(index, 'used_today', e.target.value)}
                        className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-semibold ${
                        item.closing_stock < 5 ? 'text-red-600' : 
                        item.closing_stock < 20 ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {item.closing_stock.toFixed(1)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="text"
                        value={item.notes}
                        onChange={(e) => handleItemChange(index, 'notes', e.target.value)}
                        placeholder="Add notes..."
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-blue-800 mb-2">Instructions:</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Opening stock is automatically set from current inventory levels</li>
          <li>• Enter purchased quantities and used quantities for the day</li>
          <li>• Closing stock is auto-calculated: Opening + Purchased - Used</li>
          <li>• Red closing stock indicates low inventory (&lt;5), yellow indicates medium (&lt;20)</li>
          <li>• Save the log to update inventory levels and maintain records</li>
        </ul>
      </div>
    </div>
  );
};

export default DailyStockLog;