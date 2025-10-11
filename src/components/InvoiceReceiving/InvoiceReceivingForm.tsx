// src/components/InvoiceReceiving/InvoiceReceivingForm.tsx - FIXED PRODUCTS LOADING
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
  Plus,
  Camera,
  Image
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
  const [existingDocuments, setExistingDocuments] = useState<any[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [productImages, setProductImages] = useState<Record<number, File[]>>({});
  const [existingProductImages, setExistingProductImages] = useState<Record<number, any[]>>({});
  const [documentTypes, setDocumentTypes] = useState<string[]>([]);
  const [customDocumentTypes, setCustomDocumentTypes] = useState<string[]>([]);

  // Predefined document types
  const predefinedDocumentTypes = [
    'Invoice',
    'Delivery Note',
    'Packing List',
    'Quality Certificate',
    'Test Report',
    'Warranty Certificate',
    'Purchase Order Copy',
    'Transport Document',
    'Insurance Certificate',
    'Other'
  ];

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

  // Helper function to convert date to YYYY-MM-DD format
  const formatDateForInput = (date: any): string => {
    if (!date) return '';
    try {
      // Handle MongoDB date objects with $date
      let dateValue = date;
      if (typeof date === 'object' && date.$date) {
        dateValue = date.$date;
      }
      
      const dateObj = new Date(dateValue);
      if (isNaN(dateObj.getTime())) return '';
      
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('Error formatting date:', error, date);
      return '';
    }
  };

  useEffect(() => {
    loadPurchaseOrders();
    if (isEdit && id) {
      loadInvoiceReceiving(id);
    }
  }, [isEdit, id]);

  useEffect(() => {
    if (preSelectedPO && !isEdit) {
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
      
      console.log('Loaded PO with updated quantities:', po);
      
      setSelectedPO(po);
      
      setFormData(prev => ({
        ...prev,
        purchaseOrder: po._id,
        supplier: po.principal?.name || '',
        receivedProducts: po.products?.map(line => {
          const productId = line.product?._id || line.product;
          const alreadyReceived = line.alreadyReceived || line.receivedQty || 0;
          const remainingQty = line.pendingQty || line.backlogQty || Math.max(0, line.quantity - alreadyReceived);
          
          return {
            product: productId,
            productName: line.productName,
            productCode: line.productCode || '',
            orderedQty: line.quantity,
            remainingQuantity: remainingQty,
            alreadyReceived: alreadyReceived,
            receivedQty: 0,
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

  const loadInvoiceReceiving = async (id: string) => {
    try {
      setLoading(true);
      console.log('\n========================================');
      console.log('STARTING TO LOAD INVOICE RECEIVING:', id);
      console.log('========================================\n');
      
      const response = await invoiceReceivingAPI.getInvoiceReceiving(id);
      const receiving = response.data;
      
      console.log('RAW RESPONSE FROM API:');
      console.log(JSON.stringify(receiving, null, 2));
      
      // Extract PO ID - handle both string and object formats
      let poId = '';
      if (typeof receiving.purchaseOrder === 'string') {
        poId = receiving.purchaseOrder;
      } else if (typeof receiving.purchaseOrder === 'object') {
        poId = receiving.purchaseOrder._id || receiving.purchaseOrder.$oid || '';
      }
      
      console.log('Extracted PO ID:', poId);
      
      // Load the PO to get remaining quantities
      let poData: PurchaseOrder | null = null;
      if (poId) {
        try {
          console.log('Loading PO data for:', poId);
          const poResponse = await purchaseOrderAPI.getPurchaseOrder(poId);
          poData = poResponse.purchaseOrder;
          setSelectedPO(poData);
          console.log('PO Data loaded successfully:', poData.poNumber);
        } catch (error) {
          console.error('Error loading PO:', error);
        }
      }
      
      // Get products array - check ALL possible field names
      console.log('\nChecking for products in response...');
      console.log('receiving.receivedProducts:', receiving.receivedProducts ? 'EXISTS' : 'NULL');
      console.log('receiving.products:', receiving.products ? 'EXISTS' : 'NULL');
      
      let productsArray: any[] = [];
      
      if (receiving.receivedProducts && Array.isArray(receiving.receivedProducts)) {
        productsArray = receiving.receivedProducts;
        console.log('Using receivedProducts field');
      } else if (receiving.products && Array.isArray(receiving.products)) {
        productsArray = receiving.products;
        console.log('Using products field');
      } else {
        console.warn('NO PRODUCTS FOUND IN RESPONSE!');
        console.log('Full receiving object keys:', Object.keys(receiving));
      }
      
      console.log('\nProducts array length:', productsArray.length);
      console.log('Products array:', JSON.stringify(productsArray, null, 2));
      
      if (productsArray.length === 0) {
        console.error('WARNING: No products to transform!');
        toast.warning('No products found in this receiving record');
      }
      
      // Transform products with ALL fields
      console.log('\n--- STARTING PRODUCT TRANSFORMATION ---');
      const transformedProducts = productsArray.map((product: any, index: number) => {
        console.log(`\nTransforming product ${index + 1}/${productsArray.length}:`);
        console.log('Raw product:', JSON.stringify(product, null, 2));
        
        // Extract product ID - handle multiple formats
        let productId = '';
        if (typeof product.product === 'string') {
          productId = product.product;
        } else if (typeof product.product === 'object') {
          productId = product.product._id || product.product.$oid || '';
        }
        
        console.log('Extracted product ID:', productId);
        
        // Calculate quantities from PO
        let remainingQty = 0;
        let alreadyReceived = 0;
        let orderedQty = product.orderedQty || 0;
        
        if (poData && productId) {
          const poProduct = poData.products.find(p => {
            const pId = p.product?._id || p.product;
            return pId?.toString() === productId.toString();
          });
          
          if (poProduct) {
            orderedQty = poProduct.quantity;
            // Subtract current receiving from already received
            alreadyReceived = (poProduct.alreadyReceived || poProduct.receivedQty || 0) - (product.receivedQty || 0);
            remainingQty = Math.max(0, orderedQty - alreadyReceived);
            console.log(`Quantities - Ordered: ${orderedQty}, Already: ${alreadyReceived}, Remaining: ${remainingQty}`);
          } else {
            console.warn('Product not found in PO');
          }
        }
        
        // Format dates - handle MongoDB date objects
        const mfgDate = formatDateForInput(product.mfgDate || product.manufacturingDate);
        const expDate = formatDateForInput(product.expDate || product.expiryDate);
        
        console.log('Dates:', { mfgDate, expDate });
        
        const transformed = {
          product: productId,
          productName: product.productName || '',
          productCode: product.productCode || '',
          orderedQty: orderedQty,
          remainingQuantity: remainingQty,
          alreadyReceived: alreadyReceived,
          receivedQty: product.receivedQty || 0,
          foc: product.foc || 0,
          unitPrice: product.unitPrice || 0,
          unit: product.unit || 'PCS',
          batchNumber: product.batchNo || product.batchNumber || '',
          expiryDate: expDate,
          manufacturingDate: mfgDate,
          remarks: product.remarks || '',
          qcStatus: product.qcStatus || 'pending',
          qcRemarks: product.qcRemarks || '',
          status: product.status || 'received'
        };
        
        console.log('Transformed product:', transformed);
        return transformed;
      });
      
      console.log('\n--- PRODUCT TRANSFORMATION COMPLETE ---');
      console.log('Total transformed products:', transformedProducts.length);
      console.log('All transformed products:', JSON.stringify(transformedProducts, null, 2));
      
      // Handle existing product images
      console.log('\n--- LOADING PRODUCT IMAGES ---');
      const existingImages: Record<number, any[]> = {};
      productsArray.forEach((product: any, index: number) => {
        if (product.productImages && Array.isArray(product.productImages) && product.productImages.length > 0) {
          existingImages[index] = product.productImages.map((img: any) => ({
            filename: img.filename,
            originalName: img.originalName,
            size: img.size,
            mimetype: img.mimetype,
            uploadedAt: img.uploadedAt,
            _id: img._id || img.$oid
          }));
          console.log(`Product ${index} has ${product.productImages.length} images`);
        }
      });
      
      if (Object.keys(existingImages).length > 0) {
        setExistingProductImages(existingImages);
        console.log('Loaded product images for', Object.keys(existingImages).length, 'products');
      } else {
        console.log('No product images found');
      }
      
      // Handle existing documents
      console.log('\n--- LOADING DOCUMENTS ---');
      if (receiving.documents && Array.isArray(receiving.documents) && receiving.documents.length > 0) {
        const docs = receiving.documents.map((doc: any) => ({
          name: doc.name || doc.originalName,
          type: doc.type || 'Unknown',
          filename: doc.filename,
          originalName: doc.originalName,
          size: doc.size,
          mimetype: doc.mimetype,
          uploadedAt: doc.uploadedAt,
          _id: doc._id || doc.$oid
        }));
        setExistingDocuments(docs);
        console.log('Loaded', docs.length, 'documents');
      } else {
        console.log('No documents found');
      }
      
      // Format dates
      const invoiceDate = formatDateForInput(receiving.invoiceDate);
      const receivedDate = formatDateForInput(receiving.receivedDate);
      
      console.log('\n--- SETTING FORM DATA ---');
      console.log('Invoice Number:', receiving.invoiceNumber);
      console.log('Invoice Date:', invoiceDate);
      console.log('Invoice Amount:', receiving.invoiceAmount);
      console.log('Received Date:', receivedDate);
      console.log('Supplier:', receiving.supplier);
      console.log('Notes:', receiving.notes || '(empty)');
      console.log('QC Required:', receiving.qcRequired);
      console.log('Products to set:', transformedProducts.length);
      
      // Set form data with ALL fields
      const newFormData = {
        purchaseOrder: poId,
        invoiceNumber: receiving.invoiceNumber || '',
        invoiceDate: invoiceDate,
        invoiceAmount: receiving.invoiceAmount || 0,
        supplier: receiving.supplier || (typeof receiving.purchaseOrder === 'object' ? receiving.purchaseOrder.supplier : '') || '',
        receivedDate: receivedDate,
        notes: receiving.notes || '',
        qcRequired: receiving.qcRequired !== undefined ? receiving.qcRequired : true,
        receivedProducts: transformedProducts
      };
      
      console.log('Setting form data:', JSON.stringify(newFormData, null, 2));
      setFormData(newFormData);
      
      console.log('\n========================================');
      console.log('INVOICE RECEIVING LOADED SUCCESSFULLY');
      console.log('Products loaded:', transformedProducts.length);
      console.log('========================================\n');
      
      // Show success message
      if (transformedProducts.length > 0) {
        toast.success(`Loaded ${transformedProducts.length} products`);
      }
      
    } catch (error) {
      console.error('\n========================================');
      console.error('ERROR LOADING INVOICE RECEIVING');
      console.error('========================================');
      console.error(error);
      toast.error('Failed to load invoice receiving data');
      setErrors({ general: 'Failed to load invoice receiving data' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
    if (field === 'receivedQty') {
      const product = formData.receivedProducts[index];
      const availableQty = product.remainingQuantity || 0;
      
      if (value > availableQty) {
        toast.error(`Cannot receive ${value} items. Only ${availableQty} items available.`);
        return;
      }
      
      if (value < 0) {
        toast.error('Received quantity cannot be negative.');
        return;
      }
    }
    
    setFormData(prev => ({
      ...prev,
      receivedProducts: prev.receivedProducts.map((product, i) => 
        i === index ? { ...product, [field]: value } : product
      )
    }));
  };

  const addBatchEntry = (productIndex: number) => {
    const product = formData.receivedProducts[productIndex];
    const newBatchEntry = {
      ...product,
      receivedQty: 0,
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

  const removeBatchEntry = (index: number) => {
    if (formData.receivedProducts.length > 1) {
      setFormData(prev => ({
        ...prev,
        receivedProducts: prev.receivedProducts.filter((_, i) => i !== index)
      }));
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    const newDocumentTypes = [...documentTypes];
    const newCustomTypes = [...customDocumentTypes];
    
    files.forEach((_, index) => {
      newDocumentTypes.push('');
      newCustomTypes.push('');
    });
    
    setUploadedFiles(prev => [...prev, ...files]);
    setDocumentTypes(newDocumentTypes);
    setCustomDocumentTypes(newCustomTypes);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    setDocumentTypes(prev => prev.filter((_, i) => i !== index));
    setCustomDocumentTypes(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingDocument = (index: number) => {
    setExistingDocuments(prev => prev.filter((_, i) => i !== index));
    toast.info('Document will be removed when you save');
  };

  const handleDocumentTypeChange = (index: number, type: string) => {
    const newTypes = [...documentTypes];
    newTypes[index] = type;
    setDocumentTypes(newTypes);
    
    if (type !== 'Other') {
      const newCustomTypes = [...customDocumentTypes];
      newCustomTypes[index] = '';
      setCustomDocumentTypes(newCustomTypes);
    }
  };

  const handleCustomDocumentTypeChange = (index: number, customType: string) => {
    const newCustomTypes = [...customDocumentTypes];
    newCustomTypes[index] = customType;
    setCustomDocumentTypes(newCustomTypes);
  };

  const handleProductImageUpload = (productIndex: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const existingImages = productImages[productIndex] || [];
    const existingDbImages = existingProductImages[productIndex] || [];
    const totalImages = existingImages.length + existingDbImages.length + files.length;
    
    if (totalImages > 10) {
      toast.error('Maximum 10 images allowed per product');
      return;
    }
    
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const invalidFiles = files.filter(file => !validTypes.includes(file.type));
    
    if (invalidFiles.length > 0) {
      toast.error('Only JPG, JPEG, and PNG images are allowed');
      return;
    }
    
    const oversizedFiles = files.filter(file => file.size > 5 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      toast.error('Each image must be less than 5MB');
      return;
    }
    
    setProductImages(prev => ({
      ...prev,
      [productIndex]: [...existingImages, ...files]
    }));
    
    toast.success(`${files.length} image(s) added`);
  };

  const removeProductImage = (productIndex: number, imageIndex: number) => {
    setProductImages(prev => ({
      ...prev,
      [productIndex]: (prev[productIndex] || []).filter((_, i) => i !== imageIndex)
    }));
  };

  const removeExistingProductImage = (productIndex: number, imageIndex: number) => {
    setExistingProductImages(prev => ({
      ...prev,
      [productIndex]: (prev[productIndex] || []).filter((_, i) => i !== imageIndex)
    }));
    toast.info('Image will be removed when you save');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('=== FORM SUBMISSION ===');
    console.log('Form Data:', JSON.stringify(formData, null, 2));
    
    const newErrors: Record<string, string> = {};
    
    if (!formData.purchaseOrder) {
      newErrors.purchaseOrder = 'Purchase Order is required';
    }
    
    if (formData.receivedProducts.length === 0) {
      newErrors.receivedProducts = 'At least one product must be received';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error('Please fix the validation errors');
      return;
    }
    
    setSaving(true);
    
    try {
      const productImageMapping: Array<{ productIndex: number }> = [];
      Object.entries(productImages).forEach(([productIndex, images]) => {
        images.forEach(() => {
          productImageMapping.push({ productIndex: parseInt(productIndex) });
        });
      });
      
      const allProductImages = Object.values(productImages).flat();
      
      if (isEdit && id) {
        await invoiceReceivingAPI.updateInvoiceReceiving(
          id,
          {
            ...formData,
            documents: uploadedFiles
          },
          allProductImages,
          productImageMapping,
          documentTypes,
          customDocumentTypes,
          (progress) => setUploadProgress(progress)
        );
        toast.success('Invoice receiving updated successfully');
      } else {
        await invoiceReceivingAPI.createInvoiceReceiving(
          {
            ...formData,
            documents: uploadedFiles
          },
          allProductImages,
          productImageMapping,
          documentTypes,
          customDocumentTypes,
          (progress) => setUploadProgress(progress)
        );
        toast.success('Invoice receiving created successfully');
      }
      
      navigate('/invoice-receiving');
    } catch (error: any) {
      console.error('Submit error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to save invoice receiving';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
      setUploadProgress(0);
    }
  };

  const calculateTotalReceived = () => {
    return formData.receivedProducts.reduce((sum, product) => sum + product.receivedQty, 0);
  };

  const calculateTotalOrdered = () => {
    return formData.receivedProducts.reduce((sum, product) => sum + product.orderedQty, 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Loading invoice receiving data...</p>
        </div>
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
            {isEdit ? `Editing: ${formData.invoiceNumber}` : 'Record received products and invoice details'}
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

      {/* Debug Panel */}
      {isEdit && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm font-semibold text-blue-900 mb-2">Debug Info:</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-blue-800">
            <div>Products: <strong>{formData.receivedProducts.length}</strong></div>
            <div>Documents: <strong>{existingDocuments.length}</strong></div>
            <div>Invoice: <strong>{formData.invoiceNumber || 'N/A'}</strong></div>
            <div>Amount: <strong>₹{formData.invoiceAmount || 0}</strong></div>
            <div>Supplier: <strong>{formData.supplier || 'N/A'}</strong></div>
            <div>Notes: <strong>{formData.notes ? 'Yes' : 'No'}</strong></div>
            <div>QC: <strong>{formData.qcRequired ? 'Yes' : 'No'}</strong></div>
            <div>PO: <strong>{formData.purchaseOrder ? 'Linked' : 'Not linked'}</strong></div>
          </div>
        </div>
      )}

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
                } ${isEdit ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              >
                <option value="">Select a purchase order</option>
                {purchaseOrders.map(po => (
                  <option key={po._id} value={po._id}>
                    {po.poNumber} - {po.principal?.name}
                  </option>
                ))}
              </select>
              {isEdit && (
                <p className="text-xs text-gray-500 mt-1">Cannot change PO in edit mode</p>
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Supplier name"
                readOnly={!!selectedPO}
              />
            </div>
          </div>
          
          {selectedPO && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">Purchase Order Details</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-blue-700 font-medium">PO:</span>
                  <p className="text-blue-900">{selectedPO.poNumber}</p>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">Status:</span>
                  <p className="text-blue-900">{selectedPO.status}</p>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">Products:</span>
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Invoice number"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Invoice Date *
              </label>
              <input
                type="date"
                value={formData.invoiceDate}
                onChange={(e) => handleInputChange('invoiceDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Invoice Amount
              </label>
              <input
                type="number"
                value={formData.invoiceAmount}
                onChange={(e) => handleInputChange('invoiceAmount', Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Received Products - ALWAYS RENDER IF WE HAVE PRODUCTS */}
        {formData.receivedProducts && formData.receivedProducts.length > 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Package className="w-5 h-5 mr-2 text-blue-600" />
                Received Products ({formData.receivedProducts.length})
              </h2>
              
              <div className="text-sm font-medium text-gray-700">
                Total: <span className="text-blue-600">{calculateTotalReceived()}</span> / {calculateTotalOrdered()} items
              </div>
            </div>

            {/* Products List */}
            <div className="space-y-4">
              {formData.receivedProducts.map((product, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 text-lg">{product.productName}</h3>
                      <p className="text-sm text-gray-600">Code: {product.productCode} | Unit: {product.unit}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        Ordered: <strong>{product.orderedQty}</strong> | 
                        Already Received: <strong>{product.alreadyReceived || 0}</strong> | 
                        Remaining: <strong className="text-blue-600">{product.remainingQuantity || 0}</strong>
                      </p>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => addBatchEntry(index)}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100"
                    >
                      <Plus className="w-4 h-4 inline mr-1" />
                      Add Batch
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3 bg-white p-3 rounded">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Received Qty *
                      </label>
                      <input
                        type="number"
                        value={product.receivedQty}
                        onChange={(e) => updateReceivedProduct(index, 'receivedQty', Number(e.target.value))}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        min="0"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Batch Number
                      </label>
                      <input
                        type="text"
                        value={product.batchNumber}
                        onChange={(e) => updateReceivedProduct(index, 'batchNumber', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Mfg Date
                      </label>
                      <input
                        type="date"
                        value={product.manufacturingDate}
                        onChange={(e) => updateReceivedProduct(index, 'manufacturingDate', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Exp Date
                      </label>
                      <input
                        type="date"
                        value={product.expiryDate}
                        onChange={(e) => updateReceivedProduct(index, 'expiryDate', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Remarks
                      </label>
                      <input
                        type="text"
                        value={product.remarks}
                        onChange={(e) => updateReceivedProduct(index, 'remarks', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                  </div>

                  {/* Product Images */}
                  <div className="mt-3 pt-3 border-t">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Camera className="w-4 h-4 inline mr-1" />
                      Product Images (Max 10)
                    </label>
                    
                    {/* Existing Images */}
                    {existingProductImages[index] && existingProductImages[index].length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs text-gray-600 mb-2">Existing: {existingProductImages[index].length}</p>
                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                          {existingProductImages[index].map((img, imgIdx) => (
                            <div key={imgIdx} className="relative group">
                              <img
                                src={`http://localhost:5000/api/files/public/view/${img.filename}`}
                                alt={`Existing ${imgIdx + 1}`}
                                className="w-full aspect-square object-cover rounded border"
                              />
                              <button
                                type="button"
                                onClick={() => removeExistingProductImage(index, imgIdx)}
                                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* New Images */}
                    {productImages[index] && productImages[index].length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs text-gray-600 mb-2">New: {productImages[index].length}</p>
                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                          {productImages[index].map((img, imgIdx) => (
                            <div key={imgIdx} className="relative group">
                              <img
                                src={URL.createObjectURL(img)}
                                alt={`New ${imgIdx + 1}`}
                                className="w-full aspect-square object-cover rounded border"
                              />
                              <button
                                type="button"
                                onClick={() => removeProductImage(index, imgIdx)}
                                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => handleProductImageUpload(index, e)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">Summary</h3>
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-blue-700">Total Ordered:</span>
                  <p className="text-blue-900 font-bold text-lg">{calculateTotalOrdered()}</p>
                </div>
                <div>
                  <span className="text-blue-700">Total Received:</span>
                  <p className="text-blue-900 font-bold text-lg">{calculateTotalReceived()}</p>
                </div>
                <div>
                  <span className="text-blue-700">Remaining:</span>
                  <p className="text-blue-900 font-bold text-lg">{calculateTotalOrdered() - calculateTotalReceived()}</p>
                </div>
                <div>
                  <span className="text-blue-700">Status:</span>
                  <p className="text-blue-900 font-bold">
                    {calculateTotalReceived() === 0 ? 'Not Started' :
                     calculateTotalReceived() === calculateTotalOrdered() ? 'Complete' :
                     calculateTotalReceived() > calculateTotalOrdered() ? 'Over' : 'Partial'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <Package className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
            <p className="text-yellow-800 font-medium">No products loaded</p>
            <p className="text-yellow-600 text-sm mt-1">
              {isEdit ? 'There may be an issue loading the products from the database.' : 'Select a purchase order to add products.'}
            </p>
          </div>
        )}

        {/* Documents Section - Abbreviated for space */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Upload className="w-5 h-5 mr-2" />
            Documents ({existingDocuments.length + uploadedFiles.length})
          </h2>
          
          {existingDocuments.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium mb-2">Existing:</p>
              <div className="space-y-2">
                {existingDocuments.map((doc, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm truncate">{doc.originalName}</span>
                    <button
                      type="button"
                      onClick={() => removeExistingDocument(idx)}
                      className="text-red-600 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <input
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            onChange={handleFileUpload}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
          
          {/* Display uploaded files with document type selection */}
          {uploadedFiles.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium mb-2">Uploaded Files:</p>
              <div className="space-y-3">
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <div className="min-w-0 flex-1">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Document Type
                        </label>
                        <select
                          value={documentTypes[index] || ''}
                          onChange={(e) => handleDocumentTypeChange(index, e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select type...</option>
                          {predefinedDocumentTypes.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                        
                        {documentTypes[index] === 'Other' && (
                          <input
                            type="text"
                            value={customDocumentTypes[index] || ''}
                            onChange={(e) => handleCustomDocumentTypeChange(index, e.target.value)}
                            placeholder="Enter custom type..."
                            className="w-full px-2 py-1 mt-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        )}
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="text-red-600 hover:text-red-800 p-1"
                        title="Remove file"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Additional Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h2>
          
          <div className="space-y-4">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.qcRequired}
                onChange={(e) => handleInputChange('qcRequired', e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm font-medium">Quality Control Required</span>
            </label>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Additional notes..."
              />
            </div>
          </div>
        </div>

        {/* Upload Progress */}
        {saving && uploadProgress > 0 && (
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex justify-between mb-2">
              <span className="text-sm">Uploading...</span>
              <span className="text-sm font-medium">{uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/invoice-receiving')}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            disabled={saving}
          >
            Cancel
          </button>
          
          <button
            type="submit"
            disabled={saving || formData.receivedProducts.length === 0}
            className="inline-flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {isEdit ? 'Update' : 'Save'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default InvoiceReceivingForm;