# PDF Renamer

A Node.js tool that intelligently reads the contents of invoice PDFs and renames them with a consistent, human-readable format:

`yyyy-mm-dd - {Company name} - Invoice {invoice number}.pdf` 

Where `yyyy-mm-dd` is the date of the invoice, `{Company name}` is the name of the company that issued the invoice, and `{invoice number}` is the invoice number.

## Features

- Extracts relevant information from various PDF invoice types
- Renames files with a consistent naming pattern
- Processes single files or entire directories
- Extensible architecture with modular rules for different PDF types

## Requirements

- Node.js v22 or higher
- macOS (uses macOS-specific `date` command)
- pdftotext (can be installed via Homebrew: `brew install poppler`)

## Usage

You can use pdf-renamer without installation using `npx`:

### Single file
```bash
npx @rvanbaalen/pdf-renamer /path/to/invoice.pdf
```

### Multiple files
```bash
# Renames all PDF files in the current directory
npx @rvanbaalen/pdf-renamer . 

# Renames all PDF files in the specified directory
npx @rvanbaalen/pdf-renamer /path/to/directory
```

### Options
```bash
# Show help
npx @rvanbaalen/pdf-renamer --help

# Show version
npx @rvanbaalen/pdf-renamer --version

# List all available rule extractors (add-ons)
npx @rvanbaalen/pdf-renamer --addons
```

## Installation

### Install globally (optional)

If you prefer, you can install the tool globally:

```bash
npm install -g @rvanbaalen/pdf-renamer
```

Then use it without the `npx` prefix:

```bash
pdf-renamer /path/to/invoice.pdf
```

## Supported PDF Types

PDF Renamer includes extractors for various invoice types. To see all available extractors:

```bash
npx @rvanbaalen/pdf-renamer --addons
```

Currently, PDF Renamer supports the following invoice types:

- Paddle.com invoices and remittance advice
- LanguageTooler invoices
- Stripe invoices
- And more...

More invoice types can be added by creating custom extractors.

## Extending with Custom Rules

PDF Renamer uses a modular architecture that makes it easy to add support for new PDF types. Each PDF type has its own extractor class that handles the extraction of information from that specific format.

### Creating a Custom Extractor

1. Create a new file in the `rules/` directory, e.g., `rules/MyCompanyExtractor.js`
2. Extend the `BaseExtractor` class and implement the required methods
3. Add your extractor to the list in `rules/index.js`

Here's an example of a custom extractor:

```javascript
/**
 * MyCompanyExtractor class
 * 
 * Handles extraction for MyCompany PDF invoices
 */
import { BaseExtractor } from './BaseExtractor.js';

export class MyCompanyExtractor extends BaseExtractor {
  // Provide a description of what this extractor handles
  getDescription() {
    return 'Handles MyCompany invoice PDFs';
  }

  // Determine if this extractor can handle this PDF
  canHandle() {
    return this.content.includes('MyCompany') || 
           this.content.includes('specific text that identifies this PDF type');
  }

  // Extract the date from the PDF
  getDate() {
    const layoutContent = this.extractContentWithLayout();
    const dateMatch = layoutContent.match(/Invoice Date:\s*(.*)/);
    return dateMatch ? dateMatch[1].trim() : '';
  }

  // Specify the date format for conversion
  getDateFormat() {
    return '%B %d, %Y'; // For dates like "January 1, 2023"
  }

  // Get the prefix for the new filename
  getFilenamePrefix() {
    return 'MyCompany - ';
  }

  // Get the invoice details for the new filename
  getInvoiceDetails() {
    const invoiceNumber = this.getInvoiceNumber();
    return invoiceNumber ? `Invoice ${invoiceNumber}` : '';
  }

  // Helper method to extract invoice number
  getInvoiceNumber() {
    const layoutContent = this.extractContentWithLayout();
    const invoiceMatch = layoutContent.match(/Invoice #:\s*(.*)/);
    return invoiceMatch ? invoiceMatch[1].trim() : '';
  }
}
```

### Registering Your Custom Extractor

After creating your extractor, add it to the list in `rules/index.js`:

```javascript
import { MyCompanyExtractor } from './MyCompanyExtractor.js';

// Add to the EXTRACTORS array
export const EXTRACTORS = [
  // ...existing extractors
  MyCompanyExtractor,
];
```

### BaseExtractor API

The `BaseExtractor` class provides the following methods:

- **extractContent()**: Extracts the text content from the PDF
- **extractContentWithLayout()**: Extracts the text content with layout preservation
- **executeCommand(command)**: Executes a command and returns the result
- **getDescription()**: Returns a description of what this extractor handles
- **canHandle()**: Determines if this extractor can handle the given PDF
- **getDate()**: Gets the date from the PDF
- **getDateFormat()**: Gets the date format string for date conversion
- **getFilenamePrefix()**: Gets the prefix for the new filename
- **getInvoiceDetails()**: Gets the invoice details for the new filename

You must implement the last five methods in your custom extractor.

## Development

To contribute to the project:

```bash
# Clone the repository
git clone https://github.com/rvanbaalen/pdf-renamer.git
cd pdf-renamer

# Install dependencies
npm install

# Run the script locally
node pdf-renamer.js /path/to/your/invoice.pdf
```

## Troubleshooting

If the script fails to rename a file, check the following:

1. Make sure the PDF is a recognized invoice type (use `--addons` to see supported types)
2. Verify that pdftotext is installed and working correctly (`brew install poppler`)
3. Check if the PDF content is extractable (not scanned or image-based)
4. Try adding a custom extractor for your specific PDF format

## License

MIT
