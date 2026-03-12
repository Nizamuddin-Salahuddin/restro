import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, Menu, X, LogOut, Package, ChefHat } from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuthStore();
  const { summary } = useCartStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="bg-secondary text-white sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <ChefHat className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold">
              Saffyra <span className="text-primary">Kitchen</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <Link to="/menu" className="hover:text-primary transition-colors">
              Menu
            </Link>
            {isAuthenticated && (
              <Link to="/orders" className="hover:text-primary transition-colors">
                My Orders
              </Link>
            )}
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-4">
            {/* Cart */}
            <Link
              to="/cart"
              className="relative p-2 hover:bg-secondary-light rounded-full transition-colors"
            >
              <ShoppingCart className="w-6 h-6" />
              {summary.itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-semibold">
                  {summary.itemCount}
                </span>
              )}
            </Link>

            {/* User Menu */}
            {isAuthenticated ? (
              <div className="hidden md:flex items-center space-x-2">
                <Link
                  to="/profile"
                  className="flex items-center space-x-2 p-2 hover:bg-secondary-light rounded-lg transition-colors"
                >
                  <User className="w-5 h-5" />
                  <span className="text-sm">{user?.name?.split(' ')[0]}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="p-2 hover:bg-secondary-light rounded-full transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="hidden md:flex items-center space-x-2 bg-primary px-4 py-2 rounded-full hover:bg-primary-dark transition-colors font-medium"
              >
                <User className="w-4 h-4" />
                <span>Login</span>
              </Link>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 hover:bg-secondary-light rounded-lg transition-colors"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-secondary-light animate-fade-in">
            <div className="flex flex-col space-y-2">
              <Link
                to="/menu"
                onClick={() => setIsMobileMenuOpen(false)}
                className="px-4 py-3 hover:bg-secondary-light rounded-lg transition-colors"
              >
                Menu
              </Link>
              {isAuthenticated ? (
                <>
                  <Link
                    to="/orders"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="px-4 py-3 hover:bg-secondary-light rounded-lg transition-colors flex items-center space-x-2"
                  >
                    <Package className="w-5 h-5" />
                    <span>My Orders</span>
                  </Link>
                  <Link
                    to="/profile"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="px-4 py-3 hover:bg-secondary-light rounded-lg transition-colors flex items-center space-x-2"
                  >
                    <User className="w-5 h-5" />
                    <span>Profile</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-3 hover:bg-secondary-light rounded-lg transition-colors flex items-center space-x-2 text-left w-full"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>Logout</span>
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="mx-4 py-3 bg-primary text-center rounded-lg hover:bg-primary-dark transition-colors font-medium"
                >
                  Login / Register
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
