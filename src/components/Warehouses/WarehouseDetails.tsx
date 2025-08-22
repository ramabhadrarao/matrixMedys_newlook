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
  Clock,
  Save,
  X
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { warehouseAPI, Warehouse, WarehouseContact, WarehouseDocument } from '../../services/warehouseAPI';
import { handleApiError } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

interface ContactFormData {
  name: string;
  department: 'Admin' | 'Operations' | 'Sales' | 'Logistics';
  designation: string;
  phone: string;
  alternatePhone?: string;
  email: string;
  isActive: boolean;
}

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
  const [saving, setSaving] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<WarehouseContact | null>(null);
  const [showContactDeleteModal, setShowContactDeleteModal] = useState(false);
  
  const { hasPermission } = useAuthStore();
  const canUpdate = hasPermission('warehouses', 'update');
  const canDelete = hasPermission('warehouses', 'delete');
  const canView = hasPermission('warehouses', 'view'); // Changed from 'read' to 'view'
  const canCreate = hasPermission('warehouses', 'create');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormData>({
    defaultValues: {
      isActive: true,
    },
  });

  useEffect(() => {
    if (id) {
      fetchWarehouse();
      fetchContacts();
    }
  }, [id]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (id) {
        fetchContacts();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, id]);

  const fetchWarehouse = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const response = await warehouseAPI.getWarehouse(id);
      setWarehouse(response.data.warehouse);
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
      setContacts(response.data.contacts || []);
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

  const handleAddContact = async (data: ContactFormData) => {
    if (!canCreate || !id) {
      toast.error('You do not have permission to add contacts');
      return;
    }

    try {
      setSaving(true);
      await warehouseAPI.createWarehouseContact(id, {
        contactPersonName: data.name,
        department: data.department,
        designation: data.designation,
        contactNumber: data.phone,
        alternateContactPerson: data.alternatePhone,
        emailAddress: data.email,
        isActive: data.isActive
      });
      toast.success('Contact added successfully');
      setShowContactModal(false);
      reset();
      fetchContacts();
    } catch (error) {
      handleApiError(error);
    } finally {
      setSaving(false);
    }
  };

  const handleEditContact = async (data: ContactFormData) => {
    if (!canUpdate || !editingContact || !id) {
      toast.error('You do not have permission to update contacts');
      return;
    }

    try {
      setSaving(true);
      await warehouseAPI.updateWarehouseContact(id, editingContact._id, {
        contactPersonName: data.name,
        department: data.department,
        designation: data.designation,
        contactNumber: data.phone,
        alternateContactPerson: data.alternatePhone,
        emailAddress: data.email,
        isActive: data.isActive
      });
      toast.success('Contact updated successfully');
      setEditingContact(null);
      setShowContactModal(false);
      reset();
      fetchContacts();
    } catch (error) {
      handleApiError(error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteContact = async () => {
    if (!warehouse || !canDelete || !contactToDelete || !id) {
      toast.error('You do not have permission to delete contacts');
      return;
    }

    try {
      setDeleteLoading(true);
      await warehouseAPI.deleteWarehouseContact(id, contactToDelete._id);
      toast.success('Contact deleted successfully');
      setShowContactDeleteModal(false);
      setContactToDelete(null);
      fetchContacts();
    } catch (error) {
      console.error('Error deleting contact:', error);
      handleApiError(error);
    } finally {
      setDeleteLoading(false);
    }
  };

  const startEditContact = (contact: WarehouseContact) => {
    setEditingContact(contact);
    reset({
      name: contact.contactPersonName,
      department: contact.department,
      designation: contact.designation,
      phone: contact.contactNumber,
      alternatePhone: contact.alternateContactPerson || '',
      email: contact.emailAddress,
      isActive: contact.isActive,
    });
    setShowContactModal(true);
  };

  const cancelContactEdit = () => {
    setEditingContact(null);
    setShowContactModal(false);
    reset();
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
    contact.contactPersonName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.emailAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.contactNumber.includes(searchTerm)
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
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Drug License Number</label>
                <p className="text-gray-900">{warehouse.drugLicenseNumber}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
                <p className="text-gray-900">{warehouse.district}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <p className="text-gray-900">{warehouse.status}</p>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <p className="text-gray-900">{warehouse.address}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
                  <p className="text-gray-900">{warehouse.district}</p>
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
              
              {warehouse.alternatePhone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-gray-400" />
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Alternate Phone</label>
                    <p className="text-gray-900">{warehouse.alternatePhone}</p>
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-gray-400" />
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="text-gray-900">{warehouse.email}</p>
                </div>
              </div>
            </div>
          </div>

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
          
          {canCreate && (
            <button
              onClick={() => {
                setEditingContact(null);
                reset({
                  name: '',
                  department: 'Admin',
                  designation: '',
                  phone: '',
                  alternatePhone: '',
                  email: '',
                  isActive: true,
                });
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
                    <h4 className="font-medium text-gray-900">{contact.contactPersonName}</h4>
                    <p className="text-sm text-gray-600">{contact.designation}</p>
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
                  <div className="flex items-center gap-2 text-gray-600">
                    <Building2 className="h-3 w-3" />
                    <span>{contact.department}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone className="h-3 w-3" />
                    <span>{contact.contactNumber}</span>
                  </div>
                  
                  {contact.alternateContactPerson && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <User className="h-3 w-3" />
                      <span>{contact.alternateContactPerson}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="h-3 w-3" />
                    <span className="truncate">{contact.emailAddress}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-1 mt-3 pt-3 border-t border-gray-100">
                  {canUpdate && (
                    <button
                      onClick={() => startEditContact(contact)}
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors flex items-center gap-1 text-xs"
                    >
                      <Edit className="h-3 w-3" />
                      Edit
                    </button>
                  )}
                  
                  {canDelete && (
                    <button
                      onClick={() => {
                        setContactToDelete(contact);
                        setShowContactDeleteModal(true);
                      }}
                      className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors flex items-center gap-1 text-xs"
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
            <h3 className="text-lg font-medium text-gray-900 mb-2">No contacts found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm ? 'Try adjusting your search criteria.' : 'No contacts have been added yet.'}
            </p>
            {canCreate && !searchTerm && (
              <button
                onClick={() => {
                  setEditingContact(null);
                  reset({
                    name: '',
                    department: 'Admin',
                    designation: '',
                    phone: '',
                    alternatePhone: '',
                    email: '',
                    isActive: true,
                  });
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

      {/* Add/Edit Contact Modal */}
      {showContactModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingContact ? 'Edit Contact' : 'Add Contact'}
              </h3>
              <button
                onClick={cancelContactEdit}
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
                  placeholder="e.g., Manager, Supervisor"
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
                  Alternate Contact Person
                </label>
                <input
                  type="text"
                  {...register('alternatePhone')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter alternate contact person (optional)"
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
                  onClick={cancelContactEdit}
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

      {/* Delete Contact Modal */}
      {showContactDeleteModal && contactToDelete && (
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
              <p className="font-medium text-gray-900">{contactToDelete.contactPersonName}</p>
              <p className="text-sm text-gray-600">{contactToDelete.department} - {contactToDelete.designation}</p>
            </div>
            
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowContactDeleteModal(false);
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

      {/* Delete Warehouse Modal */}
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
                {warehouse.district}, {warehouse.state.name}
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