/**
 * Ollama LLM integration for PDF analysis
 */
import fetch from 'node-fetch';
import config from '../config/default.js';

export class OllamaService {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || config.ollama.baseUrl;
    this.model = options.model || config.ollama.model;
    this.systemPrompt = options.systemPrompt || config.ollama.systemPrompt;
    this.addonPrompt = options.addonPrompt || config.ollama.addonPrompt;
  }

  /**
   * Send a prompt to the Ollama API
   * @param {string} prompt - Text prompt to send to Ollama
   * @returns {Promise<object>} - Parsed JSON response from the LLM
   */
  async query(prompt) {
    let rawResponse = '';

    try {
      // Prepare the system prompt with optional addon prompt
      let systemPrompt = this.systemPrompt;
      if (this.addonPrompt && this.addonPrompt.trim() !== '') {
        systemPrompt = `${this.systemPrompt}\n\nADDITIONAL CONTEXT:\n${this.addonPrompt}`;
      }

      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          prompt: prompt,
          system: systemPrompt,
          stream: false,
          format: 'json'
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();

      // Extract the response text
      const responseText = data.response || '';
      rawResponse = responseText; // Save for error logging

      // Try to parse the response as JSON
      try {
        // Find JSON content if wrapped in markdown code blocks
        const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, responseText];
        const jsonContent = jsonMatch[1].trim();
        const result = JSON.parse(jsonContent);

        // Attach the raw response to the result for logging purposes
        result._rawResponse = rawResponse;

        return result;
      } catch (parseError) {
        console.error('Failed to parse LLM response as JSON:', parseError);
        console.error('Raw response:', responseText);
        const error = new Error('Invalid JSON response from LLM');
        error.rawResponse = rawResponse;
        throw error;
      }
    } catch (error) {
      console.error('Error querying Ollama:', error);
      // Ensure the raw response is attached to the error object
      if (rawResponse && !error.rawResponse) {
        error.rawResponse = rawResponse;
      }
      throw error;
    }
  }

  /**
   * Analyze a PDF file using Ollama LLM
   * @param {string} pdfContent - Text content extracted from the PDF
   * @returns {Promise<object>} - Structured data extracted from the PDF
   */
  async analyzePdf(pdfContent) {
    // Create a prompt for the LLM to analyze the PDF content
    const userPrompt = `Analyze this PDF content and extract key information:

${pdfContent.slice(0, 15000)}  // Limit content to prevent token overflow

Format your response as JSON as specified in the system prompt.`;

    try {
      // Store the prompt in the result for logging
      const result = {
        _userPrompt: userPrompt,
        _extracted: true
      };

      // Get the analysis from Ollama
      const llmResult = await this.query(userPrompt);

      // Ensure the result has the expected structure
      const defaultStructure = {
        date: { yyyy: '', mm: '', dd: '', full: '' },
        company: { name: 'Unknown Company' },
        invoice: { number: '' },
        description: { oneline: 'Document' }
      };

      // If result is not an object or is a string, convert to default structure
      if (typeof llmResult !== 'object' || llmResult === null) {
        console.warn('LLM returned non-object result, using default structure');
        return { ...defaultStructure, _userPrompt: userPrompt };
      }

      // Copy all properties from LLM result
      Object.assign(result, llmResult);

      // Ensure all expected sections exist
      if (!result.date) result.date = defaultStructure.date;
      if (!result.company) result.company = defaultStructure.company;
      if (!result.invoice) result.invoice = defaultStructure.invoice;
      if (!result.description) {
        // If there's a legacy summary field, use that instead
        if (result.summary) {
          // Handle both object and string summary
          if (typeof result.summary === 'object') {
            result.description = {
              oneline: (result.summary.oneline || 'Document')
            };
          } else if (typeof result.summary === 'string') {
            result.description = {
              oneline: result.summary
            };
          } else {
            result.description = defaultStructure.description;
          }
        } else {
          result.description = defaultStructure.description;
        }
      }

      // Ensure nested objects have their properties
      if (typeof result.date !== 'object') result.date = defaultStructure.date;
      if (typeof result.company !== 'object') result.company = defaultStructure.company;
      if (typeof result.invoice !== 'object') result.invoice = defaultStructure.invoice;
      if (typeof result.description !== 'object') result.description = defaultStructure.description;

      // Ensure description.oneline exists
      if (!result.description.oneline) {
        // If description is a string, use it as oneline
        if (typeof result.description === 'string') {
          result.description = { oneline: result.description };
        } else {
          result.description.oneline = 'Document';
        }
      }

      // Ensure company.name exists
      if (!result.company.name) result.company.name = 'Unknown Company';

      return result;
    } catch (error) {
      console.error(`Error analyzing PDF: ${error.message}`);
      // Return default structure on error but include prompt for logging
      return {
        date: { yyyy: '', mm: '', dd: '', full: new Date().toISOString().split('T')[0] },
        company: { name: 'Unknown Company' },
        invoice: { number: '' },
        description: { oneline: 'Document' },
        _userPrompt: userPrompt,
        _error: error.message
      };
    }
  }
}
