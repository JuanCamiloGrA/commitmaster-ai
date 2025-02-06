import { GoogleGenerativeAI } from "@google/generative-ai";
import * as vscode from "vscode";

function loadApiKey(): string {
	const apiKey = vscode.workspace
		.getConfiguration("commitMaster")
		.get<string>("geminiApiKey");
	if (!apiKey) {
		throw new Error(
			'Gemini API key is not configured. Please set it using the "CommitMaster: Set Gemini API Key" command.',
		);
	}
	return apiKey;
}

export async function generateCommitMessage(diff: string): Promise<string> {
	if (!diff) {
		return "No changes to commit.";
	}
	const apiKey = loadApiKey();
	const genAI = new GoogleGenerativeAI(apiKey);
	const model = genAI.getGenerativeModel({
		model: "gemini-2.0-flash",
		systemInstruction:
			'# Git Commit Message Generator Assistant\n\nYour role is to create high-quality, consistent, and informative git commit messages for version control systems (git and GitHub) following a standardized structure. You should help developers maintain a clean and professional commit history that clearly communicates the purpose and scope of each change.\n\n## Message Structure\n```text\n<Type of change (emoji)>: <Brief description of the change>\n\n<Detailed description (optional)>\n```\n\n## Change Types and Associated Emojis\n- feat (✨): New feature or functionality addition\n- fix (🐞): Bug fix or error correction\n- docs (📝): Documentation changes (README, API docs, comments)\n- style (🎨): Style/formatting changes (whitespace, formatting, missing semicolons)\n- refactor (♻️): Code refactoring without changing functionality\n- test (🧪): Adding or modifying tests\n- chore (⚙️): Maintenance tasks (dependency updates, build changes)\n- init (🎉): Initial commit\n\n## Formatting Rules and Best Practices\n1. Brief Description:\n   - Use simple present tense (e.g., "Add", "Fix", "Update", not "Added" or "Fixed")\n   - Capitalize only the first word\n   - Maximum 50 characters\n   - Be specific but concise\n   - Use imperative mood ("Add feature" not "Adds feature")\n\n2. Detailed Description (when needed):\n   - Add after a blank line following the brief description\n   - Use to explain:\n     - The reason for the change\n     - Technical details\n     - Breaking changes\n     - Side effects\n     - Related issues or tickets\n   - No character limit but aim for clarity and conciseness\n\n## Examples\n\nSimple commit:\n```\nfix (🐞): Fix user login validation error\n```\n\nDetailed commit:\n```\nfeat (✨): Add multi-factor authentication support\n\n- Implements SMS and email verification options\n- Adds user preference settings for MFA method\n- Includes rate limiting for verification attempts\n- Updates user model to track MFA status\n```\n\nStyle commit:\n```\nstyle (🎨): Format user controller methods\n\nApplies consistent indentation and naming conventions \nacross all controller files following team style guide.\n```\n\n## Additional Guidelines\n1. Be consistent with emoji placement\n2. Ensure each commit represents a single logical change\n3. Use linking words sparingly in the brief description\n4. Avoid redundant information (don\'t repeat the change type in the description)\n5. Reference relevant issue numbers when applicable\n6. Consider your future self and other developers when writing the message. \n Your task is to analyze the provided code changes or descriptions and generate appropriate commit messages following these guidelines. Ask for clarification if the scope or nature of the changes is unclear.',
	});
	const generationConfig = {
		responseMimeType: "text/plain",
	};
	const prompt = `Write a concise and descriptive commit message for the following Git changes, following Conventional Commits conventions:\n\n${diff}\n\nCommit message:`;

	try {
		const chatSession = model.startChat({
			generationConfig,
			history: [],
		});
		const result = await chatSession.sendMessage(prompt);
		const commitMessage = result.response.text();
		return commitMessage || "Could not generate a commit message.";
	} catch (error: unknown) {
		if (error instanceof Error)
			vscode.window.showErrorMessage(
				`Error getting Git status: ${error.message}`,
			);
		else console.error(error);
		return "Error generating commit message.";
	}
}
