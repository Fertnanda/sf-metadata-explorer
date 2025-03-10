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
 * Checks if a file is a code file (class, trigger)
 * @param filePath The path to the file
 * @returns boolean indicating if the file is a code file
 */
export function isCodeFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return ext === '.cls' || ext === '.trigger';
}

/**
 * Extracts the metadata type from a file path
 * @param filePath The path to the file
 * @returns string representing the metadata type
 */
export function getMetadataTypeFromPath(filePath: string): string {
  // Normalize path separators
  const normalizedPath = filePath.replace(/\\/g, '/');
  
  // Handle special cases first
  if (normalizedPath.includes('/aura/')) {
    return 'aura';
  }
  
  if (normalizedPath.includes('/lwc/')) {
    return 'lwc';
  }
  
  // Extract metadata type from structured paths
  const matches = normalizedPath.match(/\/force-app\/.*\/default\/([^/]+)\//) || 
                 normalizedPath.match(/\/src\/([^/]+)\//);
  
  if (matches && matches[1]) {
    return matches[1];
  }
  
  // Handle objects subfolders
  if (normalizedPath.includes('/objects/')) {
    if (normalizedPath.includes('/fields/')) {
      return 'fields';
    } else if (normalizedPath.includes('/listViews/')) {
      return 'listViews';
    } else if (normalizedPath.includes('/validationRules/')) {
      return 'validationRules';
    } else if (normalizedPath.includes('/recordTypes/')) {
      return 'recordTypes';
    } else if (normalizedPath.includes('/businessProcesses/')) {
      return 'businessProcesses';
    } else if (normalizedPath.includes('/compactLayouts/')) {
      return 'compactLayouts';
    } else if (normalizedPath.includes('/webLinks/')) {
      return 'webLinks';
    } else {
      return 'objects';
    }
  }
  
  // For code files with metadata
  if (normalizedPath.endsWith('-meta.xml')) {
    const extension = path.extname(normalizedPath.slice(0, -9)).slice(1);
    return extension;
  }
  
  // For other files, use file extension
  const extension = path.extname(normalizedPath).slice(1);
  return extension === 'xml' ? path.basename(normalizedPath, '.xml') : extension;
}

/**
 * Gets the component name from a path
 * @param filePath The path to the file
 * @returns The component name
 */
export function getComponentNameFromPath(filePath: string): string {
  const basename = path.basename(filePath);
  
  // For meta XML files, remove the -meta.xml part
  if (basename.endsWith('-meta.xml')) {
    return basename.slice(0, -9);
  }
  
  // For objects subdirectories
  if (filePath.includes('/objects/')) {
    // Extract object name
    const objectMatch = filePath.match(/\/objects\/([^/]+)\//);
    if (objectMatch) {
      const objectName = objectMatch[1];
      
      // For object subdirectories, combine object name with the component name
      if (filePath.includes('/fields/') || 
          filePath.includes('/listViews/') || 
          filePath.includes('/validationRules/') ||
          filePath.includes('/recordTypes/') ||
          filePath.includes('/businessProcesses/') ||
          filePath.includes('/compactLayouts/') ||
          filePath.includes('/webLinks/')) {
        
        const componentName = path.basename(basename, path.extname(basename));
        return `${objectName}.${componentName}`;
      }
      
      return objectName;
    }
  }
  
  // For LWC and Aura components, return the directory name
  if (filePath.includes('/lwc/') || filePath.includes('/aura/')) {
    const parts = filePath.split('/');
    const index = parts.findIndex(part => part === 'lwc' || part === 'aura');
    if (index >= 0 && index + 1 < parts.length) {
      return parts[index + 1];
    }
  }
  
  // Default: return file name without extension
  return path.basename(basename, path.extname(basename));
}