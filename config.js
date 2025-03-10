/**
 * Custom configuration for PDF-Renamer
 *
 * This file overrides the default configuration in config/default.js
 * You can customize any of these settings to fit your needs
 */
export default {
  // Ollama configuration
  ollama: {
    // Base URL for Ollama API
    baseUrl: 'http://localhost:11434',
    // Model to use
    model: 'llama3.2-vision:latest',
    // Optional addon prompt to provide context or customize extraction
    // addonPrompt: `Additional instructions or context for document extraction: ...`,
    // System prompt for the model (uncomment to override default)
//     systemPrompt: `You are an expert PDF analyzer specializing in accurately extracting structured data from business documents.
//
// Your task is to analyze the provided PDF text content and extract the following specific information:
//
// 1. **Date**:
//    - Extract the date from the document.
//    - Format the date clearly into separate fields:
//      - Year (yyyy)
//      - Month (mm)
//      - Day (dd)
//      - Full date (formatted as yyyy-mm-dd)
//
// 2. **Company Name**:
//    - Extract the official company name as presented in the document (typically found in the letterhead or header/footer sections).
//
// 3. **Invoice Number**:
//    - Locate and extract the invoice number from the document content.
//    - Hint: Invoice numbers are usually found near words like "Invoice", "Inv", or symbols such as "#".
//
// 4. **Summary**:
//    - Create a concise summary of the invoice or document contents (2-5 words).
//
// Return your findings in the following JSON format:
//
// \`\`\`json
// {
//   "date": {
//     "yyyy": "2024",
//     "mm": "01",
//     "dd": "01",
//     "full": "2024-01-01"
//   },
//   "company": {
//     "name": "Extracted Company Name"
//   },
//   "invoice": {
//     "number": "Extracted Invoice Number"
//   },
//   "summary": {
//     "oneline": "Concise description"
//   }
// }
// \`\`\`
//
// IMPORTANT:
// - Ensure all date components are correctly formatted (yyyy: 4 digits, mm/dd: 2 digits).
// - Do NOT use hard-coded or example-specific values. All extracted information must directly originate from the analyzed document.
// `
  }
  ,

  // PDF processing
  pdf: {
    // Command to extract text from PDF (uncomment to override default)
    // textExtractionCommand: '/opt/homebrew/bin/pdftotext -layout -q "${filePath}" -',
    // Maximum PDF file size in bytes (10MB by default)
    // maxSize: 10 * 1024 * 1024
  },

  // Filename template
  filename: {
    // Template pattern
    template: '{{date.yyyy}}-{{date.mm}}-{{date.dd}} - {{company.name}} - {{description.oneline}}.pdf',
    // Fallback pattern if template variables are missing (uncomment to override default)
    // fallback: '{{date.full}} - Unnamed Invoice.pdf',
    // Should we make filenames safer (replace invalid characters)?
    // sanitize: true
  }
}
