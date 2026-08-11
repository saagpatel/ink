import { useEffect, useState } from "react";
import {
	type FileStat,
	type GlobalStats,
	getGlobalStats,
	getStatsByFile,
	getStatsByType,
	type TypeStat,
} from "../lib/db";
import { getTypeConfigSync } from "../lib/type-registry";
import type { TypeConfig } from "../types";

interface StatsDashboardProps {
	allTypes: TypeConfig[];
	onClose: () => void;
}

export function StatsDashboard({ allTypes, onClose }: StatsDashboardProps) {
	const [global, setGlobal] = useState<GlobalStats | null>(null);
	const [byType, setByType] = useState<TypeStat[]>([]);
	const [byFile, setByFile] = useState<FileStat[]>([]);

	useEffect(() => {
		Promise.all([getGlobalStats(), getStatsByType(), getStatsByFile()]).then(
			([g, t, f]) => {
				setGlobal(g);
				setByType(t);
				setByFile(f);
			},
		);
	}, []);

	const acceptanceRate =
		global && global.total > 0
			? Math.round((global.accepted / global.total) * 100)
			: 0;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
			<div className="max-h-[80vh] w-[640px] overflow-y-auto rounded-lg border border-line bg-desk-raised p-6 shadow-2xl">
				<div className="mb-6 flex items-center justify-between">
					<h2 className="font-mono text-xs tracking-widest text-ink-muted uppercase">
						Annotation Stats
					</h2>
					<button
						type="button"
						onClick={onClose}
						className="text-ink-faint transition-colors hover:text-ink"
					>
						<svg
							width="16"
							height="16"
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

				{!global ? (
					<p className="text-sm text-ink-muted">Loading...</p>
				) : global.total === 0 ? (
					<p className="-rotate-1 py-12 text-center font-hand text-xl text-ink-faint">
						No annotations yet, start writing!
					</p>
				) : (
					<div className="space-y-8">
						{/* Overview */}
						<div className="grid grid-cols-4 gap-4">
							<StatCard label="Total" value={global.total} />
							<StatCard
								label="Acceptance"
								value={`${acceptanceRate}%`}
								color="text-emerald-400"
							/>
							<StatCard
								label="Pending"
								value={global.pending}
								color="text-amber-400"
							/>
							<StatCard
								label="Avg Latency"
								value={global.avgLatencyMs ? `${global.avgLatencyMs}ms` : "—"}
								color="text-ink-muted"
							/>
						</div>

						{/* By Type */}
						{byType.length > 0 && (
							<div>
								<h3 className="mb-3 font-mono text-xs tracking-widest text-ink-faint uppercase">
									By Type
								</h3>
								<div className="space-y-2">
									{byType.map((t) => {
										const config = getTypeConfigSync(t.type, allTypes);
										const pct =
											global.total > 0 ? (t.total / global.total) * 100 : 0;
										const acceptPct =
											t.total > 0 ? (t.accepted / t.total) * 100 : 0;
										return (
											<div key={t.type}>
												<div className="mb-1 flex items-center justify-between text-xs">
													<span
														className={
															config.badgeClass +
															" rounded px-1.5 py-0.5 text-[10px]"
														}
													>
														{config.label}
													</span>
													<span className="text-ink-faint">
														{t.total} ({Math.round(acceptPct)}% accepted)
													</span>
												</div>
												<div className="h-2 overflow-hidden rounded-full bg-desk-hover">
													<div
														className="h-full rounded-full bg-pen/70 transition-all"
														style={{
															width: `${pct}%`,
														}}
													/>
												</div>
											</div>
										);
									})}
								</div>
							</div>
						)}

						{/* By File */}
						{byFile.length > 0 && (
							<div>
								<h3 className="mb-3 font-mono text-xs tracking-widest text-ink-faint uppercase">
									Top Files
								</h3>
								<div className="space-y-1">
									{byFile.map((f) => (
										<div
											key={f.path}
											className="flex items-center justify-between rounded px-2 py-1.5 text-xs hover:bg-desk-hover/50"
										>
											<span className="truncate text-ink-muted">{f.name}</span>
											<span className="shrink-0 text-ink-faint">
												{f.total} annotations · {f.accepted} accepted
											</span>
										</div>
									))}
								</div>
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}

function StatCard({
	label,
	value,
	color = "text-ink",
}: {
	label: string;
	value: string | number;
	color?: string;
}) {
	return (
		<div className="rounded-lg border border-line bg-desk/60 p-3">
			<p className="mb-1 font-mono text-[10px] tracking-widest text-ink-faint uppercase">
				{label}
			</p>
			<p className={`text-xl font-light ${color}`}>{value}</p>
		</div>
	);
}
