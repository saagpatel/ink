import { getTypeConfigSync } from "../lib/type-registry";
import type { Annotation, TypeConfig } from "../types";

function HistoryItem({
	annotation,
	allTypes,
	dimmed,
	onClick,
}: {
	annotation: Annotation;
	allTypes: TypeConfig[];
	dimmed?: boolean;
	onClick: (a: Annotation) => void;
}) {
	const config = getTypeConfigSync(annotation.type, allTypes);
	const time = new Date(annotation.createdAt).toLocaleTimeString([], {
		hour: "2-digit",
		minute: "2-digit",
	});

	return (
		<button
			type="button"
			onClick={() => onClick(annotation)}
			className={`w-full rounded px-3 py-2 text-left transition-colors hover:bg-zinc-800/50 ${dimmed ? "opacity-50" : ""}`}
		>
			<div className="mb-1 flex items-center justify-between">
				<span
					className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${config.badgeClass}`}
				>
					{config.label}
				</span>
				<span className="text-[10px] text-zinc-600">{time}</span>
			</div>
			<p className="mb-1 line-clamp-2 text-xs leading-snug text-zinc-300">
				{annotation.body}
			</p>
			<p className="line-clamp-1 text-[10px] text-zinc-600 italic">
				&ldquo;{annotation.anchorText}&rdquo;
			</p>
		</button>
	);
}

function StatusGroup({
	label,
	count,
	annotations,
	allTypes,
	dimmed,
	onClick,
	defaultOpen,
}: {
	label: string;
	count: number;
	annotations: Annotation[];
	allTypes: TypeConfig[];
	dimmed?: boolean;
	onClick: (a: Annotation) => void;
	defaultOpen?: boolean;
}) {
	if (count === 0) return null;

	return (
		<details open={defaultOpen} className="group">
			<summary className="flex cursor-pointer items-center justify-between px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-300">
				<span>{label}</span>
				<span className="rounded-full bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">
					{count}
				</span>
			</summary>
			<div className="space-y-0.5 px-1 pb-2">
				{annotations.map((a) => (
					<HistoryItem
						key={a.id}
						annotation={a}
						allTypes={allTypes}
						dimmed={dimmed}
						onClick={onClick}
					/>
				))}
			</div>
		</details>
	);
}

interface AnnotationHistoryProps {
	grouped: {
		pending: Annotation[];
		accepted: Annotation[];
		dismissed: Annotation[];
	};
	allTypes: TypeConfig[];
	onAnnotationClick: (annotation: Annotation) => void;
	onClose: () => void;
}

export function AnnotationHistory({
	grouped,
	allTypes,
	onAnnotationClick,
	onClose,
}: AnnotationHistoryProps) {
	const total =
		grouped.pending.length + grouped.accepted.length + grouped.dismissed.length;

	return (
		<div className="absolute inset-y-0 right-0 z-30 flex w-72 flex-col border-l border-zinc-800 bg-zinc-950/95 backdrop-blur-sm">
			<div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
				<span className="font-mono text-xs tracking-widest text-zinc-500 uppercase">
					History
				</span>
				<button
					type="button"
					onClick={onClose}
					className="text-zinc-600 transition-colors hover:text-zinc-300"
				>
					<svg
						width="14"
						height="14"
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
			<div className="flex-1 overflow-y-auto">
				{total === 0 ? (
					<div className="flex flex-col items-center gap-2 pt-12 text-center">
						<p className="font-['Caveat',_cursive] text-lg text-zinc-700">
							No annotations yet
						</p>
						<p className="text-[10px] text-zinc-600">
							Start writing and they'll appear here
						</p>
					</div>
				) : (
					<div className="space-y-1 py-1">
						<StatusGroup
							label="Pending"
							count={grouped.pending.length}
							annotations={grouped.pending}
							allTypes={allTypes}
							onClick={onAnnotationClick}
							defaultOpen
						/>
						<StatusGroup
							label="Accepted"
							count={grouped.accepted.length}
							annotations={grouped.accepted}
							allTypes={allTypes}
							onClick={onAnnotationClick}
							defaultOpen
						/>
						<StatusGroup
							label="Dismissed"
							count={grouped.dismissed.length}
							annotations={grouped.dismissed}
							allTypes={allTypes}
							dimmed
							onClick={onAnnotationClick}
						/>
					</div>
				)}
			</div>
		</div>
	);
}
