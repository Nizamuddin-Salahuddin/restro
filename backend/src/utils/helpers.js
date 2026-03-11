export const generateOrderNumber = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `DW${timestamp}${random}`;
};

export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const calculateDeliveryTime = (prepTime) => {
  const deliveryBuffer = 15; // 15 minutes for delivery
  const totalMinutes = prepTime + deliveryBuffer;
  const deliveryTime = new Date();
  deliveryTime.setMinutes(deliveryTime.getMinutes() + totalMinutes);
  return deliveryTime;
};

export const formatPrice = (price) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(price);
};
