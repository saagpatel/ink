import { marked } from "marked";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAnnotations } from "../hooks/use-annotations";
import { useEditor } from "../hooks/use-editor";
import { useOllama } from "../hooks/use-ollama";
import { computePositions } from "../lib/annotation-positioner";
import type {
	Annotation,
	PositionedAnnotation,
	WorkspaceSettings,
} from "../types";
import { AnnotationHistory } from "./AnnotationHistory";
import { AnnotationOverlay } from "./AnnotationOverlay";

marked.setOptions({
	gfm: true,
	breaks: true,
});

interface EditorPaneProps {
	content: string;
	filePath: string;
	fileId: number;
	settings: WorkspaceSettings;
	showHistory: boolean;
	onSave: (content: string) => void;
	onContentChange: (content: string) => void;
	onToggleSettings: () => void;
	onToggleHistory: () => void;
	onStatsChange: (stats: {
		pending: number;
		accepted: number;
		lastLatencyMs: number | null;
		generating: boolean;
	}) => void;
}

export function EditorPane({
	content,
	filePath,
	fileId,
	settings,
	showHistory,
	onSave,
	onContentChange,
	onToggleSettings,
	onToggleHistory,
	onStatsChange,
}: EditorPaneProps) {
	const editorContainerRef = useRef<HTMLDivElement>(null);
	const previewRef = useRef<HTMLDivElement>(null);
	const [previewHtml, setPreviewHtml] = useState("");
	const [positioned, setPositioned] = useState<PositionedAnnotation[]>([]);
	const debounceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

	const {
		annotations,
		allAnnotations,
		grouped,
		stats,
		lastLatencyMs,
		loadAnnotations,
		addAnnotation,
		acceptAnnotation,
		dismissAnnotation,
	} = useAnnotations();

	const updatePreview = useCallback((text: string) => {
		clearTimeout(debounceTimer.current);
		debounceTimer.current = setTimeout(() => {
			const html = marked.parse(text);
			if (typeof html === "string") {
				setPreviewHtml(html);
			}
		}, 100);
	}, []);

	// Accept/dismiss the first visible annotation (for keyboard shortcuts)
	const handleAcceptFirst = useCallback(() => {
		const firstVisible = positioned.find((a) => a.visible);
		if (firstVisible) handleAccept(firstVisible.id);
	}, [positioned]);

	const handleDismissFirst = useCallback(() => {
		const firstVisible = positioned.find((a) => a.visible);
		if (firstVisible) handleDismiss(firstVisible.id);
	}, [positioned]);

	const { viewRef, initEditor, getContent } = useEditor({
		onSave,
		onChange: (text) => {
			onContentChange(text);
			updatePreview(text);
			scheduleGeneration();
		},
		onAcceptAnnotation: handleAcceptFirst,
		onDismissAnnotation: handleDismissFirst,
		onToggleSettings,
		onToggleHistory,
	});

	const { generating, error, scheduleGeneration, cancelGeneration } = useOllama(
		{
			settings,
			fileId,
			pendingCount: annotations.length,
			getContent,
			getCursorOffset: () => {
				const view = viewRef.current;
				if (!view) return 0;
				return view.state.selection.main.head;
			},
			onAnnotationGenerated: addAnnotation,
		},
	);

	// Push stats up to App
	useEffect(() => {
		onStatsChange({
			pending: stats.pending,
			accepted: stats.accepted,
			lastLatencyMs,
			generating,
		});
	}, [stats, lastLatencyMs, generating, onStatsChange]);

	// Initialize editor and load annotations on file open
	useEffect(() => {
		if (editorContainerRef.current) {
			initEditor(editorContainerRef.current, content);
			updatePreview(content);
		}
		loadAnnotations(fileId);
		return () => {
			clearTimeout(debounceTimer.current);
			cancelGeneration();
		};
	}, [
		filePath,
		content,
		fileId,
		initEditor,
		updatePreview,
		loadAnnotations,
		cancelGeneration,
	]);

	// Recompute annotation positions
	const recomputePositions = useCallback(() => {
		const view = viewRef.current;
		if (!view || annotations.length === 0) {
			setPositioned([]);
			return;
		}
		setPositioned(computePositions(view, annotations));
	}, [viewRef, annotations]);

	useEffect(() => {
		recomputePositions();
	}, [recomputePositions]);

	// Scroll/resize → reposition + scroll sync
	useEffect(() => {
		const view = viewRef.current;
		if (!view) return;

		const scrollDom = view.scrollDOM;
		let rafId: number;

		const handleScrollOrResize = () => {
			cancelAnimationFrame(rafId);
			rafId = requestAnimationFrame(() => {
				recomputePositions();

				const preview = previewRef.current;
				if (preview && scrollDom) {
					const scrollRatio =
						scrollDom.scrollTop /
						(scrollDom.scrollHeight - scrollDom.clientHeight || 1);
					preview.scrollTop =
						scrollRatio * (preview.scrollHeight - preview.clientHeight);
				}
			});
		};

		scrollDom.addEventListener("scroll", handleScrollOrResize, {
			passive: true,
		});
		const resizeObserver = new ResizeObserver(handleScrollOrResize);
		resizeObserver.observe(view.dom);

		return () => {
			scrollDom.removeEventListener("scroll", handleScrollOrResize);
			resizeObserver.disconnect();
			cancelAnimationFrame(rafId);
		};
	}, [viewRef, filePath, recomputePositions]);

	// Accept: insert text at anchor
	const handleAccept = useCallback(
		async (id: number) => {
			const annotation = await acceptAnnotation(id);
			if (!annotation || !viewRef.current) return;

			const view = viewRef.current;
			const insertPos = Math.min(annotation.endOffset, view.state.doc.length);
			view.dispatch({
				changes: { from: insertPos, insert: ` ${annotation.body}` },
			});
			onContentChange(view.state.doc.toString());
			updatePreview(view.state.doc.toString());
		},
		[acceptAnnotation, viewRef, onContentChange, updatePreview],
	);

	const handleDismiss = useCallback(
		async (id: number) => {
			await dismissAnnotation(id);
		},
		[dismissAnnotation],
	);

	// History: click annotation → scroll to anchor
	const handleHistoryClick = useCallback(
		(annotation: Annotation) => {
			const view = viewRef.current;
			if (!view) return;
			const pos = Math.min(annotation.startOffset, view.state.doc.length);
			view.dispatch({
				selection: { anchor: pos },
				scrollIntoView: true,
			});
			view.focus();
		},
		[viewRef],
	);

	return (
		<div className="relative grid h-full grid-cols-2 divide-x divide-zinc-800">
			{/* Editor + annotation overlay */}
			<div className="relative min-h-0 overflow-hidden">
				<div ref={editorContainerRef} className="h-full" />
				<AnnotationOverlay
					annotations={positioned}
					totalAnnotations={allAnnotations.length}
					onAccept={handleAccept}
					onDismiss={handleDismiss}
				/>
				{generating && (
					<div className="absolute bottom-2 right-2 z-20 flex items-center gap-1.5 rounded bg-zinc-800/80 px-2 py-1 text-[10px] text-zinc-400">
						<span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
						generating...
					</div>
				)}
				{error && (
					<div className="absolute bottom-2 left-2 z-20 rounded border border-red-900/50 bg-red-950/80 px-3 py-1.5 text-[11px] text-red-400">
						{error}
					</div>
				)}
			</div>

			{/* Preview */}
			<div className="relative min-h-0">
				<div
					ref={previewRef}
					className="prose prose-invert prose-zinc h-full max-w-none overflow-y-auto p-6 prose-headings:text-zinc-100 prose-p:text-zinc-300 prose-a:text-blue-400 prose-strong:text-zinc-200 prose-code:text-emerald-400 prose-pre:bg-zinc-900 prose-blockquote:border-zinc-700 prose-blockquote:text-zinc-400"
					dangerouslySetInnerHTML={{ __html: previewHtml }}
				/>

				{/* History drawer overlays preview */}
				{showHistory && (
					<AnnotationHistory
						grouped={grouped}
						onAnnotationClick={handleHistoryClick}
						onClose={onToggleHistory}
					/>
				)}
			</div>
		</div>
	);
}
