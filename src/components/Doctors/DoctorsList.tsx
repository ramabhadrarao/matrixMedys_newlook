// src/components/Doctors/DoctorsList.tsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Building2,
  Target,
  Files,
  Download,
  Filter,
  X
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { doctorAPI, Doctor, portfolioAPI, Portfolio } from '../../services/doctorAPI';
import { hospitalAPI } from '../../services/hospitalAPI';
import { handleApiError } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

interface Hospital {
  _id: string;
  name: string;
  city: string;
}

const DoctorsList: React.FC = () => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialization, setSelectedSpecialization] = useState('');
  const [selectedHospital, setSelectedHospital] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDoctors, setTotalDoctors] = useState(0);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [doctorToDelete, setDoctorToDelete] = useState<Doctor | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter options
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [filtersLoading, setFiltersLoading] = useState(false);
  
  const navigate = useNavigate();
  const { hasPermission } = useAuthStore();
  
  const canCreate = hasPermission('doctors', 'create');
  const canUpdate = hasPermission('doctors', 'update');
  const canDelete = hasPermission('doctors', 'delete');
  const canView = hasPermission('doctors', 'view');

  useEffect(() => {
    if (canView) {
      fetchDoctors();
      fetchFilterOptions();
    }
  }, [currentPage, canView]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm !== '' || selectedSpecialization || selectedHospital) {
        setCurrentPage(1);
        fetchDoctors();
      } else if (searchTerm === '' && !selectedSpecialization && !selectedHospital) {
        setCurrentPage(1);
        fetchDoctors();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, selectedSpecialization, selectedHospital]);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 10,
        ...(searchTerm && { search: searchTerm.trim() }),
        ...(selectedSpecialization && { specialization: selectedSpecialization }),
        ...(selectedHospital && { hospital: selectedHospital })
      };
      
      const response = await doctorAPI.getDoctors(params);
      
      if (response.data) {
        setDoctors(response.data.doctors || []);
        if (response.data.pagination) {
          setTotalPages(response.data.pagination.pages || 1);
          setTotalDoctors(response.data.pagination.total || 0);
        }
      }
    } catch (error) {
      console.error('Error fetching doctors:', error);
      handleApiError(error);
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchFilterOptions = async () => {
    try {
      setFiltersLoading(true);
      const [portfoliosResponse, hospitalsResponse] = await Promise.all([
        portfolioAPI.getPortfolios({ limit: 100 }),
        hospitalAPI.getHospitals({ limit: 100 })
      ]);
      
      setPortfolios(portfoliosResponse.data.portfolios || []);
      setHospitals(hospitalsResponse.data.hospitals || []);
    } catch (error) {
      console.error('Error fetching filter options:', error);
    } finally {
      setFiltersLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchDoctors();
  };

  const handleDelete = async () => {
    if (!doctorToDelete) return;
    
    try {
      setDeleteLoading(true);
      await doctorAPI.deleteDoctor(doctorToDelete._id);
      toast.success('Doctor deleted successfully');
      setShowDeleteModal(false);
      setDoctorToDelete(null);
      fetchDoctors();
    } catch (error) {
      handleApiError(error);
    } finally {
      setDeleteLoading(false);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedSpecialization('');
    setSelectedHospital('');
    setCurrentPage(1);
  };

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

  const getTotalAttachments = (doctor: Doctor) => {
    return doctor.attachments ? doctor.attachments.length : 0;
  };

  const getCurrentYearTarget = (doctor: Doctor) => {
    const currentYear = new Date().getFullYear();
    return doctor.targets
      ?.filter(target => target.year === currentYear)
      ?.reduce((sum, target) => sum + target.target, 0) || 0;
  };

  const handleViewFile = (filename: string) => {
    doctorAPI.viewFile(filename);
  };

  const handleDownloadFile = (filename: string, originalName: string) => {
    doctorAPI.downloadFile(filename, originalName);
  };

  if (!canView) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <UserCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">You don't have permission to view doctors</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Doctor Management</h1>
          <p className="text-gray-600 mt-1">
            Manage doctors, specializations, and medical professionals
            {totalDoctors > 0 && ` • ${totalDoctors} total doctors`}
          </p>
        </div>
        
        {canCreate && (
          <Link
            to="/doctors/new"
            className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Doctor
          </Link>
        )}
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search doctors by name, email, or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 border rounded-lg transition-colors duration-200 ${
                showFilters || selectedSpecialization || selectedHospital
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-4 h-4" />
            </button>
            
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
            
            {(searchTerm || selectedSpecialization || selectedHospital) && (
              <button
                type="button"
                onClick={clearFilters}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200"
              >
                Clear
              </button>
            )}
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Specialization
                </label>
                <select
                  value={selectedSpecialization}
                  onChange={(e) => setSelectedSpecialization(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={filtersLoading}
                >
                  <option value="">All Specializations</option>
                  {portfolios.map((portfolio) => (
                    <option key={portfolio._id} value={portfolio._id}>
                      {portfolio.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hospital
                </label>
                <select
                  value={selectedHospital}
                  onChange={(e) => setSelectedHospital(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={filtersLoading}
                >
                  <option value="">All Hospitals</option>
                  {hospitals.map((hospital) => (
                    <option key={hospital._id} value={hospital._id}>
                      {hospital.name} - {hospital.city}
                    </option>
                  ))}
                </select>
              </div>
            </motion.div>
          )}
        </form>
      </div>

      {/* Doctors List */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading doctors...</p>
          </div>
        ) : doctors.length === 0 ? (
          <div className="p-8 text-center">
            <UserCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No doctors found</p>
            {(searchTerm || selectedSpecialization || selectedHospital) && (
              <p className="text-gray-400 text-sm mt-2">
                Try adjusting your search criteria or clear the filters
              </p>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Doctor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Specializations
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hospitals
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Targets
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Documents
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {doctors.map((doctor, index) => {
                    const totalAttachments = getTotalAttachments(doctor);
                    const currentYearTarget = getCurrentYearTarget(doctor);
                    
                    return (
                      <motion.tr
                        key={doctor._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center mr-3">
                              <UserCheck className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{doctor.name}</div>
                              <div className="text-sm text-gray-500">
                                Created: {formatDate(doctor.createdAt)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center text-sm text-gray-900">
                              <Mail className="w-3 h-3 mr-1 text-gray-400" />
                              {doctor.email}
                            </div>
                            <div className="flex items-center text-sm text-gray-900">
                              <Phone className="w-3 h-3 mr-1 text-gray-400" />
                              {doctor.phone}
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                              <MapPin className="w-3 h-3 mr-1 text-gray-400" />
                              {doctor.location}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {doctor.specialization.slice(0, 2).map((spec) => (
                              <span
                                key={spec._id}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                              >
                                <Briefcase className="w-3 h-3 mr-1" />
                                {spec.name}
                              </span>
                            ))}
                            {doctor.specialization.length > 2 && (
                              <span className="text-xs text-gray-500">
                                +{doctor.specialization.length - 2} more
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            {doctor.hospitals.slice(0, 2).map((hospital) => (
                              <div key={hospital._id} className="flex items-center text-sm text-gray-900">
                                <Building2 className="w-3 h-3 mr-1 text-gray-400" />
                                {hospital.name}
                              </div>
                            ))}
                            {doctor.hospitals.length > 2 && (
                              <div className="text-xs text-gray-500">
                                +{doctor.hospitals.length - 2} more hospitals
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center text-sm">
                            <Target className="w-4 h-4 mr-1 text-gray-400" />
                            <span className="font-medium text-emerald-600">{currentYearTarget}</span>
                            <span className="text-gray-500 ml-1">targets</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <div className="flex items-center text-sm text-gray-900">
                              <Files className="w-4 h-4 mr-1 text-gray-400" />
                              <span className="font-medium">{totalAttachments}</span>
                              <span className="text-gray-500 ml-1">
                                {totalAttachments === 1 ? 'file' : 'files'}
                              </span>
                            </div>
                            
                            {doctor.attachments && doctor.attachments.length > 0 && (
                              <div className="flex items-center space-x-1">
                                {doctor.attachments.slice(0, 2).map((attachment) => (
                                  <div key={attachment._id} className="flex items-center space-x-1">
                                    <button
                                      onClick={() => handleViewFile(attachment.filename)}
                                      className="text-blue-600 hover:text-blue-800 p-1 rounded"
                                      title={`View ${attachment.originalName}`}
                                    >
                                      <Eye className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => handleDownloadFile(attachment.filename, attachment.originalName)}
                                      className="text-green-600 hover:text-green-800 p-1 rounded"
                                      title={`Download ${attachment.originalName}`}
                                    >
                                      <Download className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                                {doctor.attachments.length > 2 && (
                                  <span className="text-xs text-gray-400">
                                    +{doctor.attachments.length - 2}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            doctor.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {doctor.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Link
                              to={`/doctors/${doctor._id}`}
                              className="text-blue-600 hover:text-blue-900 p-1 rounded"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            
                            {canUpdate && (
                              <Link
                                to={`/doctors/${doctor._id}/edit`}
                                className="text-green-600 hover:text-green-900 p-1 rounded"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </Link>
                            )}
                            
                            {canDelete && (
                              <button
                                onClick={() => {
                                  setDoctorToDelete(doctor);
                                  setShowDeleteModal(true);
                                }}
                                className="text-red-600 hover:text-red-900 p-1 rounded"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden divide-y divide-gray-200">
              {doctors.map((doctor, index) => {
                const totalAttachments = getTotalAttachments(doctor);
                const currentYearTarget = getCurrentYearTarget(doctor);
                
                return (
                  <motion.div
                    key={doctor._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="p-6"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center">
                          <UserCheck className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-medium text-gray-900">{doctor.name}</h3>
                          
                          <div className="mt-2 space-y-2">
                            <div className="flex items-center text-sm text-gray-600">
                              <Mail className="w-4 h-4 mr-2" />
                              {doctor.email}
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                              <Phone className="w-4 h-4 mr-2" />
                              {doctor.phone}
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                              <MapPin className="w-4 h-4 mr-2" />
                              {doctor.location}
                            </div>
                            
                            {/* Specializations */}
                            <div className="flex flex-wrap gap-1 mt-2">
                              {doctor.specialization.slice(0, 3).map((spec) => (
                                <span
                                  key={spec._id}
                                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                >
                                  {spec.name}
                                </span>
                              ))}
                              {doctor.specialization.length > 3 && (
                                <span className="text-xs text-gray-500">
                                  +{doctor.specialization.length - 3} more
                                </span>
                              )}
                            </div>
                            
                            {/* Stats */}
                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                              <div className="flex items-center">
                                <Target className="w-4 h-4 mr-1" />
                                {currentYearTarget} targets
                              </div>
                              <div className="flex items-center">
                                <Files className="w-4 h-4 mr-1" />
                                {totalAttachments} files
                              </div>
                            </div>
                          </div>
                          
                          <div className="mt-3 flex items-center space-x-4">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              doctor.isActive 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {doctor.isActive ? 'Active' : 'Inactive'}
                            </span>
                            <span className="text-xs text-gray-500">
                              Created: {formatDate(doctor.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        <Link
                          to={`/doctors/${doctor._id}`}
                          className="text-blue-600 hover:text-blue-900 p-2 rounded-lg hover:bg-blue-50"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        
                        {canUpdate && (
                          <Link
                            to={`/doctors/${doctor._id}/edit`}
                            className="text-green-600 hover:text-green-900 p-2 rounded-lg hover:bg-green-50"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                        )}
                        
                        {canDelete && (
                          <button
                            onClick={() => {
                              setDoctorToDelete(doctor);
                              setShowDeleteModal(true);
                            }}
                            className="text-red-600 hover:text-red-900 p-2 rounded-lg hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Page {currentPage} of {totalPages} • {totalDoctors} total doctors
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  
                  <span className="px-3 py-1 text-sm font-medium">
                    {currentPage}
                  </span>
                  
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Modal */}
      {showDeleteModal && doctorToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
          >
            <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Doctor</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <strong>"{doctorToDelete.name}"</strong>? This action cannot be undone and will also delete all associated files and data.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDoctorToDelete(null);
                }}
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
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default DoctorsList;