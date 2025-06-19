// src/components/Settings/ProfileInformation.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { 
  ArrowLeft, 
  Save, 
  Loader2, 
  User, 
  Mail, 
  Calendar, 
  Clock, 
  Shield, 
  Camera,
  Edit,
  Check,
  X,
  AlertCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { authAPI, usersAPI, handleApiError } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

interface ProfileFormData {
  name: string;
  email: string;
}

const ProfileInformation: React.FC = () => {
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [profileStats, setProfileStats] = useState({
    totalPermissions: 0,
    lastLoginDays: 0,
    accountAge: 0,
    isActive: true
  });

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>();

  useEffect(() => {
    if (user) {
      setValue('name', user.name);
      setValue('email', user.email);
      calculateProfileStats();
    }
  }, [user, setValue]);

  const calculateProfileStats = () => {
    if (!user) return;

    const createdDate = new Date(user.createdAt);
    const now = new Date();
    const accountAgeMs = now.getTime() - createdDate.getTime();
    const accountAgeDays = Math.floor(accountAgeMs / (1000 * 60 * 60 * 24));

    // You can extend this to get actual data from API
    setProfileStats({
      totalPermissions: 0, // This would come from permissions API
      lastLoginDays: 0, // This would come from user's last login
      accountAge: accountAgeDays,
      isActive: user.isActive
    });
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (user) {
      setValue('name', user.name);
      setValue('email', user.email);
    }
    setIsEditing(false);
    reset();
  };

  const onSubmit = async (data: ProfileFormData) => {
    if (!user || !isDirty) {
      setIsEditing(false);
      return;
    }

    setLoading(true);
    try {
      // Update user profile
      const response = await usersAPI.updateUser(user._id, {
        name: data.name,
        email: data.email,
        isActive: user.isActive
      });

      // Update the auth store with new user data
      setUser(response.data.user);
      
      toast.success('Profile updated successfully');
      setIsEditing(false);
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/settings')}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profile Information</h1>
          <p className="text-gray-600 mt-1">Manage your personal information and account details</p>
        </div>
      </div>

      {/* Profile Header Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold">
                  {getInitials(user.name)}
                </span>
              </div>
              <button className="absolute bottom-0 right-0 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center hover:bg-blue-400 transition-colors">
                <Camera className="w-3 h-3 text-white" />
              </button>
            </div>
            <div>
              <h2 className="text-2xl font-semibold">{user.name}</h2>
              <p className="text-blue-100">{user.email}</p>
              <div className="flex items-center space-x-4 mt-2">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  user.isActive 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  <Shield className="w-3 h-3 mr-1" />
                  {user.isActive ? 'Active Account' : 'Inactive Account'}
                </span>
              </div>
            </div>
          </div>
          
          {!isEditing && (
            <button
              onClick={handleEdit}
              className="inline-flex items-center px-4 py-2 bg-white bg-opacity-20 text-white rounded-lg hover:bg-opacity-30 transition-colors duration-200"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Profile
            </button>
          )}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 bg-white rounded-lg shadow-sm p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
            {isEditing && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleCancel}
                  className="inline-flex items-center px-3 py-1 text-sm text-gray-600 hover:text-gray-900"
                >
                  <X className="w-4 h-4 mr-1" />
                  Cancel
                </button>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Name Field */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Full Name *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  {...register('name', {
                    required: 'Name is required',
                    minLength: {
                      value: 2,
                      message: 'Name must be at least 2 characters',
                    },
                  })}
                  type="text"
                  disabled={!isEditing}
                  className={`w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                    !isEditing ? 'bg-gray-50 cursor-not-allowed' : ''
                  }`}
                  placeholder="Enter your full name"
                />
              </div>
              {errors.name && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: 'Please enter a valid email address',
                    },
                  })}
                  type="email"
                  disabled={!isEditing}
                  className={`w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                    !isEditing ? 'bg-gray-50 cursor-not-allowed' : ''
                  }`}
                  placeholder="Enter your email address"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Account Information (Read-only) */}
            <div className="space-y-4 pt-4 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-700">Account Information</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Account Created
                  </label>
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-900">{formatDate(user.createdAt)}</span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Last Updated
                  </label>
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-900">{formatDate(user.updatedAt)}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  User ID
                </label>
                <div className="text-sm text-gray-900 font-mono bg-gray-50 px-3 py-2 rounded border">
                  {user._id}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            {isEditing && (
              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !isDirty}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-colors duration-200"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            )}
          </form>
        </motion.div>

        {/* Profile Stats Sidebar */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          {/* Account Stats */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Statistics</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Account Age</p>
                    <p className="text-xs text-gray-500">Days since creation</p>
                  </div>
                </div>
                <span className="text-lg font-bold text-blue-600">{profileStats.accountAge}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <Shield className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Status</p>
                    <p className="text-xs text-gray-500">Account status</p>
                  </div>
                </div>
                <span className={`text-sm font-medium ${
                  profileStats.isActive ? 'text-green-600' : 'text-red-600'
                }`}>
                  {profileStats.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/settings/change-password')}
                className="w-full flex items-center justify-between p-3 text-left text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-gray-600" />
                  <span>Change Password</span>
                </div>
                <ArrowLeft className="w-4 h-4 text-gray-400 transform rotate-180" />
              </button>
              
              <button
                onClick={() => navigate('/settings/notifications')}
                className="w-full flex items-center justify-between p-3 text-left text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4 text-gray-600" />
                  <span>Notification Settings</span>
                </div>
                <ArrowLeft className="w-4 h-4 text-gray-400 transform rotate-180" />
              </button>
            </div>
          </div>

          {/* Security Notice */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-yellow-800 mb-1">Security Tip</h4>
                <p className="text-sm text-yellow-700">
                  Keep your profile information up to date. Changes to your email address may require verification.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ProfileInformation;