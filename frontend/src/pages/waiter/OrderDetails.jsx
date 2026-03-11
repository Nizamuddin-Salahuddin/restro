import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Minus, Trash2, Search, Printer, CreditCard, X, Clock } from 'lucide-react';
import { waiterAPI } from '../../lib/api';
import { getSocket } from '../../lib/socket';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';

const OrderDetails = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cart, setCart] = useState([]);
  const [showBillModal, setShowBillModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [discount, setDiscount] = useState(0);

  useEffect(() => {
    fetchData();

    const socket = getSocket();
    socket.on('dine_in_item_status_update', (data) => {
      if (data.orderId === parseInt(orderId)) {
        fetchOrder();
        toast.success('Item status updated!');
      }
    });

    return () => {
      socket.off('dine_in_item_status_update');
    };
  }, [orderId]);

  const fetchData = async () => {
    try {
      const [orderRes, menuRes, catRes] = await Promise.all([
        waiterAPI.getOrder(orderId),
        waiterAPI.getMenu(),
        waiterAPI.getCategories(),
      ]);
      setOrder(orderRes.data);
      setMenuItems(menuRes.data);
      setCategories(catRes.data);
    } catch (error) {
      toast.error('Failed to load order');
      navigate('/waiter');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOrder = async () => {
    try {
      const response = await waiterAPI.getOrder(orderId);
      setOrder(response.data);
    } catch (error) {
      console.error('Error fetching order:', error);
    }
  };

  const filteredMenu = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category_id === parseInt(selectedCategory);
    return matchesSearch && matchesCategory;
  });

  const addToCart = (item) => {
    const existing = cart.find(c => c.id === item.id);
    if (existing) {
      setCart(cart.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setCart([...cart, { ...item, quantity: 1, specialInstructions: '' }]);
    }
  };

  const updateCartQuantity = (itemId, delta) => {
    setCart(cart.map(item => {
      if (item.id === itemId) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (itemId) => {
    setCart(cart.filter(item => item.id !== itemId));
  };

  const sendToKitchen = async () => {
    if (cart.length === 0) {
      toast.error('Add items to send to kitchen');
      return;
    }

    try {
      const items = cart.map(item => ({
        menuItemId: item.id,
        quantity: item.quantity,
        specialInstructions: item.specialInstructions,
      }));

      await waiterAPI.addItems(orderId, items);
      toast.success('Items sent to kitchen!');
      setCart([]);
      fetchOrder();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to send items');
    }
  };

  const removeOrderItem = async (itemId) => {
    try {
      await waiterAPI.removeItem(orderId, itemId);
      toast.success('Item removed');
      fetchOrder();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Cannot remove item');
    }
  };

  const generateBill = async () => {
    try {
      const response = await waiterAPI.generateBill(orderId, discount);
      setOrder(response.data);
      setShowBillModal(true);
    } catch (error) {
      toast.error('Failed to generate bill');
    }
  };

  const handlePayment = async (method) => {
    try {
      await waiterAPI.completeOrder(orderId, method);
      toast.success('Payment completed!');
      setShowPaymentModal(false);
      navigate('/waiter');
    } catch (error) {
      toast.error('Failed to complete payment');
    }
  };

  const printBill = () => {
    window.print();
  };

  const getItemStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-700',
      preparing: 'bg-blue-100 text-blue-700',
      ready: 'bg-green-100 text-green-700',
      served: 'bg-gray-100 text-gray-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const cartTotal = cart.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="pb-32">
      <button
        onClick={() => navigate('/waiter')}
        className="flex items-center gap-2 text-gray-600 hover:text-primary mb-4 print:hidden"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Tables
      </button>

      {/* Order Header */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold text-secondary">
              Table {order?.table_number} - {order?.order_number}
            </h1>
            <p className="text-sm text-gray-500">
              {order?.guest_count} guests • Started {new Date(order?.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
            {order?.customer_name && (
              <p className="text-sm text-gray-600 mt-1">Customer: {order.customer_name}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">₹{parseFloat(order?.total_amount || 0).toFixed(2)}</p>
            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
              order?.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
            }`}>
              {order?.status?.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 print:hidden">
        {/* Menu Section */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="font-semibold text-lg mb-4">Add Items</h2>
          
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search menu..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>

          {/* Categories */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${
                selectedCategory === 'all' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              All
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id.toString())}
                className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${
                  selectedCategory === cat.id.toString() ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Menu Grid */}
          <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
            {filteredMenu.map(item => (
              <button
                key={item.id}
                onClick={() => addToCart(item)}
                className="p-3 border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors text-left"
              >
                <div className="flex items-start gap-2">
                  <span className={`w-3 h-3 rounded-full mt-1 ${item.is_veg ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.name}</p>
                    <p className="text-primary font-semibold text-sm">₹{item.price}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Cart Section */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="font-semibold text-lg mb-4">New Items ({cart.length})</h2>
          
          {cart.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Tap menu items to add</p>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
              {cart.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                  <span className={`w-3 h-3 rounded-full ${item.is_veg ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.name}</p>
                    <p className="text-xs text-gray-500">₹{item.price} × {item.quantity}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateCartQuantity(item.id, -1)}
                      className="w-7 h-7 flex items-center justify-center bg-gray-200 rounded-full hover:bg-gray-300"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="font-semibold w-6 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateCartQuantity(item.id, 1)}
                      className="w-7 h-7 flex items-center justify-center bg-primary text-white rounded-full hover:bg-primary-dark"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="w-7 h-7 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-full"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {cart.length > 0 && (
            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-4">
                <span className="font-medium">Cart Total:</span>
                <span className="text-xl font-bold text-primary">₹{cartTotal.toFixed(2)}</span>
              </div>
              <button
                onClick={sendToKitchen}
                className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary-dark transition-colors"
              >
                Send to Kitchen
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Current Order Items */}
      <div className="bg-white rounded-xl shadow-sm p-4 mt-4">
        <h2 className="font-semibold text-lg mb-4">Order Items ({order?.items?.length || 0})</h2>
        
        {order?.items?.length === 0 ? (
          <p className="text-center text-gray-500 py-4">No items ordered yet</p>
        ) : (
          <div className="space-y-2">
            {order?.items?.map(item => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className={`w-3 h-3 rounded-full ${item.is_veg ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <div>
                    <p className="font-medium">{item.item_name}</p>
                    <p className="text-sm text-gray-500">₹{item.item_price} × {item.quantity}</p>
                    {item.special_instructions && (
                      <p className="text-xs text-gray-400">Note: {item.special_instructions}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getItemStatusColor(item.status)}`}>
                    {item.status}
                  </span>
                  <span className="font-semibold">₹{(parseFloat(item.item_price) * item.quantity).toFixed(2)}</span>
                  {item.status === 'pending' && (
                    <button
                      onClick={() => removeOrderItem(item.id)}
                      className="text-red-500 hover:bg-red-50 p-1 rounded print:hidden"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Bill Summary */}
        {order?.items?.length > 0 && (
          <div className="mt-4 pt-4 border-t space-y-2">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>₹{parseFloat(order?.subtotal || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>GST (5%)</span>
              <span>₹{parseFloat(order?.tax_amount || 0).toFixed(2)}</span>
            </div>
            {parseFloat(order?.discount_amount || 0) > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>-₹{parseFloat(order.discount_amount).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-xl font-bold pt-2 border-t">
              <span>Total</span>
              <span className="text-primary">₹{parseFloat(order?.total_amount || 0).toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action Bar */}
      {order?.status === 'active' && order?.items?.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 print:hidden">
          <div className="max-w-4xl mx-auto flex gap-4">
            <div className="flex-1">
              <label className="block text-sm text-gray-600 mb-1">Discount (₹)</label>
              <input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                min="0"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                placeholder="0"
              />
            </div>
            <button
              onClick={generateBill}
              className="flex-1 bg-secondary text-white py-3 rounded-lg font-semibold hover:bg-secondary/90 transition-colors flex items-center justify-center gap-2"
            >
              <Printer className="w-5 h-5" />
              Generate Bill
            </button>
            <button
              onClick={() => setShowPaymentModal(true)}
              className="flex-1 bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary-dark transition-colors flex items-center justify-center gap-2"
            >
              <CreditCard className="w-5 h-5" />
              Complete Payment
            </button>
          </div>
        </div>
      )}

      {/* Bill Modal */}
      {showBillModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 print:hidden">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Bill Preview</h2>
              <button onClick={() => setShowBillModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-center mb-4 pb-4 border-b">
              <h3 className="text-lg font-bold">Dum & Wok</h3>
              <p className="text-sm text-gray-500">Restaurant & Kitchen</p>
            </div>

            <div className="mb-4 pb-4 border-b">
              <div className="flex justify-between text-sm">
                <span>Order #:</span>
                <span>{order?.order_number}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Table:</span>
                <span>{order?.table_number}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Date:</span>
                <span>{new Date().toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Waiter:</span>
                <span>{order?.waiter_name}</span>
              </div>
            </div>

            <div className="mb-4 pb-4 border-b">
              {order?.items?.map(item => (
                <div key={item.id} className="flex justify-between text-sm py-1">
                  <span>{item.item_name} × {item.quantity}</span>
                  <span>₹{(parseFloat(item.item_price) * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="space-y-1 mb-4">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>₹{parseFloat(order?.subtotal || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>GST (5%)</span>
                <span>₹{parseFloat(order?.tax_amount || 0).toFixed(2)}</span>
              </div>
              {parseFloat(order?.discount_amount || 0) > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount</span>
                  <span>-₹{parseFloat(order.discount_amount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>Total</span>
                <span>₹{parseFloat(order?.total_amount || 0).toFixed(2)}</span>
              </div>
            </div>

            <div className="text-center text-sm text-gray-500 mb-4">
              <p>Thank you for dining with us!</p>
            </div>

            <button
              onClick={printBill}
              className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary-dark transition-colors flex items-center justify-center gap-2"
            >
              <Printer className="w-5 h-5" />
              Print Bill
            </button>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Payment Method</h2>
              <button onClick={() => setShowPaymentModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-center text-2xl font-bold text-primary mb-6">
              ₹{parseFloat(order?.total_amount || 0).toFixed(2)}
            </p>

            <div className="space-y-3">
              <button
                onClick={() => handlePayment('cash')}
                className="w-full py-3 border-2 border-gray-200 rounded-lg font-semibold hover:border-primary hover:bg-primary/5 transition-colors"
              >
                💵 Cash
              </button>
              <button
                onClick={() => handlePayment('card')}
                className="w-full py-3 border-2 border-gray-200 rounded-lg font-semibold hover:border-primary hover:bg-primary/5 transition-colors"
              >
                💳 Card
              </button>
              <button
                onClick={() => handlePayment('upi')}
                className="w-full py-3 border-2 border-gray-200 rounded-lg font-semibold hover:border-primary hover:bg-primary/5 transition-colors"
              >
                📱 UPI
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetails;
