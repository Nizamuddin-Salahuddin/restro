import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, CreditCard, ChevronRight, Loader2, Banknote } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';
import { orderAPI, paymentAPI } from '../../lib/api';
import toast from 'react-hot-toast';

const Checkout = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { items, summary, clearCart } = useCartStore();
  
  const [address, setAddress] = useState(user?.address || '');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
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

    setIsProcessing(true);

    try {
      // Create order with payment method
      const orderResponse = await orderAPI.createOrder({
        deliveryAddress: address,
        specialInstructions: specialInstructions || undefined,
        paymentMethod,
      });

      const { orderNumber, totalAmount, paymentMethod: pm } = orderResponse.data.data;

      // If COD, skip payment gateway
      if (pm === 'cod') {
        clearCart();
        toast.success('Order placed successfully! Pay on delivery.');
        navigate(`/orders/${orderNumber}`);
        return;
      }

      // Create Razorpay order for online payment
      const paymentResponse = await paymentAPI.createOrder(orderNumber);
      const { razorpayOrderId, keyId } = paymentResponse.data.data;

      // Open Razorpay checkout
      const options = {
        key: keyId,
        amount: Math.round(totalAmount * 100),
        currency: 'INR',
        name: 'Dum & Wok',
        description: `Order #${orderNumber}`,
        order_id: razorpayOrderId,
        handler: async function (response) {
          try {
            // Verify payment
            await paymentAPI.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              orderNumber,
            });

            // Clear cart and redirect
            clearCart();
            toast.success('Order placed successfully!');
            navigate(`/orders/${orderNumber}`);
          } catch (error) {
            console.error('Payment verification error:', error);
            toast.error('Payment verification failed. Please contact support.');
            setIsProcessing(false);
          }
        },
        prefill: {
          name: user?.name,
          email: user?.email,
          contact: user?.phone || '',
        },
        theme: {
          color: '#FF6B35',
        },
        modal: {
          ondismiss: function () {
            setIsProcessing(false);
            toast.error('Payment cancelled');
          },
        },
      };

      // Check if Razorpay script is loaded
      if (!window.Razorpay) {
        toast.error('Payment gateway not loaded. Please refresh and try again.');
        setIsProcessing(false);
        return;
      }

      const razorpay = new window.Razorpay(options);
      razorpay.on('payment.failed', function (response) {
        console.error('Payment failed:', response.error);
        toast.error(response.error.description || 'Payment failed. Please try again.');
        setIsProcessing(false);
      });
      razorpay.open();
    } catch (error) {
      console.error('Order creation error:', error);
      toast.error(error.response?.data?.message || 'Failed to create order');
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-accent py-6">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-secondary mb-6">Checkout</h1>

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
                disabled={isProcessing || !address.trim()}
                className="w-full mt-6 bg-primary text-white py-4 rounded-xl font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed btn-press flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : paymentMethod === 'cod' ? (
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
