/**
 * BaseExtractor class
 * 
 * This serves as the foundation for all PDF extractors.
 * Each extractor should extend this class and implement its methods.
 */
import { execSync } from 'child_process';

export class BaseExtractor {
  /**
   * Constructor for the extractor
   * @param {string} filePath - Path to the PDF file
   */
  constructor(filePath) {
    this.filePath = filePath;
    this.content = this.extractContent();
  }

  /**
   * Extract text content from PDF
   * @returns {string} - The text content of the PDF
   */
  extractContent() {
    try {
      if (!this.filePath) return ''; // Handle empty path for --addons option
      return execSync(`/opt/homebrew/bin/pdftotext -q "${this.filePath}" -`, { encoding: 'utf8' });
    } catch (error) {
      console.error(`Error extracting text from PDF: ${error.message}`);
      return '';
    }
  }

  /**
   * Extract content using pdftotext with layout option
   * @returns {string} - The text content of the PDF with layout preserved
   */
  extractContentWithLayout() {
    try {
      if (!this.filePath) return ''; // Handle empty path for --addons option
      return execSync(`/opt/homebrew/bin/pdftotext -q -layout "${this.filePath}" -`, { encoding: 'utf8' });
    } catch (error) {
      console.error(`Error extracting text with layout from PDF: ${error.message}`);
      return '';
    }
  }

  /**
   * Execute a command on the PDF content and return the result
   * @param {string} command - The command to execute
   * @returns {string} - The result of the command
   */
  executeCommand(command) {
    try {
      return execSync(`${command}`, { encoding: 'utf8' }).trim();
    } catch (error) {
      console.error(`Error executing command: ${error.message}`);
      return '';
    }
  }

  /**
   * Get a description of this extractor
   * @returns {string} - Description of what this extractor handles
   */
  getDescription() {
    return 'Generic PDF extractor';
  }

  /**
   * Check if this extractor can handle the given PDF
   * @returns {boolean} - True if this extractor can handle the PDF
   */
  canHandle() {
    throw new Error('canHandle method must be implemented by subclass');
  }

  /**
   * Get the date from the PDF
   * @returns {string} - The extracted date
   */
  getDate() {
    throw new Error('getDate method must be implemented by subclass');
  }

  /**
   * Get the date format for this PDF type
   * @returns {string} - The date format string for date conversion
   */
  getDateFormat() {
    throw new Error('getDateFormat method must be implemented by subclass');
  }

  /**
   * Get the filename prefix for the PDF
   * @returns {string} - The prefix for the new filename
   */
  getFilenamePrefix() {
    throw new Error('getFilenamePrefix method must be implemented by subclass');
  }

  /**
   * Get the invoice details for the PDF
   * @returns {string} - The invoice details for the new filename
   */
  getInvoiceDetails() {
    throw new Error('getInvoiceDetails method must be implemented by subclass');
  }
}