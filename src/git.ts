import { type SimpleGit, simpleGit } from "simple-git";
import type * as vscode from "vscode";

async function getGitInstance(
	folder: vscode.WorkspaceFolder,
): Promise<SimpleGit | null> {
	const git = simpleGit(folder.uri.fsPath);
	const isGitRepo = await git.checkIsRepo();
	if (!isGitRepo) {
		return null;
	}

	// Get the root directory of the git repository
	const rootDir = await git.revparse(["--show-toplevel"]);
	return simpleGit(rootDir);
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

	try {
		// Check status to see if we need to stage files
		const status = await git.status();

		// If nothing is staged but there are modified files, stage them
		if (
			status.staged.length === 0 &&
			(status.modified.length > 0 || status.not_added.length > 0)
		) {
			// Use git add with full paths to make sure we catch files in different directories
			const filesToAdd = [...status.modified, ...status.not_added];

			// Either add all modified files at once, or add them individually
			if (filesToAdd.length > 0) {
				await git.add(filesToAdd.length > 50 ? ["-A"] : filesToAdd);
				console.log(`Added ${filesToAdd.length} files to staging area`);
			}
		}

		// Get updated status after staging
		const updatedStatus = await git.status();

		// Only commit if there's something to commit
		if (updatedStatus.staged.length > 0) {
			await git.commit(message);
			console.log("Changes committed successfully");
		} else {
			console.log("No changes to commit", updatedStatus);
			throw new Error(
				"No changes to commit. Make sure you have modified files in the repository.",
			);
		}
	} catch (error) {
		console.error("Error during commit process:", error);
		throw error;
	}
}
