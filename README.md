# Salesforce Metadata Counter (sf-metadata-explorer)

VS Code extension for Salesforce developers that scans local project metadata in force-app and dataPack folders, visualizing component distribution in an interactive dashboard. Quickly analyze metadata types, counts, and structure to better understand your project's composition.

## Features (not implemented yet)

- Automatically detect Salesforce projects (SFDX or traditional)
- Count metadata components following specific counting rules
- Display total count in the status bar
- Generate detailed reports by metadata type
- Auto-refresh counts when files change

## Counting Rules

This extension follows these specific rules for counting Salesforce metadata components:

1. **Core Rule**: Each .xml file counts as one metadata component, with specific exceptions.

2. **Specific Counting Rules by Type**:
   - **Standard folders** (applications, layouts, labels): Each .xml = 1 metadata
   - **Code components** (classes, triggers): Each paired set (.cls/.trigger + meta.xml) = 1 metadata
   - **UI components**: Each aura/lwc folder = 1 metadata, regardless of files inside
   - **Objects**: Count EVERY .xml file in the objects hierarchy (fields, listViews, validationRules)
   - **Nested structures** (documents, reports): Count each .xml at any level

## Usage

1. Install the extension from the VSCode Marketplace
2. Open a Salesforce project (containing force-app or sfdx-project.json)
3. The extension will automatically detect if you're in a Salesforce project
4. View the current count in the status bar (if enabled)
5. Run commands:
   - `Count Salesforce Metadata Components`: Shows total count
   - `Generate Salesforce Metadata Report`: Creates a detailed breakdown by type

## Extension Settings

This extension contributes the following settings:

* `salesforceMetadataCounter.showInStatusBar`: Show metadata count in the status bar
* `salesforceMetadataCounter.autoRefreshCount`: Automatically refresh count when files change

## Requirements

- Visual Studio Code 1.60.0 or higher
- A Salesforce project (SFDX structure preferred)

## Building the Extension

1. Clone the repository
2. Run `npm install`
3. Run `npm run compile`
4. Press F5 to launch a new VS Code window with the extension loaded
5. Open a Salesforce project to test

## Contributing

Contributions are welcome! Please fork the repository and submit pull requests.

## License

This project is licensed under the MIT License - see the LICENSE file for details.