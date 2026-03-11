import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  ChefHat, 
  UtensilsCrossed,
  LogOut,
  Menu,
  X,
  LayoutDashboard
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { getSocket, joinRoleRoom } from '../lib/socket';
import toast from 'react-hot-toast';

const KitchenLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  useEffect(() => {
    if (user?.id) {
      const socket = getSocket();
      joinRoleRoom('kitchen');

      socket.on('new_dine_in_items', (data) => {
        toast.success('New dine-in order received!');
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('New Order!', {
            body: `New items to prepare`,
            icon: '/vite.svg',
          });
        }
      });

      socket.on('new_order', (data) => {
        toast.success('New online order received!');
      });

      return () => {
        socket.off('new_dine_in_items');
        socket.off('new_order');
      };
    }
  }, [user?.id]);

  const menuItems = [
    { path: '/kitchen', icon: LayoutDashboard, label: 'Kitchen Display', exact: true },
  ];

  const isActive = (path, exact) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Mobile Header */}
      <div className="lg:hidden bg-gray-800 text-white p-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center space-x-2">
          <ChefHat className="w-8 h-8 text-orange-500" />
          <span className="font-bold text-lg">Kitchen Display</span>
        </div>
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 hover:bg-gray-700 rounded-lg"
        >
          {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-gray-800 text-white transform transition-transform duration-300 ease-in-out ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
        >
          {/* Logo */}
          <div className="hidden lg:flex items-center space-x-2 p-6 border-b border-gray-700">
            <ChefHat className="w-10 h-10 text-orange-500" />
            <div>
              <h1 className="font-bold text-xl">Dum & Wok</h1>
              <p className="text-xs text-gray-400">Kitchen Display</p>
            </div>
          </div>

          {/* User Info */}
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold">
                  {user?.name?.charAt(0) || 'K'}
                </span>
              </div>
              <div>
                <p className="font-medium">{user?.name || 'Cook'}</p>
                <p className="text-xs text-gray-400">{user?.email}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="p-4">
            <ul className="space-y-2">
              {menuItems.map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={() => setIsSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive(item.path, item.exact)
                        ? 'bg-orange-500 text-white'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Logout */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 w-full text-gray-300 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>
        </aside>

        {/* Overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-6 min-h-screen">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default KitchenLayout;
