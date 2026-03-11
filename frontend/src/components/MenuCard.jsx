import { Plus, Minus, Flame } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';

const MenuCard = ({ item }) => {
  const { isAuthenticated } = useAuthStore();
  const { addItem, addItemLocal, items, updateQuantity, updateQuantityLocal } = useCartStore();

  const cartItem = items.find((i) => i.item_id === item.id);
  const quantity = cartItem?.quantity || 0;

  const handleAddToCart = () => {
    if (isAuthenticated) {
      addItem(item.id);
    } else {
      addItemLocal(item);
    }
  };

  const handleUpdateQuantity = (newQuantity) => {
    if (isAuthenticated) {
      updateQuantity(cartItem.id, newQuantity);
    } else {
      updateQuantityLocal(cartItem.id, newQuantity);
    }
  };

  // Generate spice indicators
  const spiceIndicators = [];
  for (let i = 0; i < 5; i++) {
    spiceIndicators.push(
      <Flame
        key={i}
        className={`w-3 h-3 ${i < item.spice_level ? 'text-red-500' : 'text-gray-300'}`}
      />
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden card-hover">
      {/* Image */}
      <div className="relative h-40 bg-gray-100">
        {item.image ? (
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
            <span className="text-4xl">🍛</span>
          </div>
        )}
        
        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {item.is_bestseller && (
            <span className="bg-primary text-white text-xs px-2 py-1 rounded-full font-medium">
              Bestseller
            </span>
          )}
        </div>

        {/* Veg/Non-veg indicator */}
        <div className="absolute top-2 right-2">
          <div
            className={`w-5 h-5 border-2 rounded flex items-center justify-center bg-white ${
              item.is_veg ? 'border-green-600' : 'border-red-600'
            }`}
          >
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                item.is_veg ? 'bg-green-600' : 'bg-red-600'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-secondary text-lg mb-1 line-clamp-1">
          {item.name}
        </h3>
        
        <p className="text-gray-500 text-sm mb-2 line-clamp-2 h-10">
          {item.description}
        </p>

        {/* Spice level */}
        <div className="flex items-center gap-1 mb-3">
          {spiceIndicators}
        </div>

        {/* Price and Add Button */}
        <div className="flex items-center justify-between">
          <span className="text-xl font-bold text-secondary">
            ₹{item.price}
          </span>

          {quantity === 0 ? (
            <button
              onClick={handleAddToCart}
              disabled={!item.is_available}
              className={`px-4 py-2 rounded-lg font-medium transition-colors btn-press ${
                item.is_available
                  ? 'bg-primary text-white hover:bg-primary-dark'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {item.is_available ? 'Add' : 'Unavailable'}
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-primary rounded-lg">
              <button
                onClick={() => handleUpdateQuantity(quantity - 1)}
                className="p-2 text-white hover:bg-primary-dark rounded-l-lg transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-white font-semibold px-2">{quantity}</span>
              <button
                onClick={() => handleUpdateQuantity(quantity + 1)}
                className="p-2 text-white hover:bg-primary-dark rounded-r-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MenuCard;
