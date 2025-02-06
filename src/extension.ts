import * as vscode from "vscode";
import { showCommitInput } from "./ui";

export function activate(context: vscode.ExtensionContext) {
	const disposable = vscode.commands.registerCommand(
		"ai-commit-generator.generateCommit",
		async () => {
			const workspaceFolders = vscode.workspace.workspaceFolders;
			if (!workspaceFolders) {
				vscode.window.showErrorMessage("No workspace folder is open.");
				return;
			}
			await showCommitInput(workspaceFolders[0], context.extensionUri);
		},
	);

	const setApiKeyCmd = vscode.commands.registerCommand(
		"ai-commit-generator.setGeminiApiKey",
		async () => {
			const apiKey = await vscode.window.showInputBox({
				prompt: "Enter your Gemini API Key",
				ignoreFocusOut: true,
				password: true,
			});
			if (apiKey) {
				await vscode.workspace
					.getConfiguration("commitMaster")
					.update("geminiApiKey", apiKey, vscode.ConfigurationTarget.Global);
				vscode.window.showInformationMessage(
					"Gemini API Key updated successfully.",
				);
			}
		},
	);

	context.subscriptions.push(disposable, setApiKeyCmd);
}

export function deactivate() {}
