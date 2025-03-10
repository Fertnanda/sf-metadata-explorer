import * as vscode from 'vscode'; 
import { isSalesforceProject } from './projectDetector'; 
import { countMetadata, generateMetadataReport } from './metadataCounter' 

let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
    console.log('Salesforce Metadata is now active');

    // Check if the current workspace is a Salesforce project
    const isSfProject = isSalesforceProject();
    if (!isSfProject) { 
        console.log('Not a Sa;esforce project, extension features disabled');
        return;
    }

    // Create status bas item (feature need to be reviewed, if this will be by default etc)
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = '$(sync) Counting SF metadata...';
    statusBarItem.tooltip = 'Click to count Salesforce metadata components';
    statusBarItem.command = 'salesforce-metadata-counter.countMetadata';
    context.subscriptions.push(statusBarItem);

    // Register commands
    const countMetadataCommand = vscode.command.registerCommand('salesforce-metadata-counter.countMetadata', async () => {
        statusBarItem.text = '$(sync~spin) Counting...'
        statusBarItem.show();

        try {
            const count = await countMetadata();
            statusBarItem.text = '$(database) SF Components: ${count}';
            vscode.window.showInformationMessage('Found ${count} Salesforce metadata components');
        } catch (error) {
            statusBarItem.text = '$(error) Count failed';
            vscode.window.showInformationMessage('Failed to count metadata: ${error}');
        }
    });

    const generateReportCommand = vscode.command.registerCommand('salesforce-metadata-counter.generateReport', async () => {
        try {
            const report = await generateMetadataReport();

            //Create and show output with the report 
            const channel = vscode.window.createOutputChannel('Salesforce Metadata Reoort');
            channel.clear()
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
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to generate report: ${error}`);
        }
    });

    context.subscriptions.push(countMetadataCommand, generateReportCommand);

    // Show the status bas item if the configuration option is enabled
    const showInStatusBar = vscode.workspace.getConfiguration('salesforceMetadataCounter')
    if (autoRefreshCount) {
        const watcher = vscode.workspace.createFileSystemWatcher('**/force-app/**/*.{xml,cls,trigger,js,html');

        count refreshCount = () => {
            // Debounce the counting to avoid escessive operations
            if (refreshTimeout) { 
                clearTimeout(refreshTimeout);
            }
            refreshTimeout =  setTimeout(() => {
                vscode.command.executeCommand('salesforce-metadata-counter.countMetadata');
            }, 2000);
        };
        
        let refreshTimeout: NodeJs.Timeout | null = null;

        // Watch for file change, creation, deletion
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