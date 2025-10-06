import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Save, X, Plus, Trash2, Search, Calculator, FileText, Building2,
  Mail, Phone, MapPin, Package, ChevronDown, ChevronUp, AlertCircle,
  Percent, IndianRupee, Truck, Send, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { purchaseOrderAPI } from '../../services/purchaseOrderAPI';
import { principalAPI } from '../../services/principalAPI';
import { branchAPI } from '../../services/branchAPI';
import { warehouseAPI } from '../../services/warehouseAPI';
import { hospitalAPI } from '../../services/hospitalAPI';
import { productAPI } from '../../services/productAPI';
import { useAuthStore } from '../../store/authStore';

interface ProductLine {
  _id: string;
  product: string;
  productCode: string;
  productName: string;
  description: string;
  unitPrice: number;
  quantity: number;
  foc: number;
  discount: number;
  discountType: 'percentage' | 'amount';
  unit: string;
  gstRate: number;
  totalCost: number;
  remarks: string;
}

const PurchaseOrderForm: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const { user, hasPermission } = useAuthStore();
  
  // Permission checks
  const canUpdate = hasPermission('purchase_orders', 'update');
  const canSubmitForApproval = hasPermission('po_workflow', 'submit');
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submittingForApproval, setSubmittingForApproval] = useState(false);
  const [principals, setPrincipals] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  
  // UI States
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [expandedSections, setExpandedSections] = useState({
    supplier: true,
    products: true,
    billing: true,
    shipping: true,
    discount: true,
    communication: true,
    grand: true
  });
  
  // Form Data
  const [formData, setFormData] = useState({
    principal: '',
    poNumber: '',
    poDate: new Date().toISOString().split('T')[0],
    
    // Bill To
    billToType: 'branch',
    billToBranch: '',
    billToWarehouse: '',
    billToHospital: '',
    billTo: {
      branchWarehouse: '',
      name: 'MATRYX MEDISYS PRIVATE LIMITED',
      address: '',
      gstin: '',
      drugLicense: '',
      phone: ''
    },
    
    // Ship To
    shipToType: 'branch',
    shipToBranch: '',
    shipToWarehouse: '',
    shipTo: {
      branchWarehouse: '',
      name: '',
      address: '',
      gstin: '',
      drugLicense: '',
      phone: ''
    },
    
    // Products
    products: [] as ProductLine[],
    
    // Discount & Tax
    intraStateGST: false,
    additionalDiscount: { type: 'amount' as 'amount' | 'percentage', value: 0 },
    shippingCharges: { type: 'amount' as 'amount' | 'percentage', value: 0 },
    gstRate: 5,
    
    // Communication
    toEmails: [] as string[],
    fromEmail: user?.email || '',
    ccEmails: [] as string[],
    
    // Additional
    terms: '',
    notes: ''
  });

  // Purchase Order State
  const [purchaseOrderData, setPurchaseOrderData] = useState<any>(null);

  // Calculated Values
  const [calculations, setCalculations] = useState({
    subTotal: 0,
    productLevelDiscount: 0,
    additionalDiscountAmount: 0,
    cgst: 0,
    sgst: 0,
    igst: 0,
    shippingAmount: 0,
    grandTotal: 0
  });

  useEffect(() => {
    loadMasterData();
    if (isEdit && id) {
      loadPurchaseOrder(id);
    }
  }, [id, isEdit]);

  useEffect(() => {
    if (formData.principal) {
      loadProducts(formData.principal);
      generatePONumber();
      loadPrincipalEmails();
    }
  }, [formData.principal]);

  useEffect(() => {
    if (formData.billToBranch && formData.billToType === 'branch') {
      updateBillToDetails('branch');
    } else if (formData.billToBranch && formData.billToType === 'warehouse') {
      loadWarehouses(formData.billToBranch);
    }
  }, [formData.billToBranch, formData.billToType]);

  useEffect(() => {
    if (formData.billToWarehouse && formData.billToType === 'warehouse') {
      updateBillToDetails('warehouse');
    }
  }, [formData.billToWarehouse, formData.billToType]);

  useEffect(() => {
    if (formData.billToHospital && formData.billToType === 'hospital') {
      updateBillToDetails('hospital');
    }
  }, [formData.billToHospital, formData.billToType]);

  useEffect(() => {
    if (formData.shipToBranch && formData.shipToType === 'branch') {
      updateShipToDetails('branch');
      loadWarehouses(formData.shipToBranch);
    }
  }, [formData.shipToBranch, formData.shipToType]);

  useEffect(() => {
    if (formData.shipToWarehouse && formData.shipToType === 'warehouse') {
      updateShipToDetails('warehouse');
    }
  }, [formData.shipToWarehouse]);

  useEffect(() => {
    calculateTotals();
  }, [formData.products, formData.additionalDiscount, formData.shippingCharges, formData.intraStateGST, formData.gstRate]);

  const loadMasterData = async () => {
    try {
      setLoading(true);
      const [principalsRes, branchesRes, hospitalsRes] = await Promise.all([
        principalAPI.getPrincipals({ limit: 100 }),
        branchAPI.getBranches({ limit: 100 }),
        hospitalAPI.getHospitals({ limit: 100 })
      ]);
      
      setPrincipals(principalsRes.data.principals || []);
      setBranches(branchesRes.data.branches || []);
      setHospitals(hospitalsRes.data.hospitals || []);
    } catch (error) {
      toast.error('Failed to load master data');
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async (principalId: string) => {
    try {
      const response = await productAPI.getProductsForPO(principalId);
      setProducts(response.products || []);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadWarehouses = async (branchId: string) => {
    try {
      const response = await warehouseAPI.getWarehousesByBranch(branchId);
      setWarehouses(response.data.warehouses || []);
    } catch (error) {
      console.error('Error loading warehouses:', error);
    }
  };

  const loadPurchaseOrder = async (poId: string) => {
    try {
      setLoading(true);
      const response = await purchaseOrderAPI.getPurchaseOrder(poId);
      const po = response.purchaseOrder;
      
      // Store the full PO data for workflow information
      setPurchaseOrderData(po);
      
      // Map the backend data to form structure
      setFormData({
        principal: po.principal._id || po.principal,
        poNumber: po.poNumber,
        poDate: new Date(po.poDate).toISOString().split('T')[0],
        
        // For edit mode, we'll need to determine which branch/warehouse was selected
        // This is complex as we only have the branchWarehouse string
        billToBranch: '', // We'll need to find this by matching po.billTo.branchWarehouse
        billTo: po.billTo,
        
        shipToType: po.shipTo.branchWarehouse.toLowerCase().includes('warehouse') ? 'warehouse' : 'branch',
        shipToBranch: '', // We'll need to find this
        shipToWarehouse: '',
        shipTo: po.shipTo,
        
        products: po.products.map((p: any) => ({
          _id: Math.random().toString(),
          product: p.product._id || p.product,
          productCode: p.productCode || '',
          productName: p.productName || '',
          description: p.description || '',
          unitPrice: p.unitPrice || 0,
          quantity: p.quantity || 1,
          foc: p.foc || 0,
          discount: p.discount || 0,
          discountType: p.discountType || 'amount',
          unit: p.unit || 'PCS',
          gstRate: p.gstRate || 18,
          totalCost: p.totalCost || 0,
          remarks: p.remarks || ''
        })),
        
        intraStateGST: po.taxType === 'CGST_SGST',
        additionalDiscount: po.additionalDiscount || { type: 'amount', value: 0 },
        shippingCharges: po.shippingCharges || { type: 'amount', value: 0 },
        gstRate: po.gstRate || 5,
        toEmails: po.toEmails || [],
        fromEmail: po.fromEmail || user?.email || '',
        ccEmails: po.ccEmails || [],
        terms: po.terms || '',
        notes: po.notes || ''
      });
    } catch (error) {
      toast.error('Failed to load purchase order');
      navigate('/purchase-orders');
    } finally {
      setLoading(false);
    }
  };

  const generatePONumber = async () => {
    if (!formData.principal || isEdit) return;
    
    try {
      const response = await purchaseOrderAPI.getNextPONumber(formData.principal, formData.poDate);
      setFormData(prev => ({ ...prev, poNumber: response.nextPONumber }));
    } catch (error) {
      console.error('Error generating PO number:', error);
      // Fallback to client-side generation if API fails
      const principal = principals.find(p => p._id === formData.principal);
      if (principal) {
        const principalCode = principal.name.substring(0, 3).toUpperCase();
        const date = new Date();
        const dateStr = `${date.getDate().toString().padStart(2, '0')}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getFullYear().toString().substr(-2)}`;
        const timestamp = Date.now();
        const serialNo = (timestamp % 1000).toString().padStart(3, '0');
        
        const poNumber = `MM-${principalCode}-${dateStr}/${serialNo}`;
        setFormData(prev => ({ ...prev, poNumber }));
      }
    }
  };

  const loadPrincipalEmails = () => {
    const principal = principals.find(p => p._id === formData.principal);
    if (principal && principal.email) {
      setFormData(prev => ({
        ...prev,
        toEmails: [principal.email]
      }));
    }
  };

  const updateBillToDetails = (type: 'branch' | 'warehouse' | 'hospital') => {
    if (type === 'branch') {
      const branch = branches.find(b => b._id === formData.billToBranch);
      if (branch) {
        setFormData(prev => ({
          ...prev,
          billTo: {
            branchWarehouse: branch.name,
            name: 'MATRYX MEDISYS PRIVATE LIMITED',
            address: `${branch.gstAddress}, ${branch.city}, ${branch.state?.name || ''} - ${branch.pincode}`,
            gstin: branch.gstNumber,
            drugLicense: branch.drugLicenseNumber,
            phone: branch.phone
          }
        }));
      }
    } else if (type === 'warehouse') {
      const warehouse = warehouses.find(w => w._id === formData.billToWarehouse);
      if (warehouse) {
        setFormData(prev => ({
          ...prev,
          billTo: {
            branchWarehouse: warehouse.name,
            name: warehouse.name,
            address: `${warehouse.address}, ${warehouse.district} - ${warehouse.pincode}`,
            gstin: warehouse.gstNumber || '',
            drugLicense: warehouse.drugLicenseNumber || '',
            phone: warehouse.phone || ''
          }
        }));
      }
    } else if (type === 'hospital') {
      const hospital = hospitals.find(h => h._id === formData.billToHospital);
      if (hospital) {
        setFormData(prev => ({
          ...prev,
          billTo: {
            branchWarehouse: hospital.name,
            name: hospital.name,
            address: `${hospital.gstAddress}, ${hospital.city}, ${hospital.state?.name || ''} - ${hospital.pincode}`,
            gstin: hospital.gstNumber,
            drugLicense: '',
            phone: hospital.phone
          }
        }));
      }
    }
  };

  const updateShipToDetails = (type: 'branch' | 'warehouse') => {
    if (type === 'branch') {
      const branch = branches.find(b => b._id === formData.shipToBranch);
      if (branch) {
        setFormData(prev => ({
          ...prev,
          shipTo: {
            branchWarehouse: branch.name,
            name: branch.name,
            address: `${branch.gstAddress}, ${branch.city}, ${branch.state?.name || ''} - ${branch.pincode}`,
            gstin: branch.gstNumber,
            drugLicense: branch.drugLicenseNumber,
            phone: branch.phone
          }
        }));
      }
    } else {
      const warehouse = warehouses.find(w => w._id === formData.shipToWarehouse);
      if (warehouse) {
        setFormData(prev => ({
          ...prev,
          shipTo: {
            branchWarehouse: warehouse.name,
            name: warehouse.name,
            address: `${warehouse.address}, ${warehouse.district}, ${warehouse.state?.name || ''} - ${warehouse.pincode}`,
            gstin: warehouse.branch?.gstNumber || '',
            drugLicense: warehouse.drugLicenseNumber,
            phone: warehouse.phone
          }
        }));
      }
    }
  };

  const calculateTotals = () => {
    const calculationsResult = purchaseOrderAPI.calculateTotals(
      formData.products,
      formData.additionalDiscount,
      formData.shippingCharges,
      formData.gstRate,
      formData.intraStateGST
    );
    
    setCalculations(calculationsResult);
  };

  const handleAddProduct = (product: any) => {
    const unitPrice = product.dealerPrice || 0;
    const quantity = 1;
    const foc = 0;
    const discount = 0;
    
    // Calculate initial totalCost
    const effectiveQty = quantity - foc;
    const baseAmount = effectiveQty * unitPrice;
    const totalCost = Math.max(0, baseAmount - discount);
    
    const newProduct: ProductLine = {
      _id: Math.random().toString(),
      product: product._id,
      productCode: product.code,
      productName: product.name,
      description: product.specification || '',
      unitPrice: unitPrice,
      quantity: quantity,
      foc: foc,
      discount: discount,
      discountType: 'percentage',
      unit: product.unit,
      gstRate: product.gstPercentage,
      totalCost: totalCost,
      remarks: ''
    };
    
    setFormData(prev => ({
      ...prev,
      products: [...prev.products, newProduct]
    }));
    
    setShowProductSearch(false);
    setProductSearchTerm('');
  };

  const updateProductLine = (index: number, field: keyof ProductLine, value: any) => {
    const updatedProducts = [...formData.products];
    updatedProducts[index] = {
      ...updatedProducts[index],
      [field]: value
    };
    
    // Calculate totalCost for the updated product line
    const product = updatedProducts[index];
    const effectiveQty = (product.quantity || 0) - (product.foc || 0);
    const baseAmount = effectiveQty * (product.unitPrice || 0);
    
    let discount = 0;
    if (product.discount && product.discount > 0) {
      if (product.discountType === 'percentage') {
        discount = (baseAmount * product.discount) / 100;
      } else {
        discount = product.discount;
      }
    }
    
    updatedProducts[index].totalCost = Math.max(0, baseAmount - discount);
    
    setFormData(prev => ({ ...prev, products: updatedProducts }));
  };

  const removeProductLine = (index: number) => {
    setFormData(prev => ({
      ...prev,
      products: prev.products.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.principal) {
      toast.error('Please select a principal');
      return;
    }
    
    if (!formData.billToBranch) {
      toast.error('Please select billing branch');
      return;
    }
    
    if (!formData.shipToBranch && !formData.shipToWarehouse) {
      toast.error('Please select shipping location');
      return;
    }
    
    if (formData.products.length === 0) {
      toast.error('Please add at least one product');
      return;
    }
    
    if (formData.toEmails.length === 0) {
      toast.error('Please add at least one recipient email');
      return;
    }

    try {
      setSaving(true);
      
      const payload = {
        // Don't send poNumber for new POs - let backend generate it
        ...(isEdit && { poNumber: formData.poNumber }),
        poDate: formData.poDate,
        principal: formData.principal,
        billTo: formData.billTo,
        shipTo: formData.shipTo,
        
        // Products - match backend expected structure
        products: formData.products.map(p => ({
          product: p.product,
          productCode: p.productCode,
          productName: p.productName,
          description: p.description,
          quantity: p.quantity,
          unitPrice: p.unitPrice,
          foc: p.foc || 0,
          discount: p.discount || 0,
          discountType: p.discountType || 'amount',
          unit: p.unit || 'PCS',
          gstRate: p.gstRate || 18,
          remarks: p.remarks || ''
        })),
        
        // Financial settings
        additionalDiscount: formData.additionalDiscount || { type: 'amount', value: 0 },
        taxType: formData.intraStateGST ? 'CGST_SGST' : 'IGST',
        gstRate: formData.gstRate || 5,
        shippingCharges: formData.shippingCharges || { type: 'amount', value: 0 },
        
        // Communication
        toEmails: formData.toEmails,
        fromEmail: formData.fromEmail,
        ccEmails: formData.ccEmails || [],
        terms: formData.terms || '',
        notes: formData.notes || ''
      };

      console.log('Submitting PO with payload:', payload);
      
      if (isEdit && id) {
        const response = await purchaseOrderAPI.updatePurchaseOrder(id, payload);
        toast.success(response.message || 'Purchase order updated successfully');
      } else {
        const response = await purchaseOrderAPI.createPurchaseOrder(payload);
        console.log('PO creation response:', response);
        
        // Show generated PO number if available
        if (response.generatedPONumber) {
          toast.success(`Purchase order created with PO# ${response.generatedPONumber}`);
        } else {
          toast.success(response.message || 'Purchase order created successfully');
        }
      }
      
      navigate('/purchase-orders');
    } catch (error: any) {
      console.error('PO submission error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to save purchase order';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForApproval = async () => {
    // Validation
    if (!formData.principal) {
      toast.error('Please select a principal');
      return;
    }
    
    if (!formData.billToBranch) {
      toast.error('Please select billing branch');
      return;
    }
    
    if (!formData.shipToBranch && !formData.shipToWarehouse) {
      toast.error('Please select shipping location');
      return;
    }
    
    if (formData.products.length === 0) {
      toast.error('Please add at least one product');
      return;
    }

    try {
      setSubmittingForApproval(true);
      
      if (!isEdit || !id) {
        toast.error('Purchase order must be saved before submitting for approval');
        return;
      }
      
      const response = await purchaseOrderAPI.submitForApproval(id);
      toast.success(response.message || 'Purchase order submitted for approval successfully');
      navigate('/purchase-orders');
    } catch (error: any) {
      console.error('Submit for approval error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to submit purchase order for approval';
      toast.error(errorMessage);
    } finally {
      setSubmittingForApproval(false);
    }
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const formatCurrency = (amount: number) => {
    return purchaseOrderAPI.formatCurrency(amount);
  };

  useEffect(() => {
    const filtered = products.filter(product =>
      product.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
      product.code.toLowerCase().includes(productSearchTerm.toLowerCase())
    );
    setFilteredProducts(filtered);
  }, [productSearchTerm, products]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/purchase-orders')}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEdit ? 'Edit Purchase Order' : 'Create Purchase Order'}
            </h1>
            <p className="text-gray-600 mt-1">
              {formData.poNumber || 'PO Number will be auto-generated'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigate('/purchase-orders')}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || submittingForApproval || (isEdit && !canUpdate)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-colors"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {isEdit ? 'Update PO' : 'Generate PO'}
              </>
            )}
          </button>
          
          {/* Submit for Approval Button - Only show for draft POs in edit mode */}
          {isEdit && purchaseOrderData?.currentStage?.code === 'DRAFT' && canSubmitForApproval && (
            <button
              onClick={handleSubmitForApproval}
              disabled={saving || submittingForApproval}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-colors"
            >
              {submittingForApproval ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit for Approval
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Principal Selection */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Building2 className="w-5 h-5 mr-2" />
            Principal Selection
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Principal *
            </label>
            <select
              value={formData.principal}
              onChange={(e) => setFormData(prev => ({ ...prev, principal: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isEdit}
            >
              <option value="">Select Principal</option>
              {principals.map(principal => (
                <option key={principal._id} value={principal._id}>
                  {principal.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              PO Date *
            </label>
            <input
              type="date"
              value={formData.poDate}
              onChange={(e) => setFormData(prev => ({ ...prev, poDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Bill To & Ship To */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bill To */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Bill To (Billing Details)</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Bill To Type *
              </label>
              <div className="grid grid-cols-3 gap-3">
                <label className={`flex items-center justify-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                  formData.billToType === 'branch' 
                    ? 'border-blue-500 bg-blue-50 text-blue-700' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}>
                  <input
                    type="radio"
                    value="branch"
                    checked={formData.billToType === 'branch'}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      billToType: 'branch',
                      billToWarehouse: '', // Clear warehouse selection
                      billToHospital: '', // Clear hospital selection
                      billTo: { branchWarehouse: '', name: '', address: '', gstin: '', drugLicense: '', phone: '' }
                    }))}
                    className="sr-only"
                  />
                  <div className="text-center">
                    <div className="font-medium">Branch</div>
                    <div className="text-xs text-gray-500">Bill to branch</div>
                  </div>
                </label>
                <label className={`flex items-center justify-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                  formData.billToType === 'warehouse' 
                    ? 'border-blue-500 bg-blue-50 text-blue-700' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}>
                  <input
                    type="radio"
                    value="warehouse"
                    checked={formData.billToType === 'warehouse'}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      billToType: 'warehouse',
                      billToBranch: '', // Clear branch selection
                      billToHospital: '', // Clear hospital selection
                      billTo: { branchWarehouse: '', name: '', address: '', gstin: '', drugLicense: '', phone: '' }
                    }))}
                    className="sr-only"
                  />
                  <div className="text-center">
                    <div className="font-medium">Warehouse</div>
                    <div className="text-xs text-gray-500">Bill to warehouse</div>
                  </div>
                </label>
                <label className={`flex items-center justify-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                  formData.billToType === 'hospital' 
                    ? 'border-blue-500 bg-blue-50 text-blue-700' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}>
                  <input
                    type="radio"
                    value="hospital"
                    checked={formData.billToType === 'hospital'}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      billToType: 'hospital',
                      billToBranch: '', // Clear branch selection
                      billToWarehouse: '', // Clear warehouse selection
                      billTo: { branchWarehouse: '', name: '', address: '', gstin: '', drugLicense: '', phone: '' }
                    }))}
                    className="sr-only"
                  />
                  <div className="text-center">
                    <div className="font-medium">Hospital</div>
                    <div className="text-xs text-gray-500">Bill to hospital</div>
                  </div>
                </label>
              </div>
            </div>
            
            {formData.billToType === 'branch' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Branch *
                </label>
                <select
                  value={formData.billToBranch}
                  onChange={(e) => setFormData(prev => ({ ...prev, billToBranch: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Choose a branch for billing...</option>
                  {branches.map(branch => (
                    <option key={branch._id} value={branch._id}>
                      {branch.name} - {branch.city}, {branch.state?.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : formData.billToType === 'warehouse' ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Branch (to load warehouses) *
                  </label>
                  <select
                    value={formData.billToBranch}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      billToBranch: e.target.value,
                      billToWarehouse: '', // Clear warehouse when branch changes
                      billTo: { branchWarehouse: '', name: '', address: '', gstin: '', drugLicense: '', phone: '' }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Choose a branch first...</option>
                    {branches.map(branch => (
                      <option key={branch._id} value={branch._id}>
                        {branch.name} - {branch.city}, {branch.state?.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Warehouse *
                  </label>
                  <select
                    value={formData.billToWarehouse}
                    onChange={(e) => setFormData(prev => ({ ...prev, billToWarehouse: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      !formData.billToBranch 
                        ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed' 
                        : 'border-gray-300'
                    }`}
                    disabled={!formData.billToBranch}
                  >
                    <option value="">
                      {!formData.billToBranch ? 'Select a branch first...' : 'Choose a warehouse...'}
                    </option>
                    {warehouses.map(warehouse => (
                      <option key={warehouse._id} value={warehouse._id}>
                        {warehouse.name} - {warehouse.district}
                      </option>
                    ))}
                  </select>
                  {!formData.billToBranch && (
                    <div className="flex items-center mt-2 text-xs text-amber-600">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Please select a branch first to load available warehouses
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Hospital *
                </label>
                <select
                  value={formData.billToHospital}
                  onChange={(e) => setFormData(prev => ({ ...prev, billToHospital: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Choose a hospital for billing...</option>
                  {hospitals.map(hospital => (
                    <option key={hospital._id} value={hospital._id}>
                      {hospital.name} - {hospital.city}, {hospital.state?.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            {formData.billTo.name && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <div className="font-medium text-gray-900">{formData.billTo.name}</div>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-start">
                        <svg className="w-4 h-4 mr-2 mt-0.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                        <span>{formData.billTo.address}</span>
                      </div>
                      {formData.billTo.gstin && (
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span>GSTIN: {formData.billTo.gstin}</span>
                        </div>
                      )}
                      {formData.billTo.drugLicense && (
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span>DL No: {formData.billTo.drugLicense}</span>
                        </div>
                      )}
                      {formData.billTo.phone && (
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <span>{formData.billTo.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="ml-3">
                    <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      ✓ Selected
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Ship To */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Ship To (Shipping Details)</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Ship To Type *
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className={`flex items-center justify-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                  formData.shipToType === 'branch' 
                    ? 'border-blue-500 bg-blue-50 text-blue-700' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}>
                  <input
                    type="radio"
                    value="branch"
                    checked={formData.shipToType === 'branch'}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      shipToType: 'branch',
                      shipToWarehouse: '', // Clear warehouse selection
                      shipTo: { branchWarehouse: '', name: '', address: '', gstin: '', drugLicense: '', phone: '' }
                    }))}
                    className="sr-only"
                  />
                  <div className="text-center">
                    <div className="font-medium">Branch</div>
                    <div className="text-xs text-gray-500">Ship directly to branch</div>
                  </div>
                </label>
                <label className={`flex items-center justify-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                  formData.shipToType === 'warehouse' 
                    ? 'border-blue-500 bg-blue-50 text-blue-700' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}>
                  <input
                    type="radio"
                    value="warehouse"
                    checked={formData.shipToType === 'warehouse'}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      shipToType: 'warehouse',
                      shipToBranch: '', // Clear branch selection
                      shipTo: { branchWarehouse: '', name: '', address: '', gstin: '', drugLicense: '', phone: '' }
                    }))}
                    className="sr-only"
                  />
                  <div className="text-center">
                    <div className="font-medium">Warehouse</div>
                    <div className="text-xs text-gray-500">Ship to warehouse</div>
                  </div>
                </label>
              </div>
            </div>
            
            {formData.shipToType === 'branch' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Branch *
                </label>
                <select
                  value={formData.shipToBranch}
                  onChange={(e) => setFormData(prev => ({ ...prev, shipToBranch: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Choose a branch for shipping...</option>
                  {branches.map(branch => (
                    <option key={branch._id} value={branch._id}>
                      {branch.name} - {branch.city}, {branch.state?.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Branch (to load warehouses) *
                  </label>
                  <select
                    value={formData.shipToBranch}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      shipToBranch: e.target.value,
                      shipToWarehouse: '', // Clear warehouse when branch changes
                      shipTo: { branchWarehouse: '', name: '', address: '', gstin: '', drugLicense: '', phone: '' }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Choose a branch first...</option>
                    {branches.map(branch => (
                      <option key={branch._id} value={branch._id}>
                        {branch.name} - {branch.city}, {branch.state?.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Warehouse *
                  </label>
                  <select
                    value={formData.shipToWarehouse}
                    onChange={(e) => setFormData(prev => ({ ...prev, shipToWarehouse: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      !formData.shipToBranch 
                        ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed' 
                        : 'border-gray-300'
                    }`}
                    disabled={!formData.shipToBranch}
                  >
                    <option value="">
                      {!formData.shipToBranch ? 'Select a branch first...' : 'Choose a warehouse...'}
                    </option>
                    {warehouses.map(warehouse => (
                      <option key={warehouse._id} value={warehouse._id}>
                        {warehouse.name} - {warehouse.district}
                      </option>
                    ))}
                  </select>
                  {!formData.shipToBranch && (
                    <div className="flex items-center mt-2 text-xs text-amber-600">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Please select a branch first to load available warehouses
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {formData.shipTo.name && (
              <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 border border-green-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <div className="font-medium text-gray-900">{formData.shipTo.name}</div>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-start">
                        <svg className="w-4 h-4 mr-2 mt-0.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                        <span>{formData.shipTo.address}</span>
                      </div>
                      {formData.shipTo.gstin && (
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span>GSTIN: {formData.shipTo.gstin}</span>
                        </div>
                      )}
                      {formData.shipTo.drugLicense && (
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span>DL No: {formData.shipTo.drugLicense}</span>
                        </div>
                      )}
                      {formData.shipTo.phone && (
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <span>{formData.shipTo.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="ml-3">
                    <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      ✓ Selected
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Product List */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Package className="w-5 h-5 mr-2" />
              Product List
              {formData.products.length > 0 && (
                <span className="ml-2 text-sm text-gray-500">
                  ({formData.products.length} items)
                </span>
              )}
            </h2>
            <button
              onClick={() => setShowProductSearch(true)}
              disabled={!formData.principal}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </button>
          </div>
        </div>
        
        <div className="p-6">
          {formData.products.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No products added</p>
              <p className="text-gray-400 text-sm mt-2">
                {formData.principal ? 'Click "Add Product" to get started' : 'Select a principal first'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">S.No</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product Code & Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">FOC</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Discount</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total Cost</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {formData.products.map((product, index) => (
                    <tr key={product._id}>
                      <td className="px-4 py-2 text-sm">{index + 1}</td>
                      <td className="px-4 py-2">
                        <div className="text-sm font-medium text-gray-900">{product.productCode}</div>
                        <div className="text-sm text-gray-500">{product.productName}</div>
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={product.description}
                          onChange={(e) => updateProductLine(index, 'description', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                          placeholder="Enter description"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          value={product.unitPrice}
                          onChange={(e) => updateProductLine(index, 'unitPrice', Number(e.target.value))}
                          className="w-20 px-2 py-1 text-sm border border-gray-300 rounded"
                          min="0"
                          step="0.01"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          value={product.quantity}
                          onChange={(e) => updateProductLine(index, 'quantity', Number(e.target.value))}
                          className="w-16 px-2 py-1 text-sm border border-gray-300 rounded"
                          min="1"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          value={product.foc}
                          onChange={(e) => updateProductLine(index, 'foc', Number(e.target.value))}
                          className="w-16 px-2 py-1 text-sm border border-gray-300 rounded"
                          min="0"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center space-x-1">
                          <input
                            type="number"
                            value={product.discount}
                            onChange={(e) => updateProductLine(index, 'discount', Number(e.target.value))}
                            className="w-16 px-2 py-1 text-sm border border-gray-300 rounded"
                            min="0"
                          />
                          <select
                            value={product.discountType}
                            onChange={(e) => updateProductLine(index, 'discountType', e.target.value)}
                            className="px-1 py-1 text-sm border border-gray-300 rounded"
                          >
                            <option value="percentage">%</option>
                            <option value="amount">₹</option>
                          </select>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-sm font-medium">
                        {formatCurrency(product.totalCost)}
                      </td>
                      <td className="px-4 py-2">
                        <button
                          onClick={() => removeProductLine(index)}
                          className="text-red-600 hover:text-red-800 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Discount and Tax Section */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Discount and Tax Section (Optional)</h2>
          <button
            onClick={() => toggleSection('discount')}
            className="text-gray-500 hover:text-gray-700"
          >
            {expandedSections.discount ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
        
        {expandedSections.discount && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.intraStateGST}
                  onChange={(e) => setFormData(prev => ({ ...prev, intraStateGST: e.target.checked }))}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">
                  Intra-State GST (CGST + SGST)
                </span>
              </label>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Discount
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  value={formData.additionalDiscount.value}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    additionalDiscount: {
                      ...prev.additionalDiscount,
                      value: Number(e.target.value)
                    }
                  }))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                />
                <select
                  value={formData.additionalDiscount.type}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    additionalDiscount: {
                      ...prev.additionalDiscount,
                      type: e.target.value as 'percentage' | 'amount'
                    }
                  }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="percentage">%</option>
                  <option value="amount">₹</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Shipping/Additional Charges
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  value={formData.shippingCharges.value}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    shippingCharges: {
                      ...prev.shippingCharges,
                      value: Number(e.target.value)
                    }
                  }))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                />
                <select
                  value={formData.shippingCharges.type}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    shippingCharges: {
                      ...prev.shippingCharges,
                      type: e.target.value as 'percentage' | 'amount'
                    }
                  }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="amount">₹</option>
                  <option value="percentage">%</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                GST Rate (%)
              </label>
              <input
                type="number"
                value={formData.gstRate}
                onChange={(e) => setFormData(prev => ({ ...prev, gstRate: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0"
                max="100"
              />
            </div>
          </div>
        )}
      </div>

      {/* Grand Total Section */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Grand Total Section</h2>
        
        <div className="space-y-3">
          <div className="flex justify-between py-2">
            <span className="text-gray-600">Sub Total:</span>
            <span className="font-medium">{formatCurrency(calculations.subTotal)}</span>
          </div>
          
          {calculations.productLevelDiscount > 0 && (
            <div className="flex justify-between py-2">
              <span className="text-gray-600">Product-Level Discount:</span>
              <span className="font-medium text-red-600">- {formatCurrency(calculations.productLevelDiscount)}</span>
            </div>
          )}
          
          {calculations.additionalDiscountAmount > 0 && (
            <div className="flex justify-between py-2">
              <span className="text-gray-600">Additional Discount:</span>
              <span className="font-medium text-red-600">- {formatCurrency(calculations.additionalDiscountAmount)}</span>
            </div>
          )}
          
          {formData.intraStateGST ? (
            <>
              <div className="flex justify-between py-2">
                <span className="text-gray-600">CGST ({formData.gstRate / 2}%):</span>
                <span className="font-medium">{formatCurrency(calculations.cgst)}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600">SGST ({formData.gstRate / 2}%):</span>
                <span className="font-medium">{formatCurrency(calculations.sgst)}</span>
              </div>
            </>
          ) : (
            <div className="flex justify-between py-2">
              <span className="text-gray-600">IGST ({formData.gstRate}%):</span>
              <span className="font-medium">{formatCurrency(calculations.igst)}</span>
            </div>
          )}
          
          {calculations.shippingAmount > 0 && (
            <div className="flex justify-between py-2">
              <span className="text-gray-600">Shipping Charges:</span>
              <span className="font-medium">{formatCurrency(calculations.shippingAmount)}</span>
            </div>
          )}
          
          <div className="border-t pt-3">
            <div className="flex justify-between">
              <span className="text-lg font-semibold text-gray-900">Grand Total:</span>
              <span className="text-lg font-bold text-blue-600">{formatCurrency(calculations.grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Communication Section */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Mail className="w-5 h-5 mr-2" />
          Communication Section
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              To Email *
            </label>
            <input
              type="email"
              value={formData.toEmails.join(', ')}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                toEmails: e.target.value.split(',').map(email => email.trim()).filter(email => email) 
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="email1@example.com, email2@example.com"
            />
            <p className="text-xs text-gray-500 mt-1">Separate multiple emails with commas</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              From Email
            </label>
            <input
              type="email"
              value={formData.fromEmail}
              onChange={(e) => setFormData(prev => ({ ...prev, fromEmail: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="your@email.com"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CC Email
            </label>
            <input
              type="email"
              value={formData.ccEmails.join(', ')}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                ccEmails: e.target.value.split(',').map(email => email.trim()).filter(email => email) 
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="cc1@example.com, cc2@example.com"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Terms & Conditions
            </label>
            <textarea
              value={formData.terms}
              onChange={(e) => setFormData(prev => ({ ...prev, terms: e.target.value }))}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter terms and conditions..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter additional notes..."
            />
          </div>
        </div>
      </div>

      {/* Product Search Modal */}
      <AnimatePresence>
        {showProductSearch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] overflow-hidden"
            >
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Select Product</h3>
                  <button
                    onClick={() => {
                      setShowProductSearch(false);
                      setProductSearchTerm('');
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    value={productSearchTerm}
                    onChange={(e) => setProductSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Search products by name or code..."
                    autoFocus
                  />
                </div>
              </div>
              
              <div className="max-h-96 overflow-y-auto p-6">
                {filteredProducts.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No products found</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {filteredProducts.map(product => (
                      <div
                        key={product._id}
                        onClick={() => handleAddProduct(product)}
                        className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-medium text-gray-900">{product.name}</div>
                            <div className="text-sm text-gray-500">Code: {product.code}</div>
                            <div className="text-sm text-gray-500 mt-1">
                              Category: {product.category?.name} | Unit: {product.unit}
                            </div>
                            {product.dealerPrice && (
                              <div className="text-sm font-medium text-blue-600 mt-1">
                                Dealer Price: {formatCurrency(product.dealerPrice)}
                              </div>
                            )}
                          </div>
                          <Plus className="w-5 h-5 text-gray-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PurchaseOrderForm;