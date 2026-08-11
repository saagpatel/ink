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
			className={`w-full rounded px-3 py-2 text-left transition-colors hover:bg-desk-hover/50 ${dimmed ? "opacity-50" : ""}`}
		>
			<div className="mb-1 flex items-center justify-between">
				<span
					className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${config.badgeClass}`}
				>
					{config.label}
				</span>
				<span className="text-[10px] text-ink-faint">{time}</span>
			</div>
			<p className="mb-1 line-clamp-2 font-hand text-sm leading-snug text-pen">
				{annotation.body}
			</p>
			<p className="line-clamp-1 text-[10px] text-ink-faint italic">
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
			<summary className="flex cursor-pointer items-center justify-between px-3 py-1.5 text-xs text-ink-muted hover:text-ink">
				<span>{label}</span>
				<span className="rounded-full bg-desk-hover px-1.5 py-0.5 text-[10px] text-ink-muted">
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
		<div className="absolute inset-y-0 right-0 z-30 flex w-72 flex-col border-l border-line bg-desk/95 backdrop-blur-sm">
			<div className="flex items-center justify-between border-b border-line px-3 py-2">
				<span className="font-mono text-xs tracking-widest text-ink-faint uppercase">
					History
				</span>
				<button
					type="button"
					onClick={onClose}
					className="text-ink-faint transition-colors hover:text-ink"
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
						<p className="-rotate-1 font-hand text-lg text-ink-faint">
							No annotations yet
						</p>
						<p className="text-[10px] text-ink-faint">
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
