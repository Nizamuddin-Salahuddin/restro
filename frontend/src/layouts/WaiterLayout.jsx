import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutGrid, 
  History, 
  LogOut,
  Menu,
  X,
  UtensilsCrossed
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { getSocket, joinRoleRoom } from '../lib/socket';

const WaiterLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  useEffect(() => {
    if (user?.id) {
      const socket = getSocket();
      joinRoleRoom('waiter');

      socket.on('dine_in_order_ready', (data) => {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Order Ready!', {
            body: `Order is ready to be served.`,
            icon: '/vite.svg',
          });
        }
      });

      return () => {
        socket.off('dine_in_order_ready');
      };
    }
  }, [user?.id]);

  const menuItems = [
    { path: '/waiter', icon: LayoutGrid, label: 'Tables', exact: true },
    { path: '/waiter/history', icon: History, label: 'My Orders' },
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
    <div className="min-h-screen bg-accent">
      {/* Mobile Header */}
      <div className="lg:hidden bg-secondary text-white p-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center space-x-2">
          <UtensilsCrossed className="w-8 h-8 text-primary" />
          <span className="font-bold text-lg">Waiter App</span>
        </div>
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 hover:bg-secondary-light rounded-lg"
        >
          {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-secondary text-white transform transition-transform duration-300 ease-in-out ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
        >
          {/* Logo */}
          <div className="hidden lg:flex items-center space-x-2 p-6 border-b border-secondary-light">
            <UtensilsCrossed className="w-10 h-10 text-primary" />
            <div>
              <h1 className="font-bold text-xl">Dum & Wok</h1>
              <p className="text-xs text-gray-400">Waiter Panel</p>
            </div>
          </div>

          {/* User Info */}
          <div className="p-4 border-b border-secondary-light">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                <span className="text-white font-semibold">
                  {user?.name?.charAt(0) || 'W'}
                </span>
              </div>
              <div>
                <p className="font-medium">{user?.name || 'Waiter'}</p>
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
                        ? 'bg-primary text-white'
                        : 'text-gray-300 hover:bg-secondary-light hover:text-white'
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
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-secondary-light">
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

export default WaiterLayout;
