// src/components/Warehouses/WarehouseDetails.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Plus, 
  Search, 
  Download, 
  Eye, 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  User, 
  FileText, 
  Calendar, 
  Package, 
  Thermometer,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Hash,
  Clock
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { warehouseAPI, Warehouse, WarehouseContact, WarehouseDocument } from '../../services/warehouseAPI';
import { handleApiError } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

const WarehouseDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
  const [contacts, setContacts] = useState<WarehouseContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [editingContact, setEditingContact] = useState<WarehouseContact | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  const { hasPermission } = useAuthStore();
  const canUpdate = hasPermission('warehouses', 'update');
  const canDelete = hasPermission('warehouses', 'delete');
  const canView = hasPermission('warehouses', 'read');

  useEffect(() => {
    if (id) {
      fetchWarehouse();
      fetchContacts();
    }
  }, [id]);

  const fetchWarehouse = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const response = await warehouseAPI.getWarehouse(id);
      setWarehouse(response.data);
    } catch (error) {
      console.error('Error fetching warehouse:', error);
      handleApiError(error);
      navigate('/warehouses');
    } finally {
      setLoading(false);
    }
  };

  const fetchContacts = async () => {
    if (!id) return;
    
    try {
      setContactsLoading(true);
      const response = await warehouseAPI.getWarehouseContacts(id, {
        search: searchTerm
      });
      setContacts(response.data || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      handleApiError(error);
    } finally {
      setContactsLoading(false);
    }
  };

  const handleDeleteWarehouse = async () => {
    if (!warehouse || !canDelete) {
      toast.error('You do not have permission to delete warehouses');
      return;
    }

    try {
      setDeleteLoading(true);
      await warehouseAPI.deleteWarehouse(warehouse._id);
      toast.success('Warehouse deleted successfully');
      navigate('/warehouses');
    } catch (error) {
      console.error('Error deleting warehouse:', error);
      handleApiError(error);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!warehouse || !canDelete) {
      toast.error('You do not have permission to delete contacts');
      return;
    }

    try {
      await warehouseAPI.deleteBranchContact(warehouse._id, contactId);
      toast.success('Contact deleted successfully');
      fetchContacts();
    } catch (error) {
      console.error('Error deleting contact:', error);
      handleApiError(error);
    }
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

  const handleDeleteDocument = async (documentId: string) => {
    if (!warehouse || !canDelete) {
      toast.error('You do not have permission to delete documents');
      return;
    }

    try {
      await warehouseAPI.deleteDocument(warehouse._id, documentId);
      toast.success('Document deleted successfully');
      fetchWarehouse(); // Refresh to update documents
    } catch (error) {
      console.error('Error deleting document:', error);
      handleApiError(error);
    }
  };

  const getDocumentValidityStatus = (endDate: string) => {
    const today = new Date();
    const validity = new Date(endDate);
    const diffTime = validity.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { 
        status: 'expired', 
        color: 'text-red-600', 
        bgColor: 'bg-red-100', 
        icon: XCircle,
        message: `Expired ${Math.abs(diffDays)} days ago`
      };
    } else if (diffDays <= 30) {
      return { 
        status: 'expiring', 
        color: 'text-yellow-600', 
        bgColor: 'bg-yellow-100', 
        icon: AlertTriangle,
        message: `Expires in ${diffDays} days`
      };
    } else {
      return { 
        status: 'valid', 
        color: 'text-green-600', 
        bgColor: 'bg-green-100', 
        icon: CheckCircle,
        message: `Valid for ${diffDays} days`
      };
    }
  };

  const getStorageTypeIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'cold':
      case 'frozen':
        return <Thermometer className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const getStorageTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'cold':
        return 'bg-blue-100 text-blue-800';
      case 'frozen':
        return 'bg-purple-100 text-purple-800';
      case 'controlled':
        return 'bg-green-100 text-green-800';
      case 'hazmat':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.phone.includes(searchTerm)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!warehouse) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Warehouse Not Found</h2>
          <p className="text-gray-600 mb-4">The warehouse you're looking for doesn't exist.</p>
          <Link
            to="/warehouses"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Back to Warehouses
          </Link>
        </div>
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to view warehouse details.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/warehouses')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{warehouse.name}</h1>
            <div className="flex items-center gap-4 mt-1">
              {warehouse.warehouseCode && (
                <span className="text-gray-600 flex items-center gap-1">
                  <Hash className="h-4 w-4" />
                  {warehouse.warehouseCode}
                </span>
              )}
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                warehouse.isActive 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {warehouse.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {canUpdate && (
            <Link
              to={`/warehouses/${warehouse._id}/edit`}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Edit className="h-4 w-4" />
              Edit
            </Link>
          )}
          
          {canDelete && (
            <button
              onClick={() => setShowDeleteModal(true)}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Basic Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                <p className="text-gray-900">{warehouse.branch.name}</p>
              </div>
              
              {warehouse.capacity && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Storage Capacity</label>
                  <p className="text-gray-900">{warehouse.capacity}</p>
                </div>
              )}
              
              {warehouse.storageType && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Storage Type</label>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStorageTypeColor(warehouse.storageType)}`}>
                      {getStorageTypeIcon(warehouse.storageType)}
                      {warehouse.storageType.charAt(0).toUpperCase() + warehouse.storageType.slice(1)}
                    </span>
                  </div>
                </div>
              )}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <p className="text-gray-900">{warehouse.address}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <p className="text-gray-900">{warehouse.city}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <p className="text-gray-900">{warehouse.state.name}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
                  <p className="text-gray-900">{warehouse.pincode}</p>
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
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-gray-400" />
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <p className="text-gray-900">{warehouse.phone}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-gray-400" />
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="text-gray-900">{warehouse.email}</p>
                </div>
              </div>
              
              {warehouse.website && (
                <div className="flex items-center gap-3">
                  <Globe className="h-5 w-5 text-gray-400" />
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Website</label>
                    <a 
                      href={warehouse.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      {warehouse.website}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Manager Information */}
          {(warehouse.managerName || warehouse.managerPhone || warehouse.managerEmail) && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <User className="h-5 w-5" />
                Manager Information
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {warehouse.managerName && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <p className="text-gray-900">{warehouse.managerName}</p>
                  </div>
                )}
                
                {warehouse.managerPhone && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <p className="text-gray-900">{warehouse.managerPhone}</p>
                  </div>
                )}
                
                {warehouse.managerEmail && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <p className="text-gray-900">{warehouse.managerEmail}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Remarks */}
          {warehouse.remarks && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Remarks</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{warehouse.remarks}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Documents</span>
                <span className="font-medium">{warehouse.documents?.length || 0}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Contacts</span>
                <span className="font-medium">{contacts.length}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  warehouse.isActive 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {warehouse.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Created</span>
                <span className="text-sm text-gray-900">
                  {new Date(warehouse.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Documents */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documents
              </h2>
              
              {canUpdate && (
                <button
                  onClick={() => setShowDocumentModal(true)}
                  className="text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              )}
            </div>
            
            {warehouse.documents && warehouse.documents.length > 0 ? (
              <div className="space-y-3">
                {warehouse.documents.map((doc) => {
                  const validityStatus = getDocumentValidityStatus(doc.validityEndDate);
                  const StatusIcon = validityStatus.icon;
                  
                  return (
                    <div key={doc._id} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 text-sm">{doc.documentName}</h4>
                          <div className={`flex items-center gap-1 mt-1 text-xs ${validityStatus.color}`}>
                            <StatusIcon className="h-3 w-3" />
                            <span>{validityStatus.message}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {new Date(doc.validityStartDate).toLocaleDateString()} - {new Date(doc.validityEndDate).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleViewDocument(doc.filename)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="View Document"
                        >
                          <Eye className="h-3 w-3" />
                        </button>
                        
                        <button
                          onClick={() => handleDownloadDocument(doc.filename, doc.originalName)}
                          className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                          title="Download Document"
                        >
                          <Download className="h-3 w-3" />
                        </button>
                        
                        {canDelete && (
                          <button
                            onClick={() => handleDeleteDocument(doc._id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete Document"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6">
                <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">No documents uploaded</p>
                {canUpdate && (
                  <button
                    onClick={() => setShowDocumentModal(true)}
                    className="text-blue-600 hover:text-blue-800 text-sm mt-2 transition-colors"
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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <User className="h-5 w-5" />
            Contacts ({contacts.length})
          </h2>
          
          {canUpdate && (
            <button
              onClick={() => {
                setEditingContact(null);
                setShowContactModal(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Contact
            </button>
          )}
        </div>
        
        {/* Search */}
        <div className="mb-4">
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
        
        {/* Contacts List */}
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
                  <div>
                    <h4 className="font-medium text-gray-900">{contact.name}</h4>
                    <p className="text-sm text-gray-600">{contact.designation}</p>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {canUpdate && (
                      <button
                        onClick={() => {
                          setEditingContact(contact);
                          setShowContactModal(true);
                        }}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Edit Contact"
                      >
                        <Edit className="h-3 w-3" />
                      </button>
                    )}
                    
                    {canDelete && (
                      <button
                        onClick={() => handleDeleteContact(contact._id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete Contact"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone className="h-3 w-3" />
                    <span>{contact.phone}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="h-3 w-3" />
                    <span className="truncate">{contact.email}</span>
                  </div>
                  
                  {contact.department && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Building2 className="h-3 w-3" />
                      <span>{contact.department}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <User className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No contacts found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm ? 'Try adjusting your search criteria.' : 'No contacts have been added yet.'}
            </p>
            {canUpdate && !searchTerm && (
              <button
                onClick={() => {
                  setEditingContact(null);
                  setShowContactModal(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 mx-auto transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add First Contact
              </button>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Delete Warehouse</h3>
                <p className="text-gray-600">Are you sure you want to delete this warehouse?</p>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <p className="font-medium text-gray-900">{warehouse.name}</p>
              <p className="text-sm text-gray-600">
                {warehouse.city}, {warehouse.state.name}
              </p>
              <p className="text-sm text-gray-600">Branch: {warehouse.branch.name}</p>
            </div>
            
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteWarehouse}
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

export default WarehouseDetails;