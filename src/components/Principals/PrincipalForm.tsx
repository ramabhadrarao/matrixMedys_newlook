// src/components/Principals/PrincipalForm.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { 
  ArrowLeft, 
  Save, 
  Loader2, 
  Upload, 
  X, 
  Plus,
  Trash2,
  Download,
  Eye,
  FileText,
  Calendar,
  Building2,
  MapPin,
  User,
  Phone,
  Mail,
  CreditCard,
  Briefcase,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { principalAPI, PrincipalFormData, Portfolio, PrincipalDocument } from '../../services/principalAPI';
import { portfolioAPI } from '../../services/doctorAPI';
import { statesAPI } from '../../services/api';
import { handleApiError } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

interface State {
  _id: string;
  name: string;
  code: string;
}

interface FileWithMetadata {
  file: File;
  name: string;
  hasValidity: boolean;
  startDate?: string;
  endDate?: string;
  id: string;
}

interface AddressField {
  title: string;
  city: string;
  state: string;
  pincode: string;
}

// Validation Error Component
const ValidationError: React.FC<{ message?: string }> = ({ message }) => {
  if (!message) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center mt-1 text-sm text-red-600"
    >
      <AlertCircle className="w-4 h-4 mr-1" />
      {message}
    </motion.div>
  );
};

// Field Wrapper Component
const FormField: React.FC<{
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}> = ({ label, required, error, children, icon }) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        <div className="flex items-center">
          {icon && <span className="mr-2">{icon}</span>}
          {label} {required && <span className="text-red-500 ml-1">*</span>}
        </div>
      </label>
      {children}
      <ValidationError message={error} />
    </div>
  );
};

const PrincipalForm: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEdit);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  // File states
  const [selectedFiles, setSelectedFiles] = useState<FileWithMetadata[]>([]);
  const [existingDocuments, setExistingDocuments] = useState<PrincipalDocument[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deleteFileLoading, setDeleteFileLoading] = useState<string>('');

  const { hasPermission } = useAuthStore();
  const canCreate = hasPermission('principals', 'create');
  const canUpdate = hasPermission('principals', 'update');

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    clearErrors,
    setError,
  } = useForm<PrincipalFormData>({
    defaultValues: {
      isActive: true,
      portfolio: [],
      addresses: [{ title: '', city: '', state: '', pincode: '' }]
    },
  });

  const { fields: addressFields, append: appendAddress, remove: removeAddress } = useFieldArray({
    control,
    name: 'addresses' as any
  });

  const watchedPortfolios = watch('portfolio');

  // Clear validation errors when user starts typing
  useEffect(() => {
    const subscription = watch(() => {
      setValidationErrors({});
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  useEffect(() => {
    fetchInitialData();
    if (isEdit && id) {
      fetchPrincipal(id);
    }
  }, [id, isEdit]);

  const fetchInitialData = async () => {
    try {
      setDataLoading(true);
      const [portfoliosResponse, statesResponse] = await Promise.all([
        portfolioAPI.getPortfolios({ limit: 100 }),
        statesAPI.getStates({ limit: 100 })
      ]);
      
      setPortfolios(portfoliosResponse.data.portfolios || []);
      setStates(statesResponse.data.states || []);
    } catch (error) {
      console.error('Error fetching initial data:', error);
      handleApiError(error);
    } finally {
      setDataLoading(false);
    }
  };

  const fetchPrincipal = async (principalId: string) => {
    try {
      setInitialLoading(true);
      const response = await principalAPI.getPrincipal(principalId);
      const principal = response.data.principal;
      
      setValue('name', principal.name);
      setValue('email', principal.email);
      setValue('mobile', principal.mobile);
      setValue('gstNumber', principal.gstNumber);
      setValue('panNumber', principal.panNumber);
      setValue('isActive', principal.isActive);
      setValue('portfolio', principal.portfolio.map((p: any) => p._id));
      
      // Set addresses
      if (principal.addresses && principal.addresses.length > 0) {
        setValue('addresses', principal.addresses.map((addr: any) => ({
          title: addr.title,
          city: addr.city,
          state: addr.state._id || addr.state,
          pincode: addr.pincode
        })));
      }
      
      // Set existing documents
      if (principal.documents && principal.documents.length > 0) {
        setExistingDocuments(principal.documents);
      }
    } catch (error) {
      handleApiError(error);
      navigate('/principals');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFiles: FileWithMetadata[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate file type
        const allowedTypes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'image/jpeg',
          'image/png',
          'image/jpg',
          'text/plain'
        ];
        
        if (!allowedTypes.includes(file.type)) {
          toast.error(`Invalid file type for ${file.name}. Only PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, PNG, and TXT files are allowed.`);
          continue;
        }
        
        // Validate file size (10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`File ${file.name} is too large. Maximum size is 10MB.`);
          continue;
        }
        
        newFiles.push({
          file,
          name: file.name.split('.')[0],
          hasValidity: false,
          id: `${Date.now()}-${i}`
        });
      }
      
      if (newFiles.length > 0) {
        setSelectedFiles(prev => [...prev, ...newFiles]);
        toast.success(`${newFiles.length} file(s) selected successfully`);
      }
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeSelectedFile = (fileId: string) => {
    setSelectedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const updateFileMetadata = (fileId: string, field: keyof FileWithMetadata, value: any) => {
    setSelectedFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, [field]: value } : f
    ));
  };

  const handleDeleteExistingDocument = async (documentId: string) => {
    if (!id) return;
    
    try {
      setDeleteFileLoading(documentId);
      await principalAPI.deleteDocument(id, documentId);
      setExistingDocuments(prev => prev.filter(doc => doc._id !== documentId));
      toast.success('Document deleted successfully');
    } catch (error) {
      handleApiError(error);
    } finally {
      setDeleteFileLoading('');
    }
  };

  const addAddressField = () => {
    appendAddress({ title: '', city: '', state: '', pincode: '' });
  };

  const validateForm = (data: PrincipalFormData): boolean => {
    const errors: Record<string, string> = {};
    
    // Validate portfolios
    if (!data.portfolio || data.portfolio.length === 0) {
      errors.portfolio = 'Please select at least one portfolio';
      setError('portfolio', { message: 'At least one portfolio is required' });
    }
    
    // Validate addresses
    if (!data.addresses || data.addresses.length === 0) {
      errors.addresses = 'Please add at least one address';
    }
    
    // Validate file dates
    selectedFiles.forEach((file, index) => {
      if (file.hasValidity) {
        if (!file.startDate) {
          errors[`file_${index}_startDate`] = 'Start date is required when validity is enabled';
        }
        if (!file.endDate) {
          errors[`file_${index}_endDate`] = 'End date is required when validity is enabled';
        }
        if (file.startDate && file.endDate && new Date(file.startDate) > new Date(file.endDate)) {
          errors[`file_${index}_dates`] = 'End date must be after start date';
        }
      }
    });
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const onSubmit = async (data: PrincipalFormData) => {
    // Clear previous validation errors
    setValidationErrors({});
    
    // Validate form
    if (!validateForm(data)) {
      toast.error('Please fix the validation errors');
      return;
    }

    setLoading(true);
    setUploadProgress(0);
    
    try {
      const formData: PrincipalFormData = {
        ...data,
        documents: selectedFiles.map(f => f.file),
        documentNames: selectedFiles.map(f => f.name),
        hasValidities: selectedFiles.map(f => f.hasValidity),
        startDates: selectedFiles.map(f => f.startDate || ''),
        endDates: selectedFiles.map(f => f.endDate || ''),
      };

      if (isEdit && id) {
        await principalAPI.updatePrincipal(id, formData, setUploadProgress);
        toast.success('Principal updated successfully');
      } else {
        await principalAPI.createPrincipal(formData, setUploadProgress);
        toast.success('Principal created successfully');
      }
      
      navigate('/principals');
    } catch (error: any) {
      console.error('Submit error:', error);
      
      // Handle specific validation errors from backend
      if (error.response?.status === 422 && error.response?.data?.errors) {
        const backendErrors: Record<string, string> = {};
        error.response.data.errors.forEach((err: any) => {
          backendErrors[err.param] = err.msg;
          setError(err.param as any, { message: err.msg });
        });
        setValidationErrors(backendErrors);
        toast.error('Please fix the validation errors');
      } else if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        handleApiError(error);
      }
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
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
    if (mimetype?.includes('sheet') || mimetype?.includes('excel')) return <FileText className="w-5 h-5 text-green-600" />;
    if (mimetype?.includes('image')) return <FileText className="w-5 h-5 text-purple-600" />;
    return <FileText className="w-5 h-5 text-gray-600" />;
  };

  const handleViewFile = (filename: string) => {
    principalAPI.viewFile(filename);
  };

  const handleDownloadFile = (filename: string, originalName: string) => {
    principalAPI.downloadFile(filename, originalName);
  };

  const isDocumentExpired = (endDate?: string) => {
    if (!endDate) return false;
    return new Date(endDate) < new Date();
  };

  if (initialLoading || dataLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/principals')}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit Principal' : 'Add New Principal'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isEdit ? 'Update principal information' : 'Create a new principal profile'}
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
              <FormField
                label="Principal Name"
                required
                error={errors.name?.message}
                icon={<Building2 className="w-4 h-4" />}
              >
                <input
                  {...register('name', {
                    required: 'Principal name is required',
                    minLength: {
                      value: 2,
                      message: 'Name must be at least 2 characters',
                    },
                  })}
                  type="text"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.name ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter principal name"
                />
              </FormField>

              <FormField
                label="Email Address"
                required
                error={errors.email?.message}
                icon={<Mail className="w-4 h-4" />}
              >
                <input
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: 'Please enter a valid email address',
                    },
                  })}
                  type="email"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.email ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter email address"
                />
              </FormField>

              <FormField
                label="Mobile Number"
                required
                error={errors.mobile?.message}
                icon={<Phone className="w-4 h-4" />}
              >
                <input
                  {...register('mobile', {
                    required: 'Mobile number is required',
                    minLength: {
                      value: 10,
                      message: 'Mobile number must be at least 10 digits',
                    },
                    pattern: {
                      value: /^[0-9]+$/,
                      message: 'Mobile number must contain only digits',
                    },
                  })}
                  type="tel"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.mobile ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter mobile number"
                />
              </FormField>
            </div>
          </div>

          {/* Registration Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
              Registration Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                label="GST Number"
                required
                error={errors.gstNumber?.message || validationErrors.gstNumber}
                icon={<FileText className="w-4 h-4" />}
              >
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
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase ${
                    errors.gstNumber || validationErrors.gstNumber ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter GST number"
                  style={{ textTransform: 'uppercase' }}
                />
              </FormField>

              <FormField
                label="PAN Number"
                required
                error={errors.panNumber?.message || validationErrors.panNumber}
                icon={<CreditCard className="w-4 h-4" />}
              >
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
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase ${
                    errors.panNumber || validationErrors.panNumber ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter PAN number"
                  style={{ textTransform: 'uppercase' }}
                />
              </FormField>
            </div>
          </div>

          {/* Portfolios */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
                <Briefcase className="w-5 h-5 inline mr-2" />
                Portfolios
              </h3>
              <span className="text-sm text-gray-500">
                {watchedPortfolios?.length || 0} selected
              </span>
            </div>
            
            <FormField
              label="Select Portfolios"
              required
              error={errors.portfolio?.message || validationErrors.portfolio}
            >
              <div className={`border rounded-lg p-4 max-h-64 overflow-y-auto ${
                errors.portfolio || validationErrors.portfolio ? 'border-red-300' : 'border-gray-300'
              }`}>
                {portfolios.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">No portfolios available</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {portfolios.map((portfolio) => {
                      const isChecked = watchedPortfolios?.includes(portfolio._id);
                      return (
                        <label 
                          key={portfolio._id} 
                          className={`flex items-start space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${
                            isChecked ? 'bg-blue-50 border border-blue-300' : 'hover:bg-gray-50 border border-transparent'
                          }`}
                        >
                          <input
                            {...register('portfolio', {
                              required: 'At least one portfolio is required',
                            })}
                            type="checkbox"
                            value={portfolio._id}
                            className="mt-1 rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                          />
                          <div className="flex-1">
                            <div className="flex items-center">
                              <span className="text-sm font-medium text-gray-900">{portfolio.name}</span>
                              {isChecked && <CheckCircle className="w-4 h-4 text-blue-600 ml-2" />}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{portfolio.description}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </FormField>
          </div>

          {/* Addresses */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
                <MapPin className="w-5 h-5 inline mr-2" />
                Addresses
              </h3>
              <button
                type="button"
                onClick={addAddressField}
                className="inline-flex items-center px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Address
              </button>
            </div>
            
            {addressFields.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p className="text-gray-600 font-medium">No addresses added yet</p>
                <p className="text-sm text-gray-500 mt-1">Click "Add Address" to add a new address</p>
              </div>
            ) : (
              <div className="space-y-4">
                <AnimatePresence>
                  {addressFields.map((field, index) => (
                    <motion.div
                      key={field.id}
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      className="p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-medium text-gray-700">Address {index + 1}</h4>
                        {addressFields.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeAddress(index)}
                            className="text-red-600 hover:text-red-800 p-1 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          label="Address Title"
                          required
                          error={errors.addresses?.[index]?.title?.message}
                        >
                          <input
                            {...register(`addresses.${index}.title` as const, {
                              required: 'Address title is required',
                            })}
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="e.g., Head Office, Branch Office"
                          />
                        </FormField>
                        
                        <FormField
                          label="City"
                          required
                          error={errors.addresses?.[index]?.city?.message}
                        >
                          <input
                            {...register(`addresses.${index}.city` as const, {
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
                        </FormField>
                        
                        <FormField
                          label="State"
                          required
                          error={errors.addresses?.[index]?.state?.message}
                        >
                          <select
                            {...register(`addresses.${index}.state` as const, {
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
                        </FormField>
                        
                        <FormField
                          label="Pincode"
                          required
                          error={errors.addresses?.[index]?.pincode?.message}
                        >
                          <input
                            {...register(`addresses.${index}.pincode` as const, {
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
                        </FormField>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Existing Documents */}
          {existingDocuments.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
                Existing Documents
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {existingDocuments.map((document) => (
                  <div key={document._id} className="p-4 bg-gray-50 rounded-lg border">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {getFileIcon(document.mimetype)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {document.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(document.size)} • {new Date(document.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteExistingDocument(document._id)}
                        disabled={deleteFileLoading === document._id}
                        className="text-red-600 hover:text-red-800 p-1 rounded disabled:opacity-50"
                        title="Delete Document"
                      >
                        {deleteFileLoading === document._id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    
                    {document.hasValidity && (
                      <div className="mb-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600">Valid from:</span>
                          <span className="font-medium">{new Date(document.startDate!).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600">Valid to:</span>
                          <span className={`font-medium ${isDocumentExpired(document.endDate) ? 'text-red-600' : 'text-green-600'}`}>
                            {new Date(document.endDate!).toLocaleDateString()}
                            {isDocumentExpired(document.endDate) && ' (Expired)'}
                          </span>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {document.originalName}
                      </span>
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => handleViewFile(document.filename)}
                          className="text-blue-600 hover:text-blue-800 p-1 rounded"
                          title="View File"
                        >
                          <Eye className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadFile(document.filename, document.originalName)}
                          className="text-green-600 hover:text-green-800 p-1 rounded"
                          title="Download"
                        >
                          <Download className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New Documents to Upload */}
          {selectedFiles.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
                New Documents to Upload
              </h3>
              <div className="space-y-4">
                <AnimatePresence>
                  {selectedFiles.map((fileData, index) => (
                    <motion.div
                      key={fileData.id}
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      className="p-4 bg-blue-50 rounded-lg border border-blue-200"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          {getFileIcon(fileData.file.type)}
                          <div>
                            <p className="text-sm font-medium text-gray-900">{fileData.file.name}</p>
                            <p className="text-xs text-gray-500">{formatFileSize(fileData.file.size)}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeSelectedFile(fileData.id)}
                          className="text-red-600 hover:text-red-800 p-1 rounded"
                          title="Remove File"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Document Name *
                          </label>
                          <input
                            type="text"
                            value={fileData.name}
                            onChange={(e) => updateFileMetadata(fileData.id, 'name', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter document name"
                          />
                        </div>
                        
                        <div>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={fileData.hasValidity}
                              onChange={(e) => updateFileMetadata(fileData.id, 'hasValidity', e.target.checked)}
                              className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                            />
                            <span className="ml-2 text-sm text-gray-700">This document has validity period</span>
                          </label>
                        </div>
                        
                        {fileData.hasValidity && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Start Date *
                              </label>
                              <input
                                type="date"
                                value={fileData.startDate || ''}
                                onChange={(e) => updateFileMetadata(fileData.id, 'startDate', e.target.value)}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                              />
                              {validationErrors[`file_${index}_startDate`] && (
                                <p className="text-xs text-red-600 mt-1">{validationErrors[`file_${index}_startDate`]}</p>
                              )}
                            </div>
                            
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                End Date *
                              </label>
                              <input
                                type="date"
                                value={fileData.endDate || ''}
                                onChange={(e) => updateFileMetadata(fileData.id, 'endDate', e.target.value)}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                              />
                              {validationErrors[`file_${index}_endDate`] && (
                                <p className="text-xs text-red-600 mt-1">{validationErrors[`file_${index}_endDate`]}</p>
                              )}
                              {validationErrors[`file_${index}_dates`] && (
                                <p className="text-xs text-red-600 mt-1">{validationErrors[`file_${index}_dates`]}</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* File Upload */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
              Documents
            </h3>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <label htmlFor="documents" className="cursor-pointer">
                <span className="text-blue-600 hover:text-blue-500 font-medium">Upload files</span>
                <span className="text-gray-500"> or drag and drop</span>
              </label>
              <input
                ref={fileInputRef}
                id="documents"
                type="file"
                className="hidden"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt"
                onChange={handleFileSelect}
              />
              <p className="text-xs text-gray-500 mt-1">PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, PNG, TXT up to 10MB each</p>
            </div>

            {/* Upload Progress */}
            {uploadProgress > 0 && uploadProgress < 100 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4"
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Uploading...</span>
                  <span className="text-gray-600">{uploadProgress}%</span>
                </div>
                <div className="mt-1 bg-gray-200 rounded-full h-2">
                  <motion.div
                    className="bg-blue-600 h-2 rounded-full"
                    initial={{ width: '0%' }}
                    animate={{ width: `${uploadProgress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </motion.div>
            )}
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
                <span className="ml-2 text-sm text-gray-700">Active Principal</span>
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Inactive principals will be hidden from active listings
              </p>
            </div>
          </div>

          {/* Validation Error Summary */}
          {Object.keys(validationErrors).length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-200 rounded-lg p-4"
            >
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                <h4 className="text-sm font-medium text-red-800">Please fix the following errors:</h4>
              </div>
              <ul className="mt-2 space-y-1 text-sm text-red-600 list-disc list-inside">
                {Object.entries(validationErrors).map(([field, message]) => (
                  <li key={field}>{message}</li>
                ))}
              </ul>
            </motion.div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate('/principals')}
              className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || (!canCreate && !isEdit) || (!canUpdate && isEdit)}
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
                  {isEdit ? 'Update Principal' : 'Create Principal'}
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default PrincipalForm;