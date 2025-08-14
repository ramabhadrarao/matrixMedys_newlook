// src/components/Principals/PrincipalDetails.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  Building2,
  FileText,
  CreditCard,
  User,
  Briefcase,
  Files,
  Download,
  Eye,
  Plus,
  Loader2,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  Clock,
  Users,
  Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { 
  principalAPI, 
  Principal, 
  AddressFormData,
  ContactPersonFormData,
  DocumentFormData
} from '../../services/principalAPI';
import { portfolioAPI, Portfolio } from '../../services/doctorAPI';
import { statesAPI, handleApiError } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

interface State {
  _id: string;
  name: string;
  code: string;
}

const PrincipalDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuthStore();
  
  const [principal, setPrincipal] = useState<Principal | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  // Address management states
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [editingAddress, setEditingAddress] = useState<any>(null);
  const [savingAddress, setSavingAddress] = useState(false);
  const [deleteAddressLoading, setDeleteAddressLoading] = useState<string>('');
  const [states, setStates] = useState<State[]>([]);
  
  // Document management states
  const [showAddDocument, setShowAddDocument] = useState(false);
  const [selectedDocumentFile, setSelectedDocumentFile] = useState<File | null>(null);
  const [documentData, setDocumentData] = useState({
    name: '',
    hasValidity: false,
    startDate: '',
    endDate: ''
  });
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deletingDocuments, setDeletingDocuments] = useState<Set<string>>(new Set());
  
  // Contact person management states
  const [showAddContact, setShowAddContact] = useState(false);
  const [editingContact, setEditingContact] = useState<any>(null);
  const [savingContact, setSavingContact] = useState(false);
  const [deleteContactLoading, setDeleteContactLoading] = useState<string>('');
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);

  const canUpdate = hasPermission('principals', 'update');
  const canDelete = hasPermission('principals', 'delete');

  // Forms
  const addressForm = useForm<AddressFormData>();
  const contactForm = useForm<ContactPersonFormData>();

  useEffect(() => {
    if (id) {
      fetchPrincipalDetails();
      fetchInitialData();
    }
  }, [id]);

  const fetchPrincipalDetails = async () => {
    try {
      setLoading(true);
      const response = await principalAPI.getPrincipal(id!);
      setPrincipal(response.data.principal);
    } catch (error) {
      handleApiError(error);
      navigate('/principals');
    } finally {
      setLoading(false);
    }
  };

  const fetchInitialData = async () => {
    try {
      const [statesResponse, portfoliosResponse] = await Promise.all([
        statesAPI.getStates({ limit: 100 }),
        portfolioAPI.getPortfolios({ limit: 100 })
      ]);
      setStates(statesResponse.data.states || []);
      setPortfolios(portfoliosResponse.data.portfolios || []);
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  };

  const handleDelete = async () => {
    if (!principal) return;
    
    try {
      setDeleteLoading(true);
      await principalAPI.deletePrincipal(principal._id);
      toast.success('Principal deleted successfully');
      navigate('/principals');
    } catch (error) {
      handleApiError(error);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Address management functions
  const handleAddAddress = () => {
    addressForm.reset({
      title: '',
      city: '',
      state: '',
      pincode: ''
    });
    setEditingAddress(null);
    setShowAddAddress(true);
  };

  const handleEditAddress = (address: any) => {
    addressForm.reset({
      title: address.title,
      city: address.city,
      state: address.state._id || address.state,
      pincode: address.pincode
    });
    setEditingAddress(address);
    setShowAddAddress(true);
  };

  const onSubmitAddress = async (data: AddressFormData) => {
    if (!principal) return;
    
    try {
      setSavingAddress(true);
      if (editingAddress) {
        await principalAPI.updateAddress(principal._id, editingAddress._id, data);
        toast.success('Address updated successfully');
      } else {
        await principalAPI.addAddress(principal._id, data);
        toast.success('Address added successfully');
      }
      setShowAddAddress(false);
      setEditingAddress(null);
      fetchPrincipalDetails();
    } catch (error) {
      handleApiError(error);
    } finally {
      setSavingAddress(false);
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!principal) return;
    
    try {
      setDeleteAddressLoading(addressId);
      await principalAPI.deleteAddress(principal._id, addressId);
      toast.success('Address deleted successfully');
      fetchPrincipalDetails();
    } catch (error) {
      handleApiError(error);
    } finally {
      setDeleteAddressLoading('');
    }
  };

  // Document management functions
  const handleDocumentFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
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
        toast.error('Invalid file type. Only PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, PNG, and TXT files are allowed.');
        return;
      }
      
      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File too large. Maximum size is 10MB.');
        return;
      }
      
      setSelectedDocumentFile(file);
      setDocumentData(prev => ({ ...prev, name: file.name.split('.')[0] }));
      toast.success('File selected successfully');
    }
  };

  const handleAddDocument = async () => {
    if (!selectedDocumentFile || !principal || !documentData.name) {
      toast.error('Please select a file and enter a document name');
      return;
    }
    
    if (documentData.hasValidity && (!documentData.startDate || !documentData.endDate)) {
      toast.error('Please enter validity dates');
      return;
    }
    
    try {
      setUploadingDocument(true);
      setUploadProgress(0);
      
      const documentFormData: DocumentFormData = {
        file: selectedDocumentFile,
        name: documentData.name,
        hasValidity: documentData.hasValidity,
        startDate: documentData.startDate || undefined,
        endDate: documentData.endDate || undefined
      };
      
      await principalAPI.addDocument(principal._id, documentFormData, setUploadProgress);
      
      // Reset form
      setSelectedDocumentFile(null);
      setDocumentData({ name: '', hasValidity: false, startDate: '', endDate: '' });
      setShowAddDocument(false);
      
      toast.success('Document uploaded successfully');
      fetchPrincipalDetails();
    } catch (error) {
      handleApiError(error);
    } finally {
      setUploadingDocument(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!principal) return;
    
    try {
      setDeletingDocuments(prev => new Set(prev).add(documentId));
      await principalAPI.deleteDocument(principal._id, documentId);
      toast.success('Document deleted successfully');
      fetchPrincipalDetails();
    } catch (error) {
      handleApiError(error);
    } finally {
      setDeletingDocuments(prev => {
        const newSet = new Set(prev);
        newSet.delete(documentId);
        return newSet;
      });
    }
  };

  // Contact person management functions
  const handleAddContact = () => {
    contactForm.reset({
      portfolio: '',
      departmentName: '',
      personName: '',
      email: '',
      mobile: '',
      address: '',
      location: '',
      pincode: ''
    });
    setEditingContact(null);
    setShowAddContact(true);
  };

  const handleEditContact = (contact: any) => {
    contactForm.reset({
      portfolio: contact.portfolio?._id || '',
      departmentName: contact.departmentName,
      personName: contact.personName,
      email: contact.email,
      mobile: contact.mobile,
      address: contact.address || '',
      location: contact.location,
      pincode: contact.pincode
    });
    setEditingContact(contact);
    setShowAddContact(true);
  };

  const onSubmitContact = async (data: ContactPersonFormData) => {
    if (!principal) return;
    
    try {
      setSavingContact(true);
      const contactData = {
        ...data,
        portfolio: data.portfolio || undefined
      };
      
      if (editingContact) {
        await principalAPI.updateContact(principal._id, editingContact._id, contactData);
        toast.success('Contact person updated successfully');
      } else {
        await principalAPI.addContact(principal._id, contactData);
        toast.success('Contact person added successfully');
      }
      setShowAddContact(false);
      setEditingContact(null);
      fetchPrincipalDetails();
    } catch (error) {
      handleApiError(error);
    } finally {
      setSavingContact(false);
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!principal) return;
    
    try {
      setDeleteContactLoading(contactId);
      await principalAPI.deleteContact(principal._id, contactId);
      toast.success('Contact person deleted successfully');
      fetchPrincipalDetails();
    } catch (error) {
      handleApiError(error);
    } finally {
      setDeleteContactLoading('');
    }
  };

  // Utility functions
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString();
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

  const isDocumentExpired = (endDate?: string) => {
    if (!endDate) return false;
    return new Date(endDate) < new Date();
  };

  const handleViewFile = (filename: string) => {
    principalAPI.viewFile(filename);
  };

  const handleDownloadFile = (filename: string, originalName: string) => {
    principalAPI.downloadFile(filename, originalName);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!principal) {
    return (
      <div className="text-center py-12">
        <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">Principal not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/principals')}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Principal Details</h1>
            <p className="text-gray-600 mt-1">View and manage principal information</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {canUpdate && (
            <Link
              to={`/principals/${principal._id}/edit`}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Principal
            </Link>
          )}
          
          {canDelete && (
            <button
              onClick={() => setShowDeleteModal(true)}
              className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Principal Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-sm p-6"
      >
        <div className="flex items-start space-x-6">
          <div className="w-24 h-24 bg-indigo-500 rounded-full flex items-center justify-center">
            <Building2 className="w-12 h-12 text-white" />
          </div>
          
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{principal.name}</h2>
                <div className="mt-2 space-y-1">
                  <div className="flex items-center text-gray-600">
                    <Mail className="w-4 h-4 mr-2" />
                    {principal.email}
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Phone className="w-4 h-4 mr-2" />
                    {principal.mobile}
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                  principal.isActive 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {principal.isActive ? 'Active' : 'Inactive'}
                </span>
                <div className="mt-2 text-sm text-gray-500">
                  Created: {formatDate(principal.createdAt)}
                </div>
              </div>
            </div>
            
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center text-sm text-gray-600 mb-1">
                  <FileText className="w-4 h-4 mr-1" />
                  GST Number
                </div>
                <div className="font-medium text-gray-900">{principal.gstNumber}</div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center text-sm text-gray-600 mb-1">
                  <CreditCard className="w-4 h-4 mr-1" />
                  PAN Number
                </div>
                <div className="font-medium text-gray-900">{principal.panNumber}</div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Portfolios */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-lg shadow-sm p-6"
      >
        <div className="flex items-center mb-4">
          <Briefcase className="w-5 h-5 text-blue-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Portfolios</h3>
        </div>
        
        {principal.portfolio.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No portfolios assigned</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {principal.portfolio.map((portfolio) => (
              <div key={portfolio._id} className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900">{portfolio.name}</h4>
                <p className="text-sm text-gray-600 mt-1">{portfolio.description}</p>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mt-2 ${
                  portfolio.isActive 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {portfolio.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Addresses */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-lg shadow-sm p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <MapPin className="w-5 h-5 text-green-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">
              Addresses ({principal.addresses.length})
            </h3>
          </div>
          
          {canUpdate && (
            <button
              onClick={handleAddAddress}
              className="inline-flex items-center px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Address
            </button>
          )}
        </div>
        
        {principal.addresses.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No addresses added yet</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {principal.addresses.map((address) => (
              <div key={address._id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{address.title}</h4>
                  {canUpdate && (
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleEditAddress(address)}
                        className="text-blue-600 hover:text-blue-800 p-1 rounded"
                        title="Edit Address"
                      >
                        <Edit className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteAddress(address._id)}
                        disabled={deleteAddressLoading === address._id}
                        className="text-red-600 hover:text-red-800 p-1 rounded disabled:opacity-50"
                        title="Delete Address"
                      >
                        {deleteAddressLoading === address._id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
                <div className="space-y-1 text-sm text-gray-600">
                  <div>{address.city}</div>
                  <div>{address.state.name} ({address.state.code})</div>
                  <div>Pincode: {address.pincode}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Documents */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-lg shadow-sm p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Files className="w-5 h-5 text-orange-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">
              Documents ({principal.documents.length})
            </h3>
          </div>
          
          {canUpdate && (
            <button
              onClick={() => setShowAddDocument(true)}
              className="inline-flex items-center px-3 py-1 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors duration-200"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Document
            </button>
          )}
        </div>
        
        {principal.documents.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No documents uploaded</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {principal.documents.map((document) => (
              <div key={document._id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    {getFileIcon(document.mimetype)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {document.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(document.size)} • {formatDate(document.uploadedAt)}
                      </p>
                    </div>
                  </div>
                  
                  {canUpdate && (
                    <button
                      onClick={() => handleDeleteDocument(document._id)}
                      disabled={deletingDocuments.has(document._id)}
                      className="text-red-600 hover:text-red-800 p-1 rounded disabled:opacity-50"
                      title="Delete Document"
                    >
                      {deletingDocuments.has(document._id) ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
                
                {document.hasValidity && (
                  <div className="mb-3 p-2 bg-gray-50 rounded">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-600">Valid from:</span>
                      <span className="font-medium">{formatDate(document.startDate!)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">Valid to:</span>
                      <span className={`font-medium ${isDocumentExpired(document.endDate) ? 'text-red-600' : 'text-green-600'}`}>
                        {formatDate(document.endDate!)}
                      </span>
                    </div>
                    {isDocumentExpired(document.endDate) && (
                      <div className="flex items-center mt-2 text-xs text-red-600">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Document Expired
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {document.originalName}
                  </span>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleViewFile(document.filename)}
                      className="text-blue-600 hover:text-blue-800 p-1 rounded"
                      title="View File"
                    >
                      <Eye className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDownloadFile(document.filename, document.originalName)}
                      className="text-green-600 hover:text-green-800 p-1 rounded"
                      title="Download"
                    >
                      <Download className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                
                <div className="mt-2 text-xs text-gray-500">
                  Uploaded by {document.uploadedBy.name}
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Contact Persons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-lg shadow-sm p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Users className="w-5 h-5 text-purple-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">
              Contact Persons ({principal.contactPersons.length})
            </h3>
          </div>
          
          {canUpdate && (
            <button
              onClick={handleAddContact}
              className="inline-flex items-center px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Contact
            </button>
          )}
        </div>
        
        {principal.contactPersons.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No contact persons added yet</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {principal.contactPersons.map((contact) => (
              <div key={contact._id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-medium text-gray-900">{contact.personName}</h4>
                    <p className="text-sm text-gray-600">{contact.departmentName}</p>
                    {contact.portfolio && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                        <Briefcase className="w-3 h-3 mr-1" />
                        {contact.portfolio.name}
                      </span>
                    )}
                  </div>
                  {canUpdate && (
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleEditContact(contact)}
                        className="text-blue-600 hover:text-blue-800 p-1 rounded"
                        title="Edit Contact"
                      >
                        <Edit className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteContact(contact._id)}
                        disabled={deleteContactLoading === contact._id}
                        className="text-red-600 hover:text-red-800 p-1 rounded disabled:opacity-50"
                        title="Delete Contact"
                      >
                        {deleteContactLoading === contact._id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="space-y-1 text-sm">
                  <div className="flex items-center text-gray-600">
                    <Mail className="w-3 h-3 mr-2" />
                    {contact.email}
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Phone className="w-3 h-3 mr-2" />
                    {contact.mobile}
                  </div>
                  <div className="flex items-center text-gray-600">
                    <MapPin className="w-3 h-3 mr-2" />
                    {contact.location}
                  </div>
                </div>
                
                {contact.address && (
                  <div className="mt-2 text-xs text-gray-500">
                    {contact.address} - {contact.pincode}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Metadata Information */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-gray-50 rounded-lg p-6"
      >
        <h3 className="text-sm font-medium text-gray-900 mb-4">Additional Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Created by:</span>
            <span className="ml-2 font-medium text-gray-900">{principal.createdBy.name}</span>
          </div>
          <div>
            <span className="text-gray-600">Created on:</span>
            <span className="ml-2 font-medium text-gray-900">{formatDate(principal.createdAt)}</span>
          </div>
          {principal.updatedBy && (
            <>
              <div>
                <span className="text-gray-600">Last updated by:</span>
                <span className="ml-2 font-medium text-gray-900">{principal.updatedBy.name}</span>
              </div>
              <div>
                <span className="text-gray-600">Last updated on:</span>
                <span className="ml-2 font-medium text-gray-900">{formatDate(principal.updatedAt)}</span>
              </div>
            </>
          )}
        </div>
      </motion.div>

      {/* Add/Edit Address Modal */}
      {showAddAddress && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">
                {editingAddress ? 'Edit Address' : 'Add New Address'}
              </h3>
              <button
                onClick={() => {
                  setShowAddAddress(false);
                  setEditingAddress(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={addressForm.handleSubmit(onSubmitAddress)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address Title *
                </label>
                <input
                  {...addressForm.register('title', {
                    required: 'Address title is required',
                  })}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Head Office, Branch Office"
                />
                {addressForm.formState.errors.title && (
                  <p className="mt-1 text-sm text-red-600">{addressForm.formState.errors.title.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City *
                </label>
                <input
                  {...addressForm.register('city', {
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
                {addressForm.formState.errors.city && (
                  <p className="mt-1 text-sm text-red-600">{addressForm.formState.errors.city.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State *
                </label>
                <select
                  {...addressForm.register('state', {
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
                {addressForm.formState.errors.state && (
                  <p className="mt-1 text-sm text-red-600">{addressForm.formState.errors.state.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pincode *
                </label>
                <input
                  {...addressForm.register('pincode', {
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
                {addressForm.formState.errors.pincode && (
                  <p className="mt-1 text-sm text-red-600">{addressForm.formState.errors.pincode.message}</p>
                )}
              </div>

              <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddAddress(false);
                    setEditingAddress(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAddress}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-colors duration-200"
                >
                  {savingAddress ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      {editingAddress ? 'Updating...' : 'Adding...'}
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {editingAddress ? 'Update Address' : 'Add Address'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Add Document Modal */}
      {showAddDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">Add New Document</h3>
              <button
                onClick={() => {
                  setShowAddDocument(false);
                  setSelectedDocumentFile(null);
                  setDocumentData({ name: '', hasValidity: false, startDate: '', endDate: '' });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select File *
                </label>
                {selectedDocumentFile ? (
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {getFileIcon(selectedDocumentFile.type)}
                        <div>
                          <p className="text-sm font-medium text-gray-900">{selectedDocumentFile.name}</p>
                          <p className="text-xs text-gray-500">{formatFileSize(selectedDocumentFile.size)}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedDocumentFile(null)}
                        className="text-red-600 hover:text-red-800 p-1 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <label htmlFor="document-file" className="cursor-pointer">
                      <span className="text-blue-600 hover:text-blue-500 font-medium">Upload a file</span>
                      <span className="text-gray-500"> or drag and drop</span>
                    </label>
                    <input
                      id="document-file"
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt"
                      onChange={handleDocumentFileSelect}
                    />
                    <p className="text-xs text-gray-500 mt-1">PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, PNG, TXT up to 10MB</p>
                  </div>
                )}
              </div>

              {/* Document Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Document Name *
                </label>
                <input
                  type="text"
                  value={documentData.name}
                  onChange={(e) => setDocumentData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter document name"
                />
              </div>

              {/* Validity Toggle */}
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={documentData.hasValidity}
                    onChange={(e) => setDocumentData(prev => ({ ...prev, hasValidity: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  />
                  <span className="ml-2 text-sm text-gray-700">This document has validity period</span>
                </label>
              </div>

              {/* Validity Dates */}
              {documentData.hasValidity && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      value={documentData.startDate}
                      onChange={(e) => setDocumentData(prev => ({ ...prev, startDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date *
                    </label>
                    <input
                      type="date"
                      value={documentData.endDate}
                      onChange={(e) => setDocumentData(prev => ({ ...prev, endDate: e.target.value }))}
                      min={documentData.startDate}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}

              {/* Upload Progress */}
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div>
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

            <div className="flex justify-end space-x-4 mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowAddDocument(false);
                  setSelectedDocumentFile(null);
                  setDocumentData({ name: '', hasValidity: false, startDate: '', endDate: '' });
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleAddDocument}
                disabled={!selectedDocumentFile || !documentData.name || uploadingDocument}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-colors duration-200"
              >
                {uploadingDocument ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Document
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Add/Edit Contact Modal */}
      {showAddContact && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingContact ? 'Edit Contact Person' : 'Add New Contact Person'}
                </h3>
                <button
                  onClick={() => {
                    setShowAddContact(false);
                    setEditingContact(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={contactForm.handleSubmit(onSubmitContact)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Person Name *
                    </label>
                    <input
                      {...contactForm.register('personName', {
                        required: 'Person name is required',
                      })}
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter person name"
                    />
                    {contactForm.formState.errors.personName && (
                      <p className="mt-1 text-sm text-red-600">{contactForm.formState.errors.personName.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Department Name *
                    </label>
                    <input
                      {...contactForm.register('departmentName', {
                        required: 'Department name is required',
                      })}
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter department name"
                    />
                    {contactForm.formState.errors.departmentName && (
                      <p className="mt-1 text-sm text-red-600">{contactForm.formState.errors.departmentName.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Portfolio (Optional)
                    </label>
                    <select
                      {...contactForm.register('portfolio')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select Portfolio</option>
                      {portfolios.map((portfolio) => (
                        <option key={portfolio._id} value={portfolio._id}>
                          {portfolio.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      {...contactForm.register('email', {
                        required: 'Email is required',
                        pattern: {
                          value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                          message: 'Please enter a valid email',
                        },
                      })}
                      type="email"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter email address"
                    />
                    {contactForm.formState.errors.email && (
                      <p className="mt-1 text-sm text-red-600">{contactForm.formState.errors.email.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mobile *
                    </label>
                    <input
                      {...contactForm.register('mobile', {
                        required: 'Mobile is required',
                        minLength: {
                          value: 10,
                          message: 'Mobile must be at least 10 digits',
                        },
                      })}
                      type="tel"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter mobile number"
                    />
                    {contactForm.formState.errors.mobile && (
                      <p className="mt-1 text-sm text-red-600">{contactForm.formState.errors.mobile.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Location *
                    </label>
                    <input
                      {...contactForm.register('location', {
                        required: 'Location is required',
                      })}
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Floor 2, Wing A"
                    />
                    {contactForm.formState.errors.location && (
                      <p className="mt-1 text-sm text-red-600">{contactForm.formState.errors.location.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pincode *
                    </label>
                    <input
                      {...contactForm.register('pincode', {
                        required: 'Pincode is required',
                        pattern: {
                          value: /^[0-9]{6}$/,
                          message: 'Pincode must be 6 digits',
                        },
                      })}
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter pincode"
                    />
                    {contactForm.formState.errors.pincode && (
                      <p className="mt-1 text-sm text-red-600">{contactForm.formState.errors.pincode.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address (Optional)
                  </label>
                  <textarea
                    {...contactForm.register('address')}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter complete address"
                  />
                </div>

                <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddContact(false);
                      setEditingContact(null);
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingContact}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-colors duration-200"
                  >
                    {savingContact ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        {editingContact ? 'Updating...' : 'Adding...'}
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        {editingContact ? 'Update Contact' : 'Add Contact'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
          >
            <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Principal</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <strong>"{principal.name}"</strong>? This action cannot be undone and will also delete all associated addresses, documents, and contact persons.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleteLoading}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 disabled:opacity-50 flex items-center"
              >
                {deleteLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Deleting...
                  </>
                ) : (
                  'Delete Principal'
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default PrincipalDetails;