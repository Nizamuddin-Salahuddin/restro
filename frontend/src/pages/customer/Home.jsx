import { Link } from 'react-router-dom';
import { ArrowRight, Star, Clock, Truck, ChefHat, Flame } from 'lucide-react';
import { useState, useEffect } from 'react';
import { menuAPI } from '../../lib/api';
import MenuCard from '../../components/MenuCard';
import LoadingSpinner from '../../components/LoadingSpinner';

const Home = () => {
  const [bestsellers, setBestsellers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBestsellers = async () => {
      try {
        const response = await menuAPI.getBestsellers();
        setBestsellers(response.data.data);
      } catch (error) {
        console.error('Failed to fetch bestsellers:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBestsellers();
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-secondary via-secondary to-secondary-light text-white py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="animate-slide-up">
              <div className="inline-flex items-center gap-2 bg-primary/20 px-4 py-2 rounded-full mb-6">
                <Flame className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium">Now Delivering in Your Area!</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
                Authentic <span className="text-primary">Biryani</span> & Bold{' '}
                <span className="text-primary">Chinese</span> Flavors
              </h1>
              <p className="text-lg text-gray-300 mb-8 max-w-lg">
                Experience the perfect blend of traditional Dum Biryani and wok-tossed Chinese 
                delicacies, delivered hot and fresh to your doorstep.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/menu"
                  className="inline-flex items-center justify-center gap-2 bg-primary text-white px-8 py-4 rounded-full font-semibold hover:bg-primary-dark transition-colors btn-press"
                >
                  Order Now
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  to="/menu"
                  className="inline-flex items-center justify-center gap-2 border-2 border-white/30 text-white px-8 py-4 rounded-full font-semibold hover:bg-white/10 transition-colors"
                >
                  Explore Menu
                </Link>
              </div>
            </div>
            
            {/* Hero Image */}
            <div className="relative hidden md:block">
              <div className="w-80 h-80 lg:w-96 lg:h-96 mx-auto rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center animate-pulse-slow">
                <span className="text-9xl">🍛</span>
              </div>
              {/* Floating elements */}
              <div className="absolute top-10 right-10 bg-white text-secondary px-4 py-2 rounded-lg shadow-lg animate-bounce">
                <span className="text-2xl">🥢</span>
              </div>
              <div className="absolute bottom-10 left-10 bg-white text-secondary px-4 py-2 rounded-lg shadow-lg animate-bounce delay-100">
                <span className="text-2xl">🌶️</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex flex-col items-center text-center p-4">
              <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                <ChefHat className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-semibold text-secondary">Expert Chefs</h3>
              <p className="text-sm text-gray-500">Authentic recipes</p>
            </div>
            <div className="flex flex-col items-center text-center p-4">
              <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                <Clock className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-semibold text-secondary">Fast Delivery</h3>
              <p className="text-sm text-gray-500">30-45 minutes</p>
            </div>
            <div className="flex flex-col items-center text-center p-4">
              <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                <Star className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-semibold text-secondary">Top Rated</h3>
              <p className="text-sm text-gray-500">4.8★ on Google</p>
            </div>
            <div className="flex flex-col items-center text-center p-4">
              <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                <Truck className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-semibold text-secondary">Live Tracking</h3>
              <p className="text-sm text-gray-500">Real-time updates</p>
            </div>
          </div>
        </div>
      </section>

      {/* Bestsellers */}
      <section className="py-16 bg-accent">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-secondary">Bestsellers</h2>
              <p className="text-gray-500 mt-1">Most loved dishes by our customers</p>
            </div>
            <Link
              to="/menu"
              className="hidden sm:flex items-center gap-2 text-primary font-semibold hover:underline"
            >
              View All
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {bestsellers.slice(0, 4).map((item) => (
                <MenuCard key={item.id} item={item} />
              ))}
            </div>
          )}

          <div className="sm:hidden mt-6 text-center">
            <Link
              to="/menu"
              className="inline-flex items-center gap-2 text-primary font-semibold hover:underline"
            >
              View All Menu
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Categories Preview */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-secondary">Our Menu</h2>
            <p className="text-gray-500 mt-2">Choose from our wide variety of dishes</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: 'Biryani', emoji: '🍛', color: 'from-orange-500 to-red-500' },
              { name: 'Fried Rice', emoji: '🍚', color: 'from-yellow-500 to-orange-500' },
              { name: 'Noodles', emoji: '🍜', color: 'from-red-500 to-pink-500' },
              { name: 'Starters', emoji: '🍗', color: 'from-amber-500 to-orange-500' },
            ].map((cat) => (
              <Link
                key={cat.name}
                to={`/menu?category=${cat.name.toLowerCase().replace(' ', '-')}`}
                className="relative overflow-hidden rounded-2xl aspect-square card-hover"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${cat.color} opacity-90`} />
                <div className="relative h-full flex flex-col items-center justify-center text-white p-4">
                  <span className="text-5xl md:text-6xl mb-2">{cat.emoji}</span>
                  <h3 className="font-semibold text-lg">{cat.name}</h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Hungry? Order Now!
          </h2>
          <p className="text-white/80 mb-8 max-w-md mx-auto">
            Get your favorite Biryani or Chinese dish delivered in 30-45 minutes.
          </p>
          <Link
            to="/menu"
            className="inline-flex items-center gap-2 bg-white text-primary px-8 py-4 rounded-full font-semibold hover:bg-gray-100 transition-colors btn-press"
          >
            Order Now
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;
