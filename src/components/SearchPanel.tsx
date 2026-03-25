import { useCallback, useRef, useState } from "react";
import { type SearchResult, searchAnnotations } from "../lib/db";
import { getTypeConfigSync } from "../lib/type-registry";
import type { TypeConfig } from "../types";

interface SearchPanelProps {
	allTypes: TypeConfig[];
	onResultClick: (result: SearchResult) => void;
	onClose: () => void;
}

export function SearchPanel({
	allTypes,
	onResultClick,
	onClose,
}: SearchPanelProps) {
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<SearchResult[]>([]);
	const [searched, setSearched] = useState(false);
	const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
	const inputRef = useRef<HTMLInputElement>(null);

	const doSearch = useCallback(async (q: string) => {
		if (q.trim().length < 2) {
			setResults([]);
			setSearched(false);
			return;
		}
		const r = await searchAnnotations(q.trim());
		setResults(r);
		setSearched(true);
	}, []);

	const handleChange = (value: string) => {
		setQuery(value);
		clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => doSearch(value), 200);
	};

	// Auto-focus input on mount
	const setRef = useCallback((el: HTMLInputElement | null) => {
		if (el) {
			(inputRef as React.MutableRefObject<HTMLInputElement>).current = el;
			el.focus();
		}
	}, []);

	return (
		<div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-24 backdrop-blur-sm">
			<div className="w-[560px] rounded-lg border border-zinc-800 bg-zinc-950 shadow-2xl">
				{/* Search input */}
				<div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-3">
					<svg
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						className="shrink-0 text-zinc-500"
					>
						<circle cx="11" cy="11" r="8" />
						<line x1="21" y1="21" x2="16.65" y2="16.65" />
					</svg>
					<input
						ref={setRef}
						type="text"
						value={query}
						onChange={(e) => handleChange(e.target.value)}
						onKeyDown={(e) => e.key === "Escape" && onClose()}
						placeholder="Search annotations..."
						className="flex-1 bg-transparent text-sm text-zinc-200 outline-none placeholder:text-zinc-600"
					/>
					<button
						type="button"
						onClick={onClose}
						className="text-zinc-600 transition-colors hover:text-zinc-300"
					>
						<kbd className="rounded border border-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-500">
							esc
						</kbd>
					</button>
				</div>

				{/* Results */}
				<div className="max-h-96 overflow-y-auto">
					{results.length > 0 ? (
						results.map((r) => {
							const config = getTypeConfigSync(r.type, allTypes);
							return (
								<button
									key={`${r.id}-${r.filePath}`}
									type="button"
									onClick={() => onResultClick(r)}
									className="flex w-full flex-col gap-1 border-b border-zinc-800/50 px-4 py-3 text-left transition-colors hover:bg-zinc-900/50"
								>
									<div className="flex items-center gap-2">
										<span className="text-[10px] text-zinc-600">
											{r.fileName}
										</span>
										<span
											className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${config.badgeClass}`}
										>
											{config.label}
										</span>
									</div>
									<p className="text-xs leading-snug text-zinc-300">{r.body}</p>
									<p className="text-[10px] text-zinc-600 italic">
										&ldquo;{r.anchorText}&rdquo;
									</p>
								</button>
							);
						})
					) : searched ? (
						<p className="px-4 py-6 text-center text-sm text-zinc-600">
							No results for &ldquo;{query}&rdquo;
						</p>
					) : (
						<p className="px-4 py-6 text-center text-sm text-zinc-600">
							Type to search across all annotations
						</p>
					)}
				</div>
			</div>
		</div>
	);
}
