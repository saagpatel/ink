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
			<div className="max-h-[80vh] w-[640px] overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
				<div className="mb-6 flex items-center justify-between">
					<h2 className="text-sm font-medium tracking-wide text-zinc-200">
						Annotation Stats
					</h2>
					<button
						type="button"
						onClick={onClose}
						className="text-zinc-500 transition-colors hover:text-zinc-300"
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
					<p className="text-sm text-zinc-500">Loading...</p>
				) : global.total === 0 ? (
					<p className="py-12 text-center font-['Caveat',_cursive] text-xl text-zinc-700">
						No annotations yet — start writing!
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
								color="text-zinc-400"
							/>
						</div>

						{/* By Type */}
						{byType.length > 0 && (
							<div>
								<h3 className="mb-3 text-xs text-zinc-500 uppercase">
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
													<span className="text-zinc-500">
														{t.total} ({Math.round(acceptPct)}% accepted)
													</span>
												</div>
												<div className="h-2 overflow-hidden rounded-full bg-zinc-800">
													<div
														className="h-full rounded-full bg-zinc-600 transition-all"
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
								<h3 className="mb-3 text-xs text-zinc-500 uppercase">
									Top Files
								</h3>
								<div className="space-y-1">
									{byFile.map((f) => (
										<div
											key={f.path}
											className="flex items-center justify-between rounded px-2 py-1.5 text-xs hover:bg-zinc-900"
										>
											<span className="truncate text-zinc-300">{f.name}</span>
											<span className="shrink-0 text-zinc-500">
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
	color = "text-zinc-100",
}: {
	label: string;
	value: string | number;
	color?: string;
}) {
	return (
		<div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
			<p className="mb-1 text-[10px] text-zinc-500 uppercase">{label}</p>
			<p className={`text-xl font-light ${color}`}>{value}</p>
		</div>
	);
}
