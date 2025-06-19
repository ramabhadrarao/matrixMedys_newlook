// src/components/Hospitals/HospitalDetails.tsx - Updated with multiple file support
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Edit, 
  Plus, 
  Search, 
  Trash2, 
  Mail, 
  Phone, 
  MapPin, 
  Building2, 
  FileText, 
  CreditCard,
  User,
  Save,
  X,
  Download,
  Eye,
  ExternalLink,
  Upload,
  FolderOpen
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { 
  hospitalAPI, 
  Hospital, 
  HospitalContact, 
  HospitalContactFormData,
  HospitalDocument,
  DocumentFormData
} from '../../services/hospitalAPI';
import { handleApiError } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

const HospitalDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuthStore();
  
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [contacts, setContacts] = useState<HospitalContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddContact, setShowAddContact] = useState(false);
  const [editingContact, setEditingContact] = useState<HospitalContact | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<HospitalContact | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Document management states
  const [showAddDocument, setShowAddDocument] = useState(false);
  const [selectedDocumentFile, setSelectedDocumentFile] = useState<File | null>(null);
  const [documentData, setDocumentData] = useState({
    fileType: 'other' as 'agreement' | 'license' | 'certificate' | 'other',
    description: ''
  });
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deletingDocuments, setDeletingDocuments] = useState<Set<string>>(new Set());

  const canCreate = hasPermission('hospitals', 'create');
  const canUpdate = hasPermission('hospitals', 'update');
  const canDelete = hasPermission('hospitals', 'delete');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<HospitalContactFormData>({
    defaultValues: {
      isActive: true,
    },
  });

  useEffect(() => {
    if (id) {
      fetchHospitalDetails();
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchContacts();
    }
  }, [id, searchTerm]);

  const fetchHospitalDetails = async () => {
    try {
      setLoading(true);
      const response = await hospitalAPI.getHospital(id!);
      setHospital(response.data.hospital);
    } catch (error) {
      handleApiError(error);
      navigate('/hospitals');
    } finally {
      setLoading(false);
    }
  };

  const fetchContacts = async () => {
    try {
      setContactsLoading(true);
      const params = {
        limit: 100,
        ...(searchTerm && { search: searchTerm.trim() })
      };
      const response = await hospitalAPI.getHospitalContacts(id!, params);
      setContacts(response.data.contacts || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      handleApiError(error);
    } finally {
      setContactsLoading(false);
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
      toast.success('File selected successfully');
    }
  };

  const handleAddDocument = async () => {
    if (!selectedDocumentFile || !id) return;
    
    try {
      setUploadingDocument(true);
      setUploadProgress(0);
      
      const documentFormData: DocumentFormData = {
        file: selectedDocumentFile,
        fileType: documentData.fileType,
        description: documentData.description
      };
      
      await hospitalAPI.addDocument(id, documentFormData, setUploadProgress);
      
      // Refresh hospital data to get updated documents
      await fetchHospitalDetails();
      
      // Reset form
      setSelectedDocumentFile(null);
      setDocumentData({ fileType: 'other', description: '' });
      setShowAddDocument(false);
      
      toast.success('Document uploaded successfully');
    } catch (error) {
      handleApiError(error);
    } finally {
      setUploadingDocument(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!id) return;
    
    try {
      setDeletingDocuments(prev => new Set(prev).add(documentId));
      await hospitalAPI.deleteDocument(id, documentId);
      
      // Update local state
      if (hospital) {
        setHospital({
          ...hospital,
          documents: hospital.documents.filter(doc => doc._id !== documentId)
        });
      }
      
      toast.success('Document deleted successfully');
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

  // Contact management functions
  const handleAddContact = () => {
    reset({
      departmentName: '',
      personName: '',
      email: '',
      phone: '',
      address: '',
      location: '',
      pincode: '',
      isActive: true,
    });
    setEditingContact(null);
    setShowAddContact(true);
  };

  const handleEditContact = (contact: HospitalContact) => {
    reset({
      departmentName: contact.departmentName,
      personName: contact.personName,
      email: contact.email,
      phone: contact.phone,
      address: contact.address,
      location: contact.location,
      pincode: contact.pincode,
      isActive: contact.isActive,
    });
    setEditingContact(contact);
    setShowAddContact(true);
  };

  const onSubmitContact = async (data: HospitalContactFormData) => {
    try {
      setSaving(true);
      if (editingContact) {
        await hospitalAPI.updateHospitalContact(id!, editingContact._id, data);
        toast.success('Contact updated successfully');
      } else {
        await hospitalAPI.createHospitalContact(id!, data);
        toast.success('Contact added successfully');
      }
      setShowAddContact(false);
      setEditingContact(null);
      fetchContacts();
    } catch (error) {
      handleApiError(error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteContact = async () => {
    if (!contactToDelete) return;
    
    try {
      setDeleteLoading(true);
      await hospitalAPI.deleteHospitalContact(id!, contactToDelete._id);
      toast.success('Contact deleted successfully');
      setShowDeleteModal(false);
      setContactToDelete(null);
      fetchContacts();
    } catch (error) {
      handleApiError(error);
    } finally {
      setDeleteLoading(false);
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

  const getFileTypeColor = (fileType: string) => {
    switch (fileType) {
      case 'agreement': return 'bg-blue-100 text-blue-800';
      case 'license': return 'bg-green-100 text-green-800';
      case 'certificate': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleViewFile = (filename: string) => {
    try {
      hospitalAPI.viewFile(filename);
    } catch (error) {
      console.error('View error:', error);
      toast.error('Failed to view file');
    }
  };

  const handleDownloadFile = async (filename: string, originalName: string) => {
    try {
      await hospitalAPI.downloadFile(filename, originalName);
      toast.success('File download started');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download file');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!hospital) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Hospital not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/hospitals')}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{hospital.name}</h1>
            <p className="text-gray-600 mt-1">Hospital details and contact management</p>
          </div>
        </div>
        
        {canUpdate && (
          <Link
            to={`/hospitals/${hospital._id}/edit`}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit Hospital
          </Link>
        )}
      </div>

      {/* Hospital Information */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Hospital Information</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700">Contact Details</h3>
            <div className="space-y-2">
              <div className="flex items-center text-sm">
                <Mail className="w-4 h-4 text-gray-400 mr-2" />
                <span className="text-gray-900">{hospital.email}</span>
              </div>
              <div className="flex items-center text-sm">
                <Phone className="w-4 h-4 text-gray-400 mr-2" />
                <span className="text-gray-900">{hospital.phone}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700">Registration</h3>
            <div className="space-y-2">
              <div className="flex items-center text-sm">
                <FileText className="w-4 h-4 text-gray-400 mr-2" />
                <span className="text-gray-900">GST: {hospital.gstNumber}</span>
              </div>
              <div className="flex items-center text-sm">
                <CreditCard className="w-4 h-4 text-gray-400 mr-2" />
                <span className="text-gray-900">PAN: {hospital.panNumber}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700">Location</h3>
            <div className="space-y-2">
              <div className="flex items-center text-sm">
                <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                <span className="text-gray-900">{hospital.city}, {hospital.state.name}</span>
              </div>
              <div className="text-sm text-gray-600">
                Pincode: {hospital.pincode}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Address as per GST</h3>
          <p className="text-sm text-gray-900">{hospital.gstAddress}</p>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
              hospital.isActive 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {hospital.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div className="text-xs text-gray-500">
            Created: {formatDate(hospital.createdAt)} by {hospital.createdBy.name}
          </div>
        </div>
      </div>

      {/* Documents Section */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Documents</h2>
              <p className="text-gray-600 text-sm mt-1">
                Manage hospital documents and files
                {hospital.documents && hospital.documents.length > 0 && 
                  ` • ${hospital.documents.length} document(s)`}
              </p>
            </div>
            
            {canUpdate && (
              <button
                onClick={() => setShowAddDocument(true)}
                className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Document
              </button>
            )}
          </div>
        </div>

        <div className="p-6">
          {/* Legacy Agreement File */}
          {hospital.agreementFile?.filename && (
            <div className="mb-6">
              <h3 className="text-md font-medium text-gray-700 mb-3">Agreement File (Legacy)</h3>
              <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getFileIcon(hospital.agreementFile.mimetype)}
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {hospital.agreementFile.originalName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(hospital.agreementFile.size)} • 
                        Uploaded {formatDate(hospital.agreementFile.uploadedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleViewFile(hospital.agreementFile!.filename)}
                      className="inline-flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                      title="View File"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </button>
                    <button
                      onClick={() => handleDownloadFile(hospital.agreementFile!.filename, hospital.agreementFile!.originalName)}
                      className="inline-flex items-center px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                      title="Download File"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Multiple Documents */}
          {hospital.documents && hospital.documents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {hospital.documents.map((document, index) => (
                <motion.div
                  key={document._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      {getFileIcon(document.mimetype)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {document.originalName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(document.size)} • {formatDate(document.uploadedAt)}
                        </p>
                      </div>
                    </div>
                    
                    {canDelete && (
                      <button
                        onClick={() => handleDeleteDocument(document._id)}
                        disabled={deletingDocuments.has(document._id)}
                        className="text-red-600 hover:text-red-800 p-1 rounded disabled:opacity-50"
                        title="Delete Document"
                      >
                        {deletingDocuments.has(document._id) ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between mb-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getFileTypeColor(document.fileType)}`}>
                      {document.fileType}
                    </span>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleViewFile(document.filename)}
                        className="text-blue-600 hover:text-blue-800 p-1 rounded"
                        title="View File"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDownloadFile(document.filename, document.originalName)}
                        className="text-green-600 hover:text-green-800 p-1 rounded"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {document.description && (
                    <p className="text-xs text-gray-600">{document.description}</p>
                  )}
                  
                  <div className="mt-2 text-xs text-gray-500">
                    Uploaded by {document.uploadedBy.name}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No documents uploaded</p>
              <p className="text-gray-400 text-sm mt-2">
                Upload documents to keep important hospital files organized
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Contacts Section */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Department Contacts</h2>
              <p className="text-gray-600 text-sm mt-1">
                Manage hospital department contacts and personnel
              </p>
            </div>
            
            {canCreate && (
              <button
                onClick={handleAddContact}
                className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Contact
              </button>
            )}
          </div>

          {/* Search */}
          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search contacts by department, name, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Contacts List */}
        <div className="p-6">
          {contactsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Loading contacts...</p>
            </div>
          ) : contacts.length === 0 ? (
            <div className="text-center py-8">
              <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No contacts found</p>
              {searchTerm && (
                <p className="text-gray-400 text-sm mt-2">
                  Try adjusting your search terms
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {contacts.map((contact, index) => (
                <motion.div
                  key={contact._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors duration-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{contact.departmentName}</h3>
                      <p className="text-sm text-gray-600 mt-1">{contact.personName}</p>
                      
                      <div className="mt-3 space-y-1">
                        <div className="flex items-center text-sm text-gray-600">
                          <Mail className="w-3 h-3 mr-2" />
                          {contact.email}
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <Phone className="w-3 h-3 mr-2" />
                          {contact.phone}
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <MapPin className="w-3 h-3 mr-2" />
                          {contact.location}
                        </div>
                      </div>

                      <div className="mt-3 text-xs text-gray-500">
                        {contact.address} - {contact.pincode}
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          contact.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {contact.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 ml-2">
                      {canUpdate && (
                        <button
                          onClick={() => handleEditContact(contact)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                      
                      {canDelete && (
                        <button
                          onClick={() => {
                            setContactToDelete(contact);
                            setShowDeleteModal(true);
                          }}
                          className="text-red-600 hover:text-red-900 p-1 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

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
                  setDocumentData({ fileType: 'other', description: '' });
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

              {/* Document Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document Type
                </label>
                <select
                  value={documentData.fileType}
                  onChange={(e) => setDocumentData(prev => ({ 
                    ...prev, 
                    fileType: e.target.value as 'agreement' | 'license' | 'certificate' | 'other'
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="other">Other</option>
                  <option value="agreement">Agreement</option>
                  <option value="license">License</option>
                  <option value="certificate">Certificate</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={documentData.description}
                  onChange={(e) => setDocumentData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Optional description for the document"
                />
              </div>

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
                  setDocumentData({ fileType: 'other', description: '' });
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleAddDocument}
                disabled={!selectedDocumentFile || uploadingDocument}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-colors duration-200"
              >
                {uploadingDocument ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
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
                  {editingContact ? 'Edit Contact' : 'Add New Contact'}
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

              <form onSubmit={handleSubmit(onSubmitContact)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Department Name *
                    </label>
                    <input
                      {...register('departmentName', {
                        required: 'Department name is required',
                      })}
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter department name"
                    />
                    {errors.departmentName && (
                      <p className="mt-1 text-sm text-red-600">{errors.departmentName.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Person Name *
                    </label>
                    <input
                      {...register('personName', {
                        required: 'Person name is required',
                      })}
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter person name"
                    />
                    {errors.personName && (
                      <p className="mt-1 text-sm text-red-600">{errors.personName.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      {...register('email', {
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
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone *
                    </label>
                    <input
                      {...register('phone', {
                        required: 'Phone is required',
                      })}
                      type="tel"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter phone number"
                    />
                    {errors.phone && (
                      <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address *
                  </label>
                  <textarea
                    {...register('address', {
                      required: 'Address is required',
                    })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter complete address"
                  />
                  {errors.address && (
                    <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Location *
                    </label>
                    <input
                      {...register('location', {
                        required: 'Location is required',
                      })}
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Ground Floor, Wing A"
                    />
                    {errors.location && (
                      <p className="mt-1 text-sm text-red-600">{errors.location.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pincode *
                    </label>
                    <input
                      {...register('pincode', {
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
                    {errors.pincode && (
                      <p className="mt-1 text-sm text-red-600">{errors.pincode.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      {...register('isActive')}
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    />
                    <span className="ml-2 text-sm text-gray-700">Active Contact</span>
                  </label>
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
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-colors duration-200"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
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

      {/* Delete Contact Modal */}
      {showDeleteModal && contactToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
          >
            <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Contact</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete the contact for <strong>"{contactToDelete.personName}"</strong> in <strong>"{contactToDelete.departmentName}"</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setContactToDelete(null);
                }}
                disabled={deleteLoading}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteContact}
                disabled={deleteLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 disabled:opacity-50 flex items-center"
              >
                {deleteLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Deleting...
                  </>
                ) : (
                  'Delete Contact'
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default HospitalDetails;