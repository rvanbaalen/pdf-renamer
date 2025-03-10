/**
 * Filename generation with templates
 */
import Handlebars from 'handlebars';
import path from 'path';
import config from '../config/default.js';

export class FilenameGenerator {
  constructor(options = {}) {
    this.config = options.config || config;
    this.templateString = options.template || this.config.filename.template;
    this.fallbackString = options.fallback || this.config.filename.fallback;
    this.template = Handlebars.compile(this.templateString);
    this.fallbackTemplate = Handlebars.compile(this.fallbackString);
  }

  /**
   * Generate a filename from analysis data using templates
   * @param {object} analysisData - Data extracted from the PDF
   * @param {string} originalFilePath - Original PDF file path
   * @returns {string} - Generated filename
   */
  generateFilename(analysisData, originalFilePath) {
    try {
      // Make a deep copy of the analysis data to avoid modifying the original
      const data = JSON.parse(JSON.stringify(analysisData));

      // Make sure description exists before template processing
      if (!data.description) {
        data.description = { oneline: 'Document' };
      } else if (!data.description.oneline) {
        data.description.oneline = 'Document';
      }

      // Make sure other required fields exist with defaults
      if (!data.date) data.date = { yyyy: '', mm: '', dd: '', full: new Date().toISOString().split('T')[0] };
      if (!data.company) data.company = { name: 'Unknown' };
      if (!data.invoice) data.invoice = { number: '' };

      // Generate filename using the template
      let filename = this.template(data);

      // If filename generation failed, use fallback
      if (!filename || filename.includes('undefined') || filename.includes('null')) {
        console.warn('Template generation failed, using fallback template');
        filename = this.fallbackTemplate(data);
      }

      // If still fails, use a very basic fallback
      if (!filename || filename.includes('undefined') || filename.includes('null')) {
        const originalFilename = path.basename(originalFilePath);
        const timestamp = new Date().toISOString().replace(/[:T]/g, '-').split('.')[0];
        filename = `${timestamp}-${originalFilename}`;
      }

      // Sanitize filename if configured
      if (this.config.filename.sanitize) {
        filename = this.sanitizeFilename(filename);
      }

      // Ensure filename ends with .pdf
      if (!filename.toLowerCase().endsWith('.pdf')) {
        filename += '.pdf';
      }

      return filename;
    } catch (error) {
      console.error(`Error generating filename: ${error.message}`);
      // Return a safe default
      return `renamed-${path.basename(originalFilePath)}`;
    }
  }

  /**
   * Sanitize a filename to ensure it's valid
   * @param {string} filename - Filename to sanitize
   * @returns {string} - Sanitized filename
   */
  sanitizeFilename(filename) {
    // Replace invalid characters
    let sanitized = filename.replace(/[\\/:*?"<>|]/g, '_');

    // Trim whitespace and limit length
    sanitized = sanitized.trim().slice(0, 255);

    // Remove consecutive separators
    sanitized = sanitized.replace(/\s+/g, ' ');
    sanitized = sanitized.replace(/_+/g, '_');
    sanitized = sanitized.replace(/-+/g, '-');

    return sanitized;
  }
}
