/**
 * LanguageToolerExtractor class
 * 
 * Handles extraction for LanguageTooler PDF invoices
 */
import { BaseExtractor } from './BaseExtractor.js';

export class LanguageToolerExtractor extends BaseExtractor {
  getDescription() {
    return 'Handles LanguageTooler invoice PDFs';
  }

  canHandle() {
    return this.content.includes('LanguageTooler');
  }

  getDate() {
    const layoutContent = this.extractContentWithLayout();
    const dateMatch = layoutContent.match(/Billed On\s*(.*)/);
    return dateMatch ? dateMatch[1].trim() : '';
  }

  getDateFormat() {
    return '%d %b %Y';
  }

  getFilenamePrefix() {
    const companyName = this.getCompanyName();
    return companyName ? `${companyName} - ` : 'LanguageTooler - ';
  }

  getInvoiceDetails() {
    const invoiceNumber = this.getInvoiceNumber();
    return invoiceNumber ? `Invoice ${invoiceNumber}` : '';
  }

  getCompanyName() {
    const layoutContent = this.extractContentWithLayout();
    const companyMatch = layoutContent.match(/^LanguageTooler\s+(\w+)/m);
    return companyMatch ? companyMatch[0].trim() : 'LanguageTooler';
  }

  getInvoiceNumber() {
    const layoutContent = this.extractContentWithLayout();
    const invoiceMatch = layoutContent.match(/Invoice #\s*(.*)/);
    return invoiceMatch ? invoiceMatch[1].trim() : '';
  }
}