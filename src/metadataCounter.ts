import * as vscode from 'vscode';
import * as path from 'path';
import fastGlob from 'fast-glob';
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
  const xmlFiles = await fastGlob('**/*.xml', {
    cwd: sourceDir,
    absolute: true,
    ignore: ['**/package.xml'] // Exclude package.xml
  });

  // Get all code files that need special handling
  const codeFiles = await fastGlob('**/*.{cls,trigger}', {
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
      if (codeFiles.some((codeFile: string) => codeFile.replace(/\\/g, '/') === baseName)) {
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
  const xmlFiles = await fastGlob('**/*.xml', {
    cwd: sourceDir,
    absolute: true,
    ignore: ['**/package.xml']
  });

  // Get all code files
  const codeFiles = await fastGlob('**/*.{cls,trigger}', {
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
      
      if (codeFiles.some((codeFile: string) => codeFile.replace(/\\/g, '/') === baseName)) {
        pairedFileTracker.add(baseName);
        continue;
      }
    }

    // Handle component folders (aura, lwc)
    if (filePath.includes('/aura/') || filePath.includes('/lwc/')) {
      const componentDir = path.dirname(filePath);
      
      if (!pairedFileTracker.has(componentDir)) {
        pairedFileTracker.add(componentDir);
        
        // Use standardized Salesforce metadata type names
        const componentType = filePath.includes('/aura/') 
          ? 'AuraDefinitionBundle' 
          : 'LightningComponentBundle';
          
        report[componentType] = (report[componentType] || 0) + 1;
      }
    } else if (filePath.includes('/objects/')) {
      // Handle objects hierarchy with proper Salesforce metadata type names
      if (filePath.includes('/fields/')) {
        report['CustomField'] = (report['CustomField'] || 0) + 1;
      } else if (filePath.includes('/listViews/')) {
        report['ListView'] = (report['ListView'] || 0) + 1;
      } else if (filePath.includes('/validationRules/')) {
        report['ValidationRule'] = (report['ValidationRule'] || 0) + 1;
      } else if (filePath.includes('/recordTypes/')) {
        report['RecordType'] = (report['RecordType'] || 0) + 1;
      } else if (filePath.includes('/webLinks/')) {
        report['WebLink'] = (report['WebLink'] || 0) + 1;
      } else if (filePath.match(/\/objects\/[^/]+\/[^/]+\.object-meta\.xml$/)) {
        report['CustomObject'] = (report['CustomObject'] || 0) + 1;
      } else {
        // Other object components
        report[metadataType] = (report[metadataType] || 0) + 1;
      }
    } else {
      // Map common file extensions to proper Salesforce metadata type names
      let properMetadataType = metadataType;
      
      // Map common extensions to proper Salesforce metadata type names
      const typeMapping: Record<string, string> = {
        'cls': 'ApexClass',
        'trigger': 'ApexTrigger',
        'page': 'ApexPage',
        'component': 'ApexComponent',
        'app-meta': 'CustomApplication',
        'layout-meta': 'Layout',
        'permissionset-meta': 'PermissionSet',
        'profile-meta': 'Profile',
        'resource-meta': 'StaticResource',
        'tab-meta': 'CustomTab',
        'flow-meta': 'Flow',
        'globalValueSet-meta': 'GlobalValueSet',
        'queue-meta': 'Queue',
        'role-meta': 'Role',
        'labels-meta': 'CustomLabels'
      };
      
      // Extract the extension part for mapping
      const extPart = path.basename(filePath).split('.').slice(1).join('.');
      if (typeMapping[extPart]) {
        properMetadataType = typeMapping[extPart];
      } else if (path.basename(filePath).endsWith('-meta.xml')) {
        // Try to extract the type from the file name pattern
        const match = path.basename(filePath).match(/^.*\.([^.]+)-meta\.xml$/);
        if (match && match[1] && typeMapping[match[1]]) {
          properMetadataType = typeMapping[match[1]];
        }
      }
      
      // Count all other XML files by their metadata type
      report[properMetadataType] = (report[properMetadataType] || 0) + 1;
    }
  }

  // Process code files
  for (const file of codeFiles) {
    const filePath = file.replace(/\\/g, '/');
    
    if (!pairedFileTracker.has(filePath)) {
      const extension = path.extname(filePath).slice(1);
      
      // Map to standard Salesforce metadata types
      const typeMap: Record<string, string> = {
        'cls': 'ApexClass',
        'trigger': 'ApexTrigger'
      };
      
      const metadataType = typeMap[extension] || extension;
      report[metadataType] = (report[metadataType] || 0) + 1;
    }
  }

  return report;
}