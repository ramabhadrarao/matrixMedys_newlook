// src/components/Doctors/DoctorForm.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
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
  Target,
  Calendar,
  Search,
  Check,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { doctorAPI, portfolioAPI, DoctorFormData, Portfolio, MonthlyTarget } from '../../services/doctorAPI';
import { hospitalAPI } from '../../services/hospitalAPI';
import { handleApiError } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

interface FileWithMetadata {
  file: File;
  fileType: string;
  description: string;
  id: string;
}

interface Hospital {
  _id: string;
  name: string;
  city: string;
  state: {
    _id: string;
    name: string;
    code: string;
  };
}

const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december'
];

const DoctorForm: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hospitalSearchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEdit);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [allHospitals, setAllHospitals] = useState<Hospital[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  
  // Hospital selection states
  const [selectedHospitals, setSelectedHospitals] = useState<Hospital[]>([]);
  const [hospitalSearchTerm, setHospitalSearchTerm] = useState('');
  const [showHospitalDropdown, setShowHospitalDropdown] = useState(false);
  const [hospitalSearchResults, setHospitalSearchResults] = useState<Hospital[]>([]);
  const [hospitalSearchLoading, setHospitalSearchLoading] = useState(false);
  
  // File states
  const [selectedFiles, setSelectedFiles] = useState<FileWithMetadata[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<any[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deleteFileLoading, setDeleteFileLoading] = useState<string>('');

  const { hasPermission } = useAuthStore();
  const canCreate = hasPermission('doctors', 'create');
  const canUpdate = hasPermission('doctors', 'update');

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<DoctorFormData>({
    defaultValues: {
      isActive: true,
      specialization: [],
      hospitals: [],
      targets: []
    },
  });

  const { fields: targetFields, append: appendTarget, remove: removeTarget } = useFieldArray({
    control,
    name: 'targets'
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowHospitalDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    fetchInitialData();
    if (isEdit && id) {
      fetchDoctor(id);
    }
  }, [id, isEdit]);

  // Search hospitals with debounce
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (hospitalSearchTerm.trim()) {
        searchHospitals(hospitalSearchTerm);
      } else {
        setHospitalSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [hospitalSearchTerm]);

  const fetchInitialData = async () => {
    try {
      setDataLoading(true);
      const [portfoliosResponse] = await Promise.all([
        portfolioAPI.getPortfolios({ limit: 100 })
      ]);
      
      setPortfolios(portfoliosResponse.data.portfolios || []);
    } catch (error) {
      console.error('Error fetching initial data:', error);
      handleApiError(error);
    } finally {
      setDataLoading(false);
    }
  };

  const searchHospitals = async (searchTerm: string) => {
    try {
      setHospitalSearchLoading(true);
      const response = await hospitalAPI.getHospitals({ 
        search: searchTerm,
        limit: 20 
      });
      setHospitalSearchResults(response.data.hospitals || []);
    } catch (error) {
      console.error('Error searching hospitals:', error);
      handleApiError(error);
    } finally {
      setHospitalSearchLoading(false);
    }
  };

  const fetchDoctor = async (doctorId: string) => {
    try {
      setInitialLoading(true);
      const response = await doctorAPI.getDoctor(doctorId);
      const doctor = response.data.doctor;
      
      setValue('name', doctor.name);
      setValue('email', doctor.email);
      setValue('phone', doctor.phone);
      setValue('location', doctor.location);
      setValue('isActive', doctor.isActive);
      setValue('specialization', doctor.specialization.map((spec: any) => spec._id));
      setValue('hospitals', doctor.hospitals.map((hospital: any) => hospital._id));
      setValue('targets', doctor.targets || []);
      
      // Set selected hospitals
      setSelectedHospitals(doctor.hospitals || []);
      
      if (doctor.attachments && doctor.attachments.length > 0) {
        setExistingAttachments(doctor.attachments);
      }
    } catch (error) {
      handleApiError(error);
      navigate('/doctors');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleAddHospital = (hospital: Hospital) => {
    if (!selectedHospitals.find(h => h._id === hospital._id)) {
      const newSelectedHospitals = [...selectedHospitals, hospital];
      setSelectedHospitals(newSelectedHospitals);
      setValue('hospitals', newSelectedHospitals.map(h => h._id));
      setHospitalSearchTerm('');
      setShowHospitalDropdown(false);
      hospitalSearchRef.current?.focus();
    }
  };

  const handleRemoveHospital = (hospitalId: string) => {
    const newSelectedHospitals = selectedHospitals.filter(h => h._id !== hospitalId);
    setSelectedHospitals(newSelectedHospitals);
    setValue('hospitals', newSelectedHospitals.map(h => h._id));
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
          fileType: 'other',
          description: '',
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

  const updateFileMetadata = (fileId: string, field: 'fileType' | 'description', value: string) => {
    setSelectedFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, [field]: value } : f
    ));
  };

  const handleDeleteExistingAttachment = async (attachmentId: string) => {
    if (!id) return;
    
    try {
      setDeleteFileLoading(attachmentId);
      await doctorAPI.deleteAttachment(id, attachmentId);
      setExistingAttachments(prev => prev.filter(att => att._id !== attachmentId));
      toast.success('Attachment deleted successfully');
    } catch (error) {
      handleApiError(error);
    } finally {
      setDeleteFileLoading('');
    }
  };

  const addTargetField = () => {
    const currentYear = new Date().getFullYear();
    appendTarget({
      month: 'january' as any,
      target: 0,
      year: currentYear
    });
  };

  const onSubmit = async (data: DoctorFormData) => {
    if (selectedHospitals.length === 0) {
      toast.error('Please select at least one hospital');
      return;
    }

    setLoading(true);
    setUploadProgress(0);
    
    try {
      const formData: DoctorFormData = {
        ...data,
        hospitals: selectedHospitals.map(h => h._id),
        attachments: selectedFiles.map(f => f.file),
        fileTypes: selectedFiles.map(f => f.fileType),
        descriptions: selectedFiles.map(f => f.description),
      };

      if (isEdit && id) {
        await doctorAPI.updateDoctor(id, formData, setUploadProgress);
        toast.success('Doctor updated successfully');
      } else {
        await doctorAPI.createDoctor(formData, setUploadProgress);
        toast.success('Doctor created successfully');
      }
      
      navigate('/doctors');
    } catch (error: any) {
      console.error('Submit error:', error);
      handleApiError(error);
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

  const getFileTypeColor = (fileType: string) => {
    switch (fileType) {
      case 'license': return 'bg-blue-100 text-blue-800';
      case 'certificate': return 'bg-green-100 text-green-800';
      case 'degree': return 'bg-purple-100 text-purple-800';
      case 'cv': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleViewFile = (filename: string) => {
    doctorAPI.viewFile(filename);
  };

  const handleDownloadFile = (filename: string, originalName: string) => {
    doctorAPI.downloadFile(filename, originalName);
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
          onClick={() => navigate('/doctors')}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit Doctor' : 'Add New Doctor'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isEdit ? 'Update doctor information and attachments' : 'Create a new doctor profile with specializations and targets'}
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
                  Doctor Name *
                </label>
                <input
                  {...register('name', {
                    required: 'Doctor name is required',
                    minLength: {
                      value: 2,
                      message: 'Name must be at least 2 characters',
                    },
                  })}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter doctor name"
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

              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                  Location *
                </label>
                <input
                  {...register('location', {
                    required: 'Location is required',
                    minLength: {
                      value: 2,
                      message: 'Location must be at least 2 characters',
                    },
                  })}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter location"
                />
                {errors.location && (
                  <p className="mt-1 text-sm text-red-600">{errors.location.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Specializations */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
              Specializations
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Specializations *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-3">
                {portfolios.map((portfolio) => (
                  <label key={portfolio._id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                    <input
                      {...register('specialization', {
                        required: 'At least one specialization is required',
                      })}
                      type="checkbox"
                      value={portfolio._id}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-900">{portfolio.name}</span>
                      <p className="text-xs text-gray-500">{portfolio.description}</p>
                    </div>
                  </label>
                ))}
              </div>
              {errors.specialization && (
                <p className="mt-1 text-sm text-red-600">{errors.specialization.message}</p>
              )}
            </div>
          </div>

          {/* Hospitals - New Implementation */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
              Associated Hospitals
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search and Add Hospitals *
              </label>
              
              {/* Search Input */}
              <div className="relative" ref={dropdownRef}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    ref={hospitalSearchRef}
                    type="text"
                    value={hospitalSearchTerm}
                    onChange={(e) => {
                      setHospitalSearchTerm(e.target.value);
                      setShowHospitalDropdown(true);
                    }}
                    onFocus={() => setShowHospitalDropdown(true)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Type to search hospitals..."
                  />
                  {hospitalSearchLoading && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Dropdown Results */}
                <AnimatePresence>
                  {showHospitalDropdown && hospitalSearchResults.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-60 overflow-y-auto"
                    >
                      {hospitalSearchResults.map((hospital) => {
                        const isSelected = selectedHospitals.some(h => h._id === hospital._id);
                        return (
                          <button
                            key={hospital._id}
                            type="button"
                            onClick={() => handleAddHospital(hospital)}
                            disabled={isSelected}
                            className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                              isSelected ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-gray-900">{hospital.name}</p>
                                <p className="text-sm text-gray-500">{hospital.city}, {hospital.state.name}</p>
                              </div>
                              {isSelected && (
                                <Check className="w-4 h-4 text-green-600" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* No Results */}
                {showHospitalDropdown && hospitalSearchTerm && !hospitalSearchLoading && hospitalSearchResults.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 p-4 text-center text-gray-500"
                  >
                    No hospitals found
                  </motion.div>
                )}
              </div>

              {/* Selected Hospitals */}
              {selectedHospitals.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-gray-600 mb-2">Selected Hospitals ({selectedHospitals.length}):</p>
                  <div className="space-y-2">
                    {selectedHospitals.map((hospital) => (
                      <div
                        key={hospital._id}
                        className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200"
                      >
                        <div>
                          <p className="font-medium text-gray-900">{hospital.name}</p>
                          <p className="text-sm text-gray-600">{hospital.city}, {hospital.state.name}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveHospital(hospital._id)}
                          className="p-1 text-red-600 hover:text-red-800 hover:bg-red-100 rounded transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedHospitals.length === 0 && (
                <p className="mt-2 text-sm text-gray-500">
                  Start typing to search and select hospitals
                </p>
              )}

              {errors.hospitals && (
                <p className="mt-1 text-sm text-red-600">{errors.hospitals.message}</p>
              )}
            </div>
          </div>

          {/* Monthly Targets */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
                Monthly Targets
              </h3>
              <button
                type="button"
                onClick={addTargetField}
                className="inline-flex items-center px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Target
              </button>
            </div>
            
            {targetFields.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Target className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No targets added yet. Click "Add Target" to set monthly targets.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {targetFields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Month
                      </label>
                      <select
                        {...register(`targets.${index}.month` as const, {
                          required: 'Month is required',
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent capitalize"
                      >
                        {MONTHS.map((month) => (
                          <option key={month} value={month} className="capitalize">
                            {month}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Target
                      </label>
                      <input
                        {...register(`targets.${index}.target` as const, {
                          required: 'Target is required',
                          min: {
                            value: 0,
                            message: 'Target cannot be negative',
                          },
                          valueAsNumber: true,
                        })}
                        type="number"
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter target"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Year
                      </label>
                      <input
                        {...register(`targets.${index}.year` as const, {
                          valueAsNumber: true,
                        })}
                        type="number"
                        min="2020"
                        max="2030"
                        defaultValue={new Date().getFullYear()}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => removeTarget(index)}
                        className="w-full px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors duration-200 flex items-center justify-center"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Existing Attachments */}
          {existingAttachments.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
                Existing Attachments
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {existingAttachments.map((attachment) => (
                  <div key={attachment._id} className="p-4 bg-gray-50 rounded-lg border">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {getFileIcon(attachment.mimetype)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {attachment.originalName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(attachment.size)} • {new Date(attachment.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteExistingAttachment(attachment._id)}
                        disabled={deleteFileLoading === attachment._id}
                        className="text-red-600 hover:text-red-800 p-1 rounded disabled:opacity-50"
                        title="Delete Attachment"
                      >
                        {deleteFileLoading === attachment._id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between mb-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getFileTypeColor(attachment.fileType)}`}>
                        {attachment.fileType}
                      </span>
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => handleViewFile(attachment.filename)}
                          className="text-blue-600 hover:text-blue-800 p-1 rounded"
                          title="View File"
                        >
                          <Eye className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadFile(attachment.filename, attachment.originalName)}
                          className="text-green-600 hover:text-green-800 p-1 rounded"
                          title="Download"
                        >
                          <Download className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    
                    {attachment.description && (
                      <p className="text-xs text-gray-600">{attachment.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New Attachments */}
          {selectedFiles.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
                New Attachments to Upload
              </h3>
              <div className="space-y-4">
                {selectedFiles.map((fileData) => (
                  <div key={fileData.id} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
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
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          File Type
                        </label>
                        <select
                          value={fileData.fileType}
                          onChange={(e) => updateFileMetadata(fileData.id, 'fileType', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="other">Other</option>
                          <option value="license">License</option>
                          <option value="certificate">Certificate</option>
                          <option value="degree">Degree</option>
                          <option value="cv">CV/Resume</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Description
                        </label>
                        <input
                          type="text"
                          value={fileData.description}
                          onChange={(e) => updateFileMetadata(fileData.id, 'description', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Optional description"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* File Upload */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
              Attachments
            </h3>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <label htmlFor="attachments" className="cursor-pointer">
                <span className="text-blue-600 hover:text-blue-500 font-medium">Upload files</span>
                <span className="text-gray-500"> or drag and drop</span>
              </label>
              <input
                ref={fileInputRef}
                id="attachments"
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
              <div className="mt-4">
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
                <span className="ml-2 text-sm text-gray-700">Active Doctor</span>
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Inactive doctors will be hidden from public listings
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate('/doctors')}
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
                  {isEdit ? 'Update Doctor' : 'Create Doctor'}
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default DoctorForm;