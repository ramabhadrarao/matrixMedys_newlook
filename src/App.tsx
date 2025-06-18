import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import { authAPI } from './services/api';

// Layout
import Layout from './components/Layout/Layout';

// Auth Components
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import ForgotPassword from './components/Auth/ForgotPassword';

// Protected Components
import Dashboard from './components/Dashboard/Dashboard';
import StatesList from './components/States/StatesList';
import StateForm from './components/States/StateForm';
import UsersList from './components/Users/UsersList';
import UserForm from './components/Users/UserForm';
import PermissionsManagement from './components/Users/PermissionsManagement';

// Protected Route Component
interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// Public Route Component (redirect if authenticated)
const PublicRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

function App() {
  const { isAuthenticated, setUser, setPermissions, setLoading } = useAuthStore();

  useEffect(() => {
    // Check if user is authenticated on app load
    const initializeAuth = async () => {
      if (isAuthenticated) {
        try {
          setLoading(true);
          const response = await authAPI.getProfile();
          const { user, permissions } = response.data;
          setUser(user);
          setPermissions(permissions);
        } catch (error) {
          console.error('Failed to get user profile:', error);
          // Clear auth state if profile fetch fails
          useAuthStore.getState().logout();
        } finally {
          setLoading(false);
        }
      }
    };

    initializeAuth();
  }, [isAuthenticated, setUser, setPermissions, setLoading]);

  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <div className="App">
        <Routes>
          {/* Public Routes */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <PublicRoute>
                <ForgotPassword />
              </PublicRoute>
            }
          />

          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            
            {/* States Routes */}
            <Route path="states" element={<StatesList />} />
            <Route path="states/new" element={<StateForm />} />
            <Route path="states/:id" element={<StatesList />} />
            <Route path="states/:id/edit" element={<StateForm />} />
            
            {/* Users Routes */}
            <Route path="users" element={<UsersList />} />
            <Route path="users/new" element={<UserForm />} />
            <Route path="users/:id/edit" element={<UserForm />} />
            <Route path="users/:id/permissions" element={<PermissionsManagement />} />
          </Route>

          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>

        {/* Toast Notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#10B981',
                secondary: '#fff',
              },
            },
            error: {
              duration: 5000,
              iconTheme: {
                primary: '#EF4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </div>
    </Router>
  );
}

export default App;