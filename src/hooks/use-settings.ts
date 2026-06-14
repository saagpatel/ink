import { useCallback, useEffect, useState } from "react";
import { loadSettings, saveSetting } from "../lib/db";
import type { WorkspaceSettings } from "../types";

const DEFAULTS: WorkspaceSettings = {
	ollamaEndpoint: "http://localhost:11434",
	ollamaModel: "llama3.2:3b",
	annotationDensity: 2,
	debounceMs: 2500,
	lastWorkspace: "",
};

export function useSettings() {
	const [settings, setSettings] = useState<WorkspaceSettings>(DEFAULTS);
	const [loaded, setLoaded] = useState(false);

	useEffect(() => {
		loadSettings()
			.then((s) => {
				setSettings(s);
				setLoaded(true);
			})
			.catch((err) => {
				console.error("Failed to load settings:", err);
				setLoaded(true);
			});
	}, []);

	const updateSetting = useCallback(
		async <K extends keyof WorkspaceSettings>(
			key: K,
			value: WorkspaceSettings[K],
		) => {
			const dbKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
			await saveSetting(dbKey, String(value));
			setSettings((prev) => ({ ...prev, [key]: value }));
		},
		[],
	);

	return { settings, loaded, updateSetting };
}
