/**
 * StripeExtractor class
 * 
 * Handles extraction for Stripe PDF invoices
 */
import { BaseExtractor } from './BaseExtractor.js';

export class StripeExtractor extends BaseExtractor {
  getDescription() {
    return 'Handles Stripe payment processor invoice PDFs';
  }

  canHandle() {
    return this.content.includes('buildui.com') || 
           (this.content.includes('Invoice number') && this.content.includes('Date due'));
  }

  getDate() {
    const layoutContent = this.extractContentWithLayout();
    const dateMatch = layoutContent.match(/Date due\s+([A-Za-z]+ \d+, \d{4})/);
    return dateMatch ? dateMatch[1].trim() : '';
  }

  getDateFormat() {
    return '%B %d, %Y';
  }

  getFilenamePrefix() {
    const companyName = this.getCompanyName();
    return companyName ? `${companyName} - ` : 'Stripe - ';
  }

  getInvoiceDetails() {
    const invoiceNumber = this.getInvoiceNumber();
    return invoiceNumber ? `Invoice ${invoiceNumber}` : '';
  }

  getCompanyName() {
    const layoutContent = this.extractContentWithLayout();
    
    // Search for the company name, which is typically after "Date due" section
    const lines = layoutContent.split('\n');
    let foundDateDue = false;
    let companyLine = '';
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('Date due')) {
        foundDateDue = true;
        continue;
      }
      
      if (foundDateDue && lines[i].trim() && !lines[i].match(/^\s+/)) {
        companyLine = lines[i].trim().split(/\s{2,}/)[0];
        break;
      }
    }
    
    return companyLine || 'Stripe';
  }

  getInvoiceNumber() {
    const layoutContent = this.extractContentWithLayout();
    const invoiceMatch = layoutContent.match(/Invoice number\s+(\w+)/);
    return invoiceMatch ? invoiceMatch[1].trim() : '';
  }
}