import * as vscode from "vscode";
import { generateCommitMessage } from "./ai";
import { doCommit, getDiff } from "./git";

let lastCommitMessage = "";

export function getLastCommitMessage(): string {
	return lastCommitMessage;
}

export function setLastCommitMessage(message: string): void {
	lastCommitMessage = message;
}

export async function showCommitInput(
	folder: vscode.WorkspaceFolder,
	extensionUri: vscode.Uri,
): Promise<void> {
	// Create and show a new webview
	const panel = vscode.window.createWebviewPanel(
		"commitInput", // Identifies the type of the webview
		"CommitMaster AI", // Title displayed in the editor
		vscode.ViewColumn.One, // Editor column to show the webview in
		{
			enableScripts: true,
			retainContextWhenHidden: true, // Keep the webview content when hidden
			localResourceRoots: [extensionUri],
		},
	);

	// Set the webview's HTML content
	panel.webview.html = getWebviewContent(panel.webview, extensionUri);

	// Handle messages from the webview
	panel.webview.onDidReceiveMessage(
		async (message) => {
			switch (message.type) {
				case "commit":
					try {
						await doCommit(folder, message.message);
						vscode.window.showInformationMessage(
							"Changes committed successfully!",
						);
					} catch (error) {
						if (error instanceof Error) {
							vscode.window.showErrorMessage(
								`Failed to commit: ${error.message}`,
							);
						}
					}
					break;
				case "saveMessage":
					setLastCommitMessage(message.message);
					break;
			}
		},
		undefined,
		[],
	);

	// Generate and set the commit message
	panel.webview.postMessage({ type: "loading" });

	try {
		// If we have a saved message, use it immediately
		if (lastCommitMessage) {
			panel.webview.postMessage({
				type: "setCommitMessage",
				value: lastCommitMessage,
			});
		}

		// Generate a new message if needed
		const diff = await getDiff(folder);
		if (diff) {
			const commitMessage = await generateCommitMessage(diff);
			setLastCommitMessage(commitMessage);
			panel.webview.postMessage({
				type: "setCommitMessage",
				value: commitMessage,
			});
		} else if (!lastCommitMessage) {
			panel.webview.postMessage({
				type: "setCommitMessage",
				value: "No changes detected to commit.",
			});
		}
	} catch (error) {
		if (error instanceof Error) {
			vscode.window.showErrorMessage(`Error: ${error.message}`);
		}
		panel.webview.postMessage({
			type: "setCommitMessage",
			value: "Failed to generate commit message.",
		});
	}
}

function getWebviewContent(
	webview: vscode.Webview,
	extensionUri: vscode.Uri,
): string {
	const htmlPath = vscode.Uri.joinPath(
		extensionUri,
		"src",
		"webview",
		"commit-panel.html",
	);
	const fileUri = webview.asWebviewUri(htmlPath);

	return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>CommitMaster AI</title>
        <style>
            body {
                padding: 20px;
                font-family: var(--vscode-font-family);
                color: var(--vscode-editor-foreground);
            }
            .container {
                display: flex;
                flex-direction: column;
                gap: 20px;
            }
            textarea {
                width: 100%;
                min-height: 200px;
                padding: 12px;
                border: 1px solid var(--vscode-input-border);
                background: var(--vscode-input-background);
                color: var(--vscode-input-foreground);
                resize: vertical;
                font-family: var(--vscode-editor-font-family);
                font-size: var(--vscode-editor-font-size);
            }
            button {
                padding: 8px 16px;
                background: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                border: none;
                cursor: pointer;
                font-size: 14px;
            }
            button:hover {
                background: var(--vscode-button-hoverBackground);
            }
            .loading {
                display: none;
                color: var(--vscode-descriptionForeground);
                font-style: italic;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h2>CommitMaster AI - Commit Message</h2>
            <div id="loading" class="loading">Generating commit message...</div>
            <textarea id="commitMessage" placeholder="Your commit message will appear here..."></textarea>
            <div>
                <button id="commitBtn">Commit Changes</button>
            </div>
        </div>
        <script>
            const vscode = acquireVsCodeApi();
            const textarea = document.getElementById('commitMessage');
            const commitBtn = document.getElementById('commitBtn');
            const loading = document.getElementById('loading');

            window.addEventListener('message', event => {
                const message = event.data;
                switch (message.type) {
                    case 'setCommitMessage':
                        textarea.value = message.value;
                        loading.style.display = 'none';
                        break;
                    case 'loading':
                        loading.style.display = 'block';
                        break;
                }
            });

            commitBtn.addEventListener('click', () => {
                const message = textarea.value.trim();
                if (message) {
                    vscode.postMessage({
                        type: 'commit',
                        message: message
                    });
                }
            });
            
            // Save commit message when it changes
            textarea.addEventListener('input', () => {
                vscode.postMessage({
                    type: 'saveMessage',
                    message: textarea.value
                });
            });
        </script>
    </body>
    </html>`;
}
