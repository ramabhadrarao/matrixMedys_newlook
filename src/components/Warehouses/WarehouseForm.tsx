// src/components/Warehouses/WarehouseForm.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { 
  ArrowLeft, 
  Save, 
  Upload, 
  X, 
  FileText, 
  Download, 
  Eye, 
  Trash2, 
  Calendar,
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  Hash,
  User,
  AlertCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { warehouseAPI, Warehouse, WarehouseFormData, WarehouseDocument } from '../../services/warehouseAPI';
import { branchAPI } from '../../services/branchAPI';
import { statesAPI } from '../../services';
import { handleApiError } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

interface FileWithMetadata {
  file: File;
  documentName: string;
  validityStartDate: string;
  validityEndDate: string;
}

interface State {
  _id: string;
  name: string;
}

interface Branch {
  _id: string;
  name: string;
}

const WarehouseForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditing);
  const [states, setStates] = useState<State[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<FileWithMetadata[]>([]);
  const [existingDocuments, setExistingDocuments] = useState<WarehouseDocument[]>([]);
  const [documentsToDelete, setDocumentsToDelete] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  
  const { hasPermission } = useAuthStore();
  const canCreate = hasPermission('warehouses', 'create');
  const canUpdate = hasPermission('warehouses', 'update');
  const canDelete = hasPermission('warehouses', 'delete');
  
  const { control, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<WarehouseFormData>({
    defaultValues: {
      name: '',
      warehouseCode: '',
      branch: '',
      address: '',
      city: '',
      district: '',
      drugLicenseNumber: '',
      state: '',
      pincode: '',
      phone: '',
      email: '',
      alternatePhone: '',
      status: 'Active',
      isActive: true,
      remarks: ''
    }
  });

  useEffect(() => {
    fetchStates();
    fetchBranches();
    if (isEditing && id) {
      fetchWarehouse(id);
    }
  }, [isEditing, id]);

  const fetchStates = async () => {
    try {
      const response = await statesAPI.getStates();
      console.log('States response:', response);
      // Handle the response structure
      if (response && response.data) {
        const statesData = response.data.states || response.data || [];
        setStates(Array.isArray(statesData) ? statesData : []);
      } else if (Array.isArray(response)) {
        setStates(response);
      } else {
        setStates([]);
      }
    } catch (error) {
      console.error('Error fetching states:', error);
      handleApiError(error);
      setStates([]);
    }
  };

  const fetchBranches = async () => {
    try {
      const response = await branchAPI.getBranches({ limit: 100 });
      console.log('Fetched branches response:', response);
      
      // Handle the response structure correctly
      if (response && response.data) {
        const branchesData = response.data.branches || [];
        setBranches(branchesData);
      } else {
        setBranches([]);
        console.error('Unexpected response structure:', response);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
      handleApiError(error);
      setBranches([]);
    }
  };

  const fetchWarehouse = async (warehouseId: string) => {
    try {
      setInitialLoading(true);
      const response = await warehouseAPI.getWarehouse(warehouseId);
      const warehouse = response.data.warehouse || response.data;
      
      // Populate form with warehouse data
      reset({
        name: warehouse.name || '',
        warehouseCode: warehouse.warehouseCode || '',
        branch: warehouse.branch._id || '',
        address: warehouse.address || '',
        city: warehouse.city || '',
        district: warehouse.district || '',
        drugLicenseNumber: warehouse.drugLicenseNumber || '',
        state: warehouse.state._id || '',
        pincode: warehouse.pincode || '',
        phone: warehouse.phone || '',
        email: warehouse.email || '',
        alternatePhone: warehouse.alternatePhone || '',
        status: warehouse.status || 'Active',
        isActive: warehouse.isActive !== undefined ? warehouse.isActive : true,
        remarks: warehouse.remarks || ''
      });
      
      setExistingDocuments(warehouse.documents || []);
    } catch (error) {
      console.error('Error fetching warehouse:', error);
      handleApiError(error);
      navigate('/warehouses');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    files.forEach(file => {
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        toast.error(`File ${file.name} is not a supported format. Please upload PDF, JPEG, or PNG files.`);
        return;
      }
      
      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`File ${file.name} is too large. Maximum size is 10MB.`);
        return;
      }
      
      const newFile: FileWithMetadata = {
        file,
        documentName: file.name.split('.')[0],
        validityStartDate: new Date().toISOString().split('T')[0],
        validityEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      };
      
      setSelectedFiles(prev => [...prev, newFile]);
    });
    
    // Reset input
    event.target.value = '';
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const updateFileMetadata = (index: number, field: keyof Omit<FileWithMetadata, 'file'>, value: string) => {
    setSelectedFiles(prev => prev.map((file, i) => 
      i === index ? { ...file, [field]: value } : file
    ));
  };

  const handleDeleteExistingDocument = (documentId: string) => {
    setDocumentsToDelete(prev => [...prev, documentId]);
    setExistingDocuments(prev => prev.filter(doc => doc._id !== documentId));
  };

  const handleDownloadDocument = async (filename: string, originalName?: string) => {
    try {
      await warehouseAPI.downloadFile(filename, originalName);
    } catch (error) {
      console.error('Error downloading document:', error);
      handleApiError(error);
    }
  };

  const handleViewDocument = (filename: string) => {
    try {
      warehouseAPI.viewFile(filename);
    } catch (error) {
      console.error('Error viewing document:', error);
      handleApiError(error);
    }
  };

  const onSubmit = async (data: WarehouseFormData) => {
    if (isEditing && !canUpdate) {
      toast.error('You do not have permission to update warehouses');
      return;
    }
    
    if (!isEditing && !canCreate) {
      toast.error('You do not have permission to create warehouses');
      return;
    }

    try {
      setLoading(true);
      
      let warehouse: Warehouse;
      
      if (isEditing && id) {
        // Update existing warehouse
        const response = await warehouseAPI.updateWarehouse(id, data);
        warehouse = response.data;
        toast.success('Warehouse updated successfully');
      } else {
        // Create new warehouse
        const response = await warehouseAPI.createWarehouse(data);
        warehouse = response.data;
        toast.success('Warehouse created successfully');
      }
      
      // Delete marked documents
      for (const docId of documentsToDelete) {
        try {
          await warehouseAPI.deleteDocument(warehouse._id, docId);
        } catch (error) {
          console.error('Error deleting document:', error);
        }
      }
      
      // Upload new documents
      for (let i = 0; i < selectedFiles.length; i++) {
        const fileData = selectedFiles[i];
        try {
          setUploadProgress(prev => ({ ...prev, [`file-${i}`]: 0 }));
          
          await warehouseAPI.addDocument(warehouse._id, {
            file: fileData.file,
            documentName: fileData.documentName,
            validityStartDate: fileData.validityStartDate,
            validityEndDate: fileData.validityEndDate
          });
          
          setUploadProgress(prev => ({ ...prev, [`file-${i}`]: 100 }));
        } catch (error) {
          console.error('Error uploading document:', error);
          toast.error(`Failed to upload ${fileData.documentName}`);
        }
      }
      
      navigate('/warehouses');
    } catch (error) {
      console.error('Error saving warehouse:', error);
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (isEditing && !canUpdate) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to edit warehouses.</p>
        </div>
      </div>
    );
  }

  if (!isEditing && !canCreate) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to create warehouses.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/warehouses')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Edit Warehouse' : 'Add New Warehouse'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isEditing ? 'Update warehouse information and documents' : 'Create a new warehouse location'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Basic Information
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Warehouse Name *
              </label>
              <Controller
                name="name"
                control={control}
                rules={{ required: 'Warehouse name is required' }}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.name ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter warehouse name"
                  />
                )}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.name.message}
                </p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Warehouse Code
              </label>
              <Controller
                name="warehouseCode"
                control={control}
                render={({ field }) => (
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      {...field}
                      type="text"
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="WH001"
                    />
                  </div>
                )}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Branch *
              </label>
              <Controller
                name="branch"
                control={control}
                rules={{ required: 'Branch is required' }}
                render={({ field }) => (
                  <select
                    {...field}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.branch ? 'border-red-300' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select Branch</option>
                    {branches.map((branch) => (
                      <option key={branch._id} value={branch._id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                )}
              />
              {errors.branch && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.branch.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Drug License Number *
              </label>
              <Controller
                name="drugLicenseNumber"
                control={control}
                rules={{ required: 'Drug license number is required' }}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.drugLicenseNumber ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter drug license number"
                  />
                )}
              />
              {errors.drugLicenseNumber && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.drugLicenseNumber.message}
                </p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <select
                    {...field}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                )}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Active Status
              </label>
              <Controller
                name="isActive"
                control={control}
                render={({ field }) => (
                  <select
                    {...field}
                    value={field.value ? 'true' : 'false'}
                    onChange={(e) => field.onChange(e.target.value === 'true')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                )}
              />
            </div>
          </div>
        </div>

        {/* Address Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Address Information
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address *
              </label>
              <Controller
                name="address"
                control={control}
                rules={{ required: 'Address is required' }}
                render={({ field }) => (
                  <textarea
                    {...field}
                    rows={3}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.address ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter complete address"
                  />
                )}
              />
              {errors.address && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.address.message}
                </p>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City *
                </label>
                <Controller
                  name="city"
                  control={control}
                  rules={{ required: 'City is required' }}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="text"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.city ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter city"
                    />
                  )}
                />
                {errors.city && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {errors.city.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  District *
                </label>
                <Controller
                  name="district"
                  control={control}
                  rules={{ required: 'District is required' }}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="text"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.district ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter district"
                    />
                  )}
                />
                {errors.district && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {errors.district.message}
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State *
                </label>
                <Controller
                  name="state"
                  control={control}
                  rules={{ required: 'State is required' }}
                  render={({ field }) => (
                    <select
                      {...field}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.state ? 'border-red-300' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select State</option>
                      {states.map((state) => (
                        <option key={state._id} value={state._id}>
                          {state.name}
                        </option>
                      ))}
                    </select>
                  )}
                />
                {errors.state && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {errors.state.message}
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pincode *
                </label>
                <Controller
                  name="pincode"
                  control={control}
                  rules={{ 
                    required: 'Pincode is required',
                    pattern: {
                      value: /^[0-9]{6}$/,
                      message: 'Pincode must be 6 digits'
                    }
                  }}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="text"
                      maxLength={6}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.pincode ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="123456"
                    />
                  )}
                />
                {errors.pincode && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {errors.pincode.message}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Contact Information
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone *
              </label>
              <Controller
                name="phone"
                control={control}
                rules={{ 
                  required: 'Phone is required',
                  pattern: {
                    value: /^[0-9]{10}$/,
                    message: 'Phone must be 10 digits'
                  }
                }}
                render={({ field }) => (
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      {...field}
                      type="tel"
                      maxLength={10}
                      className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.phone ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="9876543210"
                    />
                  </div>
                )}
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.phone.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Alternate Phone
              </label>
              <Controller
                name="alternatePhone"
                control={control}
                render={({ field }) => (
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      {...field}
                      type="tel"
                      maxLength={10}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="9876543210"
                    />
                  </div>
                )}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email *
              </label>
              <Controller
                name="email"
                control={control}
                rules={{ 
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address'
                  }
                }}
                render={({ field }) => (
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      {...field}
                      type="email"
                      className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.email ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="warehouse@company.com"
                    />
                  </div>
                )}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.email.message}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Remarks
            </label>
            <Controller
              name="remarks"
              control={control}
              render={({ field }) => (
                <textarea
                  {...field}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Additional notes or remarks about the warehouse"
                />
              )}
            />
          </div>
        </div>

        {/* Documents Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documents
          </h2>
          
          {/* Existing Documents */}
          {existingDocuments.length > 0 && (
            <div className="mb-6">
              <h3 className="text-md font-medium text-gray-800 mb-3">Existing Documents</h3>
              <div className="space-y-3">
                {existingDocuments.map((doc) => (
                  <div key={doc._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-medium text-gray-900">{doc.documentName}</p>
                        <p className="text-sm text-gray-600">
                          Valid: {new Date(doc.validityStartDate).toLocaleDateString()} - {new Date(doc.validityEndDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleViewDocument(doc.filename)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Document"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => handleDownloadDocument(doc.filename, doc.originalName)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Download Document"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => handleDeleteExistingDocument(doc._id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Document"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* File Upload */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload New Documents
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
              <input
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  PDF, JPEG, PNG up to 10MB each
                </p>
              </label>
            </div>
          </div>
          
          {/* Selected Files */}
          {selectedFiles.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-md font-medium text-gray-800">New Documents to Upload</h3>
              {selectedFiles.map((fileData, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 border border-gray-200 rounded-lg space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-blue-600" />
                      <span className="font-medium text-gray-900">{fileData.file.name}</span>
                      <span className="text-sm text-gray-500">
                        ({(fileData.file.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => removeSelectedFile(index)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Document Name
                      </label>
                      <input
                        type="text"
                        value={fileData.documentName}
                        onChange={(e) => updateFileMetadata(index, 'documentName', e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Document name"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Valid From
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-3 w-3" />
                        <input
                          type="date"
                          value={fileData.validityStartDate}
                          onChange={(e) => updateFileMetadata(index, 'validityStartDate', e.target.value)}
                          className="w-full pl-7 pr-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Valid Until
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-3 w-3" />
                        <input
                          type="date"
                          value={fileData.validityEndDate}
                          onChange={(e) => updateFileMetadata(index, 'validityEndDate', e.target.value)}
                          className="w-full pl-7 pr-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {uploadProgress[`file-${index}`] !== undefined && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress[`file-${index}`]}%` }}
                      ></div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-4 pt-6">
          <button
            type="button"
            onClick={() => navigate('/warehouses')}
            className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Save className="h-4 w-4" />
            )}
            {loading ? 'Saving...' : (isEditing ? 'Update Warehouse' : 'Create Warehouse')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default WarehouseForm;