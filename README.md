# 🍛 Dum & Wok - Food Ordering Platform

A full-stack food ordering web application for a Biryani + Chinese restaurant. Features include customer ordering, real-time order tracking, delivery management, and admin dashboard.

![Dum & Wok](https://via.placeholder.com/800x400/FF6B35/FFFFFF?text=Dum+%26+Wok)

## 🚀 Features

### Customer Features
- 📱 Browse menu with categories (Biryani, Fried Rice, Noodles, Starters, etc.)
- 🛒 Add items to cart with quantity management
- 💳 Secure payments via Razorpay
- 📍 Real-time order tracking with live updates
- 📋 Order history and reordering
- 👤 User profile management

### Delivery Partner Features
- 📦 View assigned orders
- 🗺️ Navigate to delivery address (Google Maps integration)
- ✅ Update delivery status in real-time
- 📊 Delivery history and stats

### Admin Features
- 📈 Dashboard with key metrics (orders, revenue, pending orders)
- 🍽️ Menu management (add, edit, delete items)
- 📝 Order management with status updates
- 👥 Delivery partner management

## 🛠️ Tech Stack

### Frontend
- **React 18** with Vite
- **Tailwind CSS** for styling
- **React Router DOM** for navigation
- **Zustand** for state management
- **Socket.io Client** for real-time updates
- **Lucide React** for icons

### Backend
- **Node.js** with Express
- **PostgreSQL** database
- **JWT** authentication
- **Socket.io** for real-time communication
- **Razorpay** payment gateway

### Deployment
- **Frontend**: Vercel
- **Backend & Database**: Railway

## 📁 Project Structure

```
Restro/
├── backend/
│   ├── src/
│   │   ├── db/
│   │   │   ├── config.js       # Database connection
│   │   │   ├── migrate.js      # Schema migrations
│   │   │   └── seed.js         # Seed data
│   │   ├── middleware/
│   │   │   ├── auth.middleware.js
│   │   │   └── validate.middleware.js
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── menu.routes.js
│   │   │   ├── cart.routes.js
│   │   │   ├── order.routes.js
│   │   │   ├── payment.routes.js
│   │   │   ├── delivery.routes.js
│   │   │   └── admin.routes.js
│   │   ├── socket/
│   │   │   └── socket.js
│   │   └── utils/
│   │       └── helpers.js
│   ├── server.js
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── layouts/
│   │   ├── lib/
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   ├── customer/
│   │   │   ├── admin/
│   │   │   └── delivery/
│   │   └── store/
│   ├── package.json
│   └── .env.example
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Razorpay account (for payments)

### 1. Clone the Repository
```bash
git clone <repository-url>
cd Restro
```

### 2. Backend Setup
```bash
cd backend
npm install

# Copy environment file
cp .env.example .env

# Update .env with your credentials:
# - DATABASE_URL: Your PostgreSQL connection string
# - JWT_SECRET: A secure random string
# - RAZORPAY_KEY_ID: Your Razorpay key
# - RAZORPAY_KEY_SECRET: Your Razorpay secret

# Run database migrations
npm run migrate

# Seed the database (optional - adds sample data)
npm run seed

# Start development server
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install

# Copy environment file
cp .env.example .env

# Update .env:
# - VITE_API_URL: Backend API URL (http://localhost:5000/api for local)
# - VITE_SOCKET_URL: Socket server URL (http://localhost:5000 for local)
# - VITE_RAZORPAY_KEY_ID: Your Razorpay key ID

# Start development server
npm run dev
```

### 4. Access the Application
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

## 👤 Test Accounts

After seeding the database, you can use these test accounts:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@dumandwok.com | admin123 |
| Delivery | raju@dumandwok.com | delivery123 |
| Customer | customer@test.com | customer123 |

## 🌐 Deployment

### Deploy Backend to Railway

1. Create a new project on [Railway](https://railway.app)
2. Add a PostgreSQL database
3. Connect your GitHub repository
4. Set the root directory to `backend`
5. Add environment variables:
   - `DATABASE_URL` (auto-set by Railway)
   - `JWT_SECRET`
   - `RAZORPAY_KEY_ID`
   - `RAZORPAY_KEY_SECRET`
   - `NODE_ENV=production`
   - `CORS_ORIGIN=https://your-vercel-domain.vercel.app`
6. Deploy!

### Deploy Frontend to Vercel

1. Create a new project on [Vercel](https://vercel.com)
2. Connect your GitHub repository
3. Set the root directory to `frontend`
4. Add environment variables:
   - `VITE_API_URL=https://your-railway-domain.railway.app/api`
   - `VITE_SOCKET_URL=https://your-railway-domain.railway.app`
   - `VITE_RAZORPAY_KEY_ID`
5. Deploy!

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/profile` - Get current user
- `PUT /api/auth/profile` - Update profile
- `PUT /api/auth/change-password` - Change password

### Menu
- `GET /api/menu/categories` - Get all categories
- `GET /api/menu/items` - Get menu items (with filters)
- `GET /api/menu/items/bestsellers` - Get bestseller items

### Cart
- `GET /api/cart` - Get user's cart
- `POST /api/cart/add` - Add item to cart
- `PUT /api/cart/update/:id` - Update quantity
- `DELETE /api/cart/remove/:id` - Remove item
- `DELETE /api/cart/clear` - Clear cart

### Orders
- `POST /api/orders` - Create order
- `GET /api/orders` - Get user's orders
- `GET /api/orders/:orderNumber` - Get order details
- `PUT /api/orders/:orderNumber/cancel` - Cancel order

### Payments
- `POST /api/payments/create-order` - Create Razorpay order
- `POST /api/payments/verify` - Verify payment
- `POST /api/payments/webhook` - Razorpay webhook

### Admin
- `GET /api/admin/dashboard` - Dashboard stats
- `GET/POST /api/admin/menu` - Menu management
- `GET/PUT /api/admin/orders` - Order management
- `GET/POST /api/admin/delivery-boys` - Delivery management

### Delivery
- `GET /api/delivery/orders` - Get assigned orders
- `PUT /api/delivery/orders/:orderNumber/status` - Update status
- `POST /api/delivery/location` - Update location

## 🎨 Design Theme

| Color | Hex | Usage |
|-------|-----|-------|
| Primary (Orange) | `#FF6B35` | Buttons, accents |
| Secondary (Charcoal) | `#1A1A2E` | Text, headers |
| Accent (Cream) | `#FFFBF5` | Backgrounds |

## 📱 Screenshots

Coming soon...

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

---

Made with ❤️ for Dum & Wok

Vercel deployment trigger: 2026-03-12
