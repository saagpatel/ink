import { memo } from "react";
import type { PositionedAnnotation, TypeConfig } from "../types";
import { AnnotationCard } from "./AnnotationCard";

interface AnnotationOverlayProps {
	annotations: PositionedAnnotation[];
	totalAnnotations: number;
	allTypes: TypeConfig[];
	onAccept: (id: number) => void;
	onDismiss: (id: number) => void;
}

export const AnnotationOverlay = memo(function AnnotationOverlay({
	annotations,
	totalAnnotations,
	allTypes,
	onAccept,
	onDismiss,
}: AnnotationOverlayProps) {
	const visible = annotations.filter((a) => a.visible);

	return (
		<div
			className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
			aria-label="Annotation overlay"
		>
			{visible.length > 0 ? (
				visible.map((annotation) => (
					<AnnotationCard
						key={annotation.id}
						annotation={annotation}
						allTypes={allTypes}
						onAccept={onAccept}
						onDismiss={onDismiss}
					/>
				))
			) : totalAnnotations === 0 ? (
				<div className="flex h-full items-start justify-end pr-6 pt-16">
					<p className="font-['Caveat',_cursive] text-sm text-zinc-700">
						Start writing — annotations will appear here
					</p>
				</div>
			) : null}
		</div>
	);
});
