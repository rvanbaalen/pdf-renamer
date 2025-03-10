/**
 * Rules index file
 * 
 * Exports all available extractors
 */
import { PaddleExtractor } from './PaddleExtractor.js';
import { PaddleRemittanceExtractor } from './PaddleRemittanceExtractor.js';
import { LanguageToolerExtractor } from './LanguageToolerExtractor.js';
import { StripeExtractor } from './StripeExtractor.js';

// Add additional extractors here as you create them

export const EXTRACTORS = [
  PaddleRemittanceExtractor,
  PaddleExtractor,
  LanguageToolerExtractor,
  StripeExtractor,
  // Add additional extractors to this list
];

/**
 * Find the appropriate extractor for a PDF file
 * @param {string} filePath - Path to the PDF file
 * @returns {BaseExtractor|null} - An instance of the appropriate extractor, or null if no extractor can handle the file
 */
export function findExtractor(filePath) {
  for (const Extractor of EXTRACTORS) {
    const extractor = new Extractor(filePath);
    if (extractor.canHandle()) {
      return extractor;
    }
  }
  return null;
}