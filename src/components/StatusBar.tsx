import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import type { OllamaStatus } from "../types";

interface StatusBarProps {
	ollamaEndpoint: string;
	ollamaModel: string;
	activeFile: string | null;
	fileContent: string | null;
	pendingCount: number;
	acceptedCount: number;
	lastLatencyMs: number | null;
	generating: boolean;
	onSettingsClick: () => void;
	onHistoryClick: () => void;
	onStatsClick: () => void;
	onSearchClick: () => void;
}

export function StatusBar({
	ollamaEndpoint,
	ollamaModel,
	activeFile,
	fileContent,
	pendingCount,
	acceptedCount,
	lastLatencyMs,
	generating,
	onSettingsClick,
	onHistoryClick,
	onStatsClick,
	onSearchClick,
}: StatusBarProps) {
	const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus | null>(null);

	useEffect(() => {
		const checkOllama = async () => {
			try {
				const status = await invoke<OllamaStatus>("check_ollama", {
					endpoint: ollamaEndpoint,
				});
				setOllamaStatus(status);
			} catch {
				setOllamaStatus({ connected: false, models: [] });
			}
		};

		checkOllama();
		const interval = setInterval(checkOllama, 5000);
		return () => clearInterval(interval);
	}, [ollamaEndpoint]);

	const wordCount =
		fileContent
			?.trim()
			.split(/\s+/)
			.filter((w) => w.length > 0).length ?? 0;

	const fileName = activeFile?.split("/").pop() ?? null;

	const hasModel =
		ollamaStatus?.connected &&
		ollamaStatus.models.some((m) => m.name.startsWith(ollamaModel));

	return (
		<div className="flex h-7 shrink-0 items-center justify-between border-t border-zinc-800 bg-zinc-950 px-3 font-mono text-xs text-zinc-500">
			<div className="flex items-center gap-4">
				{fileName && <span className="text-zinc-400">{fileName}</span>}
				{fileContent !== null && <span>{wordCount} words</span>}
				{(pendingCount > 0 || acceptedCount > 0) && (
					<span>
						{pendingCount > 0 && (
							<span className="text-amber-500/80">{pendingCount} pending</span>
						)}
						{pendingCount > 0 && acceptedCount > 0 && (
							<span className="text-zinc-700"> · </span>
						)}
						{acceptedCount > 0 && (
							<span className="text-emerald-500/70">
								{acceptedCount} accepted
							</span>
						)}
					</span>
				)}
			</div>
			<div className="flex items-center gap-3">
				{lastLatencyMs !== null && (
					<span className="text-zinc-600">{lastLatencyMs}ms</span>
				)}
				{ollamaStatus === null ? (
					<span>Ollama: checking...</span>
				) : ollamaStatus.connected ? (
					<span className="flex items-center gap-1.5 text-emerald-500">
						{generating && (
							<span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
						)}
						Ollama: connected
						{hasModel ? ` (${ollamaModel})` : " (model not found)"}
					</span>
				) : (
					<span className="text-red-400">Ollama: offline</span>
				)}
				{/* Search button */}
				<button
					type="button"
					onClick={onSearchClick}
					className="text-zinc-600 transition-colors hover:text-zinc-300"
					title="Search annotations (⌘⇧F)"
				>
					<svg
						width="12"
						height="12"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<circle cx="11" cy="11" r="8" />
						<line x1="21" y1="21" x2="16.65" y2="16.65" />
					</svg>
				</button>
				{/* Stats button */}
				<button
					type="button"
					onClick={onStatsClick}
					className="text-zinc-600 transition-colors hover:text-zinc-300"
					title="Annotation stats"
				>
					<svg
						width="12"
						height="12"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<line x1="18" y1="20" x2="18" y2="10" />
						<line x1="12" y1="20" x2="12" y2="4" />
						<line x1="6" y1="20" x2="6" y2="14" />
					</svg>
				</button>
				{/* History button */}
				<button
					type="button"
					onClick={onHistoryClick}
					className="text-zinc-600 transition-colors hover:text-zinc-300"
					title="Annotation history (⌘⇧H)"
				>
					<svg
						width="12"
						height="12"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<circle cx="12" cy="12" r="10" />
						<polyline points="12 6 12 12 16 14" />
					</svg>
				</button>
				{/* Settings button */}
				<button
					type="button"
					onClick={onSettingsClick}
					className="text-zinc-600 transition-colors hover:text-zinc-300"
					title="Settings (⌘,)"
				>
					<svg
						width="12"
						height="12"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<circle cx="12" cy="12" r="3" />
						<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
					</svg>
				</button>
			</div>
		</div>
	);
}
