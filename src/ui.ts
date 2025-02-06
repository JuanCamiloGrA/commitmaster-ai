import * as vscode from "vscode";
import { getDiff } from "./git";
import { CommitPanel } from "./panel";

export async function showCommitInput(
	folder: vscode.WorkspaceFolder,
	extensionUri: vscode.Uri,
) {
	const diff = await getDiff(folder);
	if (!diff) {
		vscode.window.showInformationMessage("No changes to generate a commit.");
		return;
	}

	// Pasar el extensionUri directamente
	await CommitPanel.create(folder, extensionUri, diff);
}
