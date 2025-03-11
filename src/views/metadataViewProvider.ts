import * as vscode from 'vscode';
import { generateMetadataReport } from '../metadataCounter';
import { isSalesforceProject } from '../projectDetector';

export class MetadataViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'salesforce-metadata-counter.metadataView';

  private _view?: vscode.WebviewView;
  private _extensionUri: vscode.Uri;
  private _metadataReport: Record<string, number> = {};
  private _isRefreshing = false;

  constructor(private readonly _context: vscode.ExtensionContext) {
    this._extensionUri = _context.extensionUri;
  }

  public async refresh(): Promise<void> {
    if (this._view && !this._isRefreshing) {
      this._isRefreshing = true;
      try {
        this._metadataReport = await generateMetadataReport();
        this._view.webview.html = this._getHtmlForWebview();
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to refresh metadata view: ${error}`);
      } finally {
        this._isRefreshing = false;
      }
    }
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void | Thenable<void> {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    webviewView.webview.html = this._getLoadingHtml();

    // Set up a refresh listener
    webviewView.webview.onDidReceiveMessage(message => {
      if (message.command === 'refresh') {
        this.refresh();
      }
    });

    // Initial load of metadata counts
    if (isSalesforceProject()) {
      this.refresh();
    } else {
      webviewView.webview.html = this._getNotSalesforceProjectHtml();
    }
  }

  private _getHtmlForWebview(): string {
    // Calculate totals
    let totalMembers = 0;
    const metadataTypes = Object.keys(this._metadataReport).length;

    Object.values(this._metadataReport).forEach(count => {
      totalMembers += count;
    });

    // Sort metadata types alphabetically
    const sortedMetadata = Object.entries(this._metadataReport)
      .sort(([a], [b]) => a.localeCompare(b));

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Salesforce Metadata Count</title>
      <style>
        body {
          font-family: var(--vscode-font-family);
          padding: 10px;
          color: var(--vscode-foreground);
        }
        .summary {
          margin-bottom: 20px;
          padding: 10px;
          background-color: var(--vscode-editor-background);
          border: 1px solid var(--vscode-panel-border);
          border-radius: 4px;
        }
        .summary h2 {
          margin-top: 0;
          font-size: 16px;
          font-weight: bold;
        }
        .metadata-list {
          margin-top: 10px;
        }
        .metadata-item {
          display: flex;
          justify-content: space-between;
          padding: 4px 0;
          border-bottom: 1px solid var(--vscode-panel-border);
        }
        .metadata-name {
          font-weight: normal;
        }
        .metadata-count {
          font-weight: bold;
        }
        .refresh-button {
          padding: 6px 12px;
          margin-top: 10px;
          background-color: var(--vscode-button-background);
          color: var(--vscode-button-foreground);
          border: none;
          border-radius: 2px;
          cursor: pointer;
        }
        .refresh-button:hover {
          background-color: var(--vscode-button-hoverBackground);
        }
        .details-section h2 {
          font-size: 16px;
          margin-top: 20px;
          margin-bottom: 10px;
        }
      </style>
    </head>
    <body>
      <div class="summary">
        <h2>Summary</h2>
        <div class="metadata-item">
          <span class="metadata-name">Total metadata types:</span>
          <span class="metadata-count">${metadataTypes}</span>
        </div>
        <div class="metadata-item">
          <span class="metadata-name">Total metadata members:</span>
          <span class="metadata-count">${totalMembers}</span>
        </div>
        <button class="refresh-button" id="refresh-button">Refresh</button>
      </div>
      
      <div class="details-section">
        <h2>Detailed Metadata Type Count</h2>
        <div class="metadata-list">
          ${sortedMetadata.map(([type, count]) => `
            <div class="metadata-item">
              <span class="metadata-name">${type}:</span>
              <span class="metadata-count">${count} ${count === 1 ? 'member' : 'members'}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <script>
        const vscode = acquireVsCodeApi();
        document.getElementById('refresh-button').addEventListener('click', () => {
          vscode.postMessage({
            command: 'refresh'
          });
        });
      </script>
    </body>
    </html>`;
  }

  private _getLoadingHtml(): string {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Salesforce Metadata Count</title>
      <style>
        body {
          font-family: var(--vscode-font-family);
          padding: 10px;
          color: var(--vscode-foreground);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
        }
        .loading {
          text-align: center;
        }
        .spinner {
          width: 40px;
          height: 40px;
          margin: 20px auto;
          border: 4px solid var(--vscode-editor-background);
          border-top: 4px solid var(--vscode-button-background);
          border-radius: 50%;
          animation: spin 1.5s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    </head>
    <body>
      <div class="loading">
        <div class="spinner"></div>
        <div>Loading Salesforce metadata count...</div>
      </div>
    </body>
    </html>`;
  }

  private _getNotSalesforceProjectHtml(): string {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Salesforce Metadata Count</title>
      <style>
        body {
          font-family: var(--vscode-font-family);
          padding: 20px;
          color: var(--vscode-foreground);
          text-align: center;
        }
        .message {
          margin-top: 20px;
        }
        .icon {
          font-size: 48px;
          margin-bottom: 20px;
        }
      </style>
    </head>
    <body>
      <div class="icon">⚠️</div>
      <div class="message">
        <h3>Not a Salesforce Project</h3>
        <p>Please open a Salesforce project to view metadata counts.</p>
      </div>
    </body>
    </html>`;
  }
}