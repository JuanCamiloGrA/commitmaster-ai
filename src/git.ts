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

	if (status.staged.length > 0) {
		// If there are staged changes, get the diff of only the staged changes.
		diff = await git.diff(["--staged"]);
	} else if (status.files.length > 0) {
		// If there are only unstaged changes, get the diff of all changes.
		diff = await git.diff();
	} else {
		return "";
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
