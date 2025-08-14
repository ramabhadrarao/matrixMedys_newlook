// src/components/Principals/PrincipalsList.tsx
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
  Building2,
  Mail,
  Phone,
  MapPin,
  FileText,
  CreditCard,
  Users,
  Briefcase,
  Filter,
  X,
  Files,
  Download,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { principalAPI, Principal } from '../../services/principalAPI';
import { portfolioAPI, Portfolio } from '../../services/doctorAPI';
import { handleApiError } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

const PrincipalsList: React.FC = () => {
  const [principals, setPrincipals] = useState<Principal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPortfolio, setSelectedPortfolio] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPrincipals, setTotalPrincipals] = useState(0);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [principalToDelete, setPrincipalToDelete] = useState<Principal | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter options
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [filtersLoading, setFiltersLoading] = useState(false);
  
  const navigate = useNavigate();
  const { hasPermission } = useAuthStore();
  
  const canCreate = hasPermission('principals', 'create');
  const canUpdate = hasPermission('principals', 'update');
  const canDelete = hasPermission('principals', 'delete');
  const canView = hasPermission('principals', 'view');

  useEffect(() => {
    if (canView) {
      fetchPrincipals();
      fetchFilterOptions();
    }
  }, [currentPage, canView]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm !== '' || selectedPortfolio) {
        setCurrentPage(1);
        fetchPrincipals();
      } else if (searchTerm === '' && !selectedPortfolio) {
        setCurrentPage(1);
        fetchPrincipals();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, selectedPortfolio]);

  const fetchPrincipals = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 10,
        ...(searchTerm && { search: searchTerm.trim() }),
        ...(selectedPortfolio && { portfolio: selectedPortfolio })
      };
      
      const response = await principalAPI.getPrincipals(params);
      
      if (response.data) {
        setPrincipals(response.data.principals || []);
        if (response.data.pagination) {
          setTotalPages(response.data.pagination.pages || 1);
          setTotalPrincipals(response.data.pagination.total || 0);
        }
      }
    } catch (error) {
      console.error('Error fetching principals:', error);
      handleApiError(error);
      setPrincipals([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchFilterOptions = async () => {
    try {
      setFiltersLoading(true);
      const portfoliosResponse = await portfolioAPI.getPortfolios({ limit: 100 });
      setPortfolios(portfoliosResponse.data.portfolios || []);
    } catch (error) {
      console.error('Error fetching filter options:', error);
    } finally {
      setFiltersLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchPrincipals();
  };

  const handleDelete = async () => {
    if (!principalToDelete) return;
    
    try {
      setDeleteLoading(true);
      await principalAPI.deletePrincipal(principalToDelete._id);
      toast.success('Principal deleted successfully');
      setShowDeleteModal(false);
      setPrincipalToDelete(null);
      fetchPrincipals();
    } catch (error) {
      handleApiError(error);
    } finally {
      setDeleteLoading(false);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedPortfolio('');
    setCurrentPage(1);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString();
  };

  const getTotalDocuments = (principal: Principal) => {
    return principal.documents ? principal.documents.length : 0;
  };

  const getTotalContacts = (principal: Principal) => {
    return principal.contactPersons ? principal.contactPersons.length : 0;
  };

  const getTotalAddresses = (principal: Principal) => {
    return principal.addresses ? principal.addresses.length : 0;
  };

  const getValidDocuments = (principal: Principal) => {
    if (!principal.documents) return 0;
    const now = new Date();
    return principal.documents.filter(doc => {
      if (!doc.hasValidity || !doc.endDate) return true;
      return new Date(doc.endDate) > now;
    }).length;
  };

  const getExpiredDocuments = (principal: Principal) => {
    if (!principal.documents) return 0;
    const now = new Date();
    return principal.documents.filter(doc => {
      if (!doc.hasValidity || !doc.endDate) return false;
      return new Date(doc.endDate) <= now;
    }).length;
  };

  const handleViewFile = (filename: string) => {
    principalAPI.viewFile(filename);
  };

  const handleDownloadFile = (filename: string, originalName: string) => {
    principalAPI.downloadFile(filename, originalName);
  };

  if (!canView) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">You don't have permission to view principals</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Principal Management</h1>
          <p className="text-gray-600 mt-1">
            Manage principals, their portfolios, and contact information
            {totalPrincipals > 0 && ` • ${totalPrincipals} total principals`}
          </p>
        </div>
        
        {canCreate && (
          <Link
            to="/principals/new"
            className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Principal
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
                  placeholder="Search principals by name, email, mobile, GST, or PAN..."
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
                showFilters || selectedPortfolio
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
            
            {(searchTerm || selectedPortfolio) && (
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
                  Portfolio
                </label>
                <select
                  value={selectedPortfolio}
                  onChange={(e) => setSelectedPortfolio(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={filtersLoading}
                >
                  <option value="">All Portfolios</option>
                  {portfolios.map((portfolio) => (
                    <option key={portfolio._id} value={portfolio._id}>
                      {portfolio.name}
                    </option>
                  ))}
                </select>
              </div>
            </motion.div>
          )}
        </form>
      </div>

      {/* Principals List */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading principals...</p>
          </div>
        ) : principals.length === 0 ? (
          <div className="p-8 text-center">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No principals found</p>
            {(searchTerm || selectedPortfolio) && (
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
                      Principal
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Registration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Portfolios
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Details
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
                  {principals.map((principal, index) => {
                    const totalDocs = getTotalDocuments(principal);
                    const validDocs = getValidDocuments(principal);
                    const expiredDocs = getExpiredDocuments(principal);
                    const totalContacts = getTotalContacts(principal);
                    const totalAddresses = getTotalAddresses(principal);
                    
                    return (
                      <motion.tr
                        key={principal._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center mr-3">
                              <Building2 className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{principal.name}</div>
                              <div className="text-sm text-gray-500">
                                Created: {formatDate(principal.createdAt)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center text-sm text-gray-900">
                              <Mail className="w-3 h-3 mr-1 text-gray-400" />
                              {principal.email}
                            </div>
                            <div className="flex items-center text-sm text-gray-900">
                              <Phone className="w-3 h-3 mr-1 text-gray-400" />
                              {principal.mobile}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center text-sm text-gray-900">
                              <FileText className="w-3 h-3 mr-1 text-gray-400" />
                              GST: {principal.gstNumber}
                            </div>
                            <div className="flex items-center text-sm text-gray-900">
                              <CreditCard className="w-3 h-3 mr-1 text-gray-400" />
                              PAN: {principal.panNumber}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {principal.portfolio.slice(0, 2).map((portfolio) => (
                              <span
                                key={portfolio._id}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                              >
                                <Briefcase className="w-3 h-3 mr-1" />
                                {portfolio.name}
                              </span>
                            ))}
                            {principal.portfolio.length > 2 && (
                              <span className="text-xs text-gray-500">
                                +{principal.portfolio.length - 2} more
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center text-gray-600">
                              <MapPin className="w-3 h-3 mr-1" />
                              {totalAddresses} address{totalAddresses !== 1 ? 'es' : ''}
                            </div>
                            <div className="flex items-center text-gray-600">
                              <Users className="w-3 h-3 mr-1" />
                              {totalContacts} contact{totalContacts !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <div className="flex items-center text-sm text-gray-900">
                              <Files className="w-4 h-4 mr-1 text-gray-400" />
                              <span className="font-medium">{totalDocs}</span>
                              <span className="text-gray-500 ml-1">
                                {totalDocs === 1 ? 'file' : 'files'}
                              </span>
                            </div>
                            
                            {totalDocs > 0 && (
                              <div className="flex items-center space-x-2 text-xs">
                                {validDocs > 0 && (
                                  <span className="text-green-600">
                                    {validDocs} valid
                                  </span>
                                )}
                                {expiredDocs > 0 && (
                                  <span className="text-red-600">
                                    {expiredDocs} expired
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            principal.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {principal.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Link
                              to={`/principals/${principal._id}`}
                              className="text-blue-600 hover:text-blue-900 p-1 rounded"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            
                            {canUpdate && (
                              <Link
                                to={`/principals/${principal._id}/edit`}
                                className="text-green-600 hover:text-green-900 p-1 rounded"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </Link>
                            )}
                            
                            {canDelete && (
                              <button
                                onClick={() => {
                                  setPrincipalToDelete(principal);
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
              {principals.map((principal, index) => {
                const totalDocs = getTotalDocuments(principal);
                const validDocs = getValidDocuments(principal);
                const expiredDocs = getExpiredDocuments(principal);
                const totalContacts = getTotalContacts(principal);
                const totalAddresses = getTotalAddresses(principal);
                
                return (
                  <motion.div
                    key={principal._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="p-6"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center">
                          <Building2 className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-medium text-gray-900">{principal.name}</h3>
                          
                          <div className="mt-2 space-y-2">
                            <div className="flex items-center text-sm text-gray-600">
                              <Mail className="w-4 h-4 mr-2" />
                              {principal.email}
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                              <Phone className="w-4 h-4 mr-2" />
                              {principal.mobile}
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                              <FileText className="w-4 h-4 mr-2" />
                              GST: {principal.gstNumber}
                            </div>
                            
                            {/* Portfolios */}
                            <div className="flex flex-wrap gap-1 mt-2">
                              {principal.portfolio.slice(0, 3).map((portfolio) => (
                                <span
                                  key={portfolio._id}
                                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                >
                                  {portfolio.name}
                                </span>
                              ))}
                              {principal.portfolio.length > 3 && (
                                <span className="text-xs text-gray-500">
                                  +{principal.portfolio.length - 3} more
                                </span>
                              )}
                            </div>
                            
                            {/* Stats */}
                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                              <div className="flex items-center">
                                <MapPin className="w-4 h-4 mr-1" />
                                {totalAddresses} addresses
                              </div>
                              <div className="flex items-center">
                                <Users className="w-4 h-4 mr-1" />
                                {totalContacts} contacts
                              </div>
                              <div className="flex items-center">
                                <Files className="w-4 h-4 mr-1" />
                                {totalDocs} files
                              </div>
                            </div>
                            
                            {totalDocs > 0 && (
                              <div className="flex items-center space-x-3 text-xs">
                                {validDocs > 0 && (
                                  <span className="text-green-600">
                                    {validDocs} valid docs
                                  </span>
                                )}
                                {expiredDocs > 0 && (
                                  <span className="text-red-600 flex items-center">
                                    <AlertCircle className="w-3 h-3 mr-1" />
                                    {expiredDocs} expired
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          
                          <div className="mt-3 flex items-center space-x-4">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              principal.isActive 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {principal.isActive ? 'Active' : 'Inactive'}
                            </span>
                            <span className="text-xs text-gray-500">
                              Created: {formatDate(principal.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        <Link
                          to={`/principals/${principal._id}`}
                          className="text-blue-600 hover:text-blue-900 p-2 rounded-lg hover:bg-blue-50"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        
                        {canUpdate && (
                          <Link
                            to={`/principals/${principal._id}/edit`}
                            className="text-green-600 hover:text-green-900 p-2 rounded-lg hover:bg-green-50"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                        )}
                        
                        {canDelete && (
                          <button
                            onClick={() => {
                              setPrincipalToDelete(principal);
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
                  Page {currentPage} of {totalPages} • {totalPrincipals} total principals
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
      {showDeleteModal && principalToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
          >
            <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Principal</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <strong>"{principalToDelete.name}"</strong>? This action cannot be undone and will also delete all associated addresses, documents, and contact persons.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setPrincipalToDelete(null);
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

export default PrincipalsList;