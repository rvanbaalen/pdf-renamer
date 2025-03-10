# PDF Renamer

A Node.js tool that intelligently renames PDF files using LLM-powered analysis. It extracts information from PDFs and generates meaningful filenames based on customizable templates.

## Features

- Uses Ollama (local LLM) to analyze PDF content
- Extracts key information like dates, company names, and document content
- Customizable filename templates using Handlebars syntax
- Support for various configuration options
- Dry-run mode to preview changes
- Works with single files or entire directories

## Requirements

- Node.js v22 or higher
- macOS (uses macOS-specific `date` command) or Linux
- pdftotext (can be installed via Homebrew: `brew install poppler`)
- Ollama running locally or on a reachable server

## Installation

### Prerequisites

1. Install Ollama from [ollama.ai](https://ollama.ai) and make sure it's running
2. Pull a model that you want to use:
   ```bash
   ollama pull llama3
   ```

### Using npx

You can use pdf-renamer without installation:

```bash
npx @rvanbaalen/pdf-renamer [options] <file-or-directory>
```

### Global Installation

If you prefer, you can install the tool globally:

```bash
npm install -g @rvanbaalen/pdf-renamer
```

Then use it without the `npx` prefix:

```bash
pdf-renamer [options] <file-or-directory>
```

## Usage

### Basic Usage

```bash
# Rename a single PDF file
npx @rvanbaalen/pdf-renamer invoice.pdf

# Rename all PDFs in the current directory
npx @rvanbaalen/pdf-renamer .

# Rename all PDFs in a specific directory
npx @rvanbaalen/pdf-renamer /path/to/invoices
```

### Options

```bash
# Show help
npx @rvanbaalen/pdf-renamer --help

# Show version
npx @rvanbaalen/pdf-renamer --version

# List available Ollama models
npx @rvanbaalen/pdf-renamer list-models

# Show current configuration
npx @rvanbaalen/pdf-renamer show-config

# Use a specific model
npx @rvanbaalen/pdf-renamer -m llama3 invoice.pdf

# Use a different Ollama server
npx @rvanbaalen/pdf-renamer -u http://ollama-server:11434 invoice.pdf

# Use a custom filename template
npx @rvanbaalen/pdf-renamer -t "{{date.yyyy}}-{{date.mm}} - {{company.name}}.pdf" invoice.pdf

# Dry run (show what would happen without making changes)
npx @rvanbaalen/pdf-renamer -d invoice.pdf

# Verbose output
npx @rvanbaalen/pdf-renamer -v invoice.pdf
```

## Filename Templates

You can customize the filename template using Handlebars syntax. Available variables from the LLM analysis:

- `{{date.yyyy}}` - Year (e.g., 2025)
- `{{date.mm}}` - Month (e.g., 03)
- `{{date.dd}}` - Day (e.g., 15)
- `{{date.full}}` - Full date in ISO format (e.g., 2025-03-15)
- `{{company.name}}` - Company or organization name
- `{{invoice.number}}` - Invoice number (if available)
- `{{summary.oneline}}` - One-line summary of the document

Example templates:

```
{{date.yyyy}}-{{date.mm}}-{{date.dd}} - {{company.name}} - {{summary.oneline}}.pdf
{{date.yyyy}}-{{date.mm}}-{{date.dd}} - {{company.name}} - Invoice {{invoice.number}}.pdf
{{date.yyyy}}{{date.mm}}{{date.dd}}_{{company.name}}.pdf
```

## Configuration

You can configure PDF Renamer in several ways:

1. Command-line options (take precedence)
2. Environment variables
3. Default configuration

To use environment variables, create a `.env` file in the project directory (see `.env.example` for available options).

### Environment Variables

```
# Ollama configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3
OLLAMA_SYSTEM_PROMPT=...

# PDF processing
PDF_EXTRACTION_COMMAND=/opt/homebrew/bin/pdftotext -layout -q "${filePath}" -
PDF_MAX_SIZE=10485760  # 10MB

# Filename template
FILENAME_TEMPLATE={{date.yyyy}}-{{date.mm}}-{{date.dd}} - {{company.name}} - {{summary.oneline}}.pdf
FILENAME_FALLBACK={{date.full}} - Unnamed Invoice.pdf
FILENAME_SANITIZE=true
```

## How It Works

1. The tool extracts text content from PDFs using `pdftotext`
2. The extracted text is sent to Ollama for analysis
3. The LLM extracts key information and returns structured JSON data
4. This data is used with the template to generate a new filename
5. The PDF file is renamed accordingly

## Troubleshooting

If the script fails to rename a file, check the following:

1. Make sure Ollama is running and the model is available
2. Verify that pdftotext is installed correctly
3. Use the `-v` flag for verbose output to see what's happening
4. Try a different model if the current one doesn't extract information correctly
5. Check if the PDF content is extractable (not scanned or image-based)

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

## License

MIT
