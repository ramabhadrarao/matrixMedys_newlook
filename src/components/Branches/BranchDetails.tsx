// src/components/Branches/BranchDetails.tsx
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
  FolderOpen,
  Calendar,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { 
  branchAPI, 
  Branch, 
  BranchContact, 
  BranchContactFormData,
  BranchDocument
} from '../../services/branchAPI';
import { handleApiError } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

const BranchDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuthStore();
  
  const [branch, setBranch] = useState<Branch | null>(null);
  const [contacts, setContacts] = useState<BranchContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddContact, setShowAddContact] = useState(false);
  const [editingContact, setEditingContact] = useState<BranchContact | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<BranchContact | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Document management states
  const [showAddDocument, setShowAddDocument] = useState(false);
  const [selectedDocumentFile, setSelectedDocumentFile] = useState<File | null>(null);
  const [documentData, setDocumentData] = useState({
    documentName: '',
    validityStartDate: '',
    validityEndDate: ''
  });
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deletingDocuments, setDeletingDocuments] = useState<Set<string>>(new Set());

  const canCreate = hasPermission('branches', 'create');
  const canUpdate = hasPermission('branches', 'update');
  const canDelete = hasPermission('branches', 'delete');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BranchContactFormData>({
    defaultValues: {
      isActive: true,
    },
  });

  useEffect(() => {
    if (id) {
      fetchBranchDetails();
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchContacts();
    }
  }, [id, searchTerm]);

  const fetchBranchDetails = async () => {
    try {
      setLoading(true);
      const response = await branchAPI.getBranch(id!);
      setBranch(response.data.branch);
    } catch (error) {
      handleApiError(error);
      navigate('/branches');
    } finally {
      setLoading(false);
    }
  };

  const fetchContacts = async () => {
    try {
      setContactsLoading(true);
      const response = await branchAPI.getBranchContacts(id!, {
        search: searchTerm,
        limit: 50
      });
      setContacts(response.data.contacts || []);
    } catch (error) {
      handleApiError(error);
    } finally {
      setContactsLoading(false);
    }
  };

  const handleAddContact = async (data: BranchContactFormData) => {
    if (!canCreate) {
      toast.error('You do not have permission to add contacts');
      return;
    }

    try {
      setSaving(true);
      await branchAPI.createBranchContact(id!, data);
      toast.success('Contact added successfully');
      setShowAddContact(false);
      reset();
      fetchContacts();
    } catch (error) {
      handleApiError(error);
    } finally {
      setSaving(false);
    }
  };

  const handleEditContact = async (data: BranchContactFormData) => {
    if (!canUpdate || !editingContact) {
      toast.error('You do not have permission to update contacts');
      return;
    }

    try {
      setSaving(true);
      await branchAPI.updateBranchContact(id!, editingContact._id, data);
      toast.success('Contact updated successfully');
      setEditingContact(null);
      reset();
      fetchContacts();
    } catch (error) {
      handleApiError(error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteContact = async () => {
    if (!canDelete || !contactToDelete) {
      toast.error('You do not have permission to delete contacts');
      return;
    }

    try {
      setDeleteLoading(true);
      await branchAPI.deleteBranchContact(id!, contactToDelete._id);
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

  const startEditContact = (contact: BranchContact) => {
    setEditingContact(contact);
    reset({
      name: contact.name,
      department: contact.department,
      designation: contact.designation,
      phone: contact.phone,
      alternatePhone: contact.alternatePhone || '',
      email: contact.email,
      isActive: contact.isActive,
    });
  };

  const cancelEdit = () => {
    setEditingContact(null);
    setShowAddContact(false);
    reset();
  };

  // Document management functions
  const handleDocumentFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast.error('File size must be less than 10MB');
      return;
    }

    setSelectedDocumentFile(file);
  };

  const handleAddDocument = async () => {
    if (!canCreate || !selectedDocumentFile || !documentData.documentName.trim()) {
      toast.error('Please fill all required fields and select a file');
      return;
    }

    if (!documentData.validityStartDate || !documentData.validityEndDate) {
      toast.error('Please select validity dates');
      return;
    }

    try {
      setUploadingDocument(true);
      setUploadProgress(0);

      const formData = new FormData();
      formData.append('document', selectedDocumentFile);
      formData.append('documentName', documentData.documentName);
      formData.append('validityStartDate', documentData.validityStartDate);
      formData.append('validityEndDate', documentData.validityEndDate);

      await branchAPI.addDocument(id!, formData, setUploadProgress);
      
      toast.success('Document uploaded successfully');
      setShowAddDocument(false);
      setSelectedDocumentFile(null);
      setDocumentData({
        documentName: '',
        validityStartDate: '',
        validityEndDate: ''
      });
      fetchBranchDetails(); // Refresh to get updated documents
    } catch (error) {
      handleApiError(error);
    } finally {
      setUploadingDocument(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!canDelete) {
      toast.error('You do not have permission to delete documents');
      return;
    }

    try {
      setDeletingDocuments(prev => new Set([...prev, documentId]));
      await branchAPI.deleteDocument(id!, documentId);
      toast.success('Document deleted successfully');
      fetchBranchDetails(); // Refresh to get updated documents
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

  const handleDownloadDocument = async (filename: string, originalName?: string) => {
    try {
      await branchAPI.downloadFile(filename, originalName);
    } catch (error) {
      handleApiError(error);
    }
  };

  const handleViewDocument = (filename: string) => {
    try {
      branchAPI.viewFile(filename);
    } catch (error) {
      handleApiError(error);
    }
  };

  const getDocumentValidityStatus = (endDate: string) => {
    const today = new Date();
    const validity = new Date(endDate);
    const diffTime = validity.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { status: 'expired', color: 'text-red-600', bgColor: 'bg-red-100', icon: XCircle };
    } else if (diffDays <= 30) {
      return { status: 'expiring', color: 'text-yellow-600', bgColor: 'bg-yellow-100', icon: AlertTriangle };
    } else {
      return { status: 'valid', color: 'text-green-600', bgColor: 'bg-green-100', icon: CheckCircle };
    }
  };

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!branch) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Branch not found</h2>
          <p className="text-gray-600 mb-4">The branch you're looking for doesn't exist.</p>
          <Link
            to="/branches"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Back to Branches
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/branches')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{branch.name}</h1>
            <p className="text-gray-600 mt-1">Branch Details</p>
          </div>
        </div>
        
        {canUpdate && (
          <Link
            to={`/branches/${id}/edit`}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Edit className="h-4 w-4" />
            Edit Branch
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Branch Name</label>
                  <p className="text-gray-900 font-medium">{branch.name}</p>
                </div>
                
                {branch.branchCode && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Branch Code</label>
                    <p className="text-gray-900">{branch.branchCode}</p>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Drug License Number</label>
                  <p className="text-gray-900">{branch.drugLicenseNumber}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Status</label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    branch.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {branch.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Created</label>
                  <p className="text-gray-900">{new Date(branch.createdAt).toLocaleDateString()}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Last Updated</label>
                  <p className="text-gray-900">{new Date(branch.updatedAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-gray-400" />
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Email</label>
                    <a href={`mailto:${branch.email}`} className="text-blue-600 hover:text-blue-800">
                      {branch.email}
                    </a>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-gray-400" />
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Phone</label>
                    <a href={`tel:${branch.phone}`} className="text-blue-600 hover:text-blue-800">
                      {branch.phone}
                    </a>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                {branch.alternatePhone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-gray-400" />
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Alternate Phone</label>
                      <a href={`tel:${branch.alternatePhone}`} className="text-blue-600 hover:text-blue-800">
                        {branch.alternatePhone}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Address Information</h2>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-gray-400 mt-1" />
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-500 mb-1">GST Address</label>
                  <p className="text-gray-900">{branch.gstAddress}</p>
                  <p className="text-gray-600 mt-1">
                    {branch.city}, {branch.state.name} - {branch.pincode}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Tax Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Tax Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-gray-400" />
                  <div>
                    <label className="block text-sm font-medium text-gray-500">GST Number</label>
                    <p className="text-gray-900 font-mono">{branch.gstNumber}</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-gray-400" />
                  <div>
                    <label className="block text-sm font-medium text-gray-500">PAN Number</label>
                    <p className="text-gray-900 font-mono">{branch.panNumber}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Remarks */}
          {branch.remarks && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Remarks</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{branch.remarks}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            
            <div className="space-y-3">
              {canUpdate && (
                <Link
                  to={`/branches/${id}/edit`}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Edit className="h-4 w-4" />
                  Edit Branch
                </Link>
              )}
              
              <Link
                to={`/warehouses?branch=${id}`}
                className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Building2 className="h-4 w-4" />
                View Warehouses
              </Link>
            </div>
          </div>

          {/* Documents */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Documents</h3>
              {canCreate && (
                <button
                  onClick={() => setShowAddDocument(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg flex items-center gap-2 text-sm transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add
                </button>
              )}
            </div>
            
            {branch.documents && branch.documents.length > 0 ? (
              <div className="space-y-3">
                {branch.documents.map((doc: BranchDocument) => {
                  const validityStatus = getDocumentValidityStatus(doc.validityEndDate);
                  const StatusIcon = validityStatus.icon;
                  
                  return (
                    <div key={doc._id} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <FileText className="h-4 w-4 text-gray-400" />
                            <h4 className="font-medium text-gray-900 text-sm">{doc.documentName}</h4>
                            <StatusIcon className={`h-4 w-4 ${validityStatus.color}`} />
                          </div>
                          <p className="text-xs text-gray-600 mb-2">
                            Valid: {new Date(doc.validityStartDate).toLocaleDateString()} - {new Date(doc.validityEndDate).toLocaleDateString()}
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleViewDocument(doc.filename)}
                              className="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1"
                            >
                              <Eye className="h-3 w-3" />
                              View
                            </button>
                            <button
                              onClick={() => handleDownloadDocument(doc.filename, doc.originalName)}
                              className="text-green-600 hover:text-green-800 text-xs flex items-center gap-1"
                            >
                              <Download className="h-3 w-3" />
                              Download
                            </button>
                            {canDelete && (
                              <button
                                onClick={() => handleDeleteDocument(doc._id)}
                                disabled={deletingDocuments.has(doc._id)}
                                className="text-red-600 hover:text-red-800 text-xs flex items-center gap-1 disabled:opacity-50"
                              >
                                <Trash2 className="h-3 w-3" />
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No documents uploaded</p>
                {canCreate && (
                  <button
                    onClick={() => setShowAddDocument(true)}
                    className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Upload first document
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Contacts Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Branch Contacts</h2>
            {canCreate && (
              <button
                onClick={() => setShowAddContact(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Contact
              </button>
            )}
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        
        <div className="p-6">
          {contactsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredContacts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredContacts.map((contact) => (
                <motion.div
                  key={contact._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <User className="h-5 w-5 text-gray-400" />
                      <h3 className="font-medium text-gray-900">{contact.name}</h3>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      contact.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {contact.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-600">
                      <span className="font-medium">Department:</span> {contact.department}
                    </p>
                    <p className="text-gray-600">
                      <span className="font-medium">Designation:</span> {contact.designation}
                    </p>
                    <p className="text-gray-600">
                      <span className="font-medium">Phone:</span> 
                      <a href={`tel:${contact.phone}`} className="text-blue-600 hover:text-blue-800 ml-1">
                        {contact.phone}
                      </a>
                    </p>
                    {contact.alternatePhone && (
                      <p className="text-gray-600">
                        <span className="font-medium">Alt Phone:</span> 
                        <a href={`tel:${contact.alternatePhone}`} className="text-blue-600 hover:text-blue-800 ml-1">
                          {contact.alternatePhone}
                        </a>
                      </p>
                    )}
                    <p className="text-gray-600">
                      <span className="font-medium">Email:</span> 
                      <a href={`mailto:${contact.email}`} className="text-blue-600 hover:text-blue-800 ml-1">
                        {contact.email}
                      </a>
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
                    {canUpdate && (
                      <button
                        onClick={() => startEditContact(contact)}
                        className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                      >
                        <Edit className="h-3 w-3" />
                        Edit
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => {
                          setContactToDelete(contact);
                          setShowDeleteModal(true);
                        }}
                        className="text-red-600 hover:text-red-800 text-sm flex items-center gap-1"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No contacts found</p>
              {canCreate && (
                <button
                  onClick={() => setShowAddContact(true)}
                  className="mt-2 text-blue-600 hover:text-blue-800"
                >
                  Add first contact
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Contact Modal */}
      {(showAddContact || editingContact) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingContact ? 'Edit Contact' : 'Add Contact'}
              </h3>
              <button
                onClick={cancelEdit}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit(editingContact ? handleEditContact : handleAddContact)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  {...register('name', { required: 'Name is required' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter contact name"
                />
                {errors.name && (
                  <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department *
                </label>
                <select
                  {...register('department', { required: 'Department is required' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Department</option>
                  <option value="Admin">Admin</option>
                  <option value="Operations">Operations</option>
                  <option value="Sales">Sales</option>
                  <option value="Logistics">Logistics</option>
                </select>
                {errors.department && (
                  <p className="text-red-500 text-sm mt-1">{errors.department.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Designation *
                </label>
                <input
                  type="text"
                  {...register('designation', { required: 'Designation is required' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Manager, Supervisor, Owner"
                />
                {errors.designation && (
                  <p className="text-red-500 text-sm mt-1">{errors.designation.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone *
                </label>
                <input
                  type="tel"
                  {...register('phone', { required: 'Phone is required' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter phone number"
                />
                {errors.phone && (
                  <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
              
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  {...register('isActive')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="text-sm font-medium text-gray-700">
                  Active Contact
                </label>
              </div>
              
              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  {saving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {saving ? 'Saving...' : (editingContact ? 'Update' : 'Add')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Document Modal */}
      {showAddDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Add Document</h3>
              <button
                onClick={() => {
                  setShowAddDocument(false);
                  setSelectedDocumentFile(null);
                  setDocumentData({
                    documentName: '',
                    validityStartDate: '',
                    validityEndDate: ''
                  });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Document Name *
                </label>
                <input
                  type="text"
                  value={documentData.documentName}
                  onChange={(e) => setDocumentData(prev => ({ ...prev, documentName: e.target.value }))}
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
                  value={documentData.validityStartDate}
                  onChange={(e) => setDocumentData(prev => ({ ...prev, validityStartDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Validity End Date *
                </label>
                <input
                  type="date"
                  value={documentData.validityEndDate}
                  onChange={(e) => setDocumentData(prev => ({ ...prev, validityEndDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select File *
                </label>
                <input
                  type="file"
                  onChange={handleDocumentFileSelect}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {selectedDocumentFile && (
                  <p className="text-sm text-gray-600 mt-1">
                    Selected: {selectedDocumentFile.name} ({(selectedDocumentFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>
              
              {uploadingDocument && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="text-sm text-gray-600">Uploading... {uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
              
              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddDocument(false);
                    setSelectedDocumentFile(null);
                    setDocumentData({
                      documentName: '',
                      validityStartDate: '',
                      validityEndDate: ''
                    });
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  disabled={uploadingDocument}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddDocument}
                  disabled={uploadingDocument || !selectedDocumentFile || !documentData.documentName.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  {uploadingDocument ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {uploadingDocument ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Contact Modal */}
      {showDeleteModal && contactToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Delete Contact</h3>
                <p className="text-gray-600">Are you sure you want to delete this contact?</p>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <p className="font-medium text-gray-900">{contactToDelete.name}</p>
              <p className="text-sm text-gray-600">{contactToDelete.department} - {contactToDelete.designation}</p>
            </div>
            
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setContactToDelete(null);
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteContact}
                disabled={deleteLoading}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {deleteLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                {deleteLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BranchDetails;