import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, 
  Package, 
  History, 
  LogOut,
  Menu,
  X,
  Bike
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { getSocket, joinDeliveryRoom } from '../lib/socket';

const DeliveryLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  useEffect(() => {
    // Join delivery room for notifications
    if (user?.id) {
      const socket = getSocket();
      joinDeliveryRoom(user.id);

      socket.on('new_assignment', (data) => {
        // Show notification for new order assignment
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('New Order Assigned!', {
            body: `Order ${data.orderNumber} has been assigned to you.`,
            icon: '/vite.svg',
          });
        }
      });

      return () => {
        socket.off('new_assignment');
      };
    }
  }, [user?.id]);

  const menuItems = [
    { path: '/delivery', icon: Home, label: 'Dashboard', exact: true },
    { path: '/delivery/orders', icon: Package, label: 'Active Orders' },
    { path: '/delivery/history', icon: History, label: 'Delivery History' },
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
          <Bike className="w-8 h-8 text-primary" />
          <span className="font-bold text-lg">Delivery App</span>
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
            <Bike className="w-10 h-10 text-primary" />
            <div>
              <h1 className="font-bold text-xl">Saffyra Kitchen</h1>
              <p className="text-xs text-gray-400">Delivery Partner</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="p-4 mt-4 lg:mt-0">
            <ul className="space-y-2">
              {menuItems.map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={() => setIsSidebarOpen(false)}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive(item.path, item.exact)
                        ? 'bg-primary text-white'
                        : 'hover:bg-secondary-light text-gray-300'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* User & Logout */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-secondary-light">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{user?.name}</p>
                <p className="text-xs text-gray-400">Delivery Partner</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 hover:bg-secondary-light rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
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
        <main className="flex-1 p-4 lg:p-8 min-h-screen">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DeliveryLayout;
