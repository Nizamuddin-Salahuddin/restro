import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  CheckCircle, 
  Clock, 
  ChefHat, 
  Package, 
  Bike, 
  MapPin, 
  Phone,
  ArrowLeft,
  Navigation
} from 'lucide-react';
import { orderAPI } from '../../lib/api';
import { getSocket, trackOrder, stopTracking } from '../../lib/socket';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';

const OrderTracking = () => {
  const { orderNumber } = useParams();
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deliveryLocation, setDeliveryLocation] = useState(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  const statusSteps = [
    { key: 'pending', label: 'Order Placed', icon: Clock },
    { key: 'confirmed', label: 'Confirmed', icon: CheckCircle },
    { key: 'preparing', label: 'Preparing', icon: ChefHat },
    { key: 'ready', label: 'Ready', icon: Package },
    { key: 'picked_up', label: 'Picked Up', icon: Bike },
    { key: 'on_the_way', label: 'On the Way', icon: Navigation },
    { key: 'delivered', label: 'Delivered', icon: CheckCircle },
  ];

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await orderAPI.getOrder(orderNumber);
        setOrder(response.data.data);
        
        if (response.data.data.deliveryLocation) {
          setDeliveryLocation(response.data.data.deliveryLocation);
        }
      } catch (error) {
        toast.error('Failed to load order details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();

    // Set up socket for real-time updates
    const socket = getSocket();
    trackOrder(orderNumber);

    socket.on('order_status', (data) => {
      setOrder((prev) => prev ? { ...prev, status: data.status } : null);
      toast.success(`Order status: ${data.status.replace('_', ' ')}`);
    });

    socket.on('delivery_location', (data) => {
      setDeliveryLocation(data);
    });

    return () => {
      stopTracking(orderNumber);
      socket.off('order_status');
      socket.off('delivery_location');
    };
  }, [orderNumber]);

  // Initialize Google Maps (if API key is available)
  useEffect(() => {
    if (!order || !window.google || order.status === 'delivered' || order.status === 'cancelled') {
      return;
    }

    // Only show map for orders that are being delivered
    if (!['picked_up', 'on_the_way'].includes(order.status)) {
      return;
    }

    const initMap = () => {
      const map = new window.google.maps.Map(mapRef.current, {
        center: { 
          lat: order.delivery_latitude || 12.9716, 
          lng: order.delivery_longitude || 77.5946 
        },
        zoom: 14,
        disableDefaultUI: true,
        zoomControl: true,
      });

      // Delivery location marker
      if (order.delivery_latitude && order.delivery_longitude) {
        new window.google.maps.Marker({
          position: { lat: order.delivery_latitude, lng: order.delivery_longitude },
          map,
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#FF6B35" stroke="white" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
            `),
            scaledSize: new window.google.maps.Size(40, 40),
          },
          title: 'Delivery Location',
        });
      }

      // Delivery boy marker (will be updated in real-time)
      if (deliveryLocation) {
        markerRef.current = new window.google.maps.Marker({
          position: { lat: deliveryLocation.latitude, lng: deliveryLocation.longitude },
          map,
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#1A1A2E" stroke="white" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 16v-4"></path>
                <path d="M12 8h.01"></path>
              </svg>
            `),
            scaledSize: new window.google.maps.Size(36, 36),
          },
          title: 'Delivery Partner',
        });
      }
    };

    if (mapRef.current) {
      initMap();
    }
  }, [order, deliveryLocation]);

  // Update delivery marker position
  useEffect(() => {
    if (markerRef.current && deliveryLocation) {
      markerRef.current.setPosition({
        lat: deliveryLocation.latitude,
        lng: deliveryLocation.longitude,
      });
    }
  }, [deliveryLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <h2 className="text-2xl font-bold text-secondary mb-4">Order not found</h2>
        <Link to="/orders" className="text-primary hover:underline">
          View all orders
        </Link>
      </div>
    );
  }

  const currentStepIndex = statusSteps.findIndex((s) => s.key === order.status);
  const isCancelled = order.status === 'cancelled';

  return (
    <div className="min-h-screen bg-accent py-6">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link
            to="/orders"
            className="p-2 hover:bg-white rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-secondary">
              Order #{order.order_number}
            </h1>
            <p className="text-gray-500 text-sm">
              Placed on {new Date(order.created_at).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Timeline */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h2 className="font-bold text-secondary mb-6">Order Status</h2>
              
              {isCancelled ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">❌</span>
                  </div>
                  <h3 className="text-xl font-bold text-red-600 mb-2">Order Cancelled</h3>
                  <p className="text-gray-500">This order has been cancelled</p>
                </div>
              ) : (
                <div className="relative">
                  {/* Progress Line */}
                  <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />
                  <div 
                    className="absolute left-6 top-0 w-0.5 bg-primary transition-all duration-500"
                    style={{ 
                      height: `${(currentStepIndex / (statusSteps.length - 1)) * 100}%` 
                    }}
                  />

                  {/* Steps */}
                  <div className="space-y-6">
                    {statusSteps.map((step, index) => {
                      const isCompleted = index <= currentStepIndex;
                      const isCurrent = index === currentStepIndex;
                      const Icon = step.icon;

                      return (
                        <div key={step.key} className="flex items-center gap-4 relative">
                          <div
                            className={`w-12 h-12 rounded-full flex items-center justify-center z-10 transition-colors ${
                              isCompleted
                                ? 'bg-primary text-white'
                                : 'bg-gray-100 text-gray-400'
                            } ${isCurrent ? 'ring-4 ring-primary/20' : ''}`}
                          >
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <p
                              className={`font-medium ${
                                isCompleted ? 'text-secondary' : 'text-gray-400'
                              }`}
                            >
                              {step.label}
                            </p>
                            {isCurrent && (
                              <p className="text-sm text-primary">In Progress</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Map (for active deliveries) */}
            {['picked_up', 'on_the_way'].includes(order.status) && (
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h2 className="font-bold text-secondary mb-4">Live Tracking</h2>
                <div 
                  ref={mapRef} 
                  className="w-full h-64 rounded-lg bg-gray-100"
                  id="tracking-map"
                >
                  {!window.google && (
                    <div className="w-full h-full flex items-center justify-center text-gray-500">
                      <p className="text-center">
                        Map unavailable<br />
                        <span className="text-sm">Google Maps API key required</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Delivery Partner */}
            {order.delivery_boy_name && (
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h2 className="font-bold text-secondary mb-4">Delivery Partner</h2>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <Bike className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-secondary">{order.delivery_boy_name}</p>
                      <p className="text-sm text-gray-500">Delivery Partner</p>
                    </div>
                  </div>
                  {order.delivery_boy_phone && (
                    <a
                      href={`tel:${order.delivery_boy_phone}`}
                      className="p-3 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors"
                    >
                      <Phone className="w-5 h-5" />
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl p-6 shadow-sm sticky top-24">
              <h2 className="font-bold text-secondary mb-4">Order Summary</h2>
              
              {/* Items */}
              <div className="space-y-3 mb-4">
                {order.items?.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      {item.item_name} × {item.quantity}
                    </span>
                    <span className="font-medium">
                      ₹{(item.item_price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-200 pt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Subtotal</span>
                  <span>₹{(order.total_amount - order.delivery_fee - order.tax_amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Delivery</span>
                  <span>₹{order.delivery_fee}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Tax</span>
                  <span>₹{order.tax_amount}</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-200">
                  <span>Total</span>
                  <span>₹{order.total_amount}</span>
                </div>
              </div>

              {/* Delivery Address */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-secondary">Delivery Address</p>
                    <p className="text-sm text-gray-500">{order.delivery_address}</p>
                  </div>
                </div>
              </div>

              {/* Estimated Time */}
              {order.estimated_delivery_time && !['delivered', 'cancelled'].includes(order.status) && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium text-secondary">Estimated Delivery</p>
                      <p className="text-sm text-gray-500">
                        {new Date(order.estimated_delivery_time).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderTracking;
