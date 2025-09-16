// server/services/emailService.js
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendPOEmail = async (purchaseOrder, recipientEmail) => {
  try {
    console.log(`Starting email process for PO: ${purchaseOrder.poNumber}`);
    
    // Generate PDF
    const pdfPath = await generatePOPDF(purchaseOrder);
    console.log(`PDF generated successfully: ${pdfPath}`);
    
    // Verify PDF exists before sending email
    if (!fs.existsSync(pdfPath)) {
      throw new Error(`PDF file not found at path: ${pdfPath}`);
    }
    
    console.log(`PDF generated at: ${pdfPath}`);
    
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: recipientEmail,
      subject: `Purchase Order - ${purchaseOrder.poNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3B82F6;">Purchase Order</h2>
          <p>Dear Supplier,</p>
          <p>Please find attached the purchase order details:</p>
          <ul>
            <li><strong>PO Number:</strong> ${purchaseOrder.poNumber}</li>
            <li><strong>Date:</strong> ${purchaseOrder.poDate ? new Date(purchaseOrder.poDate).toLocaleDateString() : 'N/A'}</li>
            <li><strong>Total Amount:</strong> ₹${purchaseOrder.totalAmount || 'N/A'}</li>
          </ul>
          <p>Please review the attached PDF for complete details and confirm receipt.</p>
          <p>Best regards,<br>${process.env.COMPANY_NAME}</p>
        </div>
      `,
      attachments: [
        {
          filename: `PO_${purchaseOrder.poNumber.replace(/[\/\\:*?"<>|]/g, '_')}.pdf`,
          path: pdfPath
        }
      ]
    };

    console.log('Sending email with options:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject,
      attachmentPath: pdfPath
    });

    try {
      await transporter.sendMail(mailOptions);
      
      // Clean up PDF file after successful sending
      try {
        fs.unlinkSync(pdfPath);
        console.log(`PDF file cleaned up: ${pdfPath}`);
      } catch (cleanupError) {
        console.error('Error cleaning up PDF file:', cleanupError);
      }
      
      return { success: true, message: 'Email sent successfully' };
    } catch (emailError) {
      // Handle Gmail sending limit errors specifically
      if (emailError.code === 'EENVELOPE' && emailError.responseCode === 550) {
        console.error('Gmail sending limit exceeded. Email will be queued for later retry.');
        
        // Save PDF for later retry (don't delete it)
        console.log(`PDF saved for retry: ${pdfPath}`);
        
        return { 
          success: false, 
          error: 'GMAIL_LIMIT_EXCEEDED',
          message: 'Gmail daily sending limit exceeded. The email has been queued and will be retried later.',
          pdfPath: pdfPath,
          retryAfter: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
        };
      }
      
      // For other email errors, clean up PDF and throw
      try {
        fs.unlinkSync(pdfPath);
        console.log(`PDF file cleaned up after email error: ${pdfPath}`);
      } catch (cleanupError) {
        console.error('Error cleaning up PDF file after email error:', cleanupError);
      }
      
      throw emailError;
    }
  } catch (error) {
    console.error('Send PO email error:', error);
    throw error;
  }
};

const generatePOPDF = async (purchaseOrder) => {
  // PDF generation logic
  const doc = new PDFDocument();
  
  // Sanitize PO number for filename - replace invalid characters
  const sanitizedPONumber = purchaseOrder.poNumber.replace(/[\/\\:*?"<>|]/g, '_');
  const filename = `PO_${sanitizedPONumber}_${Date.now()}.pdf`;
  
  // Create temp directory if it doesn't exist
  const tempDir = path.join(__dirname, '..', 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  const filepath = path.join(tempDir, filename);
  
  return new Promise((resolve, reject) => {
    const stream = fs.createWriteStream(filepath);
    
    stream.on('error', (error) => {
      console.error('PDF stream error:', error);
      reject(error);
    });
    
    stream.on('close', () => {
      // Verify file exists before resolving
      if (fs.existsSync(filepath)) {
        console.log('PDF generated successfully:', filepath);
        resolve(filepath);
      } else {
        reject(new Error('PDF file was not created'));
      }
    });
    
    doc.pipe(stream);
    
    // Add PO content
    doc.fontSize(20).text('PURCHASE ORDER', { align: 'center' });
    doc.moveDown();
    
    // Bill To section
    if (purchaseOrder.billTo) {
      doc.fontSize(14).text('Bill To:', { underline: true });
      doc.fontSize(12).text(purchaseOrder.billTo.name || 'N/A');
      if (purchaseOrder.billTo.address) {
        doc.text(purchaseOrder.billTo.address);
      }
      doc.moveDown();
    }
    
    // Ship To section
    if (purchaseOrder.shipTo) {
      doc.fontSize(14).text('Ship To:', { underline: true });
      doc.fontSize(12).text(purchaseOrder.shipTo.name || 'N/A');
      if (purchaseOrder.shipTo.address) {
        doc.text(purchaseOrder.shipTo.address);
      }
      doc.moveDown();
    }
    
    // PO Details
    doc.fontSize(12).text(`PO Number: ${purchaseOrder.poNumber}`);
    doc.text(`PO Date: ${purchaseOrder.poDate ? new Date(purchaseOrder.poDate).toLocaleDateString() : 'N/A'}`);
    doc.moveDown();
    
    // Products table header
    if (purchaseOrder.products && purchaseOrder.products.length > 0) {
      doc.fontSize(14).text('Products:', { underline: true });
      doc.fontSize(10);
      
      purchaseOrder.products.forEach((product, index) => {
        doc.text(`${index + 1}. ${product.productName || 'N/A'} - Qty: ${product.quantity || 0} - Rate: ₹${product.rate || 0} - Amount: ₹${(product.quantity * product.rate) || 0}`);
      });
      doc.moveDown();
    }
    
    // Total Amount
    doc.fontSize(12).text(`Total Amount: ₹${purchaseOrder.grandTotal ? purchaseOrder.grandTotal.toFixed(2) : '0.00'}`, { align: 'right' });
    
    // End the document
    doc.end();
  });
};