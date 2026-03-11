import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';

const Cart = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { 
    items, 
    summary, 
    updateQuantity, 
    updateQuantityLocal, 
    removeItem, 
    removeItemLocal 
  } = useCartStore();

  const handleUpdateQuantity = (item, newQuantity) => {
    if (isAuthenticated) {
      updateQuantity(item.id, newQuantity);
    } else {
      updateQuantityLocal(item.id, newQuantity);
    }
  };

  const handleRemove = (item) => {
    if (isAuthenticated) {
      removeItem(item.id);
    } else {
      removeItemLocal(item.id);
    }
  };

  const handleCheckout = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: '/checkout' } } });
    } else {
      navigate('/checkout');
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
          <ShoppingBag className="w-12 h-12 text-gray-400" />
        </div>
        <h2 className="text-2xl font-bold text-secondary mb-2">Your cart is empty</h2>
        <p className="text-gray-500 mb-6 text-center">
          Looks like you haven't added any items yet
        </p>
        <Link
          to="/menu"
          className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-full font-semibold hover:bg-primary-dark transition-colors"
        >
          Browse Menu
          <ArrowRight className="w-5 h-5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-accent py-6">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-secondary mb-6">Your Cart</h1>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-xl p-4 shadow-sm flex gap-4 animate-fade-in"
              >
                {/* Image */}
                <div className="w-20 h-20 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                      <span className="text-2xl">🍛</span>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 border-2 rounded-sm flex items-center justify-center ${
                            item.is_veg ? 'border-green-600' : 'border-red-600'
                          }`}
                        >
                          <div
                            className={`w-2 h-2 rounded-full ${
                              item.is_veg ? 'bg-green-600' : 'bg-red-600'
                            }`}
                          />
                        </div>
                        <h3 className="font-semibold text-secondary line-clamp-1">
                          {item.name}
                        </h3>
                      </div>
                      <p className="text-lg font-bold text-secondary mt-1">
                        ₹{item.price}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemove(item)}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2 bg-gray-100 rounded-lg">
                      <button
                        onClick={() => handleUpdateQuantity(item, item.quantity - 1)}
                        className="p-2 hover:bg-gray-200 rounded-l-lg transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center font-semibold">{item.quantity}</span>
                      <button
                        onClick={() => handleUpdateQuantity(item, item.quantity + 1)}
                        className="p-2 hover:bg-gray-200 rounded-r-lg transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="font-bold text-secondary">
                      ₹{(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {/* Add More */}
            <Link
              to="/menu"
              className="block text-center py-3 text-primary font-medium hover:underline"
            >
              + Add more items
            </Link>
          </div>

          {/* Bill Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl p-6 shadow-sm sticky top-24">
              <h2 className="text-lg font-bold text-secondary mb-4">Bill Details</h2>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Item Total</span>
                  <span className="font-medium">₹{summary.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Delivery Fee</span>
                  <span className="font-medium">₹{summary.deliveryFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Taxes (5% GST)</span>
                  <span className="font-medium">₹{summary.tax.toFixed(2)}</span>
                </div>
                <div className="border-t border-gray-200 pt-3 flex justify-between">
                  <span className="font-bold text-secondary">To Pay</span>
                  <span className="font-bold text-secondary text-lg">
                    ₹{summary.total.toFixed(2)}
                  </span>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                className="w-full mt-6 bg-primary text-white py-4 rounded-xl font-semibold hover:bg-primary-dark transition-colors btn-press flex items-center justify-center gap-2"
              >
                Proceed to Checkout
                <ArrowRight className="w-5 h-5" />
              </button>

              {!isAuthenticated && (
                <p className="text-xs text-gray-500 text-center mt-3">
                  You'll need to login to continue
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
