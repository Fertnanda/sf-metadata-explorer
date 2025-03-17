import * as vscode from 'vscode';
import { isSalesforceProject } from './projectDetector';
import { countMetadata } from './metadataCounter';
import { MetadataViewProvider } from './views/metadataViewProvider';

let statusBarItem: vscode.StatusBarItem;
let metadataViewProvider: MetadataViewProvider;

export function activate(context: vscode.ExtensionContext) {
  console.log('Salesforce Metadata Counter is now active');

  // Always register the view provider
  metadataViewProvider = new MetadataViewProvider(context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      MetadataViewProvider.viewType,
      metadataViewProvider
    )
  );

  // Check if the current workspace is a Salesforce project
  const isSfProject = isSalesforceProject();
  if (!isSfProject) {
    console.log('Not a Salesforce project, extension features disabled');
    return;
  }
  
  // Create status bar item
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.text = '$(sync) Counting SF metadata...';
  statusBarItem.tooltip = 'Click to count Salesforce metadata components';
  statusBarItem.command = 'salesforce-metadata-counter.countMetadata';
  context.subscriptions.push(statusBarItem);

  // Register commands
  const countMetadataCommand = vscode.commands.registerCommand('salesforce-metadata-counter.countMetadata', async () => {
    statusBarItem.text = '$(sync~spin) Counting...';
    statusBarItem.show();
    
    try {
      const result = await countMetadata();
      statusBarItem.text = `$(database) SF Components: ${result.totalCount}`;
      vscode.window.showInformationMessage(`Found ${result.totalCount} Salesforce metadata components`);
      
      // Refresh the metadata view when counting is complete
      await metadataViewProvider.refresh();
    } catch (error) {
      statusBarItem.text = '$(error) Count failed';
      vscode.window.showErrorMessage(`Failed to count metadata: ${error}`);
    }
  });

  const generateReportCommand = vscode.commands.registerCommand('salesforce-metadata-counter.generateReport', async () => {
    try {
      const result = await countMetadata();
      const report = result.metadataByType;
      
      // Create and show output channel with the report
      const channel = vscode.window.createOutputChannel('Salesforce Metadata Report');
      channel.clear();
      channel.appendLine('# Salesforce Metadata Component Report');
      channel.appendLine('');
      
      let totalCount = 0;
      
      // Display counts by type
      Object.entries(report).forEach(([type, count]) => {
        channel.appendLine(`${type}: ${count}`);
        totalCount += count;
      });
      
      channel.appendLine('');
      channel.appendLine(`Total components: ${totalCount}`);
      channel.show();
      
      // Also refresh the sidebar view
      await metadataViewProvider.refresh();
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to generate report: ${error}`);
    }
  });

  const refreshMetadataViewCommand = vscode.commands.registerCommand('salesforce-metadata-counter.refreshMetadataView', async () => {
    await metadataViewProvider.refresh();
  });

  context.subscriptions.push(countMetadataCommand, generateReportCommand, refreshMetadataViewCommand);

  // Show the status bar item if the configuration option is enabled
  const showInStatusBar = vscode.workspace.getConfiguration('salesforceMetadataCounter').get('showInStatusBar', true);
  if (showInStatusBar) {
    statusBarItem.show();
    // Initial count
    vscode.commands.executeCommand('salesforce-metadata-counter.countMetadata');
  }

  // Set up file change watcher to update the count when files change
  const autoRefreshCount = vscode.workspace.getConfiguration('salesforceMetadataCounter').get('autoRefreshCount', true);
  if (autoRefreshCount) {
    const watcher = vscode.workspace.createFileSystemWatcher('**/force-app/**/*.{xml,cls,trigger,js,html}');
    
    const refreshCount = () => {
      // Debounce the counting to avoid excessive operations
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
      refreshTimeout = setTimeout(() => {
        vscode.commands.executeCommand('salesforce-metadata-counter.countMetadata');
      }, 2000);
    };

    let refreshTimeout: NodeJS.Timeout | null = null;
    
    // Watch for file changes, creations, and deletions
    watcher.onDidChange(refreshCount);
    watcher.onDidCreate(refreshCount);
    watcher.onDidDelete(refreshCount);
    
    context.subscriptions.push(watcher);
  }
}

export function deactivate() {
  if (statusBarItem) {
    statusBarItem.dispose();
  }
}