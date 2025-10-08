import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs/promises';

class PDFService {
  constructor() {
    this.browser = null;
  }

  async initBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });
    }
    return this.browser;
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async generateInvoiceReceivingPDF(invoiceData) {
    let page = null;
    try {
      const browser = await this.initBrowser();
      page = await browser.newPage();

      // Set page format
      await page.setViewport({ width: 1200, height: 800 });

      // Generate HTML content
      const htmlContent = await this.generateInvoiceHTML(invoiceData);

      // Set content and wait for it to load
      await page.setContent(htmlContent, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });

      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '0.5in',
          right: '0.5in',
          bottom: '0.5in',
          left: '0.5in'
        },
        displayHeaderFooter: true,
        headerTemplate: `
          <div style="font-size: 10px; width: 100%; text-align: center; color: #666;">
            <span>Invoice Receiving - ${invoiceData.invoiceNumber || 'N/A'}</span>
          </div>
        `,
        footerTemplate: `
          <div style="font-size: 10px; width: 100%; text-align: center; color: #666;">
            <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span> - Generated on ${new Date().toLocaleDateString()}</span>
          </div>
        `
      });

      return pdfBuffer;
    } catch (error) {
      console.error('PDF generation error:', error);
      throw new Error(`Failed to generate PDF: ${error.message}`);
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  async generateInvoiceHTML(data) {
    const {
      invoiceNumber,
      invoiceDate,
      supplierName,
      supplierAddress,
      totalAmount,
      taxAmount,
      grandTotal,
      status,
      receivedDate,
      purchaseOrder,
      products = [],
      documents = []
    } = data;

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invoice Receiving - ${invoiceNumber || 'N/A'}</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Arial', sans-serif;
                font-size: 12px;
                line-height: 1.4;
                color: #333;
                background: white;
            }
            
            .container {
                max-width: 100%;
                margin: 0 auto;
                padding: 20px;
            }
            
            .header {
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 3px solid #2563eb;
                padding-bottom: 20px;
            }
            
            .header h1 {
                font-size: 24px;
                color: #1e40af;
                margin-bottom: 5px;
            }
            
            .header .subtitle {
                font-size: 14px;
                color: #6b7280;
            }
            
            .info-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 30px;
                margin-bottom: 30px;
            }
            
            .info-card {
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                padding: 20px;
                background: #f9fafb;
            }
            
            .info-card h3 {
                font-size: 16px;
                color: #1f2937;
                margin-bottom: 15px;
                border-bottom: 1px solid #d1d5db;
                padding-bottom: 5px;
            }
            
            .info-item {
                display: flex;
                justify-content: space-between;
                margin-bottom: 8px;
                padding: 4px 0;
            }
            
            .info-label {
                font-weight: 600;
                color: #4b5563;
                flex: 1;
            }
            
            .info-value {
                color: #111827;
                flex: 1;
                text-align: right;
            }
            
            .status {
                display: inline-block;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 11px;
                font-weight: bold;
                text-transform: uppercase;
            }
            
            .status.received {
                background-color: #d1fae5;
                color: #065f46;
                border: 1px solid #a7f3d0;
            }
            
            .status.pending {
                background-color: #fef3c7;
                color: #92400e;
                border: 1px solid #fde68a;
            }
            
            .products-section {
                margin: 30px 0;
            }
            
            .section-title {
                font-size: 18px;
                color: #1f2937;
                margin-bottom: 15px;
                border-bottom: 2px solid #e5e7eb;
                padding-bottom: 5px;
            }
            
            .products-table {
                width: 100%;
                border-collapse: collapse;
                margin: 15px 0;
                font-size: 11px;
            }
            
            .products-table th,
            .products-table td {
                border: 1px solid #d1d5db;
                padding: 8px 6px;
                text-align: left;
            }
            
            .products-table th {
                background-color: #f3f4f6;
                font-weight: bold;
                color: #374151;
            }
            
            .products-table td {
                vertical-align: top;
            }
            
            .products-table .number-cell {
                text-align: right;
            }
            
            .totals-section {
                margin-top: 20px;
                float: right;
                width: 350px;
            }
            
            .total-row {
                display: flex;
                justify-content: space-between;
                padding: 8px 0;
                border-bottom: 1px solid #e5e7eb;
            }
            
            .total-row.grand-total {
                font-weight: bold;
                font-size: 14px;
                border-bottom: 2px solid #1f2937;
                border-top: 1px solid #1f2937;
                margin-top: 10px;
                padding-top: 10px;
                background-color: #f9fafb;
                padding-left: 10px;
                padding-right: 10px;
            }
            
            .documents-section {
                clear: both;
                margin-top: 40px;
                page-break-inside: avoid;
            }
            
            .documents-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 15px;
                margin-top: 15px;
            }
            
            .document-item {
                border: 1px solid #d1d5db;
                border-radius: 6px;
                padding: 15px;
                background: #f9fafb;
            }
            
            .document-name {
                font-weight: 600;
                color: #1f2937;
                margin-bottom: 5px;
            }
            
            .document-details {
                font-size: 10px;
                color: #6b7280;
            }
            
            .page-break {
                page-break-before: always;
            }
            
            @media print {
                .container {
                    padding: 0;
                }
                
                .page-break {
                    page-break-before: always;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <!-- Header -->
            <div class="header">
                <h1>Invoice Receiving Document</h1>
                <div class="subtitle">Complete Invoice Details & Product Information</div>
            </div>
            
            <!-- Invoice Information -->
            <div class="info-grid">
                <div class="info-card">
                    <h3>Invoice Information</h3>
                    <div class="info-item">
                        <span class="info-label">Invoice Number:</span>
                        <span class="info-value">${invoiceNumber || 'N/A'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Invoice Date:</span>
                        <span class="info-value">${invoiceDate ? new Date(invoiceDate).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Received Date:</span>
                        <span class="info-value">${receivedDate ? new Date(receivedDate).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Status:</span>
                        <span class="info-value">
                            <span class="status ${status?.toLowerCase() || 'pending'}">${status || 'Pending'}</span>
                        </span>
                    </div>
                </div>
                
                <div class="info-card">
                    <h3>Supplier Information</h3>
                    <div class="info-item">
                        <span class="info-label">Supplier Name:</span>
                        <span class="info-value">${supplierName || 'N/A'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Address:</span>
                        <span class="info-value">${supplierAddress || 'N/A'}</span>
                    </div>
                    ${purchaseOrder ? `
                    <div class="info-item">
                        <span class="info-label">PO Number:</span>
                        <span class="info-value">${purchaseOrder.poNumber || 'N/A'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">PO Date:</span>
                        <span class="info-value">${purchaseOrder.poDate ? new Date(purchaseOrder.poDate).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    ` : ''}
                </div>
            </div>
            
            <!-- Products Section -->
            ${products.length > 0 ? `
            <div class="products-section">
                <h2 class="section-title">Product Details</h2>
                <table class="products-table">
                    <thead>
                        <tr>
                            <th style="width: 5%">#</th>
                            <th style="width: 25%">Product Name</th>
                            <th style="width: 15%">Category</th>
                            <th style="width: 10%">Quantity</th>
                            <th style="width: 10%">Unit</th>
                            <th style="width: 12%">Unit Price</th>
                            <th style="width: 10%">Tax %</th>
                            <th style="width: 13%">Total Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${products.map((product, index) => `
                        <tr>
                            <td class="number-cell">${index + 1}</td>
                            <td>${product.productName || product.name || 'N/A'}</td>
                            <td>${product.categoryName || product.category || 'N/A'}</td>
                            <td class="number-cell">${product.quantity || 0}</td>
                            <td>${product.unit || 'N/A'}</td>
                            <td class="number-cell">₹${product.unitPrice ? parseFloat(product.unitPrice).toFixed(2) : '0.00'}</td>
                            <td class="number-cell">${product.taxPercentage || 0}%</td>
                            <td class="number-cell">₹${product.totalAmount ? parseFloat(product.totalAmount).toFixed(2) : '0.00'}</td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <!-- Totals -->
                <div class="totals-section">
                    <div class="total-row">
                        <span>Subtotal:</span>
                        <span>₹${totalAmount ? parseFloat(totalAmount).toFixed(2) : '0.00'}</span>
                    </div>
                    <div class="total-row">
                        <span>Tax Amount:</span>
                        <span>₹${taxAmount ? parseFloat(taxAmount).toFixed(2) : '0.00'}</span>
                    </div>
                    <div class="total-row grand-total">
                        <span>Grand Total:</span>
                        <span>₹${grandTotal ? parseFloat(grandTotal).toFixed(2) : '0.00'}</span>
                    </div>
                </div>
            </div>
            ` : ''}
            
            <!-- Documents Section -->
            ${documents.length > 0 ? `
            <div class="documents-section">
                <h2 class="section-title">Supporting Documents</h2>
                <div class="documents-grid">
                    ${documents.map((doc, index) => `
                    <div class="document-item">
                        <div class="document-name">${doc.originalName || `Document ${index + 1}`}</div>
                        <div class="document-details">
                            <div>Filename: ${doc.filename || 'N/A'}</div>
                            <div>Size: ${doc.size ? `${(doc.size / 1024).toFixed(1)} KB` : 'Unknown'}</div>
                            <div>Type: ${doc.originalName ? doc.originalName.split('.').pop()?.toUpperCase() : 'Unknown'}</div>
                        </div>
                    </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}
        </div>
    </body>
    </html>
    `;
  }
}

const pdfService = new PDFService();
export default pdfService;