import type { FileNode } from "../types";

function FileTree({
	nodes,
	onSelect,
	activeFile,
}: {
	nodes: FileNode[];
	onSelect: (path: string) => void;
	activeFile: string | null;
}) {
	return (
		<ul className="space-y-0.5">
			{nodes.map((node) => (
				<li key={node.path}>
					{node.is_dir ? (
						<details className="group">
							<summary className="flex cursor-pointer items-center gap-1.5 rounded px-2 py-1 text-ink-muted hover:bg-desk-hover hover:text-ink">
								<span className="text-[10px] text-ink-faint transition-transform group-open:rotate-90">
									&#9654;
								</span>
								{node.name}
							</summary>
							{node.children && (
								<div className="ml-3 border-l border-line pl-1">
									<FileTree
										nodes={node.children}
										onSelect={onSelect}
										activeFile={activeFile}
									/>
								</div>
							)}
						</details>
					) : (
						<button
							type="button"
							onClick={() => onSelect(node.path)}
							className={`flex w-full items-center gap-1.5 rounded px-2 py-1 text-left transition-colors ${
								activeFile === node.path
									? "bg-desk-hover text-ink"
									: "text-ink-muted hover:bg-desk-hover/60 hover:text-ink"
							}`}
						>
							{node.name.endsWith(".md") && (
								<span className="text-[10px] text-pen/70">M</span>
							)}
							<span>{node.name}</span>
						</button>
					)}
				</li>
			))}
		</ul>
	);
}

interface WorkspaceSidebarProps {
	tree: FileNode[];
	activeFile: string | null;
	onSelect: (path: string) => void;
	onOpenWorkspace: () => void;
}

export function WorkspaceSidebar({
	tree,
	activeFile,
	onSelect,
	onOpenWorkspace,
}: WorkspaceSidebarProps) {
	return (
		<aside className="flex w-60 shrink-0 flex-col border-r border-line bg-desk">
			<div className="flex items-center justify-between border-b border-line px-3 py-2">
				<span className="font-mono text-xs tracking-widest text-ink-faint uppercase">
					Files
				</span>
				<button
					type="button"
					onClick={onOpenWorkspace}
					className="rounded px-2 py-0.5 text-xs text-ink-muted transition-colors hover:bg-desk-hover hover:text-ink"
					title="Open workspace folder"
				>
					Open
				</button>
			</div>
			<div className="flex-1 overflow-y-auto p-2 text-sm">
				{tree.length > 0 ? (
					<FileTree nodes={tree} onSelect={onSelect} activeFile={activeFile} />
				) : (
					<div className="flex flex-col items-center gap-3 pt-12 text-center">
						<p className="-rotate-1 font-hand text-base text-ink-faint">
							Open a folder to start
						</p>
					</div>
				)}
			</div>
		</aside>
	);
}
