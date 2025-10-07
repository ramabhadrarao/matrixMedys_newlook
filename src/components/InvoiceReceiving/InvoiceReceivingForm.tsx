// src/components/InvoiceReceiving/InvoiceReceivingForm.tsx - COMPLETE UPDATED VERSION
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Save,
  X,
  Upload,
  Trash2,
  Package,
  FileText,
  Calendar,
  Building2,
  AlertCircle,
  CheckCircle,
  Plus
} from 'lucide-react';
import { invoiceReceivingAPI, InvoiceReceivingFormData, ReceivedProduct } from '../../services/invoiceReceivingAPI';
import { purchaseOrderAPI, PurchaseOrder } from '../../services/purchaseOrderAPI';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

const InvoiceReceivingForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const isEdit = Boolean(id);
  const preSelectedPO = searchParams.get('po');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [formData, setFormData] = useState<InvoiceReceivingFormData>({
    purchaseOrder: preSelectedPO || '',
    invoiceNumber: '',
    invoiceDate: '',
    invoiceAmount: 0,
    supplier: '',
    receivedDate: new Date().toISOString().split('T')[0],
    receivedProducts: [],
    documents: [],
    notes: '',
    qcRequired: true
  });

  useEffect(() => {
    loadPurchaseOrders();
    if (isEdit && id) {
      loadInvoiceReceiving(id);
    }
  }, [isEdit, id]);

  useEffect(() => {
    if (preSelectedPO) {
      loadPurchaseOrderDetails(preSelectedPO);
    }
  }, [preSelectedPO]);

  const loadPurchaseOrders = async () => {
    try {
      const response = await purchaseOrderAPI.getPurchaseOrders({
        status: 'ordered,partial_received',
        limit: 100
      });
      setPurchaseOrders(response.purchaseOrders || []);
    } catch (error) {
      toast.error('Failed to load purchase orders');
    }
  };

  const loadPurchaseOrderDetails = async (poId: string) => {
    try {
      const response = await purchaseOrderAPI.getPurchaseOrder(poId);
      const po = response.purchaseOrder;
      
      console.log('=== PURCHASE ORDER DEBUG ===');
      console.log('Full PO data:', po);
      console.log('PO products:', po.products);
      po.products?.forEach((line, index) => {
        console.log(`Product ${index}:`, {
          product: line.product,
          productId: line.product?._id,
          productName: line.productName,
          productCode: line.productCode,
          quantity: line.quantity,
          receivedQty: line.receivedQty,
          remainingCalculated: Math.max(0, line.quantity - (line.receivedQty || 0))
        });
      });
      console.log('=== END PO DEBUG ===');
      
      setSelectedPO(po);
      
      // Pre-populate form with PO data - show remaining quantities
      setFormData(prev => ({
        ...prev,
        purchaseOrder: po._id,
        supplier: po.principal?.name || '',
        receivedProducts: po.products?.map(line => {
          const remainingQty = Math.max(0, line.quantity - (line.receivedQty || 0));
          return {
            product: line.product?._id || line.product, // Handle both populated and non-populated cases
            productName: line.productName,
            productCode: line.productCode || '',
            orderedQuantity: line.quantity, // Original ordered quantity
            remainingQuantity: remainingQty, // Available to receive
            alreadyReceived: line.receivedQty || 0, // Previously received
            receivedQuantity: 0, // Current receiving quantity
            unit: line.unit || 'PCS',
            batchNumber: '',
            expiryDate: '',
            manufacturingDate: '',
            unitPrice: line.unitPrice,
            remarks: '',
            qcStatus: 'pending',
            qcRemarks: '',
            status: 'received'
          };
        }) || []
      }));
    } catch (error) {
      toast.error('Failed to load purchase order details');
    }
  };

  const loadInvoiceReceiving = async (receivingId: string) => {
    try {
      setLoading(true);
      const response = await invoiceReceivingAPI.getInvoiceReceiving(receivingId);
      const receiving = response.data;
      
      setFormData({
        purchaseOrder: typeof receiving.purchaseOrder === 'object' 
          ? receiving.purchaseOrder._id 
          : receiving.purchaseOrder,
        invoiceNumber: receiving.invoiceNumber,
        invoiceDate: receiving.invoiceDate ? 
          new Date(receiving.invoiceDate).toISOString().split('T')[0] : '',
        invoiceAmount: receiving.invoiceAmount || 0,
        supplier: receiving.supplier,
        receivedDate: receiving.receivedDate ? 
          new Date(receiving.receivedDate).toISOString().split('T')[0] : '',
        receivedProducts: receiving.receivedProducts,
        documents: receiving.documents || [],
        notes: receiving.notes || '',
        qcRequired: receiving.qcRequired !== false
      });
      
      setSelectedPO(typeof receiving.purchaseOrder === 'object' ? receiving.purchaseOrder : null);
    } catch (error: any) {
      toast.error('Failed to load invoice receiving');
      navigate('/invoice-receiving');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handlePOChange = (poId: string) => {
    if (poId) {
      loadPurchaseOrderDetails(poId);
    } else {
      setSelectedPO(null);
      setFormData(prev => ({
        ...prev,
        purchaseOrder: '',
        supplier: '',
        receivedProducts: []
      }));
    }
  };

  const updateReceivedProduct = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      receivedProducts: prev.receivedProducts.map((product, i) => 
        i === index ? { ...product, [field]: value } : product
      )
    }));
  };

  // Add new function to handle multiple batch entries
  const addBatchEntry = (productIndex: number) => {
    const product = formData.receivedProducts[productIndex];
    const newBatchEntry = {
      ...product,
      receivedQuantity: 0,
      batchNumber: '',
      expiryDate: '',
      manufacturingDate: '',
      remarks: ''
    };
    
    setFormData(prev => ({
      ...prev,
      receivedProducts: [
        ...prev.receivedProducts.slice(0, productIndex + 1),
        newBatchEntry,
        ...prev.receivedProducts.slice(productIndex + 1)
      ]
    }));
  };

  // Add function to remove batch entry
  const removeBatchEntry = (index: number) => {
    if (formData.receivedProducts.length > 1) {
      setFormData(prev => ({
        ...prev,
        receivedProducts: prev.receivedProducts.filter((_, i) => i !== index)
      }));
    }
  };

  // Add function to handle item substitution
  const handleItemSubstitution = (index: number, substitutedProductId: string, substitutedProductName: string) => {
    setFormData(prev => ({
      ...prev,
      receivedProducts: prev.receivedProducts.map((product, i) => 
        i === index ? { 
          ...product, 
          product: substitutedProductId,
          productName: substitutedProductName,
          remarks: `Substituted for ${product.productName}` 
        } : product
      )
    }));
  };

  // Add function to handle adding substituted product
  const addSubstitutedProduct = (originalIndex: number) => {
    const originalProduct = formData.receivedProducts[originalIndex];
    const substitutedEntry = {
      ...originalProduct,
      receivedQuantity: 0,
      batchNumber: '',
      expiryDate: '',
      manufacturingDate: '',
      remarks: `Substituted for ${originalProduct.productName}`,
      isSubstitution: true
    };
    
    setFormData(prev => ({
      ...prev,
      receivedProducts: [
        ...prev.receivedProducts.slice(0, originalIndex + 1),
        substitutedEntry,
        ...prev.receivedProducts.slice(originalIndex + 1)
      ]
    }));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setUploadedFiles(prev => [...prev, ...files]);
    setFormData(prev => ({ ...prev, documents: [...(prev.documents || []), ...files] }));
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    setFormData(prev => ({
      ...prev,
      documents: prev.documents?.filter((_, i) => i !== index) || []
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    console.log('=== FORM VALIDATION DEBUG ===');
    console.log('Form data:', formData);

    if (!formData.purchaseOrder) {
      newErrors.purchaseOrder = 'Purchase order is required';
      console.log('❌ Purchase order missing');
    } else {
      console.log('✅ Purchase order:', formData.purchaseOrder);
    }

    if (!formData.invoiceNumber.trim()) {
      newErrors.invoiceNumber = 'Invoice number is required';
      console.log('❌ Invoice number missing');
    } else {
      console.log('✅ Invoice number:', formData.invoiceNumber);
    }

    if (!formData.invoiceDate) {
      newErrors.invoiceDate = 'Invoice date is required';
      console.log('❌ Invoice date missing');
    } else {
      console.log('✅ Invoice date:', formData.invoiceDate);
    }

    if (!formData.receivedDate) {
      newErrors.receivedDate = 'Received date is required';
      console.log('❌ Received date missing');
    } else {
      console.log('✅ Received date:', formData.receivedDate);
    }

    if (!formData.supplier.trim()) {
      newErrors.supplier = 'Supplier is required';
      console.log('❌ Supplier missing');
    } else {
      console.log('✅ Supplier:', formData.supplier);
    }

    // Allow zero receiving - check if we have product entries (even with 0 quantities)
    if (formData.receivedProducts.length === 0) {
      newErrors.receivedProducts = 'Product list is required (even if received quantities are zero)';
      console.log('❌ No products in list');
    } else {
      console.log('✅ Products count:', formData.receivedProducts.length);
      console.log('Products:', formData.receivedProducts);
    }

    // Enhanced validation for received products
    const productGroups = formData.receivedProducts.reduce((acc, product, index) => {
      const key = `${product.product}_${product.productName}`;
      if (!acc[key]) {
        acc[key] = {
          orderedQuantity: product.orderedQuantity,
          remainingQuantity: product.remainingQuantity, // Add this field to the group
          entries: []
        };
      }
      acc[key].entries.push({ ...product, index });
      return acc;
    }, {} as Record<string, any>);

    console.log('Product groups:', productGroups);

    // Validate each product group
    Object.entries(productGroups).forEach(([key, group]) => {
      const totalReceived = group.entries.reduce((sum: number, entry: any) => sum + entry.receivedQuantity, 0);
      
      group.entries.forEach((entry: any) => {
        console.log(`Validating product ${entry.index}:`, entry);
        
        // Basic quantity validation
        if (entry.receivedQuantity < 0) {
          newErrors[`receivedProduct_${entry.index}_quantity`] = 'Received quantity cannot be negative';
          console.log(`❌ Product ${entry.index}: Negative quantity`);
        }
        
        // Batch number validation - only required if quantity > 0
        if (entry.receivedQuantity > 0 && !entry.batchNumber?.trim()) {
          newErrors[`receivedProduct_${entry.index}_batch`] = 'Batch number is required for received products';
          console.log(`❌ Product ${entry.index}: Missing batch number for received quantity ${entry.receivedQuantity}`);
        }
        
        // Expiry date validation for pharmaceutical products
        if (entry.receivedQuantity > 0 && entry.expiryDate) {
          const expiryDate = new Date(entry.expiryDate);
          const today = new Date();
          if (expiryDate <= today) {
            newErrors[`receivedProduct_${entry.index}_expiry`] = 'Expiry date must be in the future';
            console.log(`❌ Product ${entry.index}: Expiry date in past`);
          }
        }
        
        // Manufacturing date validation
        if (entry.manufacturingDate && entry.expiryDate) {
          const mfgDate = new Date(entry.manufacturingDate);
          const expDate = new Date(entry.expiryDate);
          if (mfgDate >= expDate) {
            newErrors[`receivedProduct_${entry.index}_mfg`] = 'Manufacturing date must be before expiry date';
            console.log(`❌ Product ${entry.index}: Manufacturing date after expiry`);
          }
        }
      });
      
      // Group-level validation - check against remaining quantities
      const tolerance = 0.1; // 10% tolerance
      const remainingQty = group.remainingQuantity || 0;
      if (totalReceived > remainingQty * (1 + tolerance)) {
        newErrors[`productGroup_${key}`] = `Total received quantity (${totalReceived}) exceeds available quantity (${remainingQty})`;
        console.log(`❌ Product group ${key}: Exceeds available quantity`);
      }
      
      // Optional: Add warning for zero receiving (not an error, just informational)
      if (totalReceived === 0) {
        // This is allowed - no error, just track it
        console.log(`ℹ️ Product group ${key}: No items received (${remainingQty} available)`);
      }
    });

    console.log('Validation errors:', newErrors);
    console.log('=== END VALIDATION DEBUG ===');

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
      setUploadProgress(0);
      
      const submitData = { ...formData };
      
      if (isEdit && id) {
        const response = await invoiceReceivingAPI.updateInvoiceReceiving(
          id, 
          submitData, 
          (progress) => setUploadProgress(progress)
        );
        toast.success('Invoice receiving updated successfully');
      } else {
        const response = await invoiceReceivingAPI.createInvoiceReceiving(
          submitData,
          (progress) => setUploadProgress(progress)
        );
        toast.success('Invoice receiving created successfully');
      }
      
      navigate('/invoice-receiving');
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(error.response?.data?.message || 'Failed to save invoice receiving');
    } finally {
      setSaving(false);
      setUploadProgress(0);
    }
  };

  const calculateTotalReceived = () => {
    return formData.receivedProducts.reduce((sum, product) => sum + product.receivedQuantity, 0);
  };

  const calculateTotalOrdered = () => {
    return formData.receivedProducts.reduce((sum, product) => sum + product.orderedQuantity, 0);
  };

  const formatCurrency = (amount: number) => {
    return invoiceReceivingAPI.formatCurrency(amount);
  };

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
            {isEdit ? 'Edit Invoice Receiving' : 'New Invoice Receiving'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isEdit ? 'Update invoice receiving details' : 'Record received products and invoice details'}
          </p>
        </div>
        
        <button
          onClick={() => navigate('/invoice-receiving')}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <X className="w-4 h-4 mr-2" />
          Cancel
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Purchase Order Selection */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Package className="w-5 h-5 mr-2" />
            Purchase Order
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Purchase Order *
              </label>
              <select
                value={formData.purchaseOrder}
                onChange={(e) => handlePOChange(e.target.value)}
                disabled={isEdit}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.purchaseOrder ? 'border-red-300' : 'border-gray-300'
                } ${isEdit ? 'bg-gray-100' : ''}`}
              >
                <option value="">Select a purchase order</option>
                {purchaseOrders.map(po => (
                  <option key={po._id} value={po._id}>
                    {po.poNumber} - {po.principal?.name}
                  </option>
                ))}
              </select>
              {errors.purchaseOrder && (
                <p className="text-red-600 text-sm mt-1">{errors.purchaseOrder}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Supplier *
              </label>
              <input
                type="text"
                value={formData.supplier}
                onChange={(e) => handleInputChange('supplier', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.supplier ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Supplier name"
                readOnly={!!selectedPO}
              />
              {errors.supplier && (
                <p className="text-red-600 text-sm mt-1">{errors.supplier}</p>
              )}
            </div>
          </div>
          
          {selectedPO && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">Purchase Order Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-blue-700 font-medium">PO Number:</span>
                  <p className="text-blue-900">{selectedPO.poNumber}</p>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">Status:</span>
                  <p className="text-blue-900">{selectedPO.status}</p>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">Total Products:</span>
                  <p className="text-blue-900">{selectedPO.products?.length || 0}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Invoice Details */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Invoice Details
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Invoice Number *
              </label>
              <input
                type="text"
                value={formData.invoiceNumber}
                onChange={(e) => handleInputChange('invoiceNumber', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.invoiceNumber ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter invoice number"
              />
              {errors.invoiceNumber && (
                <p className="text-red-600 text-sm mt-1">{errors.invoiceNumber}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Invoice Date *
              </label>
              <input
                type="date"
                value={formData.invoiceDate}
                onChange={(e) => handleInputChange('invoiceDate', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.invoiceDate ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.invoiceDate && (
                <p className="text-red-600 text-sm mt-1">{errors.invoiceDate}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Invoice Amount
              </label>
              <input
                type="number"
                value={formData.invoiceAmount}
                onChange={(e) => handleInputChange('invoiceAmount', Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Received Date *
              </label>
              <input
                type="date"
                value={formData.receivedDate}
                onChange={(e) => handleInputChange('receivedDate', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.receivedDate ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.receivedDate && (
                <p className="text-red-600 text-sm mt-1">{errors.receivedDate}</p>
              )}
            </div>
          </div>
        </div>

        {/* Received Products */}
        {formData.receivedProducts.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Package className="w-5 h-5 mr-2" />
                Received Products
              </h2>
              
              <div className="text-sm text-gray-600">
                Total: {calculateTotalReceived()} / {calculateTotalOrdered()} items
              </div>
            </div>
            
            {errors.receivedProducts && (
              <p className="text-red-600 text-sm mb-4">{errors.receivedProducts}</p>
            )}

            <div className="space-y-4">
               {/* Group products by original product to show multiple batches */}
               {(() => {
                 const groupedProducts = formData.receivedProducts.reduce((acc, product, index) => {
                   const key = `${product.product}_${product.productName}`;
                   if (!acc[key]) {
                     acc[key] = {
                       productInfo: {
                         productName: product.productName,
                         productCode: product.productCode,
                         unit: product.unit,
                         orderedQuantity: product.orderedQuantity,
                         remainingQuantity: product.remainingQuantity,
                         alreadyReceived: product.alreadyReceived
                       },
                       entries: []
                     };
                   }
                   acc[key].entries.push({ ...product, originalIndex: index });
                   return acc;
                 }, {} as Record<string, any>);

                return Object.entries(groupedProducts).map(([key, group]) => {
                  const totalReceived = group.entries.reduce((sum: number, entry: any) => sum + entry.receivedQuantity, 0);
                  const remainingQty = group.productInfo.remainingQuantity || 0;
                  const isPartialReceived = totalReceived > 0 && totalReceived < remainingQty;
                  const isOverReceived = totalReceived > remainingQty;
                  const isFullyReceived = totalReceived === remainingQty;

                  return (
                    <div key={key} className="border border-gray-200 rounded-lg p-4">
                      {/* Product Header */}
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-medium text-gray-900">{group.productInfo.productName}</h3>
                            {isPartialReceived && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Partial
                              </span>
                            )}
                            {isOverReceived && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Over-received
                              </span>
                            )}
                            {isFullyReceived && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Complete
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">
                            Code: {group.productInfo.productCode} | Unit: {group.productInfo.unit}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            Ordered: {group.productInfo.orderedQuantity} | Already Received: {group.productInfo.alreadyReceived || 0} | 
                            Available: {group.productInfo.remainingQuantity || 0} | Current Receiving: {totalReceived}
                          </div>
                        </div>
                        
                        <button
                          type="button"
                          onClick={() => addBatchEntry(group.entries[0].originalIndex)}
                          className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add Batch
                        </button>
                      </div>

                      {/* Batch Entries */}
                      <div className="space-y-2">
                        {group.entries.map((entry: any, entryIndex: number) => (
                          <div key={entryIndex} className="bg-gray-50 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-700">
                                Batch {entryIndex + 1}
                              </span>
                              {group.entries.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeBatchEntry(entry.originalIndex)}
                                  className="text-red-600 hover:text-red-800 p-1"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Received Qty *
                                </label>
                                <input
                                  type="number"
                                  value={entry.receivedQuantity}
                                  onChange={(e) => updateReceivedProduct(entry.originalIndex, 'receivedQuantity', Number(e.target.value))}
                                  className={`w-full px-2 py-1 border rounded text-sm ${
                                    errors[`receivedProduct_${entry.originalIndex}_quantity`] ? 'border-red-300' : 'border-gray-300'
                                  }`}
                                  min="0"
                                  placeholder="0"
                                />
                                {errors[`receivedProduct_${entry.originalIndex}_quantity`] && (
                                  <p className="text-red-600 text-xs mt-1">
                                    {errors[`receivedProduct_${entry.originalIndex}_quantity`]}
                                  </p>
                                )}
                              </div>
                              
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Batch Number
                                </label>
                                <input
                                  type="text"
                                  value={entry.batchNumber}
                                  onChange={(e) => updateReceivedProduct(entry.originalIndex, 'batchNumber', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                  placeholder="Batch No."
                                />
                              </div>
                              
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Manufacturing Date
                                </label>
                                <input
                                  type="date"
                                  value={entry.manufacturingDate}
                                  onChange={(e) => updateReceivedProduct(entry.originalIndex, 'manufacturingDate', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                              </div>
                              
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Expiry Date
                                </label>
                                <input
                                  type="date"
                                  value={entry.expiryDate}
                                  onChange={(e) => updateReceivedProduct(entry.originalIndex, 'expiryDate', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                              </div>
                              
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Remarks
                                </label>
                                <input
                                  type="text"
                                  value={entry.remarks}
                                  onChange={(e) => updateReceivedProduct(entry.originalIndex, 'remarks', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                  placeholder="Notes"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Summary Section */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">Receiving Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-blue-700 font-medium">Total Ordered:</span>
                  <p className="text-blue-900 font-semibold">{calculateTotalOrdered()}</p>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">Total Received:</span>
                  <p className="text-blue-900 font-semibold">{calculateTotalReceived()}</p>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">Remaining:</span>
                  <p className="text-blue-900 font-semibold">{calculateTotalOrdered() - calculateTotalReceived()}</p>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">Status:</span>
                  <p className="text-blue-900 font-semibold">
                    {calculateTotalReceived() === 0 ? 'Not Started' :
                     calculateTotalReceived() === calculateTotalOrdered() ? 'Complete' :
                     calculateTotalReceived() > calculateTotalOrdered() ? 'Over-received' : 'Partial'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Document Upload */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Upload className="w-5 h-5 mr-2" />
            Supporting Documents
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Documents (Invoice, Delivery Note, etc.)
              </label>
              <input
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={handleFileUpload}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-sm text-gray-500 mt-1">
                Supported formats: PDF, JPG, PNG, DOC, DOCX (Max 10MB each)
              </p>
            </div>
            
            {uploadedFiles.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Uploaded Files:</h3>
                <div className="space-y-2">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <span className="text-sm text-gray-700">{file.name}</span>
                        <span className="text-xs text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="text-red-600 hover:text-red-800 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Additional Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h2>
          
          <div className="space-y-4">
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.qcRequired}
                  onChange={(e) => handleInputChange('qcRequired', e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">
                  Quality Control Required
                </span>
              </label>
              <p className="text-sm text-gray-500 mt-1">
                Check this if the received products require quality control inspection
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter any additional notes or observations"
              />
            </div>
          </div>
        </div>

        {/* Upload Progress */}
        {saving && uploadProgress > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Uploading...</span>
              <span className="text-sm text-gray-600">{uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/invoice-receiving')}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          
          <button
            type="submit"
            disabled={saving || formData.receivedProducts.length === 0}
            className="inline-flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {saving ? 'Saving...' : (isEdit ? 'Update Receiving' : 'Save Receiving')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default InvoiceReceivingForm;