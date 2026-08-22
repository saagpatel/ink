import { markdown } from "@codemirror/lang-markdown";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { basicSetup } from "codemirror";
import { useCallback, useEffect, useRef } from "react";

// Colors and the prose face come from the design tokens in src/index.css —
// CodeMirror inlines these rules, and var() keeps the single source of truth.
const inkTheme = EditorView.theme(
	{
		"&": {
			backgroundColor: "var(--color-desk)",
			color: "var(--color-ink)",
			height: "100%",
			fontSize: "15px",
		},
		// The manuscript column sits left so the right side stays a true margin
		// for annotation cards — the notes live where notes belong.
		".cm-content": {
			fontFamily: "var(--font-prose)",
			padding: "24px 0",
			caretColor: "var(--color-ink)",
			lineHeight: "1.7",
			maxWidth: "58ch",
		},
		".cm-cursor": {
			borderLeftColor: "var(--color-ink)",
		},
		".cm-activeLine": {
			backgroundColor: "#1a1610",
		},
		".cm-selectionBackground": {
			backgroundColor: "#3a3226 !important",
		},
		// A manuscript has no line numbers. Hidden via theme so the gutter
		// extensions stay inert rather than reconfigured.
		".cm-gutters": {
			display: "none",
		},
		".cm-line": {
			padding: "0 20px",
		},
		"&.cm-focused .cm-selectionBackground": {
			backgroundColor: "#3a3226 !important",
		},
		"&.cm-focused": {
			outline: "none",
		},
		".cm-scroller": {
			overflow: "auto",
		},
	},
	{ dark: true },
);

interface UseEditorOptions {
	onSave?: (content: string) => void;
	onChange?: (content: string) => void;
	onAcceptAnnotation?: () => void;
	onDismissAnnotation?: () => void;
	onToggleSettings?: () => void;
	onToggleHistory?: () => void;
	onToggleSearch?: () => void;
}

export function useEditor({
	onSave,
	onChange,
	onAcceptAnnotation,
	onDismissAnnotation,
	onToggleSettings,
	onToggleHistory,
	onToggleSearch,
}: UseEditorOptions = {}) {
	const viewRef = useRef<EditorView | null>(null);
	const containerRef = useRef<HTMLDivElement | null>(null);
	const onSaveRef = useRef(onSave);
	const onChangeRef = useRef(onChange);
	const onAcceptRef = useRef(onAcceptAnnotation);
	const onDismissRef = useRef(onDismissAnnotation);
	const onSettingsRef = useRef(onToggleSettings);
	const onHistoryRef = useRef(onToggleHistory);
	const onSearchRef = useRef(onToggleSearch);

	onSaveRef.current = onSave;
	onChangeRef.current = onChange;
	onAcceptRef.current = onAcceptAnnotation;
	onDismissRef.current = onDismissAnnotation;
	onSettingsRef.current = onToggleSettings;
	onHistoryRef.current = onToggleHistory;
	onSearchRef.current = onToggleSearch;

	const initEditor = useCallback(
		(container: HTMLDivElement, content: string) => {
			if (viewRef.current) {
				viewRef.current.destroy();
			}

			const appKeymap = keymap.of([
				{
					key: "Mod-s",
					run: (view) => {
						onSaveRef.current?.(view.state.doc.toString());
						return true;
					},
				},
				{
					key: "Mod-Enter",
					run: () => {
						onAcceptRef.current?.();
						return true;
					},
				},
				{
					key: "Alt-d",
					run: () => {
						onDismissRef.current?.();
						return true;
					},
				},
				{
					key: "Mod-,",
					run: () => {
						onSettingsRef.current?.();
						return true;
					},
				},
				{
					key: "Mod-Shift-h",
					run: () => {
						onHistoryRef.current?.();
						return true;
					},
				},
				{
					key: "Mod-Shift-f",
					run: () => {
						onSearchRef.current?.();
						return true;
					},
				},
			]);

			const changeListener = EditorView.updateListener.of((update) => {
				if (update.docChanged) {
					onChangeRef.current?.(update.state.doc.toString());
				}
			});

			const state = EditorState.create({
				doc: content,
				extensions: [
					basicSetup,
					markdown(),
					inkTheme,
					appKeymap,
					changeListener,
					EditorView.lineWrapping,
				],
			});

			const view = new EditorView({ state, parent: container });
			viewRef.current = view;
			containerRef.current = container;
		},
		[],
	);

	const getContent = useCallback((): string => {
		return viewRef.current?.state.doc.toString() ?? "";
	}, []);

	useEffect(() => {
		return () => {
			viewRef.current?.destroy();
			viewRef.current = null;
		};
	}, []);

	return {
		viewRef,
		initEditor,
		getContent,
	};
}
