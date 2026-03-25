import { useCallback, useState } from "react";
import { EditorPane } from "./components/EditorPane";
import { SettingsPanel } from "./components/SettingsPanel";
import { StatusBar } from "./components/StatusBar";
import { WorkspaceSidebar } from "./components/WorkspaceSidebar";
import { useSettings } from "./hooks/use-settings";
import { useWorkspace } from "./hooks/use-workspace";

export default function App() {
	const {
		tree,
		workspacePath,
		activeFile,
		activeFileId,
		fileContent,
		editorContent,
		setEditorContent,
		openWorkspace,
		openFile,
		saveFile,
	} = useWorkspace();
	const { settings, updateSetting } = useSettings();
	const [showSettings, setShowSettings] = useState(false);
	const [showHistory, setShowHistory] = useState(false);
	const [editorStats, setEditorStats] = useState({
		pending: 0,
		accepted: 0,
		lastLatencyMs: null as number | null,
		generating: false,
	});

	const toggleSettings = useCallback(() => setShowSettings((v) => !v), []);
	const toggleHistory = useCallback(() => setShowHistory((v) => !v), []);

	return (
		<div className="flex h-screen flex-col bg-zinc-950 text-zinc-100">
			<div className="flex min-h-0 flex-1">
				<WorkspaceSidebar
					tree={tree}
					activeFile={activeFile}
					onSelect={openFile}
					onOpenWorkspace={openWorkspace}
				/>

				<main className="flex flex-1 flex-col">
					{activeFile && fileContent !== null && activeFileId !== null ? (
						<EditorPane
							key={activeFile}
							content={fileContent}
							filePath={activeFile}
							fileId={activeFileId}
							settings={settings}
							showHistory={showHistory}
							onSave={saveFile}
							onContentChange={setEditorContent}
							onToggleSettings={toggleSettings}
							onToggleHistory={toggleHistory}
							onStatsChange={setEditorStats}
						/>
					) : (
						<div className="flex flex-1 items-center justify-center">
							<p className="font-['Caveat',_cursive] text-3xl font-light text-zinc-700">
								{workspacePath
									? "Select a file to start writing"
									: "Open a workspace to begin"}
							</p>
						</div>
					)}
				</main>
			</div>

			<StatusBar
				ollamaEndpoint={settings.ollamaEndpoint}
				ollamaModel={settings.ollamaModel}
				activeFile={activeFile}
				fileContent={editorContent}
				pendingCount={editorStats.pending}
				acceptedCount={editorStats.accepted}
				lastLatencyMs={editorStats.lastLatencyMs}
				generating={editorStats.generating}
				onSettingsClick={toggleSettings}
				onHistoryClick={toggleHistory}
			/>

			{showSettings && (
				<SettingsPanel
					settings={settings}
					ollamaEndpoint={settings.ollamaEndpoint}
					onUpdateSetting={updateSetting}
					onClose={() => setShowSettings(false)}
				/>
			)}
		</div>
	);
}
