import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Detects if the current workspace is a Salesforce project
 * @returns boolean indicating if the current workspace is a Salesforce project
 */
export function isSalesforceProject(): boolean {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return false;
  }
  
  // Check each workspace folder for Salesforce project indicators
  for (const folder of workspaceFolders) {
    const folderPath = folder.uri.fsPath;
    
    // Method 1: Check for sfdx-project.json file (primary indicator)
    if (fs.existsSync(path.join(folderPath, 'sfdx-project.json'))) {
      return true;
    }
    
    // Method 2: Check for force-app directory structure
    if (fs.existsSync(path.join(folderPath, 'force-app', 'main', 'default'))) {
      return true;
    }
    
    // Method 3: Check for package.xml in a standard Salesforce project structure
    if (fs.existsSync(path.join(folderPath, 'src', 'package.xml'))) {
      return true;
    }
    
    // Method 4: Look for .forceignore file (common in SFDX projects)
    if (fs.existsSync(path.join(folderPath, '.forceignore'))) {
      return true;
    }
  }
  
  return false;
}

/**
 * Gets the root directory of the Salesforce project
 * @returns The path to the Salesforce project root, or undefined if not found
 */
export function getSalesforceProjectRoot(): string | undefined {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return undefined;
  }
  
  for (const folder of workspaceFolders) {
    const folderPath = folder.uri.fsPath;
    
    if (fs.existsSync(path.join(folderPath, 'sfdx-project.json')) || 
        fs.existsSync(path.join(folderPath, 'force-app', 'main', 'default')) || 
        fs.existsSync(path.join(folderPath, 'src', 'package.xml')) || 
        fs.existsSync(path.join(folderPath, '.forceignore'))) {
      return folderPath;
    }
  }
  
  return undefined;
}

/**
 * Gets the main source directory of the Salesforce project
 * @returns The path to the main source directory
 */
export function getSalesforceSourceDirectory(): string | undefined {
  const projectRoot = getSalesforceProjectRoot();
  
  if (!projectRoot) {
    return undefined;
  }
  
  // Check for structure by default (force-app/main/default)
  const sfdxSourcePath = path.join(projectRoot, 'force-app', 'main', 'default');
  if (fs.existsSync(sfdxSourcePath)) {
    return sfdxSourcePath;
  }
  
  // Check for traditional structure (src/)
  const traditionalSourcePath = path.join(projectRoot, 'src');
  if (fs.existsSync(traditionalSourcePath)) {
    return traditionalSourcePath;
  }
  
  return undefined;
}