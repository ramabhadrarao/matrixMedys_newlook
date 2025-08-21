// server/services/emailService.js
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';

export const sendPOEmail = async (purchaseOrder) => {
  try {
    // Generate PDF
    const pdfPath = await generatePOPDF(purchaseOrder);
    
    // Email content
    const mailOptions = {
      from: purchaseOrder.fromEmail || process.env.EMAIL_FROM,
      to: purchaseOrder.toEmails.join(','),
      cc: purchaseOrder.ccEmails ? purchaseOrder.ccEmails.join(',') : '',
      subject: `Purchase Order - ${purchaseOrder.poNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif;">
          <h2>Purchase Order</h2>
          <p>Dear Supplier,</p>
          <p>Please find attached Purchase Order ${purchaseOrder.poNumber} dated ${purchaseOrder.poDate.toLocaleDateString()}.</p>
          <p>Order Summary:</p>
          <ul>
            <li>Total Items: ${purchaseOrder.products.length}</li>
            <li>Total Amount: ₹${purchaseOrder.grandTotal.toFixed(2)}</li>
          </ul>
          <p>Please confirm receipt and expected delivery date.</p>
          <p>Best regards,<br>${purchaseOrder.billTo.name}</p>
        </div>
      `,
      attachments: [{
        filename: `PO_${purchaseOrder.poNumber}.pdf`,
        path: pdfPath
      }]
    };
    
    await transporter.sendMail(mailOptions);
    
    // Clean up PDF file
    fs.unlinkSync(pdfPath);
    
    return true;
  } catch (error) {
    console.error('Send PO email error:', error);
    throw error;
  }
};

const generatePOPDF = async (purchaseOrder) => {
  // PDF generation logic
  const doc = new PDFDocument();
  const filename = `PO_${purchaseOrder.poNumber}_${Date.now()}.pdf`;
  const filepath = path.join('/tmp', filename);
  
  doc.pipe(fs.createWriteStream(filepath));
  
  // Add PO content
  doc.fontSize(20).text('PURCHASE ORDER', { align: 'center' });
  doc.fontSize(12).text(`PO Number: ${purchaseOrder.poNumber}`);
  // ... add more content
  
  doc.end();
  
  return filepath;
};