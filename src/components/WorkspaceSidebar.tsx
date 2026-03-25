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
							<summary className="flex cursor-pointer items-center gap-1.5 rounded px-2 py-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200">
								<span className="text-[10px] text-zinc-600 transition-transform group-open:rotate-90">
									&#9654;
								</span>
								{node.name}
							</summary>
							{node.children && (
								<div className="ml-3 border-l border-zinc-800 pl-1">
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
									? "bg-zinc-800 text-zinc-100"
									: "text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300"
							}`}
						>
							{node.name.endsWith(".md") && (
								<span className="text-[10px] text-blue-500/60">M</span>
							)}
							<span
								className={node.name.endsWith(".md") ? "text-zinc-300" : ""}
							>
								{node.name}
							</span>
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
		<aside className="flex w-60 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950">
			<div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
				<span className="font-mono text-xs tracking-widest text-zinc-500 uppercase">
					Files
				</span>
				<button
					type="button"
					onClick={onOpenWorkspace}
					className="rounded px-2 py-0.5 text-xs text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
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
						<div className="text-2xl text-zinc-700">&#128193;</div>
						<p className="text-xs text-zinc-600">Open a folder to start</p>
					</div>
				)}
			</div>
		</aside>
	);
}
