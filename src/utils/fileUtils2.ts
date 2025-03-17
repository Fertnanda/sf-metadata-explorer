import * as path from 'path';

/**
 * Checks if a file is an XML file
 * @param filePath The path to the file
 * @returns boolean indicating if the file is an XML file
 */
export function isXmlFile(filePath: string): boolean {
  return filePath.endsWith('.xml');
}

/**
 * Extracts the metadata type from a file path
 * @param filePath The path to the file
 * @returns string representing the metadata type
 */
export function getMetadataTypeFromXmlFile(filePath: string): string {
  // Normalize path separators
  const normalizedPath = filePath.replace(/\\/g, '/');
  
  // Extract the part after the first dot and before '-meta'
  const match = path.basename(normalizedPath).match(/\.([^.]+)-meta\.xml$/);

  return match ? match[1] : '';
}

/**
 * Create metadata type table
 * No @param 
 * @returns string representing the metadata type
 */


