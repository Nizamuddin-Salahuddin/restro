import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, CreditCard, Banknote } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';
import toast from 'react-hot-toast';

const Checkout = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { items, summary } = useCartStore();
  
  const [address, setAddress] = useState(user?.address || '');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cod'); // 'online' | 'cod'

  useEffect(() => {
    if (items.length === 0) {
      navigate('/cart');
    }
  }, [items, navigate]);

  const handlePlaceOrder = async () => {
    if (!address.trim()) {
      toast.error('Please enter delivery address');
      return;
    }

    toast.error(
      'Due to heavy rush on opening, we are currently not accepting any online order. Please come after some days to check the status.',
      { duration: 6000 }
    );
  };

  return (
    <div className="min-h-screen bg-accent py-6">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-secondary mb-6">Checkout</h1>

        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="font-semibold text-amber-900">Online ordering is temporarily paused</p>
          <p className="mt-1 text-sm text-amber-800">
            Due to heavy rush on opening, we are currently not accepting any online order.
            Please come after some days to check the status.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Delivery Address */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-bold text-secondary">Delivery Address</h2>
                  <p className="text-sm text-gray-500">Where should we deliver?</p>
                </div>
              </div>

              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter your full delivery address including landmark..."
                rows={3}
                className="w-full p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
              />

              {/* TODO: Add Google Maps location picker here */}
              <p className="text-xs text-gray-400 mt-2">
                Enter complete address with building/flat number and landmark
              </p>
            </div>

            {/* Special Instructions */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h2 className="font-bold text-secondary mb-4">Special Instructions</h2>
              <textarea
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                placeholder="Any special requests? (e.g., extra spicy, less oil, etc.)"
                rows={2}
                className="w-full p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
              />
            </div>

            {/* Order Items Preview */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h2 className="font-bold text-secondary mb-4">Order Items</h2>
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
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
                      <span className="text-secondary">
                        {item.name} × {item.quantity}
                      </span>
                    </div>
                    <span className="font-medium text-secondary">
                      ₹{(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Payment Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl p-6 shadow-sm sticky top-24">
              <h2 className="text-lg font-bold text-secondary mb-4">Payment Summary</h2>
              
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
                  <span className="font-bold text-secondary">Total</span>
                  <span className="font-bold text-secondary text-lg">
                    ₹{summary.total.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Payment Method Selection */}
              <div className="mt-6 space-y-3">
                <h3 className="font-semibold text-secondary text-sm">Payment Method</h3>
                
                <label 
                  className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                    paymentMethod === 'cod' 
                      ? 'border-primary bg-primary/5' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cod"
                    checked={paymentMethod === 'cod'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    paymentMethod === 'cod' ? 'border-primary' : 'border-gray-300'
                  }`}>
                    {paymentMethod === 'cod' && (
                      <div className="w-3 h-3 rounded-full bg-primary" />
                    )}
                  </div>
                  <Banknote className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium text-secondary">Cash on Delivery</p>
                    <p className="text-xs text-gray-500">Pay when your order arrives</p>
                  </div>
                </label>

                <label 
                  className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                    paymentMethod === 'online' 
                      ? 'border-primary bg-primary/5' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="online"
                    checked={paymentMethod === 'online'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    paymentMethod === 'online' ? 'border-primary' : 'border-gray-300'
                  }`}>
                    {paymentMethod === 'online' && (
                      <div className="w-3 h-3 rounded-full bg-primary" />
                    )}
                  </div>
                  <CreditCard className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-secondary">Online Payment</p>
                    <p className="text-xs text-gray-500">Card, UPI, Netbanking</p>
                  </div>
                </label>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={!address.trim()}
                className="w-full mt-6 bg-primary text-white py-4 rounded-xl font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed btn-press flex items-center justify-center gap-2"
              >
                {paymentMethod === 'cod' ? (
                  <>
                    <Banknote className="w-5 h-5" />
                    Place Order (COD)
                  </>
                ) : (
                  <>
                    <CreditCard className="w-5 h-5" />
                    Pay ₹{summary.total.toFixed(2)}
                  </>
                )}
              </button>

              {paymentMethod === 'online' && (
                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500">
                  <img
                    src="https://razorpay.com/favicon.png"
                    alt="Razorpay"
                    className="w-4 h-4"
                  />
                  <span>Secured by Razorpay</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
