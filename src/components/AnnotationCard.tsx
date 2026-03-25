import { memo } from "react";
import type { AnnotationType, PositionedAnnotation } from "../types";

const TYPE_COLORS: Record<
	AnnotationType,
	{ border: string; badge: string; text: string }
> = {
	clarify: {
		border: "border-l-blue-500",
		badge: "bg-blue-500/20 text-blue-400",
		text: "Clarify",
	},
	expand: {
		border: "border-l-emerald-500",
		badge: "bg-emerald-500/20 text-emerald-400",
		text: "Expand",
	},
	simplify: {
		border: "border-l-amber-500",
		badge: "bg-amber-500/20 text-amber-400",
		text: "Simplify",
	},
	question: {
		border: "border-l-purple-500",
		badge: "bg-purple-500/20 text-purple-400",
		text: "Question",
	},
	alternative: {
		border: "border-l-rose-500",
		badge: "bg-rose-500/20 text-rose-400",
		text: "Alternative",
	},
};

interface AnnotationCardProps {
	annotation: PositionedAnnotation;
	onAccept: (id: number) => void;
	onDismiss: (id: number) => void;
}

export const AnnotationCard = memo(function AnnotationCard({
	annotation,
	onAccept,
	onDismiss,
}: AnnotationCardProps) {
	const colors = TYPE_COLORS[annotation.type];

	return (
		<div
			className={`absolute right-2 w-56 rounded-r border-l-2 ${colors.border} bg-zinc-900/90 p-3 shadow-lg backdrop-blur-sm transition-opacity`}
			style={{ top: annotation.yPx, pointerEvents: "auto" }}
		>
			<div className="mb-1.5 flex items-center justify-between">
				<span
					className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${colors.badge}`}
				>
					{colors.text}
				</span>
				<div className="flex gap-1">
					<button
						type="button"
						onClick={() => onAccept(annotation.id)}
						className="rounded p-0.5 text-zinc-500 transition-colors hover:bg-emerald-500/20 hover:text-emerald-400"
						title="Accept suggestion"
					>
						<svg
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2.5"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<polyline points="20 6 9 17 4 12" />
						</svg>
					</button>
					<button
						type="button"
						onClick={() => onDismiss(annotation.id)}
						className="rounded p-0.5 text-zinc-500 transition-colors hover:bg-red-500/20 hover:text-red-400"
						title="Dismiss"
					>
						<svg
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2.5"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<line x1="18" y1="6" x2="6" y2="18" />
							<line x1="6" y1="6" x2="18" y2="18" />
						</svg>
					</button>
				</div>
			</div>
			<p className="font-['Caveat',_cursive] text-sm leading-snug text-zinc-300">
				{annotation.body}
			</p>
		</div>
	);
});
