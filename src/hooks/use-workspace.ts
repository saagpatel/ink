import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { useCallback, useState } from "react";
import { saveSetting, upsertFile } from "../lib/db";
import { wordCount } from "../lib/text-utils";
import type { FileNode } from "../types";

export function useWorkspace() {
	const [tree, setTree] = useState<FileNode[]>([]);
	const [workspacePath, setWorkspacePath] = useState<string | null>(null);
	const [activeFile, setActiveFile] = useState<string | null>(null);
	const [activeFileId, setActiveFileId] = useState<number | null>(null);
	const [fileContent, setFileContent] = useState<string | null>(null);
	const [editorContent, setEditorContent] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	const openWorkspace = useCallback(async () => {
		const selected = await open({ directory: true, multiple: false });
		if (!selected) return;

		const path = selected as string;
		setLoading(true);
		try {
			const nodes = await invoke<FileNode[]>("list_dir", { path });
			setTree(nodes);
			setWorkspacePath(path);
			setActiveFile(null);
			setActiveFileId(null);
			setFileContent(null);
			setEditorContent(null);
			await saveSetting("last_workspace", path);
		} finally {
			setLoading(false);
		}
	}, []);

	const openFile = useCallback(async (path: string) => {
		const content = await invoke<string>("read_file", { path });
		setActiveFile(path);
		setFileContent(content);
		setEditorContent(content);

		const name = path.split("/").pop() ?? path;
		const id = await upsertFile(path, name, wordCount(content));
		setActiveFileId(id);
	}, []);

	const saveFile = useCallback(
		async (content: string) => {
			if (!activeFile) return;
			await invoke("write_file", { path: activeFile, content });

			const name = activeFile.split("/").pop() ?? activeFile;
			const id = await upsertFile(activeFile, name, wordCount(content));
			setActiveFileId(id);
		},
		[activeFile],
	);

	const refreshTree = useCallback(async () => {
		if (!workspacePath) return;
		const nodes = await invoke<FileNode[]>("list_dir", {
			path: workspacePath,
		});
		setTree(nodes);
	}, [workspacePath]);

	return {
		tree,
		workspacePath,
		activeFile,
		activeFileId,
		fileContent,
		editorContent,
		setEditorContent,
		loading,
		openWorkspace,
		openFile,
		saveFile,
		refreshTree,
	};
}
