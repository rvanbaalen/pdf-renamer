/**
 * PaddleRemittanceExtractor class
 * 
 * Handles extraction for Paddle.com Remittance Advice PDFs
 */
import { BaseExtractor } from './BaseExtractor.js';

export class PaddleRemittanceExtractor extends BaseExtractor {
  getDescription() {
    return 'Handles Paddle.com remittance advice PDFs';
  }

  canHandle() {
    return this.content.includes('Remittance Advice');
  }

  getDate() {
    const layoutContent = this.extractContentWithLayout();
    const dateMatch = layoutContent.match(/Payment Date:\s*(.*)/);
    return dateMatch ? dateMatch[1].trim() : '';
  }

  getDateFormat() {
    return '%d %b %Y';
  }

  getFilenamePrefix() {
    return 'Paddle.com - ';
  }

  getInvoiceDetails() {
    return 'Remittance Advice';
  }
}