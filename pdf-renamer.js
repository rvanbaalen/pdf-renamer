#!/usr/bin/env node

/**
 * PDF Renamer
 *
 * A tool to intelligently rename PDF invoices with meaningful filenames
 * using LLM-powered analysis
 */

import { Command } from 'commander';
import { promises as fs } from 'fs';
import path, { dirname, basename, join } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import readline from 'readline';
import { appendFile } from 'fs/promises';

// Import our modules
import { PdfProcessor } from './lib/pdf-processor.js';
import { FilenameGenerator } from './lib/filename-generator.js';
import { OllamaService } from './lib/ollama.js';
import defaultConfig from './config/default.js';
import customConfig from './config.js';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get version from package.json
const packageJson = JSON.parse(await fs.readFile(join(__dirname, 'package.json'), 'utf8'));
const version = packageJson.version;

// Create customized configuration from custom config and defaults
const config = {
  ollama: {
    baseUrl: customConfig.ollama?.baseUrl || defaultConfig.ollama.baseUrl,
    model: customConfig.ollama?.model || defaultConfig.ollama.model,
    systemPrompt: customConfig.ollama?.systemPrompt || defaultConfig.ollama.systemPrompt,
    addonPrompt: customConfig.ollama?.addonPrompt || defaultConfig.ollama.addonPrompt,
  },
  pdf: {
    textExtractionCommand: customConfig.pdf?.textExtractionCommand || defaultConfig.pdf.textExtractionCommand,
    maxSize: customConfig.pdf?.maxSize || defaultConfig.pdf.maxSize,
  },
  filename: {
    template: customConfig.filename?.template || defaultConfig.filename.template,
    fallback: customConfig.filename?.fallback || defaultConfig.filename.fallback,
    sanitize: customConfig.filename?.sanitize !== false,
  }
};

// First, directly check arguments to decide how to proceed
const args = process.argv.slice(2);
const firstArg = args[0];

// Extract options from args manually for direct path processing
function extractOptions(args) {
  const options = {
    model: config.ollama.model,
    url: config.ollama.baseUrl,
    template: config.filename.template,
    dryRun: false,
    verbose: false,
    debug: false,
    configFile: null
  };

  const paths = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith('--') || arg.startsWith('-')) {
      // Handle options
      if (arg === '--model' || arg === '-m') {
        options.model = args[++i];
      } else if (arg === '--url' || arg === '-u') {
        options.url = args[++i];
      } else if (arg === '--template' || arg === '-t') {
        options.template = args[++i];
      } else if (arg === '--dry-run' || arg === '-d') {
        options.dryRun = true;
      } else if (arg === '--verbose' || arg === '-v') {
        options.verbose = true;
      } else if (arg === '--config' || arg === '-c') {
        options.configFile = args[++i];
      } else if (arg === '--debug') {
        options.debug = true;
      }
    } else {
      // Handle paths
      paths.push(arg);
    }
  }

  return { options, paths };
}

// Skip Commander.js for path arguments that start with "." or "/"
const isDirectlyProcessingPaths =
  (firstArg && (firstArg === '.' || firstArg.startsWith('./') || firstArg.startsWith('/'))) ||
  (args.length > 0 && !['list-models', 'show-config', 'show-variables'].includes(firstArg) && !firstArg?.startsWith('-'));

// Create the program instance
const program = new Command();

// Define core program interface
program
  .name('pdf-renamer')
  .description('Rename PDF files using LLM-powered analysis')
  .version(version)
  .option('-m, --model <model>', 'Ollama model to use', config.ollama.model)
  .option('-u, --url <url>', 'Ollama API URL', config.ollama.baseUrl)
  .option('-t, --template <template>', 'Filename template', config.filename.template)
  .option('-d, --dry-run', 'Show what would be done without making changes', false)
  .option('-v, --verbose', 'Show detailed output', false)
  .option('-c, --config <file>', 'Path to config file')
  .option('--debug', 'Show template values for a single PDF without renaming');

// Command to list available Ollama models
program
  .command('list-models')
  .description('List available Ollama models')
  .action(async () => {
    try {
      const baseUrl = program.opts().url || config.ollama.baseUrl;
      const response = await fetch(`${baseUrl}/api/tags`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.models && Array.isArray(data.models)) {
        console.log('Available Ollama models:');
        data.models.forEach(model => {
          console.log(`- ${model.name}`);
        });
      } else {
        console.log('No models found or unexpected response format');
      }
    } catch (error) {
      console.error(`Error listing models: ${error.message}`);
      process.exit(1);
    }
    process.exit(0);
  });

// Command to show current configuration
program
  .command('show-config')
  .description('Show current configuration')
  .action(() => {
    console.log('Current configuration:');
    console.log(JSON.stringify(config, null, 2));
    process.exit(0);
  });

// Command to show available variables for the filename template
program
  .command('show-variables')
  .description('Show available variables for the filename template')
  .action(async () => {
    // Try to load local config
    const localConfig = await loadLocalConfig();

    // Get current template considering local config
    let currentTemplate = config.filename.template;
    const options = program.opts();

    if (localConfig && localConfig.template) {
      currentTemplate = localConfig.template;
    }
    if (options.template) {
      currentTemplate = options.template;
    }

    // Show variables
    showFilenameVariables();

    console.log('\nDefault template:');
    console.log(config.filename.template);

    if (localConfig && localConfig.template) {
      console.log('\nLocal config template:');
      console.log(localConfig.template);
    }

    if (options.template) {
      console.log('\nCommand line template:');
      console.log(options.template);
    }

    console.log('\nActive template:');
    console.log(currentTemplate);

    process.exit(0);
  });

// Process command (but we handle direct paths in the main function too)
program
  .command('process [paths...]')
  .description('Process and rename PDF files')
  .action(async () => {
    // We'll handle this directly in the main function
    // This is just to provide help text and ensure the command is recognized
  });

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

// Process PDF files
async function processPdfFiles(inputPaths, options) {
  const verbose = options.verbose;
  const dryRun = options.dryRun;
  const debug = options.debug;

  // Try to load local config if not already loaded
  let localConfig = null;
  try {
    localConfig = await loadLocalConfig();
  } catch (error) {
    // Continue without local config
  }

  // Determine final options with priority: command line > local config > default config
  const finalUrl = options.url || (localConfig && localConfig.url) || config.ollama.baseUrl;
  const finalModel = options.model || (localConfig && localConfig.model) || config.ollama.model;
  const finalTemplate = options.template || (localConfig && localConfig.template) || config.filename.template;

  // Create instances with final options
  const ollamaService = new OllamaService({
    baseUrl: finalUrl,
    model: finalModel,
    systemPrompt: config.ollama.systemPrompt,
    addonPrompt: config.ollama.addonPrompt
  });

  const pdfProcessor = new PdfProcessor({
    ollama: ollamaService,
    config: config
  });

  const filenameGenerator = new FilenameGenerator({
    template: finalTemplate,
    fallback: config.filename.fallback,
    config: config
  });

  console.log(`Using model: ${finalModel}`);
  console.log(`Using template: ${finalTemplate}`);

  // In debug mode, only process the first PDF file
  if (debug) {
    console.log('\nDEBUG MODE: Will only process one PDF file to show template values');
    console.log('-------------------------------------------------------------');

    // Find the first PDF file
    let pdfFile = null;

    for (let inputPath of inputPaths) {
      try {
        // Convert relative paths to absolute
        if (inputPath === '.') {
          // For '.' use the actual current directory based on command invocation
          const scriptDir = dirname(process.argv[1] || '.');

          // If the script is called with an absolute path, use that base directory
          if (path.isAbsolute(process.argv[1])) {
            inputPath = scriptDir;
          } else {
            // Otherwise, try to resolve the relative path
            try {
              inputPath = path.resolve(inputPath);
            } catch (error) {
              console.log('Warning: Unable to resolve current directory, using script directory');
              inputPath = __dirname;
            }
          }
        } else if (!path.isAbsolute(inputPath)) {
          // For other relative paths
          try {
            inputPath = path.resolve(inputPath);
          } catch (error) {
            // Fallback to resolving against script directory
            inputPath = path.resolve(__dirname, inputPath);
          }
        }

        // Check if path exists
        await fs.access(inputPath);

        // Check if it's a directory or a file
        const stats = await fs.stat(inputPath);

        if (stats.isFile() && inputPath.toLowerCase().endsWith('.pdf')) {
          // Use this PDF file
          pdfFile = inputPath;
          break;
        } else if (stats.isDirectory()) {
          // Look for PDF files in the directory
          const files = await fs.readdir(inputPath);
          const pdfFiles = files
            .filter(file => file.toLowerCase().endsWith('.pdf'))
            .map(file => join(inputPath, file));

          if (pdfFiles.length > 0) {
            pdfFile = pdfFiles[0];
            break;
          }
        }
      } catch (error) {
        console.error(`Error accessing path ${inputPath}: ${error.message}`);
      }
    }

    if (pdfFile) {
      console.log(`Using PDF file for debug: ${pdfFile}`);
      await processSinglePdf(pdfFile, pdfProcessor, filenameGenerator, { verbose, dryRun, debug });
    } else {
      console.error('No PDF files found to process in debug mode');
    }

    return;
  }

  // Process each input path normally
  for (let inputPath of inputPaths) {
    try {
      // Convert relative paths to absolute
      if (inputPath === '.') {
        // For '.' use the actual current directory based on command invocation
        const scriptDir = dirname(process.argv[1] || '.');

        // If the script is called with an absolute path, use that base directory
        if (path.isAbsolute(process.argv[1])) {
          inputPath = scriptDir;
        } else {
          // Otherwise, try to resolve the relative path
          try {
            inputPath = path.resolve(inputPath);
          } catch (error) {
            console.log('Warning: Unable to resolve current directory, using script directory');
            inputPath = __dirname;
          }
        }
      } else if (!path.isAbsolute(inputPath)) {
        // For other relative paths
        try {
          inputPath = path.resolve(inputPath);
        } catch (error) {
          // Fallback to resolving against script directory
          inputPath = path.resolve(__dirname, inputPath);
        }
      }

      console.log(`Processing path: ${inputPath}`);

      // Check if path exists
      await fs.access(inputPath);

      // Check if it's a directory or a file
      const stats = await fs.stat(inputPath);

      if (stats.isDirectory()) {
        if (verbose) console.log(`Processing directory: ${inputPath}`);

        // Get all PDF files in the directory
        const files = await fs.readdir(inputPath);
        const pdfFiles = files
          .filter(file => file.toLowerCase().endsWith('.pdf'))
          .map(file => join(inputPath, file));

        if (pdfFiles.length === 0) {
          console.log(`No PDF files found in: ${inputPath}`);
          continue;
        }

        console.log(`Found ${pdfFiles.length} PDF files in: ${inputPath}`);

        // Process each PDF file
        for (const pdfFile of pdfFiles) {
          await processSinglePdf(pdfFile, pdfProcessor, filenameGenerator, { verbose, dryRun, debug });
        }
      } else if (stats.isFile() && inputPath.toLowerCase().endsWith('.pdf')) {
        // Process a single PDF file
        await processSinglePdf(inputPath, pdfProcessor, filenameGenerator, { verbose, dryRun, debug });
      } else {
        console.log(`Skipping non-PDF file: ${inputPath}`);
      }
    } catch (error) {
      console.error(`Error processing input path ${inputPath}: ${error.message}`);
    }
  }
}

// Write error log to file
async function writeErrorLog(filePath, error, analysis = null) {
  const logDir = join(dirname(filePath), 'pdf-renamer-logs');
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const logFile = join(logDir, 'error-log.txt');

  try {
    // Create log directory if it doesn't exist
    await fs.mkdir(logDir, { recursive: true });

    // Create log entry
    let logEntry = `\n======= ERROR LOG: ${timestamp} =======\n`;
    logEntry += `File: ${filePath}\n`;
    logEntry += `Error: ${error.message}\n`;

    // Add analysis data if available
    if (analysis) {
      // Create a clean version without internal properties
      const cleanAnalysis = { ...analysis };
      // Save special properties separately
      const userPrompt = analysis._userPrompt;
      const rawResponse = analysis._rawResponse;

      // Remove internal properties
      delete cleanAnalysis._userPrompt;
      delete cleanAnalysis._extracted;
      delete cleanAnalysis._rawResponse;

      logEntry += `\nExtracted values:\n${JSON.stringify(cleanAnalysis, null, 2)}\n`;

      // Add the PDF content if available
      if (error.pdfContent) {
        const pdfContentFile = join(logDir, `${basename(filePath)}-content-${timestamp}.txt`);
        await fs.writeFile(pdfContentFile, error.pdfContent);
        logEntry += `\nPDF content saved to: ${basename(pdfContentFile)}\n`;
      }

      // Add the system prompt if available
      if (error.systemPrompt) {
        logEntry += `\nSystem prompt:\n${error.systemPrompt}\n`;
      }

      // Add the addon prompt if available
      if (error.addonPrompt) {
        logEntry += `\nAddon prompt:\n${error.addonPrompt}\n`;
      }

      // Add the user prompt if available
      if (userPrompt) {
        const userPromptFile = join(logDir, `${basename(filePath)}-prompt-${timestamp}.txt`);
        await fs.writeFile(userPromptFile, userPrompt);
        logEntry += `\nUser prompt saved to: ${basename(userPromptFile)}\n`;
      }

      // Add the raw LLM response if available
      if (rawResponse || error.rawResponse) {
        const responseText = rawResponse || error.rawResponse;
        const responseFile = join(logDir, `${basename(filePath)}-response-${timestamp}.txt`);
        await fs.writeFile(responseFile, responseText);
        logEntry += `\nLLM response saved to: ${basename(responseFile)}\n`;
      }
    }

    logEntry += `=====================================\n\n`;

    // Append to log file
    await appendFile(logFile, logEntry);
    console.log(`Error details written to: ${logFile}`);
  } catch (logError) {
    console.error(`Failed to write error log: ${logError.message}`);
  }
}

// Process a single PDF file
async function processSinglePdf(filePath, pdfProcessor, filenameGenerator, options) {
  const { verbose, dryRun, debug } = options;

  try {
    if (verbose) console.log(`Processing PDF file: ${filePath}`);

    // Process the PDF and get analysis
    const analysis = await pdfProcessor.processPdf(filePath);

    if (verbose || debug) {
      console.log('Analysis result:');
      console.log(JSON.stringify(analysis, null, 2));
    }

    // In debug mode, display template values in a more readable format
    if (debug) {
      // Ensure all expected fields exist to avoid undefined errors
      const safeAnalysis = {
        date: analysis.date || { yyyy: '', mm: '', dd: '', full: '' },
        company: analysis.company || { name: '' },
        invoice: analysis.invoice || { number: '' },
        description: analysis.description || { oneline: '' }
      };

      console.log('\n=======================================');
      console.log('TEMPLATE VALUES FOR:', basename(filePath));
      console.log('=======================================');
      console.log('Date:');
      console.log(`  Year:  {{date.yyyy}} = ${safeAnalysis.date.yyyy || ''}`);
      console.log(`  Month: {{date.mm}} = ${safeAnalysis.date.mm || ''}`);
      console.log(`  Day:   {{date.dd}} = ${safeAnalysis.date.dd || ''}`);
      console.log(`  Full:  {{date.full}} = ${safeAnalysis.date.full || ''}`);
      console.log('Company:');
      console.log(`  Name:  {{company.name}} = ${safeAnalysis.company.name || ''}`);
      console.log('Invoice:');
      console.log(`  Number: {{invoice.number}} = ${safeAnalysis.invoice.number || ''}`);
      console.log('Description:');
      console.log(`  One-line: {{description.oneline}} = ${safeAnalysis.description.oneline || ''}`);
      console.log('=======================================');

      // Show what the filename would be
      const newFilename = filenameGenerator.generateFilename(analysis, filePath);
      console.log(`\nFilename with current template:`);
      console.log(`  Template: ${filenameGenerator.templateString}`);
      console.log(`  Result:   ${newFilename}`);

      // In debug mode, don't actually rename
      return;
    }

    // Generate new filename
    const newFilename = filenameGenerator.generateFilename(analysis, filePath);
    const dirPath = dirname(filePath);
    const newFilePath = join(dirPath, newFilename);

    // Show rename action
    console.log(`Renaming file:`);
    console.log(`  From: ${basename(filePath)}`);
    console.log(`  To:   ${newFilename}`);

    // Skip if source and destination are the same
    if (filePath === newFilePath) {
      console.log('File already has the target name, skipping');
      return;
    }

    // Actually rename the file (unless in dry run mode)
    if (!dryRun) {
      await fs.rename(filePath, newFilePath);
      console.log('File renamed successfully');
    } else {
      console.log('(Dry run: no changes made)');
    }
  } catch (error) {
    console.error(`Error processing ${filePath}: ${error.message}`);

    // Log to file with any partial analysis that might be available
    let partialAnalysis = null;
    if (error.partialAnalysis) {
      partialAnalysis = error.partialAnalysis;
    }
    await writeErrorLog(filePath, error, partialAnalysis);

    // Always show stack trace in debug mode
    if ((verbose || debug) && error.stack) {
      console.error(error.stack);
    }
  }
}

// Function to load local config
async function loadLocalConfig() {
  try {
    // First try to load from the directory where the command was run
    let configPath;

    try {
      // Try to get the directory where the command was run
      const runtimeDir = path.resolve('.');
      configPath = join(runtimeDir, 'pdf-renamer.config.json');
      const configData = await fs.readFile(configPath, 'utf8');
      return JSON.parse(configData);
    } catch (error) {
      // If we can't access that directory or file doesn't exist there,
      // fall back to script directory
      configPath = join(__dirname, 'pdf-renamer.config.json');
      try {
        const configData = await fs.readFile(configPath, 'utf8');
        return JSON.parse(configData);
      } catch (configError) {
        // File doesn't exist or couldn't be parsed
        return null;
      }
    }
  } catch (error) {
    console.error(`Error loading local config: ${error.message}`);
    return null;
  }
}

// Function to save local config
async function saveLocalConfig(configData) {
  try {
    // First try to save to the directory where the command was run
    let configPath;

    try {
      const runtimeDir = path.resolve('.');
      configPath = join(runtimeDir, 'pdf-renamer.config.json');
      await fs.writeFile(configPath, JSON.stringify(configData, null, 2), 'utf8');
      console.log(`Configuration saved to ${configPath}`);
      return true;
    } catch (error) {
      // If we can't access that directory, fall back to script directory
      console.log('Warning: Unable to save config to current directory, falling back to script directory');
      configPath = join(__dirname, 'pdf-renamer.config.json');
      await fs.writeFile(configPath, JSON.stringify(configData, null, 2), 'utf8');
      console.log(`Configuration saved to ${configPath}`);
      return true;
    }
  } catch (error) {
    console.error(`Error saving local config: ${error.message}`);
    return false;
  }
}

// Function to prompt for user input
async function promptUser(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// Function to show filename variables
function showFilenameVariables() {
  console.log('Available variables for the filename template:');
  console.log('--------------------------------------------');
  console.log('{{date.yyyy}}     - Year (4 digits)');
  console.log('{{date.mm}}       - Month (2 digits)');
  console.log('{{date.dd}}       - Day (2 digits)');
  console.log('{{date.full}}     - Full date in ISO format (YYYY-MM-DD)');
  console.log('{{company.name}}  - Company/organization name');
  console.log('{{invoice.number}} - Invoice number (if available)');
  console.log('{{description.oneline}} - One-line description extracted from the document');
}

// Main function
async function main() {
  try {
    if (isDirectlyProcessingPaths) {
      // Parse args manually for direct path processing
      const { options, paths } = extractOptions(args);

      if (paths.length === 0) {
        console.error('No input paths provided');
        console.log('Usage: pdf-renamer <path> [options]');
        process.exit(1);
      }

      // Try to load local config
      const localConfig = await loadLocalConfig();

      // Merge with command line options and defaults
      if (localConfig) {
        console.log('Using local configuration from pdf-renamer.config.json');
        if (localConfig.template && !options.template) {
          options.template = localConfig.template;
        }
        if (localConfig.model && !options.model) {
          options.model = localConfig.model;
        }
        if (localConfig.url && !options.url) {
          options.url = localConfig.url;
        }
      }

      // Skip user interaction in debug mode
      if (!options.debug) {
        // Show available variables and current template
        showFilenameVariables();
        console.log('\nCurrent template:');
        console.log(options.template);
        console.log();

        // Ask user for filename format
        const template = await promptUser(`Enter filename format [${options.template}]: `);

        // Use user input or default
        if (template && template.trim()) {
          options.template = template.trim();

          // Ask if user wants to save the format
          const saveResponse = await promptUser('Save this format for future use? (y/n): ');
          if (saveResponse.toLowerCase() === 'y' || saveResponse.toLowerCase() === 'yes') {
            const configData = {
              ...localConfig || {},
              template: options.template
            };
            await saveLocalConfig(configData);
          }
        }
      }

      // Check dependencies
      checkDependencies();

      // Process the input paths with the potentially updated options
      await processPdfFiles(paths, options);
    } else {
      // For standard commands, use Commander.js
      program.parse(process.argv);

      // If no command matched, show help
      if (!program.commands.some(cmd => cmd._executableHandler)) {
        program.help();
      }
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

// Run the application
main();
