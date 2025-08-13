// src/components/Doctors/DoctorDetails.tsx
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
  User,
  Briefcase,
  Building2,
  Target,
  Files,
  Download,
  Eye,
  Plus,
  FileText,
  Loader2
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { doctorAPI, Doctor } from '../../services/doctorAPI';
import { handleApiError } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

const DoctorDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteFileLoading, setDeleteFileLoading] = useState<string>('');

  const { hasPermission } = useAuthStore();
  const canUpdate = hasPermission('doctors', 'update');
  const canDelete = hasPermission('doctors', 'delete');

  useEffect(() => {
    if (id) {
      fetchDoctor(id);
    }
  }, [id]);

  const fetchDoctor = async (doctorId: string) => {
    try {
      setLoading(true);
      const response = await doctorAPI.getDoctor(doctorId);
      setDoctor(response.data.doctor);
    } catch (error) {
      handleApiError(error);
      navigate('/doctors');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!doctor) return;
    
    try {
      setDeleteLoading(true);
      await doctorAPI.deleteDoctor(doctor._id);
      toast.success('Doctor deleted successfully');
      navigate('/doctors');
    } catch (error) {
      handleApiError(error);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!doctor) return;
    
    try {
      setDeleteFileLoading(attachmentId);
      await doctorAPI.deleteAttachment(doctor._id, attachmentId);
      setDoctor(prev => prev ? {
        ...prev,
        attachments: prev.attachments.filter(att => att._id !== attachmentId)
      } : null);
      toast.success('Attachment deleted successfully');
    } catch (error) {
      handleApiError(error);
    } finally {
      setDeleteFileLoading('');
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimetype: string) => {
    if (mimetype?.includes('pdf')) return <FileText className="w-6 h-6 text-red-600" />;
    if (mimetype?.includes('word') || mimetype?.includes('document')) return <FileText className="w-6 h-6 text-blue-600" />;
    if (mimetype?.includes('sheet') || mimetype?.includes('excel')) return <FileText className="w-6 h-6 text-green-600" />;
    if (mimetype?.includes('image')) return <FileText className="w-6 h-6 text-purple-600" />;
    return <FileText className="w-6 h-6 text-gray-600" />;
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

  const getCurrentYearTargets = () => {
    if (!doctor?.targets) return [];
    const currentYear = new Date().getFullYear();
    return doctor.targets.filter(target => target.year === currentYear);
  };

  const getTotalAnnualTarget = () => {
    const currentTargets = getCurrentYearTargets();
    return currentTargets.reduce((sum, target) => sum + target.target, 0);
  };

  const handleViewFile = (filename: string) => {
    doctorAPI.viewFile(filename);
  };

  const handleDownloadFile = (filename: string, originalName: string) => {
    doctorAPI.downloadFile(filename, originalName);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="text-center py-12">
        <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">Doctor not found</p>
      </div>
    );
  }

  const currentTargets = getCurrentYearTargets();
  const totalTarget = getTotalAnnualTarget();

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/doctors')}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Doctor Details</h1>
            <p className="text-gray-600 mt-1">View and manage doctor information</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {canUpdate && (
            <Link
              to={`/doctors/${doctor._id}/edit`}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Doctor
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

      {/* Doctor Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-sm p-6"
      >
        <div className="flex items-start space-x-6">
          <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center">
            <User className="w-12 h-12 text-white" />
          </div>
          
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{doctor.name}</h2>
                <div className="mt-2 space-y-1">
                  <div className="flex items-center text-gray-600">
                    <Mail className="w-4 h-4 mr-2" />
                    {doctor.email}
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Phone className="w-4 h-4 mr-2" />
                    {doctor.phone}
                  </div>
                  <div className="flex items-center text-gray-600">
                    <MapPin className="w-4 h-4 mr-2" />
                    {doctor.location}
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                  doctor.isActive 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {doctor.isActive ? 'Active' : 'Inactive'}
                </span>
                <div className="mt-2 text-sm text-gray-500">
                  Created: {formatDate(doctor.createdAt)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Specializations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-lg shadow-sm p-6"
        >
          <div className="flex items-center mb-4">
            <Briefcase className="w-5 h-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Specializations</h3>
          </div>
          
          {doctor.specialization.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No specializations assigned</p>
          ) : (
            <div className="space-y-3">
              {doctor.specialization.map((spec) => (
                <div key={spec._id} className="border border-gray-200 rounded-lg p-3">
                  <h4 className="font-medium text-gray-900">{spec.name}</h4>
                  <p className="text-sm text-gray-600 mt-1">{spec.description}</p>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Hospitals */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-lg shadow-sm p-6"
        >
          <div className="flex items-center mb-4">
            <Building2 className="w-5 h-5 text-purple-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Associated Hospitals</h3>
          </div>
          
          {doctor.hospitals.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No hospitals assigned</p>
          ) : (
            <div className="space-y-3">
              {doctor.hospitals.map((hospital) => (
                <div key={hospital._id} className="border border-gray-200 rounded-lg p-3">
                  <h4 className="font-medium text-gray-900">{hospital.name}</h4>
                  <p className="text-sm text-gray-600">{hospital.city}, {hospital.state.name}</p>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Targets */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-lg shadow-sm p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Target className="w-5 h-5 text-green-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">
              Monthly Targets ({new Date().getFullYear()})
            </h3>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Annual Target</div>
            <div className="text-2xl font-bold text-green-600">{totalTarget.toLocaleString()}</div>
          </div>
        </div>
        
        {currentTargets.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No targets set for this year</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {currentTargets.map((target) => (
              <div key={target.month} className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-sm font-medium text-gray-900 capitalize mb-1">
                  {target.month}
                </div>
                <div className="text-xl font-bold text-green-600">
                  {target.target.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Attachments */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-lg shadow-sm p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Files className="w-5 h-5 text-orange-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">
              Attachments ({doctor.attachments.length})
            </h3>
          </div>
        </div>
        
        {doctor.attachments.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No attachments uploaded</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {doctor.attachments.map((attachment) => (
              <div key={attachment._id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    {getFileIcon(attachment.mimetype)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {attachment.originalName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(attachment.size)} • {formatDate(attachment.uploadedAt)}
                      </p>
                    </div>
                  </div>
                  
                  {canUpdate && (
                    <button
                      onClick={() => handleDeleteAttachment(attachment._id)}
                      disabled={deleteFileLoading === attachment._id}
                      className="text-red-600 hover:text-red-800 p-1 rounded disabled:opacity-50"
                      title="Delete Attachment"
                    >
                      {deleteFileLoading === attachment._id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
                
                <div className="flex items-center justify-between mb-3">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getFileTypeColor(attachment.fileType)}`}>
                    {attachment.fileType}
                  </span>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleViewFile(attachment.filename)}
                      className="text-blue-600 hover:text-blue-800 p-1 rounded"
                      title="View File"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDownloadFile(attachment.filename, attachment.originalName)}
                      className="text-green-600 hover:text-green-800 p-1 rounded"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {attachment.description && (
                  <p className="text-xs text-gray-600">{attachment.description}</p>
                )}
                
                <div className="mt-2 text-xs text-gray-500">
                  Uploaded by {attachment.uploadedBy.name}
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
          >
            <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Doctor</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <strong>"{doctor.name}"</strong>? This action cannot be undone and will also delete all associated files and data.
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
                  'Delete Doctor'
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default DoctorDetails;