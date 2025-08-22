// src/components/Branches/BranchForm.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { 
  ArrowLeft, 
  Save, 
  Loader2, 
  Upload, 
  X, 
  Download, 
  Eye, 
  FileText, 
  Trash2,
  Plus,
  Edit,
  Calendar
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { branchAPI, BranchFormData, BranchDocument } from '../../services/branchAPI';
import { statesAPI, handleApiError } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

interface State {
  _id: string;
  name: string;
  code: string;
}

interface DocumentWithMetadata {
  file: File;
  documentName: string;
  validityStartDate: string;
  validityEndDate: string;
  id: string;
}

const BranchForm: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEdit);
  const [states, setStates] = useState<State[]>([]);
  const [statesLoading, setStatesLoading] = useState(true);
  
  // Document states
  const [selectedDocuments, setSelectedDocuments] = useState<DocumentWithMetadata[]>([]);
  const [existingDocuments, setExistingDocuments] = useState<BranchDocument[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deleteDocumentLoading, setDeleteDocumentLoading] = useState<string>('');
  const [showAddDocument, setShowAddDocument] = useState(false);
  const [newDocument, setNewDocument] = useState({
    documentName: '',
    validityStartDate: '',
    validityEndDate: ''
  });

  const { hasPermission } = useAuthStore();
  const canUpdate = hasPermission('branches', 'update');
  const canCreate = hasPermission('branches', 'create');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BranchFormData>({
    defaultValues: {
      isActive: true,
    },
  });

  useEffect(() => {
    fetchStates();
    if (isEdit && id) {
      fetchBranch(id);
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

  const fetchBranch = async (branchId: string) => {
    try {
      setInitialLoading(true);
      const response = await branchAPI.getBranch(branchId);
      const branch = response.data.branch;
      
      // Set form values
      setValue('name', branch.name);
      setValue('email', branch.email);
      setValue('phone', branch.phone);
      setValue('alternatePhone', branch.alternatePhone || '');
      setValue('branchCode', branch.branchCode || '');
      setValue('drugLicenseNumber', branch.drugLicenseNumber);
      setValue('gstNumber', branch.gstNumber);
      setValue('panNumber', branch.panNumber);
      setValue('gstAddress', branch.gstAddress);
      setValue('city', branch.city);
      setValue('state', branch.state._id);
      setValue('pincode', branch.pincode);
      setValue('remarks', branch.remarks || '');
      setValue('isActive', branch.isActive);
      
      // Set existing documents
      setExistingDocuments(branch.documents || []);
    } catch (error) {
      console.error('Error fetching branch:', error);
      handleApiError(error);
      navigate('/branches');
    } finally {
      setInitialLoading(false);
    }
  };

  // Handle file selection for new documents
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast.error('File size must be less than 10MB');
      return;
    }

    if (!newDocument.documentName.trim()) {
      toast.error('Please enter document name first');
      return;
    }

    if (!newDocument.validityStartDate || !newDocument.validityEndDate) {
      toast.error('Please select validity dates');
      return;
    }

    const documentWithMetadata: DocumentWithMetadata = {
      file,
      documentName: newDocument.documentName,
      validityStartDate: newDocument.validityStartDate,
      validityEndDate: newDocument.validityEndDate,
      id: Date.now().toString()
    };

    setSelectedDocuments(prev => [...prev, documentWithMetadata]);
    setNewDocument({
      documentName: '',
      validityStartDate: '',
      validityEndDate: ''
    });
    setShowAddDocument(false);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove selected document
  const removeSelectedDocument = (id: string) => {
    setSelectedDocuments(prev => prev.filter(doc => doc.id !== id));
  };

  // Delete existing document
  const deleteExistingDocument = async (documentId: string) => {
    if (!id) return;
    
    try {
      setDeleteDocumentLoading(documentId);
      await branchAPI.deleteDocument(id, documentId);
      setExistingDocuments(prev => prev.filter(doc => doc._id !== documentId));
      toast.success('Document deleted successfully');
    } catch (error) {
      console.error('Error deleting document:', error);
      handleApiError(error);
    } finally {
      setDeleteDocumentLoading('');
    }
  };

  // Handle form submission
  const onSubmit = async (data: BranchFormData) => {
    if (!canCreate && !isEdit) {
      toast.error('You do not have permission to create branches');
      return;
    }
    
    if (!canUpdate && isEdit) {
      toast.error('You do not have permission to update branches');
      return;
    }

    try {
      setLoading(true);
      setUploadProgress(0);

      // Prepare form data with documents
      const formData: BranchFormData = {
        ...data,
        documents: selectedDocuments.map(doc => doc.file),
        documentNames: selectedDocuments.map(doc => doc.documentName),
        validityStartDates: selectedDocuments.map(doc => doc.validityStartDate),
        validityEndDates: selectedDocuments.map(doc => doc.validityEndDate)
      };

      let response;
      if (isEdit && id) {
        response = await branchAPI.updateBranch(id, formData, setUploadProgress);
        toast.success('Branch updated successfully');
      } else {
        response = await branchAPI.createBranch(formData, setUploadProgress);
        toast.success('Branch created successfully');
      }

      navigate('/branches');
    } catch (error) {
      console.error('Error saving branch:', error);
      handleApiError(error);
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  // Handle file download
  const handleDownload = async (filename: string, originalName?: string) => {
    try {
      await branchAPI.downloadFile(filename, originalName);
    } catch (error) {
      console.error('Error downloading file:', error);
      handleApiError(error);
    }
  };

  // Handle file view
  const handleView = (filename: string) => {
    try {
      branchAPI.viewFile(filename);
    } catch (error) {
      console.error('Error viewing file:', error);
      handleApiError(error);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/branches')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit Branch' : 'Create Branch'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isEdit ? 'Update branch information' : 'Add a new branch to your organization'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Branch Name *
              </label>
              <input
                type="text"
                {...register('name', { required: 'Branch name is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter branch name"
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Branch Code
              </label>
              <input
                type="text"
                {...register('branchCode')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter branch code (optional)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email *
              </label>
              <input
                type="email"
                {...register('email', { 
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address'
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter email address"
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone *
              </label>
              <input
                type="tel"
                {...register('phone', { required: 'Phone number is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter phone number"
              />
              {errors.phone && (
                <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Alternate Phone
              </label>
              <input
                type="tel"
                {...register('alternatePhone')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter alternate phone (optional)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Drug License Number *
              </label>
              <input
                type="text"
                {...register('drugLicenseNumber', { required: 'Drug license number is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter drug license number"
              />
              {errors.drugLicenseNumber && (
                <p className="text-red-500 text-sm mt-1">{errors.drugLicenseNumber.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Tax Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Tax Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                GST Number *
              </label>
              <input
                type="text"
                {...register('gstNumber', { required: 'GST number is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter GST number"
              />
              {errors.gstNumber && (
                <p className="text-red-500 text-sm mt-1">{errors.gstNumber.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                PAN Number *
              </label>
              <input
                type="text"
                {...register('panNumber', { required: 'PAN number is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter PAN number"
              />
              {errors.panNumber && (
                <p className="text-red-500 text-sm mt-1">{errors.panNumber.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Address Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Address Information</h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                GST Address *
              </label>
              <textarea
                {...register('gstAddress', { required: 'GST address is required' })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter complete address as per GST registration"
              />
              {errors.gstAddress && (
                <p className="text-red-500 text-sm mt-1">{errors.gstAddress.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City *
                </label>
                <input
                  type="text"
                  {...register('city', { required: 'City is required' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter city"
                />
                {errors.city && (
                  <p className="text-red-500 text-sm mt-1">{errors.city.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State *
                </label>
                <select
                  {...register('state', { required: 'State is required' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={statesLoading}
                >
                  <option value="">Select State</option>
                  {states.map((state) => (
                    <option key={state._id} value={state._id}>
                      {state.name}
                    </option>
                  ))}
                </select>
                {errors.state && (
                  <p className="text-red-500 text-sm mt-1">{errors.state.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pin Code *
                </label>
                <input
                  type="text"
                  {...register('pincode', { 
                    required: 'Pin code is required',
                    pattern: {
                      value: /^[0-9]{6}$/,
                      message: 'Pin code must be 6 digits'
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter pin code"
                />
                {errors.pincode && (
                  <p className="text-red-500 text-sm mt-1">{errors.pincode.message}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Documents Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Documents</h2>
            <button
              type="button"
              onClick={() => setShowAddDocument(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Document
            </button>
          </div>

          {/* Add Document Form */}
          {showAddDocument && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="text-md font-medium text-gray-900 mb-3">Add New Document</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Document Name *
                  </label>
                  <input
                    type="text"
                    value={newDocument.documentName}
                    onChange={(e) => setNewDocument(prev => ({ ...prev, documentName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Drug License, Rental Agreement"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Validity Start Date *
                  </label>
                  <input
                    type="date"
                    value={newDocument.validityStartDate}
                    onChange={(e) => setNewDocument(prev => ({ ...prev, validityStartDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Validity End Date *
                  </label>
                  <input
                    type="date"
                    value={newDocument.validityEndDate}
                    onChange={(e) => setNewDocument(prev => ({ ...prev, validityEndDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  Select File
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddDocument(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Existing Documents */}
          {existingDocuments.length > 0 && (
            <div className="mb-6">
              <h3 className="text-md font-medium text-gray-900 mb-3">Existing Documents</h3>
              <div className="space-y-3">
                {existingDocuments.map((doc) => (
                  <div key={doc._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
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
                        onClick={() => handleView(doc.filename)}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                        title="View Document"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownload(doc.filename, doc.originalName)}
                        className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                        title="Download Document"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteExistingDocument(doc._id)}
                        disabled={deleteDocumentLoading === doc._id}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                        title="Delete Document"
                      >
                        {deleteDocumentLoading === doc._id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Selected Documents */}
          {selectedDocuments.length > 0 && (
            <div>
              <h3 className="text-md font-medium text-gray-900 mb-3">New Documents to Upload</h3>
              <div className="space-y-3">
                {selectedDocuments.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-medium text-gray-900">{doc.documentName}</p>
                        <p className="text-sm text-gray-600">
                          {doc.file.name} ({(doc.file.size / 1024 / 1024).toFixed(2)} MB)
                        </p>
                        <p className="text-sm text-gray-600">
                          Valid: {new Date(doc.validityStartDate).toLocaleDateString()} - {new Date(doc.validityEndDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSelectedDocument(doc.id)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                      title="Remove Document"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Additional Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Remarks / Notes
              </label>
              <textarea
                {...register('remarks')}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter any additional notes or remarks"
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                {...register('isActive')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="text-sm font-medium text-gray-700">
                Active Branch
              </label>
            </div>
          </div>
        </div>

        {/* Upload Progress */}
        {loading && uploadProgress > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              <span className="text-sm font-medium text-gray-700">
                {isEdit ? 'Updating' : 'Creating'} branch... {uploadProgress}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-4 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <button
            type="button"
            onClick={() => navigate('/branches')}
            className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || (!canCreate && !isEdit) || (!canUpdate && isEdit)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {loading ? (isEdit ? 'Updating...' : 'Creating...') : (isEdit ? 'Update Branch' : 'Create Branch')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BranchForm;