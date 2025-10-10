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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [productImages, setProductImages] = useState<Record<number, File[]>>({});
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

  // Update the loadPurchaseOrderDetails function
  const loadPurchaseOrderDetails = async (poId: string) => {
    try {
      const response = await purchaseOrderAPI.getPurchaseOrder(poId);
      const po = response.purchaseOrder;
      
      console.log('Loaded PO with updated quantities:', po);
      
      setSelectedPO(po);
      
      // Use the quantities already calculated by the backend
      setFormData(prev => ({
        ...prev,
        purchaseOrder: po._id,
        supplier: po.principal?.name || '',
        receivedProducts: po.products?.map(line => {
          const productId = line.product?._id || line.product;
          // Use the backend-calculated quantities
          const alreadyReceived = line.alreadyReceived || line.receivedQty || 0;
          const remainingQty = line.pendingQty || line.backlogQty || Math.max(0, line.quantity - alreadyReceived);
          
          return {
            product: productId,
            productName: line.productName,
            productCode: line.productCode || '',
            orderedQty: line.quantity,
            remainingQuantity: remainingQty,
            alreadyReceived: alreadyReceived,
            receivedQty: 0, // Start with 0, user will input
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
      const response = await invoiceReceivingAPI.getInvoiceReceiving(id);
      const receiving = response.data;
      
      console.log('Loading invoice receiving data:', receiving);
      
      setFormData({
        purchaseOrder: typeof receiving.purchaseOrder === 'object' 
          ? receiving.purchaseOrder._id 
          : receiving.purchaseOrder,
        invoiceNumber: receiving.invoiceNumber,
        invoiceDate: receiving.invoiceDate ? new Date(receiving.invoiceDate).toISOString().split('T')[0] : '',
        invoiceAmount: receiving.invoiceAmount,
        supplier: receiving.supplier || '',
        receivedDate: receiving.receivedDate ? new Date(receiving.receivedDate).toISOString().split('T')[0] : '',
        notes: receiving.notes || '',
        qcRequired: receiving.qcRequired || false,
        receivedProducts: receiving.receivedProducts || receiving.products || []
      });
      
      // Set uploaded files and document types from existing documents
      if (receiving.documents && receiving.documents.length > 0) {
        const existingFiles = receiving.documents.map((doc: any) => ({
          name: doc.name || doc.originalName,
          size: doc.size || 0,
          type: doc.mimetype || 'application/octet-stream',
          url: doc.url || `/api/files/${doc.filename}`
        }));
        
        const existingDocumentTypes = receiving.documents.map((doc: any) => doc.type || '');
        const existingCustomDocumentTypes = receiving.documents.map((doc: any) => 
          predefinedDocumentTypes.includes(doc.type) ? '' : doc.type || ''
        );
        
        setUploadedFiles(existingFiles);
        setDocumentTypes(existingDocumentTypes);
        setCustomDocumentTypes(existingCustomDocumentTypes);
      }
      
      // Load the associated purchase order details if needed
      if (receiving.purchaseOrder) {
        const poId = typeof receiving.purchaseOrder === 'object' 
          ? receiving.purchaseOrder._id 
          : receiving.purchaseOrder;
        await loadPurchaseOrderDetails(poId);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading invoice receiving:', error);
      setErrors({ general: 'Failed to load invoice receiving data' });
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
  // If updating receivedQty, validate against available quantity
  if (field === 'receivedQty') {
    const product = formData.receivedProducts[index];
    const availableQty = product.remainingQuantity || 0;
    
    // Prevent exceeding available quantity
    if (value > availableQty) {
      toast.error(`Cannot receive ${value} items. Only ${availableQty} items available.`);
      return; // Don't update if exceeding available quantity
    }
    
    // Prevent negative quantities
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

// Add new function to handle multiple batch entries
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
    receivedQty: 0,
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
  
  // Initialize document types for new files
  const newDocumentTypes = [...documentTypes];
  const newCustomTypes = [...customDocumentTypes];
  
  files.forEach((_, index) => {
    newDocumentTypes.push(''); // Empty string means no type selected yet
    newCustomTypes.push('');
  });
  
  setUploadedFiles(prev => [...prev, ...files]);
  setDocumentTypes(newDocumentTypes);
  setCustomDocumentTypes(newCustomTypes);
  // Remove the documents update from formData since we're using uploadedFiles
  // setFormData(prev => ({ ...prev, documents: [...(prev.documents || []), ...files] }));
};

const removeFile = (index: number) => {
  setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  setDocumentTypes(prev => prev.filter((_, i) => i !== index));
  setCustomDocumentTypes(prev => prev.filter((_, i) => i !== index));
  // Remove the documents update from formData since we're using uploadedFiles
  // setFormData(prev => ({
  //   ...prev,
  //   documents: prev.documents?.filter((_, i) => i !== index) || []
  // }));
};

const handleDocumentTypeChange = (index: number, type: string) => {
  const newTypes = [...documentTypes];
  newTypes[index] = type;
  setDocumentTypes(newTypes);
  
  // If "Other" is selected, clear the custom type for this index
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

// Product images handling functions
const handleProductImageUpload = (productIndex: number, event: React.ChangeEvent<HTMLInputElement>) => {
  const files = Array.from(event.target.files || []);
  const existingImages = productImages[productIndex] || [];
  const totalImages = existingImages.length + files.length;
  
  if (totalImages > 10) {
    toast.error('Maximum 10 images allowed per product');
    return;
  }
  
  // Validate file types
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  const invalidFiles = files.filter(file => !validTypes.includes(file.type));
  
  if (invalidFiles.length > 0) {
    toast.error('Only JPG, JPEG, and PNG images are allowed');
    return;
  }
  
  // Validate file sizes (5MB max per image)
  const oversizedFiles = files.filter(file => file.size > 5 * 1024 * 1024);
  if (oversizedFiles.length > 0) {
    toast.error('Each image must be less than 5MB');
    return;
  }
  
  setProductImages(prev => ({
    ...prev,
    [productIndex]: [...existingImages, ...files]
  }));
};

const removeProductImage = (productIndex: number, imageIndex: number) => {
  setProductImages(prev => ({
    ...prev,
    [productIndex]: (prev[productIndex] || []).filter((_, i) => i !== imageIndex)
  }));
};

const validateForm = (): boolean => {
  const newErrors: Record<string, string> = {};

  // Only validate critical fields for button enabling
  // More detailed validation will happen on form submission
  
  // Basic field validation - only check truly required fields
  if (!formData.purchaseOrder) {
    newErrors.purchaseOrder = 'Purchase order is required';
  }

  // Remove validation for invoice fields to allow saving drafts
  // These will be validated on form submission instead

  // Products validation - must have at least one product entry
  if (formData.receivedProducts.length === 0) {
    newErrors.receivedProducts = 'At least one product entry is required';
  } else {
    // Only validate critical errors that should prevent saving
    formData.receivedProducts.forEach((product, index) => {
      // Check for negative quantities - handle both field names
      const receivedQty = product.receivedQty !== undefined ? product.receivedQty : product.receivedQuantity;
      if (receivedQty !== undefined && receivedQty < 0) {
        newErrors[`product_${index}_quantity`] = 'Quantity cannot be negative';
      }
      
      // Validate dates if provided - handle both field names
      const mfgDate = product.manufacturingDate || product.mfgDate;
      const expDate = product.expiryDate || product.expDate;
      
      if (expDate && mfgDate) {
        const mfgDateObj = new Date(mfgDate);
        const expDateObj = new Date(expDate);
        if (mfgDateObj >= expDateObj) {
          newErrors[`product_${index}_dates`] = 'Manufacturing date must be before expiry date';
        }
      }
      
      // Check if expiry date is in the past (only error for non-zero quantities)
      if (expDate && receivedQty > 0) {
        const expDateObj = new Date(expDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (expDateObj < today) {
          newErrors[`product_${index}_expiry`] = 'Cannot receive expired products';
        }
      }
    });
  }

  // console.log('Validation complete. Errors found:', Object.keys(newErrors).length);
    // console.log('Errors:', newErrors);

  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
const ProductReceivingStatus: React.FC<{ product: any }> = ({ product }) => {
  const percentage = product.orderedQty > 0
          ? ((product.alreadyReceived / product.orderedQty) * 100).toFixed(1)
    : 0;
    
  return (
    <div className="mt-2 space-y-1">
      <div className="flex justify-between text-xs text-gray-600">
        <span>Progress: {product.alreadyReceived}/{product.orderedQty}</span>
        <span>{percentage}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all ${
            percentage >= 100 ? 'bg-green-600' : 
            percentage >= 50 ? 'bg-blue-600' : 
            'bg-yellow-600'
          }`}
          style={{ width: `${Math.min(100, percentage)}%` }}
        />
      </div>
      {product.remainingQuantity === 0 && (
        <p className="text-xs text-orange-600">
          ⚠️ This product has been fully received. Additional receiving will exceed ordered quantity.
        </p>
      )}
    </div>
  );
};
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('=== FRONTEND FORM SUBMISSION DEBUG ===');
    console.log('Form Data:', JSON.stringify(formData, null, 2));
    console.log('Received Products:', formData.receivedProducts);
    console.log('Received Products Length:', formData.receivedProducts.length);
    console.log('Document Types:', documentTypes);
    console.log('Custom Document Types:', customDocumentTypes);
    console.log('Product Images:', productImages);
    console.log('Uploaded Files:', uploadedFiles);
    console.log('=====================================');
    
    // Comprehensive form validation - Made less strict for draft saves
    const newErrors: Record<string, string> = {};
    
    // Required field validations - Only enforce critical fields
    if (!formData.purchaseOrder) {
      newErrors.purchaseOrder = 'Purchase Order is required';
    }
    
    // Make invoice fields optional for draft saves
    if (formData.invoiceNumber && formData.invoiceNumber.trim()) {
      if (formData.invoiceNumber.trim().length < 3) {
        newErrors.invoiceNumber = 'Invoice Number must be at least 3 characters long';
      } else if (formData.invoiceNumber.trim().length > 50) {
        newErrors.invoiceNumber = 'Invoice Number cannot exceed 50 characters';
      }
    }
    
    // Make date validations optional for draft saves
    if (formData.invoiceDate) {
      const invoiceDate = new Date(formData.invoiceDate);
      const today = new Date();
      today.setHours(23, 59, 59, 999); // End of today
      
      if (invoiceDate > today) {
        newErrors.invoiceDate = 'Invoice Date cannot be in the future';
      }
      
      // Check if invoice date is too far in the past (more than 2 years)
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(today.getFullYear() - 2);
      if (invoiceDate < twoYearsAgo) {
        newErrors.invoiceDate = 'Invoice Date cannot be more than 2 years in the past';
      }
    }
    
    if (formData.receivedDate) {
      const receivedDate = new Date(formData.receivedDate);
      const today = new Date();
      today.setHours(23, 59, 59, 999); // End of today
      
      if (receivedDate > today) {
        newErrors.receivedDate = 'Received Date cannot be in the future';
      }
      
      // Check if received date is before invoice date
      if (formData.invoiceDate) {
        const invoiceDate = new Date(formData.invoiceDate);
        if (receivedDate < invoiceDate) {
          newErrors.receivedDate = 'Received Date cannot be before Invoice Date';
        }
      }
    }
    
    // Make supplier validation optional for draft saves
    if (formData.supplier && formData.supplier.trim()) {
      if (formData.supplier.trim().length < 2) {
        newErrors.supplier = 'Supplier name must be at least 2 characters long';
      }
    }
    
    // Validate invoice amount if provided
    if (formData.invoiceAmount !== undefined && formData.invoiceAmount < 0) {
      newErrors.invoiceAmount = 'Invoice Amount cannot be negative';
    }
    
    // Validate products
    if (formData.receivedProducts.length === 0) {
      newErrors.receivedProducts = 'At least one product must be received';
    }
    
    // Validate individual products
    let hasProductErrors = false;
    formData.receivedProducts.forEach((product, index) => {
      // Validate received quantity
      if (product.receivedQty < 0) {
        newErrors[`receivedQty_${index}`] = 'Received quantity cannot be negative';
        hasProductErrors = true;
      } else if (product.receivedQty > product.remainingQuantity) {
        newErrors[`receivedQty_${index}`] = 'Received quantity cannot exceed remaining quantity';
        hasProductErrors = true;
      }
      
      // Validate unit price
      if (product.unitPrice < 0) {
        newErrors[`unitPrice_${index}`] = 'Unit price cannot be negative';
        hasProductErrors = true;
      }
      
      // Validate batch number if provided
      if (product.batchNo && product.batchNo.length > 50) {
        newErrors[`batchNo_${index}`] = 'Batch number cannot exceed 50 characters';
        hasProductErrors = true;
      }
      
      // Validate manufacturing date if provided
      if (product.mfgDate) {
        const mfgDate = new Date(product.mfgDate);
        const today = new Date();
        if (mfgDate > today) {
          newErrors[`mfgDate_${index}`] = 'Manufacturing date cannot be in the future';
          hasProductErrors = true;
        }
      }
      
      // Validate expiry date if provided
      if (product.expDate) {
        const expDate = new Date(product.expDate);
        const today = new Date();
        
        // Check if expiry date is in the past
        if (expDate < today) {
          newErrors[`expDate_${index}`] = 'Product has already expired';
          hasProductErrors = true;
        }
        
        // Check if expiry date is after manufacturing date
        if (product.mfgDate) {
          const mfgDate = new Date(product.mfgDate);
          if (expDate <= mfgDate) {
            newErrors[`expDate_${index}`] = 'Expiry date must be after manufacturing date';
            hasProductErrors = true;
          }
        }
      }
      
      // Validate FOC quantity
      if (product.foc && product.foc < 0) {
        newErrors[`foc_${index}`] = 'FOC quantity cannot be negative';
        hasProductErrors = true;
      }
      
      // Validate remarks length
      if (product.remarks && product.remarks.length > 500) {
        newErrors[`remarks_${index}`] = 'Remarks cannot exceed 500 characters';
        hasProductErrors = true;
      }
    });
    
    // Validate document types
    uploadedFiles.forEach((file, index) => {
      const docType = documentTypes[index];
      const customType = customDocumentTypes[index];
      
      if (!docType) {
        newErrors[`documentType_${index}`] = 'Document type is required';
      } else if (docType === 'Other' && !customType?.trim()) {
        newErrors[`customDocumentType_${index}`] = 'Custom document type is required';
      } else if (docType === 'Other' && customType && customType.length > 100) {
        newErrors[`customDocumentType_${index}`] = 'Custom document type cannot exceed 100 characters';
      }
      
      // Validate file size (max 10MB per file)
      if (file.size > 10 * 1024 * 1024) {
        newErrors[`fileSize_${index}`] = 'File size cannot exceed 10MB';
      }
    });
    
    // Validate notes length
    if (formData.notes && formData.notes.length > 1000) {
      newErrors.notes = 'Notes cannot exceed 1000 characters';
    }
    
    // Show validation errors
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      
      // Count different types of errors for better user feedback
      const fieldErrors = Object.keys(newErrors).filter(key => !key.includes('_')).length;
      const productErrors = Object.keys(newErrors).filter(key => key.includes('_')).length;
      
      let errorMessage = 'Please fix the validation errors';
      if (fieldErrors > 0 && productErrors > 0) {
        errorMessage = `Please fix ${fieldErrors} field error(s) and ${productErrors} product error(s)`;
      } else if (fieldErrors > 0) {
        errorMessage = `Please fix ${fieldErrors} field error(s)`;
      } else if (productErrors > 0) {
        errorMessage = `Please fix ${productErrors} product error(s)`;
      }
      
      toast.error(errorMessage);
      
      // Scroll to first error
      const firstErrorKey = Object.keys(newErrors)[0];
      const firstErrorElement = document.querySelector(`[name="${firstErrorKey}"]`) || 
                               document.querySelector(`[data-error="${firstErrorKey}"]`);
      if (firstErrorElement) {
        firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      
      return;
    }
    
    setErrors({});
    setSaving(true);
    
    try {
      // Prepare product images mapping
      const productImageMapping: Array<{ productIndex: number }> = [];
      Object.entries(productImages).forEach(([productIndex, images]) => {
        images.forEach(() => {
          productImageMapping.push({ productIndex: parseInt(productIndex) });
        });
      });
      
      // Flatten product images
      const allProductImages = Object.values(productImages).flat();
      
      if (isEdit && id) {
        await invoiceReceivingAPI.updateInvoiceReceiving(
          id,
          {
            ...formData,
            documents: uploadedFiles // Use uploadedFiles instead of formData.documents
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
            documents: uploadedFiles // Use uploadedFiles instead of formData.documents
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
      
      // Handle detailed validation errors from backend
      if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        const backendErrors: { [key: string]: string } = {};
        
        error.response.data.errors.forEach((err: any) => {
          if (err.path) {
            // Handle express-validator errors
            backendErrors[err.path] = err.msg;
          } else if (typeof err === 'string') {
            // Handle custom validation error strings
            toast.error(err);
          }
        });
        
        // Set field-specific errors if any
        if (Object.keys(backendErrors).length > 0) {
          setErrors(prev => ({ ...prev, ...backendErrors }));
        }
        
        // Show main error message
        const mainMessage = error.response?.data?.message || 'Validation failed';
        toast.error(mainMessage);
        
        // Show detailed error summary
        if (error.response.data.errors.length > 0) {
          const errorMessages = error.response.data.errors
            .map((err: any) => typeof err === 'string' ? err : err.msg || err.message)
            .filter(Boolean);
          
          if (errorMessages.length > 0) {
            setTimeout(() => {
              errorMessages.forEach((msg: string, index: number) => {
                setTimeout(() => toast.error(msg, { duration: 4000 }), index * 500);
              });
            }, 1000);
          }
        }
      } else {
        // Handle single error message
        const errorMessage = error.response?.data?.message || 'Failed to save invoice receiving';
        toast.error(errorMessage);
      }
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
                         orderedQty: product.orderedQty,
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
                  const totalReceived = group.entries.reduce((sum: number, entry: any) => sum + entry.receivedQty, 0);
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
                            Ordered: {group.productInfo.orderedQty} | Already Received: {group.productInfo.alreadyReceived || 0} | 
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
                                  value={entry.receivedQty}
                              onChange={(e) => updateReceivedProduct(entry.originalIndex, 'receivedQty', Number(e.target.value))}
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
                              
                              {/* Product Images Upload */}
                              <div className="col-span-full">
                                <label className="block text-xs font-medium text-gray-700 mb-2">
                                  <Camera className="w-4 h-4 inline mr-1" />
                                  Product Images (Max 10)
                                </label>
                                <div className="space-y-2">
                                  <input
                                    type="file"
                                    multiple
                                    accept="image/jpeg,image/jpg,image/png"
                                    onChange={(e) => handleProductImageUpload(entry.originalIndex, e)}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                  />
                                  <p className="text-xs text-gray-500">
                                    JPG, JPEG, PNG only. Max 5MB per image.
                                  </p>
                                  
                                  {/* Display uploaded images */}
                                  {productImages[entry.originalIndex] && productImages[entry.originalIndex].length > 0 && (
                                    <div className="grid grid-cols-3 gap-2 mt-2">
                                      {productImages[entry.originalIndex].map((image, imageIndex) => (
                                        <div key={imageIndex} className="relative group">
                                          <div className="aspect-square bg-gray-100 rounded border overflow-hidden">
                                            <img
                                              src={URL.createObjectURL(image)}
                                              alt={`Product ${entry.originalIndex + 1} - Image ${imageIndex + 1}`}
                                              className="w-full h-full object-cover"
                                            />
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => removeProductImage(entry.originalIndex, imageIndex)}
                                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                          >
                                            <X className="w-3 h-3" />
                                          </button>
                                          <div className="text-xs text-gray-500 mt-1 truncate">
                                            {image.name}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
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
                <h3 className="text-sm font-medium text-gray-700 mb-3">Uploaded Files:</h3>
                <div className="space-y-3">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-2 flex-1">
                          <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm text-gray-700 font-medium block truncate">{file.name}</span>
                            <span className="text-xs text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="text-red-600 hover:text-red-800 p-1 flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Document Type *
                          </label>
                          <select
                            value={documentTypes[index] || ''}
                            onChange={(e) => handleDocumentTypeChange(index, e.target.value)}
                            className={`w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent ${
                              errors[`documentType_${index}`] ? 'border-red-500' : 'border-gray-300'
                            }`}
                            required
                          >
                            <option value="">Select document type</option>
                            {predefinedDocumentTypes.map((type) => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                          {errors[`documentType_${index}`] && (
                            <p className="text-xs text-red-600 mt-1">{errors[`documentType_${index}`]}</p>
                          )}
                        </div>
                        
                        {documentTypes[index] === 'Other' && (
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Custom Document Type *
                            </label>
                            <input
                              type="text"
                              value={customDocumentTypes[index] || ''}
                              onChange={(e) => handleCustomDocumentTypeChange(index, e.target.value)}
                              placeholder="Enter document type"
                              className={`w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent ${
                                errors[`customDocumentType_${index}`] ? 'border-red-500' : 'border-gray-300'
                              }`}
                              required
                            />
                            {errors[`customDocumentType_${index}`] && (
                              <p className="text-xs text-red-600 mt-1">{errors[`customDocumentType_${index}`]}</p>
                            )}
                          </div>
                        )}
                      </div>
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