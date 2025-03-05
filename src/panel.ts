import * as vscode from "vscode";
import { generateCommitMessage } from "./ai";
import { doCommit } from "./git";

export class CommitPanel {
	public static currentPanel: CommitPanel | undefined;
	private readonly _panel: vscode.WebviewPanel;
	private _disposables: vscode.Disposable[] = [];
	private _folder: vscode.WorkspaceFolder;

	private constructor(
		panel: vscode.WebviewPanel,
		folder: vscode.WorkspaceFolder,
		extensionUri: vscode.Uri,
	) {
		this._panel = panel;
		this._folder = folder;

		this._panel.webview.html = this._getWebviewContent(
			this._panel.webview,
			extensionUri,
		);

		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

		this._panel.webview.onDidReceiveMessage(
			async (message) => {
				switch (message.type) {
					case "commit":
						try {
							await doCommit(this._folder, message.message);
							vscode.window.showInformationMessage("Commit successful");
							this._panel.dispose();
						} catch (error) {
							vscode.window.showErrorMessage("Error creating commit");
							console.error(error);
						}
						break;
				}
			},
			null,
			this._disposables,
		);
	}

	public static async create(
		folder: vscode.WorkspaceFolder,
		extensionUri: vscode.Uri,
		diff: string,
	) {
		const column = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;

		if (CommitPanel.currentPanel) {
			CommitPanel.currentPanel._panel.reveal(column);
		} else {
			const panel = vscode.window.createWebviewPanel(
				"commitPanel",
				"CommitMaster AI",
				column || vscode.ViewColumn.One,
				{
					enableScripts: true,
					localResourceRoots: [vscode.Uri.joinPath(extensionUri, "webview")],
				},
			);

			CommitPanel.currentPanel = new CommitPanel(panel, folder, extensionUri);
		}

		// Mostrar loading
		CommitPanel.currentPanel._panel.webview.postMessage({ type: "loading" });

		// Generar y mostrar el mensaje
		const commitMessage = await generateCommitMessage(diff);
		CommitPanel.currentPanel._panel.webview.postMessage({
			type: "setCommitMessage",
			value: commitMessage,
		});

		return CommitPanel.currentPanel;
	}

	private _getWebviewContent(
		webview: vscode.Webview,
		extensionUri: vscode.Uri,
	): string {
		const htmlPath = vscode.Uri.joinPath(
			extensionUri,
			"src",
			"webview",
			"commit-panel.html",
		);
		// biome-ignore lint/style/useNodejsImportProtocol: <explanation>
		const htmlContent = require("fs").readFileSync(htmlPath.fsPath, "utf8");
		return htmlContent;
	}

	public dispose() {
		CommitPanel.currentPanel = undefined;
		this._panel.dispose();
		while (this._disposables.length) {
			const disposable = this._disposables.pop();
			if (disposable) {
				disposable.dispose();
			}
		}
	}
}
