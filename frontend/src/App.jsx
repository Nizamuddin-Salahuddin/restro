import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Layouts
import CustomerLayout from './layouts/CustomerLayout';
import AdminLayout from './layouts/AdminLayout';
import DeliveryLayout from './layouts/DeliveryLayout';
import WaiterLayout from './layouts/WaiterLayout';
import KitchenLayout from './layouts/KitchenLayout';

// Customer Pages
import Home from './pages/customer/Home';
import Menu from './pages/customer/Menu';
import Cart from './pages/customer/Cart';
import Checkout from './pages/customer/Checkout';
import OrderTracking from './pages/customer/OrderTracking';
import MyOrders from './pages/customer/MyOrders';
import Profile from './pages/customer/Profile';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminMenu from './pages/admin/MenuManagement';
import AdminOrders from './pages/admin/OrderManagement';
import AdminDelivery from './pages/admin/DeliveryManagement';

// Delivery Pages
import DeliveryDashboard from './pages/delivery/Dashboard';
import DeliveryOrders from './pages/delivery/Orders';
import DeliveryHistory from './pages/delivery/History';

// Waiter Pages
import WaiterTables from './pages/waiter/Tables';
import WaiterNewOrder from './pages/waiter/NewOrder';
import WaiterOrderDetails from './pages/waiter/OrderDetails';
import WaiterHistory from './pages/waiter/History';

// Kitchen Pages
import KitchenDashboard from './pages/kitchen/Dashboard';

// Guards
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Router>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1A1A2E',
            color: '#fff',
            borderRadius: '8px',
          },
          success: {
            iconTheme: {
              primary: '#10B981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#EF4444',
              secondary: '#fff',
            },
          },
        }}
      />
      
      <Routes>
        {/* Auth Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Customer Routes */}
        <Route path="/" element={<CustomerLayout />}>
          <Route index element={<Home />} />
          <Route path="menu" element={<Menu />} />
          <Route path="cart" element={<Cart />} />
          <Route path="checkout" element={
            <ProtectedRoute>
              <Checkout />
            </ProtectedRoute>
          } />
          <Route path="orders" element={
            <ProtectedRoute>
              <MyOrders />
            </ProtectedRoute>
          } />
          <Route path="orders/:orderNumber" element={
            <ProtectedRoute>
              <OrderTracking />
            </ProtectedRoute>
          } />
          <Route path="profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminLayout />
          </ProtectedRoute>
        }>
          <Route index element={<AdminDashboard />} />
          <Route path="menu" element={<AdminMenu />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="delivery" element={<AdminDelivery />} />
        </Route>

        {/* Delivery Routes */}
        <Route path="/delivery" element={
          <ProtectedRoute allowedRoles={['delivery']}>
            <DeliveryLayout />
          </ProtectedRoute>
        }>
          <Route index element={<DeliveryDashboard />} />
          <Route path="orders" element={<DeliveryOrders />} />
          <Route path="history" element={<DeliveryHistory />} />
        </Route>

        {/* Waiter Routes */}
        <Route path="/waiter" element={
          <ProtectedRoute allowedRoles={['waiter']}>
            <WaiterLayout />
          </ProtectedRoute>
        }>
          <Route index element={<WaiterTables />} />
          <Route path="new-order/:tableId" element={<WaiterNewOrder />} />
          <Route path="order/:orderId" element={<WaiterOrderDetails />} />
          <Route path="history" element={<WaiterHistory />} />
        </Route>

        {/* Kitchen/Cook Routes */}
        <Route path="/kitchen" element={
          <ProtectedRoute allowedRoles={['cook']}>
            <KitchenLayout />
          </ProtectedRoute>
        }>
          <Route index element={<KitchenDashboard />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
