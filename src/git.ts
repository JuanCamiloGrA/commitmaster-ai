import { type SimpleGit, simpleGit } from "simple-git";
import type * as vscode from "vscode";

async function getGitInstance(
	folder: vscode.WorkspaceFolder,
): Promise<SimpleGit | null> {
	const isGitRepo = await simpleGit(folder.uri.fsPath).checkIsRepo();
	if (!isGitRepo) {
		return null;
	}
	return simpleGit(folder.uri.fsPath);
}

export async function getDiff(folder: vscode.WorkspaceFolder): Promise<string> {
	const git: SimpleGit | null = await getGitInstance(folder);
	if (!git) {
		return "";
	}

	const status = await git.status();
	let diff = "";

	// First check staged changes
	if (status.staged.length > 0) {
		diff = await git.diff(["--staged"]);
	}
	// If no staged changes, get all modified files
	else if (status.modified.length > 0 || status.not_added.length > 0) {
		diff = await git.diff();
	}

	return diff;
}

export async function doCommit(
	folder: vscode.WorkspaceFolder,
	message: string,
): Promise<void> {
	const git: SimpleGit | null = await getGitInstance(folder);
	if (!git) {
		return;
	}
	await git.commit(message);
}
