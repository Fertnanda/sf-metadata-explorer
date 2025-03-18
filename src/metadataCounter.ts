import fastGlob from 'fast-glob';
import { getSalesforceSourceDirectory } from './projectDetector';
import { getMetadataTypeFromXmlFile } from './utils/fileUtils';

// Interface dict number by metadata type 
export interface MetadataReport {
  [key: string]: number;
}

// Interface for metadata count result return
export interface MetadataCountResult {
  totalCount: number;
  metadataByType: MetadataReport;
}

/**
 * Counts the total number of Salesforce metadata components
 * Counts the total number of each type of metadata found
 * @returns the total count and breakdown by metadata type
 */
export async function countMetadata(): Promise<MetadataCountResult> {
  const sourceDir = getSalesforceSourceDirectory();
  if (!sourceDir) {
    throw new Error('Salesforce source directory not found');
  }

  // Get all XML files in the project
  const xmlFiles = await fastGlob('**/*.xml', {
    cwd: sourceDir,
    absolute: true,
    ignore: [
      '**/package.xml',       // Exclude package.xml
      '**/jsconfig.json',     // Exclude config files
      '**/README.md',         // Exclude readme files
      '**/node_modules/**',   // Exclude node modules
      '**/bower_components/**' // Exclude bower components
    ]
  });

  // Initialize the report object
  const metadataByType: MetadataReport = {};

  // Apply counting
  let totalCount = 0;
  
  // Count XML files
  for (const file of xmlFiles) {
    const filePath = file.replace(/\\/g, '/'); // Normalize path separators

    const metadataType = getMetadataTypeFromXmlFile(filePath);

    // Only count files with valid metadata types
    if (metadataType && metadataType.trim() !== '') {
      totalCount++;
      metadataByType[metadataType] = (metadataByType[metadataType] || 0) + 1;
    }
  }
  
  return { totalCount, metadataByType };
}

/**
 * Generates a detailed report of metadata by type
 * @returns Promise<MetadataReport> A report object with counts by metadata type
 */
export async function generateMetadataReport(): Promise<MetadataReport> {
  const result = await countMetadata();
  return result.metadataByType;
}