import { invoke } from "@tauri-apps/api/core";
import { useCallback, useRef, useState } from "react";
import { getRecentAnnotationTypes } from "../lib/db";
import { ANNOTATION_PROMPTS } from "../lib/prompt-templates";
import { getAnchorRange } from "../lib/text-utils";
import type { Annotation, AnnotationType, WorkspaceSettings } from "../types";

const ANNOTATION_TYPES: AnnotationType[] = [
	"clarify",
	"expand",
	"simplify",
	"question",
	"alternative",
];

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

	const pickAnnotationType = useCallback(
		async (fId: number): Promise<AnnotationType> => {
			const recent = await getRecentAnnotationTypes(fId, 3);

			// Don't repeat the same type 3x in a row
			if (recent.length >= 2 && recent[0] === recent[1]) {
				const avoid = recent[0];
				const candidates = ANNOTATION_TYPES.filter((t) => t !== avoid);
				const idx = typeIndexRef.current % candidates.length;
				typeIndexRef.current++;
				return candidates[idx];
			}

			const idx = typeIndexRef.current % ANNOTATION_TYPES.length;
			typeIndexRef.current++;
			return ANNOTATION_TYPES[idx];
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
			const prompt = ANNOTATION_PROMPTS[annotationType](anchorText, content);

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
