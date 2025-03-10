import * as vscode from 'vscode';
import * as path from 'path';
import * as glob from 'fast-glob';
import { getSalesforceSourceDirectory } from './projectDetector';
import { isXmlFile, isCodeFile, getMetadataTypeFromPath } from './utils/fileUtils';

// Interface for metadata report
interface MetadataReport {
  [key: string]: number;
}

/**
 * Counts the total number of Salesforce metadata components
 * @returns A promise that resolves to the total count
 */
export async function countMetadata(): Promise<number> {
  const sourceDir = getSalesforceSourceDirectory();
  if (!sourceDir) {
    throw new Error('Salesforce source directory not found');
  }

  // Get all XML files in the project
  const xmlFiles = await glob('**/*.xml', {
    cwd: sourceDir,
    absolute: true,
    ignore: ['**/package.xml'] // Exclude package.xml
  });

  // Get all code files that need special handling
  const codeFiles = await glob('**/*.{cls,trigger}', {
    cwd: sourceDir,
    absolute: true
  });

  // Apply counting rules
  let count = 0;
  
  // Set to track paired files to avoid double-counting
  const pairedFileTracker = new Set<string>();
  
  // Count XML files
  for (const file of xmlFiles) {
    const filePath = file.replace(/\\/g, '/'); // Normalize path separators

    // Skip files that are metadata for code components
    if (filePath.endsWith('-meta.xml')) {
      const baseName = filePath.slice(0, -9); // Remove '-meta.xml'
      
      // Check if this is a metadata file for a code component
      if (codeFiles.some(codeFile => codeFile.replace(/\\/g, '/') === baseName)) {
        pairedFileTracker.add(baseName);
        continue; // Skip counting this file as it will be counted with its paired file
      }
    }

    // Handle component folders (aura, lwc)
    if (filePath.includes('/aura/') || filePath.includes('/lwc/')) {
      const componentDir = path.dirname(filePath);
      
      // If we haven't counted this component folder yet
      if (!pairedFileTracker.has(componentDir)) {
        pairedFileTracker.add(componentDir);
        count++;
      }
    } else {
      // Count all other XML files as one component each
      count++;
    }
  }
  
  // Count code files (paired with their metadata)
  for (const file of codeFiles) {
    const filePath = file.replace(/\\/g, '/');
    
    // If we haven't already paired this with its metadata
    if (!pairedFileTracker.has(filePath)) {
      count++;
    }
  }
  
  return count;
}

/**
 * Generates a detailed report of metadata by type
 * @returns Promise<MetadataReport> A report object with counts by metadata type
 */
export async function generateMetadataReport(): Promise<MetadataReport> {
  const sourceDir = getSalesforceSourceDirectory();
  if (!sourceDir) {
    throw new Error('Salesforce source directory not found');
  }

  // Initialize the report object
  const report: MetadataReport = {};

  // Get all XML files
  const xmlFiles = await glob('**/*.xml', {
    cwd: sourceDir,
    absolute: true,
    ignore: ['**/package.xml']
  });

  // Get all code files
  const codeFiles = await glob('**/*.{cls,trigger}', {
    cwd: sourceDir,
    absolute: true
  });

  // Tracked components to avoid double-counting
  const pairedFileTracker = new Set<string>();

  // Process XML files
  for (const file of xmlFiles) {
    const filePath = file.replace(/\\/g, '/');
    const metadataType = getMetadataTypeFromPath(filePath);

    // Skip metadata files for code components
    if (filePath.endsWith('-meta.xml')) {
      const baseName = filePath.slice(0, -9);
      
      if (codeFiles.some(codeFile => codeFile.replace(/\\/g, '/') === baseName)) {
        pairedFileTracker.add(baseName);
        continue;
      }
    }

    // Handle component folders (aura, lwc)
    if (filePath.includes('/aura/') || filePath.includes('/lwc/')) {
      const componentDir = path.dirname(filePath);
      
      if (!pairedFileTracker.has(componentDir)) {
        pairedFileTracker.add(componentDir);
        const componentType = filePath.includes('/aura/') ? 'aura' : 'lwc';
        report[componentType] = (report[componentType] || 0) + 1;
      }
    } else {
      // Count all other XML files by their metadata type
      report[metadataType] = (report[metadataType] || 0) + 1;
    }
  }

  // Process code files
  for (const file of codeFiles) {
    const filePath = file.replace(/\\/g, '/');
    
    if (!pairedFileTracker.has(filePath)) {
      const extension = path.extname(filePath).slice(1);
      report[extension] = (report[extension] || 0) + 1;
    }
  }

  return report;
}