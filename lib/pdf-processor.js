/**
 * PDF processing module
 */
import { exec } from 'child_process';
import { promises as fs } from 'fs';
import { promisify } from 'util';
import path from 'path';
import config from '../config/default.js';
import { OllamaService } from './ollama.js';

const execAsync = promisify(exec);

export class PdfProcessor {
  constructor(options = {}) {
    this.ollamaService = new OllamaService(options.ollama);
    this.config = options.config || config;
  }

  /**
   * Extract text content from a PDF file
   * @param {string} filePath - Path to the PDF file
   * @returns {Promise<string>} - Extracted text content
   */
  async extractText(filePath) {
    try {
      // Check if the file exists
      await fs.access(filePath);

      // Check file size
      const stats = await fs.stat(filePath);
      if (stats.size > this.config.pdf.maxSize) {
        throw new Error(`PDF file too large: ${stats.size} bytes (max: ${this.config.pdf.maxSize} bytes)`);
      }

      // Extract text content using command from config
      const command = this.config.pdf.textExtractionCommand.replace('${filePath}', filePath);
      const { stdout } = await execAsync(command);
      return stdout;
    } catch (error) {
      console.error(`Error extracting text from PDF: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process a PDF file using LLM
   * @param {string} filePath - Path to the PDF file
   * @returns {Promise<object>} - Analysis results from the LLM
   */
  async processPdf(filePath) {
    let extractedText = null;

    try {
      console.log(`Processing PDF: ${path.basename(filePath)}`);

      // Extract text from PDF
      extractedText = await this.extractText(filePath);

      // If text extraction failed or returned empty content
      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error('Failed to extract text content from PDF');
      }

      console.log(`Analyzing PDF content with Ollama (${this.ollamaService.model})...`);

      // Analyze PDF content using LLM
      const analysis = await this.ollamaService.analyzePdf(extractedText);

      // Validate the analysis result
      this.validateAnalysis(analysis);

      return analysis;
    } catch (error) {
      console.error(`Error processing PDF: ${error.message}`);
      if (extractedText) {
        error.pdfContent = extractedText;
      }

      throw error;
    }
  }

  /**
   * Validate the analysis result from LLM
   * @param {object} analysis - Analysis result from LLM
   */
  validateAnalysis(analysis) {
    // Check if analysis is an object
    if (!analysis || typeof analysis !== 'object') {
      throw new Error('Invalid analysis result: not an object');
    }

    // Check for required fields
    const requiredFields = ['date', 'company'];
    for (const field of requiredFields) {
      if (!analysis[field]) {
        throw new Error(`Missing required field in analysis result: ${field}`);
      }
    }

    // Handle legacy or missing description field
    if (!analysis.description) {
      if (analysis.summary) {
        // Convert legacy summary to description
        analysis.description = analysis.summary;
      } else {
        analysis.description = { oneline: 'Document' };
      }
    }

    // Ensure date fields are present
    if (!analysis.date.full) {
      // Try to construct full date from parts
      if (analysis.date.yyyy && analysis.date.mm && analysis.date.dd) {
        analysis.date.full = `${analysis.date.yyyy}-${analysis.date.mm}-${analysis.date.dd}`;
      } else {
        throw new Error('Missing date information in analysis result');
      }
    }

    // If we have full date but not the parts, split it
    if (analysis.date.full && (!analysis.date.yyyy || !analysis.date.mm || !analysis.date.dd)) {
      const dateParts = analysis.date.full.split('-');
      if (dateParts.length === 3) {
        analysis.date.yyyy = dateParts[0];
        analysis.date.mm = dateParts[1];
        analysis.date.dd = dateParts[2];
      }
    }

    // Ensure company name is present
    if (!analysis.company.name) {
      analysis.company.name = 'Unknown Company';
    }

    // Ensure description is present
    if (!analysis.description || !analysis.description.oneline) {
      if (!analysis.description) {
        analysis.description = { oneline: 'Document' };
      } else {
        analysis.description.oneline = 'Document';
      }
    }
  }
}
