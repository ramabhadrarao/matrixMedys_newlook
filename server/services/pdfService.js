import puppeteer from 'puppeteer';

class PDFService {
  constructor() {
    this.browser = null;
    this.isInitializing = false;
  }

  async initBrowser() {
    // Prevent multiple initialization attempts
    if (this.isInitializing) {
      console.log('Browser is already initializing, waiting...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      return this.browser;
    }

    if (!this.browser) {
      try {
        this.isInitializing = true;
        console.log('Initializing Puppeteer browser...');
        
        this.browser = await puppeteer.launch({
          headless: 'new',
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-web-security'
          ],
          timeout: 30000
        });
        
        console.log('Browser initialized successfully');
      } catch (error) {
        console.error('Failed to initialize browser:', error);
        this.browser = null;
        throw error;
      } finally {
        this.isInitializing = false;
      }
    }
    return this.browser;
  }

  async closeBrowser() {
    if (this.browser) {
      try {
        await this.browser.close();
        this.browser = null;
        console.log('Browser closed successfully');
      } catch (error) {
        console.error('Error closing browser:', error);
      }
    }
  }

  async generateInvoiceReceivingPDF(invoiceData) {
  let page = null;
  try {
    console.log('Starting PDF generation...');
    console.log('Invoice number:', invoiceData.invoiceNumber);

    const browser = await this.initBrowser();
    page = await browser.newPage();

    // Set page format
    await page.setViewport({ width: 1200, height: 1680 });

    // Generate HTML content
    console.log('Generating HTML content...');
    const htmlContent = this.generateInvoiceHTML(invoiceData);
    
    if (!htmlContent || htmlContent.length < 100) {
      throw new Error('Generated HTML is too short or empty');
    }

    console.log('HTML content generated, length:', htmlContent.length);

    // Set content and wait for it to load
    await page.setContent(htmlContent, { 
      waitUntil: ['networkidle0', 'domcontentloaded'],
      timeout: 30000 
    });

    // Wait for fonts to load
    await page.evaluate(() => document.fonts.ready);

    console.log('Page content loaded successfully');

    // Generate PDF
    console.log('Generating PDF buffer...');
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: false,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      },
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="font-size: 9px; width: 100%; text-align: center; color: #666; padding: 5px 0;">
          <span>Invoice Receiving - ${this.escapeHtml(invoiceData.invoiceNumber || 'N/A')}</span>
        </div>
      `,
      footerTemplate: `
        <div style="font-size: 9px; width: 100%; text-align: center; color: #666; padding: 5px 0;">
          <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span> | Generated on ${new Date().toLocaleDateString('en-IN')}</span>
        </div>
      `
    });

    console.log('PDF buffer generated, size:', pdfBuffer.length, 'bytes');

    // Validate PDF buffer
    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('Generated PDF buffer is empty');
    }

    // Convert to Buffer for proper validation and return
    const buffer = Buffer.from(pdfBuffer);
    
    // Check PDF signature
    const pdfSignature = Buffer.from([0x25, 0x50, 0x44, 0x46]); // %PDF
    const bufferStart = buffer.slice(0, 4);

    if (!bufferStart.equals(pdfSignature)) {
      console.error('Invalid PDF signature. Expected: %PDF, Got:', bufferStart.toString());
      throw new Error('Generated file is not a valid PDF');
    }

    console.log('PDF validation successful');
    return buffer;

  } catch (error) {
    console.error('PDF generation error:', error.message);
    console.error('Error stack:', error.stack);
    throw new Error(`Failed to generate PDF: ${error.message}`);
  } finally {
    if (page) {
      try {
        await page.close();
        console.log('Page closed');
      } catch (err) {
        console.error('Error closing page:', err);
      }
    }
  }
}

  escapeHtml(text) {
    if (!text) return '';
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.toString().replace(/[&<>"']/g, m => map[m]);
  }

  generateInvoiceHTML(data) {
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

    // Format currency
    const formatCurrency = (amount) => {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2
      }).format(amount || 0);
    };

    // Format date
    const formatDate = (date) => {
      if (!date) return 'N/A';
      try {
        return new Date(date).toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      } catch (e) {
        return 'N/A';
      }
    };

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invoice Receiving - ${this.escapeHtml(invoiceNumber)}</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: Arial, Helvetica, sans-serif;
                font-size: 11px;
                line-height: 1.4;
                color: #333;
                background: white;
            }
            
            .container {
                max-width: 100%;
                margin: 0 auto;
                padding: 10px;
            }
            
            .header {
                text-align: center;
                margin-bottom: 20px;
                border-bottom: 3px solid #2563eb;
                padding-bottom: 15px;
            }
            
            .header h1 {
                font-size: 22px;
                color: #1e40af;
                margin-bottom: 5px;
            }
            
            .header .subtitle {
                font-size: 12px;
                color: #6b7280;
            }
            
            .info-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 15px;
                margin-bottom: 20px;
            }
            
            .info-card {
                border: 1px solid #e5e7eb;
                border-radius: 6px;
                padding: 12px;
                background: #f9fafb;
            }
            
            .info-card h3 {
                font-size: 13px;
                color: #1f2937;
                margin-bottom: 10px;
                border-bottom: 1px solid #d1d5db;
                padding-bottom: 4px;
            }
            
            .info-item {
                display: flex;
                justify-content: space-between;
                margin-bottom: 6px;
                padding: 3px 0;
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
                padding: 3px 10px;
                border-radius: 15px;
                font-size: 10px;
                font-weight: bold;
                text-transform: uppercase;
                background-color: #d1fae5;
                color: #065f46;
                border: 1px solid #a7f3d0;
            }
            
            .products-section {
                margin: 20px 0;
            }
            
            .section-title {
                font-size: 15px;
                color: #1f2937;
                margin-bottom: 10px;
                border-bottom: 2px solid #e5e7eb;
                padding-bottom: 4px;
            }
            
            .products-table {
                width: 100%;
                border-collapse: collapse;
                margin: 10px 0;
                font-size: 10px;
            }
            
            .products-table th,
            .products-table td {
                border: 1px solid #d1d5db;
                padding: 6px 4px;
                text-align: left;
            }
            
            .products-table th {
                background-color: #f3f4f6;
                font-weight: bold;
                color: #374151;
            }
            
            .products-table .number-cell {
                text-align: right;
            }
            
            .totals-section {
                margin-top: 15px;
                float: right;
                width: 300px;
            }
            
            .total-row {
                display: flex;
                justify-content: space-between;
                padding: 6px 0;
                border-bottom: 1px solid #e5e7eb;
            }
            
            .total-row.grand-total {
                font-weight: bold;
                font-size: 12px;
                border-bottom: 2px solid #1f2937;
                border-top: 1px solid #1f2937;
                margin-top: 8px;
                padding-top: 8px;
                background-color: #f9fafb;
                padding-left: 8px;
                padding-right: 8px;
            }
            
            @media print {
                body {
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Invoice Receiving Document</h1>
                <div class="subtitle">Invoice Details & Product Information</div>
            </div>
            
            <div class="info-grid">
                <div class="info-card">
                    <h3>Invoice Information</h3>
                    <div class="info-item">
                        <span class="info-label">Invoice Number:</span>
                        <span class="info-value">${this.escapeHtml(invoiceNumber)}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Invoice Date:</span>
                        <span class="info-value">${formatDate(invoiceDate)}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Received Date:</span>
                        <span class="info-value">${formatDate(receivedDate)}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Status:</span>
                        <span class="info-value">
                            <span class="status">${this.escapeHtml(status)}</span>
                        </span>
                    </div>
                </div>
                
                <div class="info-card">
                    <h3>Supplier Information</h3>
                    <div class="info-item">
                        <span class="info-label">Supplier:</span>
                        <span class="info-value">${this.escapeHtml(supplierName)}</span>
                    </div>
                    ${purchaseOrder ? `
                    <div class="info-item">
                        <span class="info-label">PO Number:</span>
                        <span class="info-value">${this.escapeHtml(purchaseOrder.poNumber)}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">PO Date:</span>
                        <span class="info-value">${formatDate(purchaseOrder.poDate)}</span>
                    </div>
                    ` : ''}
                </div>
            </div>
            
            ${products.length > 0 ? `
            <div class="products-section">
                <h2 class="section-title">Product Details</h2>
                <table class="products-table">
                    <thead>
                        <tr>
                            <th style="width: 5%">#</th>
                            <th style="width: 30%">Product Name</th>
                            <th style="width: 15%">Category</th>
                            <th style="width: 10%">Qty</th>
                            <th style="width: 8%">Unit</th>
                            <th style="width: 15%">Unit Price</th>
                            <th style="width: 17%">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${products.map((product, index) => `
                        <tr>
                            <td class="number-cell">${index + 1}</td>
                            <td>${this.escapeHtml(product.productName)}</td>
                            <td>${this.escapeHtml(product.categoryName)}</td>
                            <td class="number-cell">${product.quantity}</td>
                            <td>${this.escapeHtml(product.unit)}</td>
                            <td class="number-cell">${formatCurrency(product.unitPrice)}</td>
                            <td class="number-cell">${formatCurrency(product.totalAmount)}</td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <div class="totals-section">
                    <div class="total-row">
                        <span>Subtotal:</span>
                        <span>${formatCurrency(totalAmount)}</span>
                    </div>
                    <div class="total-row">
                        <span>Tax Amount:</span>
                        <span>${formatCurrency(taxAmount)}</span>
                    </div>
                    <div class="total-row grand-total">
                        <span>Grand Total:</span>
                        <span>${formatCurrency(grandTotal)}</span>
                    </div>
                </div>
            </div>
            ` : '<p style="text-align: center; padding: 20px; color: #666;">No products available</p>'}
        </div>
    </body>
    </html>
    `;
  }
}

const pdfService = new PDFService();
export default pdfService;