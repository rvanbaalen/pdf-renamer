/**
 * PaddleExtractor class
 * 
 * Handles extraction for Paddle.com PDF invoices
 */
import { BaseExtractor } from './BaseExtractor.js';

export class PaddleExtractor extends BaseExtractor {
  getDescription() {
    return 'Handles Paddle.com invoice PDFs';
  }

  canHandle() {
    return this.content.includes('Paddle.com') && !this.content.includes('Remittance Advice');
  }

  getDate() {
    const layoutContent = this.extractContentWithLayout();
    const dateMatch = layoutContent.match(/Invoice Date:\s*(.*)/);
    return dateMatch ? dateMatch[1].trim() : '';
  }

  getDateFormat() {
    return '%d %b %Y';
  }

  getFilenamePrefix() {
    const companyName = this.getCompanyName();
    return companyName ? `${companyName} - ` : 'Paddle - ';
  }

  getInvoiceDetails() {
    const invoiceNumber = this.getInvoiceNumber();
    return invoiceNumber ? `Invoice ${invoiceNumber}` : '';
  }

  getCompanyName() {
    const layoutContent = this.extractContentWithLayout();
    const matches = layoutContent.match(/Invoice to:(?:[\s\S]*?)(.*?)(?:[\s]*){2,}/m);
    return matches ? matches[1].trim() : '';
  }

  getInvoiceNumber() {
    const layoutContent = this.extractContentWithLayout();
    const matches = layoutContent.match(/Invoice Number:\s*(.*)/);
    return matches ? matches[1].trim() : '';
  }
}