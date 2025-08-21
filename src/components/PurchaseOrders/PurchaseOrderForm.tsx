// src/components/PurchaseOrders/PurchaseOrderForm.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Save,
  X,
  Plus,
  Trash2,
  Search,
  Calculator,
  FileText,
  Building2,
  Mail,
  Phone,
  MapPin
} from 'lucide-react';
import { purchaseOrderAPI, PurchaseOrderFormData, ProductLine } from '../../services/purchaseOrderAPI';
import { productsAPI } from '../../services/api';
import { poValidation, poCalculations, poFormatters, UNITS, TAX_TYPES } from '../../utils/purchaseOrderUtils';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

interface Product {
  _id: string;
  name: string;
  description?: string;
  category: {
    _id: string;
    name: string;
  };
  principal: {
    _id: string;
    name: string;
  };
  unit: string;
  gstRate: number;
}

const PurchaseOrderForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { hasPermission } = useAuthStore();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<PurchaseOrderFormData>({
    supplier: '',
    supplierContact: '',
    supplierEmail: '',
    supplierPhone: '',
    description: '',
    expectedDeliveryDate: '',
    priority: 'medium',
    productLines: [],
    billingAddress: {
      street: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India'
    },
    shippingAddress: {
      street: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India',
      sameAsBilling: true
    },
    taxType: TAX_TYPES.IGST,
    shippingCharges: {
      type: 'fixed',
      value: 0
    },
    terms: '',
    notes: ''
  });

  // Load existing PO data if editing
  useEffect(() => {
    if (isEdit && id) {
      loadPurchaseOrder(id);
    }
  }, [isEdit, id]);

  // Load products for selection
  useEffect(() => {
    loadProducts();
  }, []);

  const loadPurchaseOrder = async (poId: string) => {
    try {
      setLoading(true);
      const response = await purchaseOrderAPI.getPurchaseOrder(poId);
      const po = response.data;
      
      setFormData({
        supplier: po.supplier,
        supplierContact: po.supplierContact || '',
        supplierEmail: po.supplierEmail || '',
        supplierPhone: po.supplierPhone || '',
        description: po.description || '',
        expectedDeliveryDate: po.expectedDeliveryDate ? 
          new Date(po.expectedDeliveryDate).toISOString().split('T')[0] : '',
        priority: po.priority || 'medium',
        productLines: po.productLines,
        billingAddress: po.billingAddress,
        shippingAddress: po.shippingAddress,
        taxType: po.taxType || TAX_TYPES.IGST,
        shippingCharges: po.shippingCharges || { type: 'fixed', value: 0 },
        terms: po.terms || '',
        notes: po.notes || ''
      });
    } catch (error: any) {
      toast.error('Failed to load purchase order');
      navigate('/purchase-orders');
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await productsAPI.getProducts({ limit: 1000 });
      setProducts(response.data.products);
    } catch (error) {
      toast.error('Failed to load products');
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleAddressChange = (type: 'billingAddress' | 'shippingAddress', field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value
      }
    }));
  };

  const handleSameAsBilling = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      shippingAddress: {
        ...prev.shippingAddress,
        sameAsBilling: checked,
        ...(checked ? {
          street: prev.billingAddress.street,
          city: prev.billingAddress.city,
          state: prev.billingAddress.state,
          pincode: prev.billingAddress.pincode,
          country: prev.billingAddress.country
        } : {})
      }
    }));
  };

  const addProductLine = (product: Product) => {
    const newProductLine: ProductLine = {
      product: product._id,
      productName: product.name,
      description: product.description || '',
      quantity: 1,
      unit: product.unit,
      unitPrice: 0,
      discount: 0,
      discountType: 'percentage',
      gstRate: product.gstRate,
      receivedQuantity: 0,
      backlogQuantity: 0
    };

    setFormData(prev => ({
      ...prev,
      productLines: [...prev.productLines, newProductLine]
    }));
    setShowProductSearch(false);
    setSearchTerm('');
  };

  const updateProductLine = (index: number, field: keyof ProductLine, value: any) => {
    setFormData(prev => ({
      ...prev,
      productLines: prev.productLines.map((line, i) => 
        i === index ? { ...line, [field]: value } : line
      )
    }));
  };

  const removeProductLine = (index: number) => {
    setFormData(prev => ({
      ...prev,
      productLines: prev.productLines.filter((_, i) => i !== index)
    }));
  };

  const calculateTotals = () => {
    const subTotal = poCalculations.calculateSubTotal(formData.productLines);
    const shipping = poCalculations.calculateShipping(subTotal, formData.shippingCharges);
    const tax = poCalculations.calculateTax(subTotal, 18, formData.taxType); // Assuming 18% GST
    const total = subTotal + shipping + tax.total;

    return {
      subTotal,
      shipping,
      tax,
      total
    };
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Basic validation
    if (!formData.supplier.trim()) {
      newErrors.supplier = 'Supplier name is required';
    }

    if (formData.supplierEmail && !poValidation.isValidEmail(formData.supplierEmail)) {
      newErrors.supplierEmail = 'Invalid email format';
    }

    if (formData.supplierPhone && !poValidation.isValidMobile(formData.supplierPhone)) {
      newErrors.supplierPhone = 'Invalid phone number';
    }

    if (formData.productLines.length === 0) {
      newErrors.productLines = 'At least one product is required';
    }

    // Validate product lines
    formData.productLines.forEach((line, index) => {
      const lineErrors = poValidation.validateProductLine(line);
      if (lineErrors.length > 0) {
        newErrors[`productLine_${index}`] = lineErrors.join(', ');
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors before submitting');
      return;
    }

    try {
      setSaving(true);
      
      if (isEdit && id) {
        await purchaseOrderAPI.updatePurchaseOrder(id, formData);
        toast.success('Purchase order updated successfully');
      } else {
        await purchaseOrderAPI.createPurchaseOrder(formData);
        toast.success('Purchase order created successfully');
      }
      
      navigate('/purchase-orders');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save purchase order');
    } finally {
      setSaving(false);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.principal.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totals = calculateTotals();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit Purchase Order' : 'Create Purchase Order'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isEdit ? 'Update purchase order details' : 'Create a new purchase order'}
          </p>
        </div>
        
        <button
          onClick={() => navigate('/purchase-orders')}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <X className="w-4 h-4 mr-2" />
          Cancel
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Supplier Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Building2 className="w-5 h-5 mr-2" />
            Supplier Information
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Supplier Name *
              </label>
              <input
                type="text"
                value={formData.supplier}
                onChange={(e) => handleInputChange('supplier', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.supplier ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter supplier name"
              />
              {errors.supplier && (
                <p className="text-red-600 text-sm mt-1">{errors.supplier}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Person
              </label>
              <input
                type="text"
                value={formData.supplierContact}
                onChange={(e) => handleInputChange('supplierContact', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter contact person name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="email"
                  value={formData.supplierEmail}
                  onChange={(e) => handleInputChange('supplierEmail', e.target.value)}
                  className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.supplierEmail ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter email address"
                />
              </div>
              {errors.supplierEmail && (
                <p className="text-red-600 text-sm mt-1">{errors.supplierEmail}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="tel"
                  value={formData.supplierPhone}
                  onChange={(e) => handleInputChange('supplierPhone', e.target.value)}
                  className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.supplierPhone ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter phone number"
                />
              </div>
              {errors.supplierPhone && (
                <p className="text-red-600 text-sm mt-1">{errors.supplierPhone}</p>
              )}
            </div>
          </div>
        </div>

        {/* Order Details */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Order Details
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter order description"
              />
            </div>
            
            <div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expected Delivery Date
                </label>
                <input
                  type="date"
                  value={formData.expectedDeliveryDate}
                  onChange={(e) => handleInputChange('expectedDeliveryDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => handleInputChange('priority', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Product Lines */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Calculator className="w-5 h-5 mr-2" />
              Product Lines
            </h2>
            
            <button
              type="button"
              onClick={() => setShowProductSearch(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </button>
          </div>
          
          {errors.productLines && (
            <p className="text-red-600 text-sm mb-4">{errors.productLines}</p>
          )}

          {/* Product Search Modal */}
          {showProductSearch && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-96 overflow-hidden">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Select Product</h3>
                  <button
                    onClick={() => setShowProductSearch(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Search products..."
                    />
                  </div>
                </div>
                
                <div className="max-h-64 overflow-y-auto">
                  {filteredProducts.map(product => (
                    <div
                      key={product._id}
                      onClick={() => addProductLine(product)}
                      className="p-3 border border-gray-200 rounded-lg mb-2 cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <div className="font-medium">{product.name}</div>
                      <div className="text-sm text-gray-600">
                        {product.category.name} • {product.principal.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        Unit: {product.unit} • GST: {product.gstRate}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Product Lines Table */}
          {formData.productLines.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Discount</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {formData.productLines.map((line, index) => (
                    <tr key={index}>
                      <td className="px-4 py-2">
                        <div className="font-medium">{line.productName}</div>
                        {line.description && (
                          <div className="text-sm text-gray-500">{line.description}</div>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          value={line.quantity}
                          onChange={(e) => updateProductLine(index, 'quantity', Number(e.target.value))}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                          min="1"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <select
                          value={line.unit}
                          onChange={(e) => updateProductLine(index, 'unit', e.target.value)}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          {UNITS.map(unit => (
                            <option key={unit} value={unit}>{unit}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          value={line.unitPrice}
                          onChange={(e) => updateProductLine(index, 'unitPrice', Number(e.target.value))}
                          className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                          min="0"
                          step="0.01"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center space-x-1">
                          <input
                            type="number"
                            value={line.discount}
                            onChange={(e) => updateProductLine(index, 'discount', Number(e.target.value))}
                            className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                            min="0"
                          />
                          <select
                            value={line.discountType}
                            onChange={(e) => updateProductLine(index, 'discountType', e.target.value)}
                            className="w-16 px-1 py-1 border border-gray-300 rounded text-xs"
                          >
                            <option value="percentage">%</option>
                            <option value="fixed">₹</option>
                          </select>
                        </div>
                      </td>
                      <td className="px-4 py-2 font-medium">
                        {poFormatters.formatCurrency(poCalculations.calculateProductTotal(line))}
                      </td>
                      <td className="px-4 py-2">
                        <button
                          type="button"
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
          ) : (
            <div className="text-center py-8 text-gray-500">
              No products added yet. Click "Add Product" to get started.
            </div>
          )}
        </div>

        {/* Billing & Shipping Address */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <MapPin className="w-5 h-5 mr-2" />
            Addresses
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Billing Address */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Billing Address</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  value={formData.billingAddress.street}
                  onChange={(e) => handleAddressChange('billingAddress', 'street', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Street Address"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={formData.billingAddress.city}
                    onChange={(e) => handleAddressChange('billingAddress', 'city', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="City"
                  />
                  <input
                    type="text"
                    value={formData.billingAddress.state}
                    onChange={(e) => handleAddressChange('billingAddress', 'state', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="State"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={formData.billingAddress.pincode}
                    onChange={(e) => handleAddressChange('billingAddress', 'pincode', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Pincode"
                  />
                  <input
                    type="text"
                    value={formData.billingAddress.country}
                    onChange={(e) => handleAddressChange('billingAddress', 'country', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Country"
                  />
                </div>
              </div>
            </div>
            
            {/* Shipping Address */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900">Shipping Address</h3>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.shippingAddress.sameAsBilling}
                    onChange={(e) => handleSameAsBilling(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-600">Same as billing</span>
                </label>
              </div>
              
              <div className="space-y-3">
                <input
                  type="text"
                  value={formData.shippingAddress.street}
                  onChange={(e) => handleAddressChange('shippingAddress', 'street', e.target.value)}
                  disabled={formData.shippingAddress.sameAsBilling}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                  placeholder="Street Address"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={formData.shippingAddress.city}
                    onChange={(e) => handleAddressChange('shippingAddress', 'city', e.target.value)}
                    disabled={formData.shippingAddress.sameAsBilling}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    placeholder="City"
                  />
                  <input
                    type="text"
                    value={formData.shippingAddress.state}
                    onChange={(e) => handleAddressChange('shippingAddress', 'state', e.target.value)}
                    disabled={formData.shippingAddress.sameAsBilling}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    placeholder="State"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={formData.shippingAddress.pincode}
                    onChange={(e) => handleAddressChange('shippingAddress', 'pincode', e.target.value)}
                    disabled={formData.shippingAddress.sameAsBilling}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    placeholder="Pincode"
                  />
                  <input
                    type="text"
                    value={formData.shippingAddress.country}
                    onChange={(e) => handleAddressChange('shippingAddress', 'country', e.target.value)}
                    disabled={formData.shippingAddress.sameAsBilling}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    placeholder="Country"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tax & Shipping */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Tax & Shipping</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tax Type
              </label>
              <select
                value={formData.taxType}
                onChange={(e) => handleInputChange('taxType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={TAX_TYPES.IGST}>IGST</option>
                <option value={TAX_TYPES.CGST_SGST}>CGST + SGST</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Shipping Charges
              </label>
              <div className="flex space-x-2">
                <select
                  value={formData.shippingCharges.type}
                  onChange={(e) => handleInputChange('shippingCharges', {
                    ...formData.shippingCharges,
                    type: e.target.value
                  })}
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="fixed">Fixed</option>
                  <option value="percentage">%</option>
                </select>
                <input
                  type="number"
                  value={formData.shippingCharges.value}
                  onChange={(e) => handleInputChange('shippingCharges', {
                    ...formData.shippingCharges,
                    value: Number(e.target.value)
                  })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Terms & Notes */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Terms & Notes</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Terms & Conditions
              </label>
              <textarea
                value={formData.terms}
                onChange={(e) => handleInputChange('terms', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter terms and conditions"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter additional notes"
              />
            </div>
          </div>
        </div>

        {/* Order Summary */}
        {formData.productLines.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{poFormatters.formatCurrency(totals.subTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping:</span>
                <span>{poFormatters.formatCurrency(totals.shipping)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax ({formData.taxType}):</span>
                <span>{poFormatters.formatCurrency(totals.tax.total)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-semibold text-lg">
                <span>Total:</span>
                <span>{poFormatters.formatCurrency(totals.total)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/purchase-orders')}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {saving ? 'Saving...' : (isEdit ? 'Update Purchase Order' : 'Create Purchase Order')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PurchaseOrderForm;