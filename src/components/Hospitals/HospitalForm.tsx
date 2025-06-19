// src/components/Hospitals/HospitalForm.tsx - Updated with proper file handling
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Save, Loader2, Upload, X, Download, Eye, FileText, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { hospitalAPI, HospitalFormData } from '../../services/hospitalAPI';
import { statesAPI, handleApiError } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

interface State {
  _id: string;
  name: string;
  code: string;
}

const HospitalForm: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEdit);
  const [states, setStates] = useState<State[]>([]);
  const [statesLoading, setStatesLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [existingFile, setExistingFile] = useState<any>(null);
  const [filePreview, setFilePreview] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deleteFileLoading, setDeleteFileLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<HospitalFormData>({
    defaultValues: {
      isActive: true,
    },
  });

  useEffect(() => {
    fetchStates();
    if (isEdit && id) {
      fetchHospital(id);
    }
  }, [id, isEdit]);

  const fetchStates = async () => {
    try {
      setStatesLoading(true);
      const response = await statesAPI.getStates({ limit: 100 });
      setStates(response.data.states || []);
    } catch (error) {
      console.error('Error fetching states:', error);
      handleApiError(error);
    } finally {
      setStatesLoading(false);
    }
  };

  const fetchHospital = async (hospitalId: string) => {
    try {
      setInitialLoading(true);
      const response = await hospitalAPI.getHospital(hospitalId);
      const hospital = response.data.hospital;
      
      setValue('name', hospital.name);
      setValue('email', hospital.email);
      setValue('phone', hospital.phone);
      setValue('gstNumber', hospital.gstNumber);
      setValue('panNumber', hospital.panNumber);
      setValue('gstAddress', hospital.gstAddress);
      setValue('city', hospital.city);
      setValue('state', hospital.state._id);
      setValue('pincode', hospital.pincode);
      setValue('isActive', hospital.isActive);
      
      // Handle existing file
      if (hospital.agreementFile?.filename) {
        setExistingFile(hospital.agreementFile);
      }
    } catch (error) {
      handleApiError(error);
      navigate('/hospitals');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png',
        'image/jpg'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        toast.error('Invalid file type. Only PDF, DOC, DOCX, JPG, JPEG, and PNG files are allowed.');
        return;
      }
      
      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File too large. Maximum size is 10MB.');
        return;
      }
      
      setSelectedFile(file);
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setFilePreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setFilePreview('');
      }
      
      toast.success('File selected successfully');
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setFilePreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteExistingFile = async () => {
    if (!existingFile || !id) return;
    
    try {
      setDeleteFileLoading(true);
      await hospitalAPI.deleteHospitalFile(id);
      setExistingFile(null);
      toast.success('File deleted successfully');
    } catch (error) {
      console.error('Error deleting file:', error);
      handleApiError(error);
    } finally {
      setDeleteFileLoading(false);
    }
  };

  const handleViewFile = (filename: string) => {
    window.open(hospitalAPI.viewFile(filename), '_blank');
  };

  const handleDownloadFile = (filename: string, originalName: string) => {
    hospitalAPI.downloadFile(filename, originalName);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimetype: string) => {
    if (mimetype?.includes('pdf')) return <FileText className="w-5 h-5 text-red-600" />;
    if (mimetype?.includes('word') || mimetype?.includes('document')) return <FileText className="w-5 h-5 text-blue-600" />;
    if (mimetype?.includes('image')) return <FileText className="w-5 h-5 text-green-600" />;
    return <FileText className="w-5 h-5 text-gray-600" />;
  };

  const onSubmit = async (data: HospitalFormData) => {
    setLoading(true);
    setUploadProgress(0);
    
    try {
      // Prepare form data
      const formData: HospitalFormData = {
        ...data,
        agreementFile: selectedFile || undefined,
      };

      if (isEdit && id) {
        await hospitalAPI.updateHospital(id, formData, setUploadProgress);
        toast.success('Hospital updated successfully');
      } else {
        await hospitalAPI.createHospital(formData, setUploadProgress);
        toast.success('Hospital created successfully');
      }
      
      navigate('/hospitals');
    } catch (error: any) {
      console.error('Submit error:', error);
      handleApiError(error);
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  if (initialLoading || statesLoading) {
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
          onClick={() => navigate('/hospitals')}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit Hospital' : 'Add New Hospital'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isEdit ? 'Update hospital information' : 'Create a new hospital entry with contact details'}
          </p>
        </div>
      </div>

      {/* Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-sm p-6"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
              Basic Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Hospital Name *
                </label>
                <input
                  {...register('name', {
                    required: 'Hospital name is required',
                    minLength: {
                      value: 2,
                      message: 'Name must be at least 2 characters',
                    },
                  })}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter hospital name"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: 'Please enter a valid email address',
                    },
                  })}
                  type="email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter email address"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  {...register('phone', {
                    required: 'Phone number is required',
                    minLength: {
                      value: 10,
                      message: 'Phone number must be at least 10 digits',
                    },
                  })}
                  type="tel"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter phone number"
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
                )}
              </div>

              {/* File Upload Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Agreement Document
                </label>
                
                {/* Existing File Display */}
                {existingFile && !selectedFile && (
                  <div className="mb-3 p-3 bg-gray-50 rounded-lg border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getFileIcon(existingFile.mimetype)}
                        <div>
                          <p className="text-sm font-medium text-gray-900">{existingFile.originalName}</p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(existingFile.size)} • Uploaded {new Date(existingFile.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => handleViewFile(existingFile.filename)}
                          className="text-blue-600 hover:text-blue-800 p-1 rounded"
                          title="View File"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadFile(existingFile.filename, existingFile.originalName)}
                          className="text-green-600 hover:text-green-800 p-1 rounded"
                          title="Download File"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={handleDeleteExistingFile}
                          disabled={deleteFileLoading}
                          className="text-red-600 hover:text-red-800 p-1 rounded disabled:opacity-50"
                          title="Delete File"
                        >
                          {deleteFileLoading ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Selected File Preview */}
                {selectedFile && (
                  <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getFileIcon(selectedFile.type)}
                        <div>
                          <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                          <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={removeSelectedFile}
                        className="text-red-600 hover:text-red-800 p-1 rounded"
                        title="Remove File"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* File Upload Area */}
                {!selectedFile && (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <span className="text-blue-600 hover:text-blue-500 font-medium">Upload a file</span>
                      <span className="text-gray-500"> or drag and drop</span>
                    </label>
                    <input
                      ref={fileInputRef}
                      id="file-upload"
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={handleFileSelect}
                    />
                    <p className="text-xs text-gray-500 mt-1">PDF, DOC, DOCX, JPG, JPEG, PNG up to 10MB</p>
                  </div>
                )}

                {/* Upload Progress */}
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Uploading...</span>
                      <span className="text-gray-600">{uploadProgress}%</span>
                    </div>
                    <div className="mt-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Image Preview */}
                {filePreview && (
                  <div className="mt-3">
                    <img
                      src={filePreview}
                      alt="File preview"
                      className="max-w-full h-32 object-contain rounded-lg border"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Registration Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
              Registration Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="gstNumber" className="block text-sm font-medium text-gray-700 mb-2">
                  GST Number *
                </label>
                <input
                  {...register('gstNumber', {
                    required: 'GST number is required',
                    minLength: {
                      value: 15,
                      message: 'GST number must be exactly 15 characters',
                    },
                    maxLength: {
                      value: 15,
                      message: 'GST number must be exactly 15 characters',
                    },
                    pattern: {
                      value: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
                      message: 'Please enter a valid GST number',
                    },
                  })}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
                  placeholder="Enter GST number"
                  style={{ textTransform: 'uppercase' }}
                />
                {errors.gstNumber && (
                  <p className="mt-1 text-sm text-red-600">{errors.gstNumber.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="panNumber" className="block text-sm font-medium text-gray-700 mb-2">
                  PAN Number *
                </label>
                <input
                  {...register('panNumber', {
                    required: 'PAN number is required',
                    minLength: {
                      value: 10,
                      message: 'PAN number must be exactly 10 characters',
                    },
                    maxLength: {
                      value: 10,
                      message: 'PAN number must be exactly 10 characters',
                    },
                    pattern: {
                      value: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
                      message: 'Please enter a valid PAN number',
                    },
                  })}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
                  placeholder="Enter PAN number"
                  style={{ textTransform: 'uppercase' }}
                />
                {errors.panNumber && (
                  <p className="mt-1 text-sm text-red-600">{errors.panNumber.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
              Address Information
            </h3>
            
            <div>
              <label htmlFor="gstAddress" className="block text-sm font-medium text-gray-700 mb-2">
                Address as per GST *
              </label>
              <textarea
                {...register('gstAddress', {
                  required: 'GST address is required',
                  minLength: {
                    value: 10,
                    message: 'Address must be at least 10 characters',
                  },
                })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter complete address as per GST registration"
              />
              {errors.gstAddress && (
                <p className="mt-1 text-sm text-red-600">{errors.gstAddress.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                  City *
                </label>
                <input
                  {...register('city', {
                    required: 'City is required',
                    minLength: {
                      value: 2,
                      message: 'City must be at least 2 characters',
                    },
                  })}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter city name"
                />
                {errors.city && (
                  <p className="mt-1 text-sm text-red-600">{errors.city.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-2">
                  State *
                </label>
                <select
                  {...register('state', {
                    required: 'State is required',
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select State</option>
                  {states.map((state) => (
                    <option key={state._id} value={state._id}>
                      {state.name} ({state.code})
                    </option>
                  ))}
                </select>
                {errors.state && (
                  <p className="mt-1 text-sm text-red-600">{errors.state.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="pincode" className="block text-sm font-medium text-gray-700 mb-2">
                  Pincode *
                </label>
                <input
                  {...register('pincode', {
                    required: 'Pincode is required',
                    pattern: {
                      value: /^[0-9]{6}$/,
                      message: 'Pincode must be exactly 6 digits',
                    },
                  })}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter pincode"
                />
                {errors.pincode && (
                  <p className="mt-1 text-sm text-red-600">{errors.pincode.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
              Status
            </h3>
            
            <div>
              <label className="flex items-center">
                <input
                  {...register('isActive')}
                  type="checkbox"
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-gray-700">Active Hospital</span>
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Inactive hospitals will be hidden from public listings
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate('/hospitals')}
              className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-colors duration-200"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  {uploadProgress > 0 ? `Uploading... ${uploadProgress}%` : (isEdit ? 'Updating...' : 'Creating...')}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {isEdit ? 'Update Hospital' : 'Create Hospital'}
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default HospitalForm;