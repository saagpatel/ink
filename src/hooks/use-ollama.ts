import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { getRecentAnnotationTypes } from "../lib/db";
import { buildPrompt } from "../lib/prompt-templates";
import { getAnchorRange } from "../lib/text-utils";
import { getAllTypes } from "../lib/type-registry";
import type { Annotation, WorkspaceSettings } from "../types";

const DENSITY_MAX_PENDING: Record<number, number> = {
	0: 0,
	1: 1,
	2: 3,
	3: 5,
};

interface GenerateResponse {
	response: string;
	latency_ms: number;
}

interface UseOllamaOptions {
	settings: WorkspaceSettings;
	fileId: number | null;
	pendingCount: number;
	getContent: () => string;
	getCursorOffset: () => number;
	onAnnotationGenerated: (
		annotation: Omit<Annotation, "id" | "createdAt">,
	) => void;
}

export function useOllama({
	settings,
	fileId,
	pendingCount,
	getContent,
	getCursorOffset,
	onAnnotationGenerated,
}: UseOllamaOptions) {
	const [generating, setGenerating] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
	const typeIndexRef = useRef(0);
	const availableTypesRef = useRef<string[]>([
		"clarify",
		"expand",
		"simplify",
		"question",
		"alternative",
	]);

	// Load all available types (built-in + custom)
	useEffect(() => {
		getAllTypes().then((types) => {
			availableTypesRef.current = types.map((t) => t.name);
		});
	}, []);

	const pickAnnotationType = useCallback(
		async (fId: number): Promise<string> => {
			const types = availableTypesRef.current;
			const recent = await getRecentAnnotationTypes(fId, 3);

			if (recent.length >= 2 && recent[0] === recent[1]) {
				const avoid = recent[0];
				const candidates = types.filter((t) => t !== avoid);
				const idx = typeIndexRef.current % candidates.length;
				typeIndexRef.current++;
				return candidates[idx];
			}

			const idx = typeIndexRef.current % types.length;
			typeIndexRef.current++;
			return types[idx];
		},
		[],
	);

	const triggerGeneration = useCallback(async () => {
		if (!fileId) return;
		if (settings.annotationDensity === 0) return;

		const maxPending = DENSITY_MAX_PENDING[settings.annotationDensity] ?? 3;
		if (pendingCount >= maxPending) return;

		const content = getContent();
		if (content.trim().length < 20) return;

		const cursorOffset = getCursorOffset();
		const {
			start,
			end,
			text: anchorText,
		} = getAnchorRange(content, cursorOffset);

		if (anchorText.trim().length < 10) return;

		setGenerating(true);
		setError(null);
		try {
			const annotationType = await pickAnnotationType(fileId);
			const prompt = await buildPrompt(annotationType, anchorText, content);

			const result = await invoke<GenerateResponse>("generate_annotation", {
				endpoint: settings.ollamaEndpoint,
				model: settings.ollamaModel,
				prompt,
			});

			onAnnotationGenerated({
				fileId,
				type: annotationType,
				body: result.response.trim(),
				startOffset: start,
				endOffset: end,
				anchorText,
				status: "pending",
				modelUsed: settings.ollamaModel,
				latencyMs: result.latency_ms,
			});
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			console.error("Ollama generation failed:", msg);
			setError(msg);
			setTimeout(() => setError(null), 5000);
		} finally {
			setGenerating(false);
		}
	}, [
		fileId,
		settings,
		pendingCount,
		getContent,
		getCursorOffset,
		pickAnnotationType,
		onAnnotationGenerated,
	]);

	const scheduleGeneration = useCallback(() => {
		clearTimeout(debounceRef.current);
		if (settings.annotationDensity === 0) return;

		debounceRef.current = setTimeout(triggerGeneration, settings.debounceMs);
	}, [triggerGeneration, settings.debounceMs, settings.annotationDensity]);

	const cancelGeneration = useCallback(() => {
		clearTimeout(debounceRef.current);
	}, []);

	return {
		generating,
		error,
		scheduleGeneration,
		cancelGeneration,
	};
}
