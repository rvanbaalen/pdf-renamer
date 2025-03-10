#!/usr/bin/env node

/**
 * PDF Renamer
 *
 * A tool to intelligently rename PDF invoices with meaningful filenames
 * based on various extraction rules.
 */

import { execSync } from 'child_process';
import { basename, dirname, join } from 'path';
import { existsSync, renameSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { findExtractor, EXTRACTORS } from './rules/index.js';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get version from package.json
const packageJson = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf8'));
const version = packageJson.version;

// Check dependencies
function checkDependencies() {
  // Check for pdftotext
  try {
    execSync('which pdftotext', { stdio: 'ignore' });
  } catch (error) {
    console.error('Error: pdftotext is not installed or not in your PATH.');
    console.error('Install it using:');
    console.error('  macOS: brew install poppler');
    console.error('  Linux: apt-get install poppler-utils or similar');
    process.exit(1);
  }

  // Check Node.js version
  const nodeVersion = process.versions.node.split('.')[0];
  if (parseInt(nodeVersion) < 22) {
    console.error(`Error: Node.js version 22 or higher is required. Your version: ${process.versions.node}`);
    console.error('Please upgrade your Node.js installation.');
    process.exit(1);
  }
}

// Display all available rule extractors (add-ons)
function listAddons() {
  console.log(`PDF Renamer v${version} - Available Rule Extractors (Add-ons)`);
  console.log('\nThe following rule extractors are available for PDF recognition:');
  console.log('--------------------------------------------------------------');

  // Extract names and descriptions from each extractor
  for (const ExtractorClass of EXTRACTORS) {
    try {
      // Instantiate a temporary instance to get its name (without a file)
      const tempInstance = new ExtractorClass('');
      let name = ExtractorClass.name.replace(/Extractor$/, '');
      let description = tempInstance.getDescription?.() || 'Extracts information from PDF invoices';

      console.log(`- ${name.padEnd(20)} ${description}`);
    } catch (error) {
      console.log(`- ${ExtractorClass.name.replace(/Extractor$/, '')}`);
    }
  }

  console.log('\nTo add a custom extractor, create a new file in the rules/ directory.');
  console.log('See the README for details on creating custom extractors.');
}

// Process command-line arguments
function processArgs() {
  const args = process.argv.slice(2);

  // Show help
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`PDF Renamer v${version}`);
    console.log('A tool to intelligently rename PDF invoices with meaningful filenames.');
    console.log('\nUsage:');
    console.log('  npx pdf-renamer [options] <file-or-directory>');
    console.log('\nOptions:');
    console.log('  -h, --help      Show this help message');
    console.log('  -v, --version   Show version information');
    console.log('  --addons        List all available rule extractors (add-ons)');
    console.log('\nExamples:');
    console.log('  npx pdf-renamer invoice.pdf            Rename a single PDF file');
    console.log('  npx pdf-renamer .                      Rename all PDFs in current directory');
    console.log('  npx pdf-renamer /path/to/invoices      Rename all PDFs in specified directory');
    process.exit(0);
  }

  // Show version
  if (args.includes('--version') || args.includes('-v')) {
    console.log(`v${version}`);
    process.exit(0);
  }

  // List addons
  if (args.includes('--addons')) {
    listAddons();
    process.exit(0);
  }

  // No inputs provided
  if (args.length === 0) {
    console.error('No input provided. Provide an input file or folder as the first argument.');
    console.error('Use --help for more information.');
    process.exit(1);
  }

  return args;
}

// Function to sanitize parts of the filename
function sanitizePart(text) {
  return text.replace(/[/:*?"<>|]/g, '_');
}

// Function to convert date formats
function convertDate(dateStr, format) {
  try {
    // Special case for formats already in the correct format
    if (format === 'YYYY-MM-DD' || dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateStr;
    }

    return execSync(`date -j -f "${format}" "${dateStr}" "+%Y-%m-%d" 2>/dev/null`, { encoding: 'utf8' }).trim();
  } catch (error) {
    console.error(`Failed to convert date: ${dateStr} with format ${format}. Error: ${error.message}`);
    return '';
  }
}

// Function to process a single file
function processFile(inputFile) {
  try {
    console.log(`Processing PDF file: ${inputFile}`);

    // Find the appropriate extractor for this PDF
    const extractor = findExtractor(inputFile);

    if (!extractor) {
      console.error('> Error: Unable to recognize PDF type.');
      return;
    }

    // Extract information using the extractor
    const extractedDate = extractor.getDate();
    const dateFormat = extractor.getDateFormat();
    const filenamePrefix = extractor.getFilenamePrefix();
    const invoiceDetails = extractor.getInvoiceDetails();

    if (!extractedDate) {
      console.error('> Error: Failed to extract date from PDF.');
      return;
    }

    // Convert date format
    const convertedDate = convertDate(extractedDate, dateFormat);

    if (!convertedDate) {
      console.error('> Failed to convert date. Please ensure the date in the PDF is in the correct format.');
      return;
    }

    // Prepare new filename
    const filename = basename(inputFile);

    // Sanitize the new filename parts
    const sanitizedPrefix = sanitizePart(filenamePrefix);
    const sanitizedInvoiceDetails = sanitizePart(invoiceDetails);
    const sanitizedFilename = sanitizePart(filename);

    let newFilename;

    // Determine what format to use based on the filename
    if (invoiceDetails) {
      newFilename = `${convertedDate} - ${sanitizedPrefix}${sanitizedInvoiceDetails}.pdf`;
    } else if (/^github-.*-receipt-[0-9]{4}-[0-9]{2}-[0-9]{2}\.pdf$/.test(filename)) {
      const middlePart = filename.replace(/^github-(.*)-receipt-[0-9]{4}-[0-9]{2}-[0-9]{2}\.pdf$/, '$1');
      const sanitizedMiddlePart = sanitizePart(middlePart);
      newFilename = `${convertedDate} - ${sanitizedPrefix}${sanitizedMiddlePart}-receipt.pdf`;
    } else if (/^[0-9]+\.pdf$/.test(filename)) {
      newFilename = `${convertedDate} - ${sanitizedPrefix}${sanitizedFilename}`;
    } else if (/^[0-9]{4}-[0-9]{2}-[0-9]{2}/.test(filename)) {
      newFilename = `${convertedDate} - ${sanitizedPrefix}${filename.substring(11)}`;
    } else {
      newFilename = `${convertedDate} - ${sanitizedPrefix}${sanitizedFilename}`;
    }

    // Get directory of input file
    const dir = dirname(inputFile);
    const newPath = join(dir, newFilename);

    // Rename the file
    renameSync(inputFile, newPath);

    console.log(`File renamed to: ${newFilename}`);
    console.log('---');
  } catch (error) {
    console.error(`Error processing file ${inputFile}: ${error.message}`);
  }
}

// Main function
function main() {
  // Check dependencies first
  checkDependencies();

  // Process command-line arguments
  const inputs = processArgs();

  // Process each input item
  for (const inputItem of inputs) {
    try {
      if (existsSync(inputItem)) {
        const stats = execSync(`test -d "${inputItem}" && echo "directory" || echo "file"`, { encoding: 'utf8' }).trim();

        if (stats === 'directory') {
          console.log(`Processing all PDF files in the folder: ${inputItem}`);
          // Find all PDFs in the directory and process them
          const pdfFiles = execSync(`find "${inputItem}" -name "*.pdf" -type f`, { encoding: 'utf8' })
            .trim()
            .split('\n')
            .filter(Boolean);

          for (const pdfFile of pdfFiles) {
            console.log('---');
            processFile(pdfFile);
          }
        } else if (inputItem.endsWith('.pdf')) {
          console.log('---');
          processFile(inputItem);
        } else {
          console.log(`${inputItem} is not a PDF file or a folder.`);
        }
      } else {
        console.error(`Input does not exist: ${inputItem}`);
      }
    } catch (error) {
      console.error(`Error processing ${inputItem}: ${error.message}`);
    }
  }
}

// Run the main function
main();
