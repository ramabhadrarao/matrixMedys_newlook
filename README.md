# Matryx Medizys - Full-Stack Authentication Application

A modern, secure full-stack web application built with Node.js, Express, MongoDB, React, TypeScript, and Tailwind CSS. Features comprehensive authentication, permission-based access control, and a beautiful responsive UI.

## 🚀 Features

### Authentication & Security
- **JWT Authentication** with access and refresh tokens
- **Password Reset** via email with secure tokens
- **Permission-based Access Control** with dynamic user permissions
- **Rate Limiting** and security middleware
- **Password Hashing** with bcrypt
- **Input Validation** and sanitization

### Frontend Features
- **Modern React UI** with TypeScript
- **Responsive Design** with Tailwind CSS
- **Smooth Animations** with Framer Motion
- **State Management** with Zustand
- **Form Validation** with React Hook Form
- **Toast Notifications** for user feedback
- **Dynamic Navigation** based on user permissions

### Backend Features
- **RESTful API** with Express.js
- **MongoDB** database with Mongoose ODM
- **Email Integration** with Nodemailer
- **Comprehensive Error Handling**
- **API Documentation** ready endpoints
- **Scalable Architecture**

## 🛠️ Tech Stack

### Backend
- Node.js
- Express.js
- MongoDB with Mongoose
- JWT (jsonwebtoken)
- bcryptjs
- Nodemailer
- Express Validator
- Helmet (Security)
- CORS
- Rate Limiting

### Frontend
- React 18
- TypeScript
- Vite
- Tailwind CSS
- Zustand (State Management)
- React Router DOM
- React Hook Form
- Framer Motion
- Lucide React (Icons)
- Axios
- React Hot Toast

## 📦 Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

### 1. Clone the Repository
```bash
git clone <repository-url>
cd techcorp-auth-app
```

### 2. Backend Setup
```bash
# Install backend dependencies
cd server
npm install

# Copy environment file and configure
cp .env.example .env
# Edit .env with your configuration

# Seed permissions (run after first user registration)
npm run seed
```

### 3. Frontend Setup
```bash
# Install frontend dependencies (from root directory)
npm install

# Copy environment file
cp .env.example .env
# Edit .env if needed
```

### 4. Database Setup
Make sure MongoDB is running locally or configure your cloud MongoDB URI in the server/.env file.

### 5. Start the Application
```bash
# Start both frontend and backend concurrently
npm run dev

# Or start them separately:
# Backend (from server directory)
npm run dev

# Frontend (from root directory)
npm run client
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

## 🔧 Configuration

### Environment Variables

#### Backend (.env in server directory)
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `JWT_REFRESH_SECRET`: Secret key for refresh tokens
- `EMAIL_HOST`, `EMAIL_USER`, `EMAIL_PASS`: SMTP configuration
- `CLIENT_URL`: Frontend URL for CORS

#### Frontend (.env in root directory)
- `VITE_API_URL`: Backend API URL

## 📚 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh-token` - Refresh access token
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token
- `GET /api/auth/profile` - Get user profile

### States Management
- `GET /api/states` - Get all states (with pagination and search)
- `GET /api/states/:id` - Get single state
- `POST /api/states` - Create new state
- `PUT /api/states/:id` - Update state
- `DELETE /api/states/:id` - Delete state

## 🔐 Permission System

The application uses a flexible permission system:

### Default Permissions
- `states_view` - View states
- `states_create` - Create new states
- `states_update` - Update existing states
- `states_delete` - Delete states
- `users_view` - View users
- `users_create` - Create new users
- `users_update` - Update existing users
- `users_delete` - Delete users

### Permission Assignment
Permissions are assigned to users through the `UserPermission` model. The first registered user automatically receives all permissions (admin user).

## 🎨 UI/UX Features

- **Responsive Design** - Works perfectly on desktop, tablet, and mobile
- **Dark/Light Theme Ready** - Easy to implement theme switching
- **Smooth Animations** - Framer Motion powered transitions
- **Modern Components** - Clean, professional design
- **Accessibility** - WCAG compliant components
- **Loading States** - Proper loading indicators
- **Error Handling** - User-friendly error messages

## 🚀 Deployment

### Backend Deployment
1. Set up MongoDB Atlas or your preferred MongoDB hosting
2. Configure environment variables for production
3. Deploy to your preferred platform (Heroku, DigitalOcean, AWS, etc.)

### Frontend Deployment
1. Build the frontend: `npm run build`
2. Deploy the `dist` folder to your preferred hosting (Netlify, Vercel, etc.)
3. Update `VITE_API_URL` to point to your production backend

## 🔒 Security Features

- **JWT Token Security** with short-lived access tokens
- **Refresh Token Rotation** for enhanced security
- **Password Hashing** with bcrypt and salt rounds
- **Rate Limiting** to prevent brute force attacks
- **Input Validation** and sanitization
- **CORS Configuration** for cross-origin requests
- **Helmet** for security headers
- **Environment Variable Protection**

## 📱 Mobile Responsive

The application is fully responsive and provides an excellent user experience across all devices:
- **Mobile-first Design**
- **Touch-friendly Interface**
- **Optimized Navigation**
- **Responsive Tables** with mobile card layouts

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support, email support@techcorp.com or create an issue in the repository.

---

Built with ❤️ by Matryx Medizys