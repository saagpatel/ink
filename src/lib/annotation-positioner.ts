import type { EditorView } from "@codemirror/view";
import type { Annotation, PositionedAnnotation } from "../types";

const CARD_HEIGHT = 80;

export function computePositions(
	view: EditorView,
	annotations: Annotation[],
): PositionedAnnotation[] {
	const editorRect = view.dom.getBoundingClientRect();
	const scrollTop = view.scrollDOM.scrollTop;
	const viewportHeight = view.scrollDOM.clientHeight;

	const positioned: PositionedAnnotation[] = [];

	for (const annotation of annotations) {
		const coords = view.coordsAtPos(
			Math.min(annotation.startOffset, view.state.doc.length),
		);

		if (!coords) {
			positioned.push({ ...annotation, yPx: 0, visible: false });
			continue;
		}

		const relativeY = coords.top - editorRect.top + scrollTop;
		const inViewport =
			coords.top >= editorRect.top &&
			coords.top <= editorRect.top + viewportHeight;

		positioned.push({
			...annotation,
			yPx: relativeY,
			visible: inViewport,
		});
	}

	// Anti-collision: push overlapping cards down
	const visible = positioned.filter((p) => p.visible);
	visible.sort((a, b) => a.yPx - b.yPx);

	for (let i = 1; i < visible.length; i++) {
		const prev = visible[i - 1];
		const curr = visible[i];
		if (curr.yPx - prev.yPx < CARD_HEIGHT) {
			curr.yPx = prev.yPx + CARD_HEIGHT;
		}
	}

	return positioned;
}
