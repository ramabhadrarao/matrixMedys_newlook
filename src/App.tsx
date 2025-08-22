// src/App.tsx - Updated with Doctors and Portfolios routes
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

// Hospital Components
import HospitalsList from './components/Hospitals/HospitalsList';
import HospitalForm from './components/Hospitals/HospitalForm';
import HospitalDetails from './components/Hospitals/HospitalDetails';

// Doctor Components
import DoctorsList from './components/Doctors/DoctorsList';
import DoctorForm from './components/Doctors/DoctorForm';
import DoctorDetails from './components/Doctors/DoctorDetails';

// Portfolio Components
import PortfoliosList from './components/Portfolios/PortfoliosList';
import PortfolioForm from './components/Portfolios/PortfolioForm';

// Principal Components
import PrincipalsList from './components/Principals/PrincipalsList';
import PrincipalForm from './components/Principals/PrincipalForm';
import PrincipalDetails from './components/Principals/PrincipalDetails';
// Category Components
import CategoriesList from './components/Categories/CategoriesList';
import CategoryForm from './components/Categories/CategoryForm';

// Product Components  
import ProductsList from './components/Products/ProductsList';
import ProductForm from './components/Products/ProductForm';
import CategoryDetails from './components/Categories/CategoryDetails';
import ProductDetails from './components/Products/ProductDetails';

// Purchase Order Components
import { PurchaseOrdersList, PurchaseOrderForm, PurchaseOrderDetails } from './components/PurchaseOrders';

// Import Invoice Receiving components
import { InvoiceReceivingList, InvoiceReceivingForm, InvoiceReceivingDetails } from './components/InvoiceReceiving';

// Import Workflow components
import { WorkflowStagesList, WorkflowStageForm, UserAssignmentModal } from './components/Workflow';

// Branch Components
import BranchesList from './components/Branches/BranchesList';
import BranchForm from './components/Branches/BranchForm';
import BranchDetails from './components/Branches/BranchDetails';

// Warehouse Components
import WarehousesList from './components/Warehouses/WarehousesList';
import WarehouseForm from './components/Warehouses/WarehouseForm';
import WarehouseDetails from './components/Warehouses/WarehouseDetails';

import Settings from './components/Settings/Settings';
import ChangePassword from './components/Settings/ChangePassword';
import ProfileInformation from './components/Settings/ProfileInformation';

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
            
            {/* Hospital Routes */}
            <Route path="hospitals" element={<HospitalsList />} />
            <Route path="hospitals/new" element={<HospitalForm />} />
            <Route path="hospitals/:id" element={<HospitalDetails />} />
            <Route path="hospitals/:id/edit" element={<HospitalForm />} />
            
            {/* Doctor Routes */}
            <Route path="doctors" element={<DoctorsList />} />
            <Route path="doctors/new" element={<DoctorForm />} />
            <Route path="doctors/:id" element={<DoctorDetails />} />
            <Route path="doctors/:id/edit" element={<DoctorForm />} />
            
            {/* Portfolio Routes */}
            <Route path="portfolios" element={<PortfoliosList />} />
            <Route path="portfolios/new" element={<PortfolioForm />} />
            <Route path="portfolios/:id/edit" element={<PortfolioForm />} />
            
            {/* Branch Routes */}
            <Route path="branches" element={<BranchesList />} />
            <Route path="branches/new" element={<BranchForm />} />
            <Route path="branches/:id" element={<BranchDetails />} />
            <Route path="branches/:id/edit" element={<BranchForm />} />
            
            {/* Warehouse Routes */}
            <Route path="warehouses" element={<WarehousesList />} />
            <Route path="warehouses/new" element={<WarehouseForm />} />
            <Route path="warehouses/:id" element={<WarehouseDetails />} />
            <Route path="warehouses/:id/edit" element={<WarehouseForm />} />
            
            {/* Principal Routes */}
            <Route path="principals" element={<PrincipalsList />} />
            <Route path="principals/new" element={<PrincipalForm />} />
            <Route path="principals/:id" element={<PrincipalDetails />} />
            <Route path="principals/:id/edit" element={<PrincipalForm />} />
          {/* Category Routes */}
          <Route path="categories" element={<CategoriesList />} />
          <Route path="categories/new" element={<CategoryForm />} />
          <Route path="categories/:id" element={<CategoryDetails />} /> {/* Add this */}
          <Route path="categories/:id/edit" element={<CategoryForm />} />

          {/* Product Routes */}
          <Route path="products" element={<ProductsList />} />
          <Route path="products/new" element={<ProductForm />} />
          <Route path="products/:id" element={<ProductDetails />} /> {/* Update this */}
          <Route path="products/:id/edit" element={<ProductForm />} />
          
          {/* Purchase Order Routes */}
          <Route path="purchase-orders" element={<PurchaseOrdersList />} />
          <Route path="purchase-orders/new" element={<PurchaseOrderForm />} />
          <Route path="purchase-orders/:id" element={<PurchaseOrderDetails />} />
          <Route path="purchase-orders/:id/edit" element={<PurchaseOrderForm />} />
          
          {/* Invoice Receiving Routes */}
          <Route path="invoice-receiving" element={<InvoiceReceivingList />} />
          <Route path="invoice-receiving/new" element={<InvoiceReceivingForm />} />
          <Route path="invoice-receiving/:id" element={<InvoiceReceivingDetails />} />
          <Route path="invoice-receiving/:id/edit" element={<InvoiceReceivingForm />} />
          
          {/* Workflow Routes */}
          <Route path="workflow/stages" element={<WorkflowStagesList />} />
          <Route path="workflow/stages/new" element={<WorkflowStageForm />} />
          <Route path="workflow/stages/:id/edit" element={<WorkflowStageForm />} />
          <Route path="workflow/stages/:id/permissions" element={<UserAssignmentModal isOpen={true} onClose={() => {}} stageId="" stageName="" />} />
          
            {/* States Routes - Moved to Settings/Masters */}
            <Route path="states" element={<StatesList />} />
            <Route path="states/new" element={<StateForm />} />
            <Route path="states/:id" element={<StatesList />} />
            <Route path="states/:id/edit" element={<StateForm />} />
            
            {/* Users Routes */}
            <Route path="users" element={<UsersList />} />
            <Route path="users/new" element={<UserForm />} />
            <Route path="users/:id/edit" element={<UserForm />} />
            <Route path="users/:id/permissions" element={<PermissionsManagement />} />

            {/* Settings Routes */}
            <Route path="settings" element={<Settings />} />
            <Route path="settings/change-password" element={<ChangePassword />} />
            <Route path="settings/profile" element={<ProfileInformation />} />
            <Route path="settings/notifications" element={<div className="p-6 text-center text-gray-500">Notification settings coming soon...</div>} />
            <Route path="settings/permissions" element={<div className="p-6 text-center text-gray-500">Permission management coming soon...</div>} />
            <Route path="settings/appearance" element={<div className="p-6 text-center text-gray-500">Appearance settings coming soon...</div>} />
            <Route path="settings/language" element={<div className="p-6 text-center text-gray-500">Language settings coming soon...</div>} />
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