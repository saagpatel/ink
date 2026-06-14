import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import type { OllamaModel, OllamaStatus, WorkspaceSettings } from "../types";

const DENSITY_LABELS: Record<number, string> = {
	0: "Off",
	1: "Occasional",
	2: "Normal",
	3: "Frequent",
};

interface SettingsPanelProps {
	settings: WorkspaceSettings;
	ollamaEndpoint: string;
	onUpdateSetting: <K extends keyof WorkspaceSettings>(
		key: K,
		value: WorkspaceSettings[K],
	) => Promise<void>;
	onClose: () => void;
}

export function SettingsPanel({
	settings,
	ollamaEndpoint,
	onUpdateSetting,
	onClose,
}: SettingsPanelProps) {
	const [models, setModels] = useState<OllamaModel[]>([]);
	const [endpoint, setEndpoint] = useState(settings.ollamaEndpoint);

	useEffect(() => {
		const fetchModels = async () => {
			try {
				const status = await invoke<OllamaStatus>("check_ollama", {
					endpoint: ollamaEndpoint,
				});
				if (status.connected) {
					setModels(status.models);
				}
			} catch {
				// Ollama offline — models list stays empty
			}
		};
		fetchModels();
	}, [ollamaEndpoint]);

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
			<div className="w-96 rounded-lg border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
				<div className="mb-6 flex items-center justify-between">
					<h2 className="text-sm font-medium tracking-wide text-zinc-200">
						Settings
					</h2>
					<button
						type="button"
						onClick={onClose}
						className="text-zinc-500 transition-colors hover:text-zinc-300"
					>
						<svg
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<line x1="18" y1="6" x2="6" y2="18" />
							<line x1="6" y1="6" x2="18" y2="18" />
						</svg>
					</button>
				</div>

				<div className="space-y-5">
					{/* Annotation Density */}
					<div>
						<label className="mb-2 block text-xs text-zinc-500">
							Annotation Density:{" "}
							<span className="text-zinc-300">
								{DENSITY_LABELS[settings.annotationDensity]}
							</span>
						</label>
						<input
							type="range"
							min={0}
							max={3}
							step={1}
							value={settings.annotationDensity}
							onChange={(e) =>
								onUpdateSetting(
									"annotationDensity",
									Number(e.target.value) as 0 | 1 | 2 | 3,
								)
							}
							className="w-full accent-zinc-500"
						/>
						<div className="mt-1 flex justify-between text-[10px] text-zinc-600">
							<span>Off</span>
							<span>Occasional</span>
							<span>Normal</span>
							<span>Frequent</span>
						</div>
					</div>

					{/* Ollama Endpoint */}
					<div>
						<label className="mb-1.5 block text-xs text-zinc-500">
							Ollama Endpoint
						</label>
						<input
							type="text"
							value={endpoint}
							onChange={(e) => setEndpoint(e.target.value)}
							onBlur={() => onUpdateSetting("ollamaEndpoint", endpoint)}
							className="w-full rounded border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200 outline-none focus:border-zinc-600"
						/>
					</div>

					{/* Model */}
					<div>
						<label className="mb-1.5 block text-xs text-zinc-500">Model</label>
						{models.length > 0 ? (
							<select
								value={settings.ollamaModel}
								onChange={(e) => onUpdateSetting("ollamaModel", e.target.value)}
								className="w-full rounded border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200 outline-none focus:border-zinc-600"
							>
								{models.map((m) => (
									<option key={m.name} value={m.name}>
										{m.name}
									</option>
								))}
							</select>
						) : (
							<input
								type="text"
								value={settings.ollamaModel}
								onChange={(e) => onUpdateSetting("ollamaModel", e.target.value)}
								className="w-full rounded border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200 outline-none focus:border-zinc-600"
								placeholder="e.g. llama3.2:3b"
							/>
						)}
					</div>

					{/* Debounce */}
					<div>
						<label className="mb-1.5 block text-xs text-zinc-500">
							Debounce (ms)
						</label>
						<input
							type="number"
							min={500}
							max={10000}
							step={500}
							value={settings.debounceMs}
							onChange={(e) =>
								onUpdateSetting("debounceMs", Number(e.target.value))
							}
							className="w-full rounded border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200 outline-none focus:border-zinc-600"
						/>
					</div>
				</div>
			</div>
		</div>
	);
}
