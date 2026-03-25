import Database from "@tauri-apps/plugin-sql";
import type {
	Annotation,
	AnnotationStatus,
	AnnotationType,
	CustomAnnotationType,
	WorkspaceSettings,
} from "../types";

let db: Database | null = null;

export async function getDb(): Promise<Database> {
	if (!db) {
		db = await Database.load("sqlite:ink.db");
	}
	return db;
}

export async function loadSettings(): Promise<WorkspaceSettings> {
	const database = await getDb();
	const rows = await database.select<{ key: string; value: string }[]>(
		"SELECT key, value FROM settings",
	);

	const map = new Map(rows.map((r) => [r.key, r.value]));

	return {
		ollamaEndpoint: map.get("ollama_endpoint") ?? "http://localhost:11434",
		ollamaModel: map.get("ollama_model") ?? "llama3.2:3b",
		annotationDensity: (Number(map.get("annotation_density")) || 2) as
			| 0
			| 1
			| 2
			| 3,
		debounceMs: Number(map.get("debounce_ms")) || 2500,
		lastWorkspace: map.get("last_workspace") ?? "",
	};
}

export async function saveSetting(key: string, value: string): Promise<void> {
	const database = await getDb();
	await database.execute(
		"INSERT OR REPLACE INTO settings (key, value) VALUES ($1, $2)",
		[key, value],
	);
}

export async function upsertFile(
	path: string,
	name: string,
	wordCount: number,
): Promise<number> {
	const database = await getDb();
	await database.execute(
		`INSERT INTO files (path, name, word_count, last_opened, updated_at)
		 VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
		 ON CONFLICT(path) DO UPDATE SET
		   word_count = $3,
		   last_opened = CURRENT_TIMESTAMP,
		   updated_at = CURRENT_TIMESTAMP`,
		[path, name, wordCount],
	);
	const rows = await database.select<{ id: number }[]>(
		"SELECT id FROM files WHERE path = $1",
		[path],
	);
	return rows[0].id;
}

// --- Annotation CRUD ---

interface AnnotationRow {
	id: number;
	file_id: number;
	type: AnnotationType;
	body: string;
	start_offset: number;
	end_offset: number;
	anchor_text: string;
	status: AnnotationStatus;
	model_used: string;
	latency_ms: number | null;
	created_at: string;
}

function rowToAnnotation(row: AnnotationRow): Annotation {
	return {
		id: row.id,
		fileId: row.file_id,
		type: row.type,
		body: row.body,
		startOffset: row.start_offset,
		endOffset: row.end_offset,
		anchorText: row.anchor_text,
		status: row.status,
		modelUsed: row.model_used,
		latencyMs: row.latency_ms,
		createdAt: row.created_at,
	};
}

export async function insertAnnotation(
	annotation: Omit<Annotation, "id" | "createdAt">,
): Promise<number> {
	const database = await getDb();
	const result = await database.execute(
		`INSERT INTO annotations (file_id, type, body, start_offset, end_offset, anchor_text, status, model_used, latency_ms)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
		[
			annotation.fileId,
			annotation.type,
			annotation.body,
			annotation.startOffset,
			annotation.endOffset,
			annotation.anchorText,
			annotation.status,
			annotation.modelUsed,
			annotation.latencyMs,
		],
	);
	return result.lastInsertId ?? 0;
}

export async function updateAnnotationStatus(
	id: number,
	status: AnnotationStatus,
): Promise<void> {
	const database = await getDb();
	await database.execute(
		"UPDATE annotations SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
		[status, id],
	);
}

export async function getAnnotationsForFile(
	fileId: number,
): Promise<Annotation[]> {
	const database = await getDb();
	const rows = await database.select<AnnotationRow[]>(
		"SELECT * FROM annotations WHERE file_id = $1 ORDER BY created_at DESC",
		[fileId],
	);
	return rows.map(rowToAnnotation);
}

export async function getRecentAnnotationTypes(
	fileId: number,
	limit: number,
): Promise<AnnotationType[]> {
	const database = await getDb();
	const rows = await database.select<{ type: AnnotationType }[]>(
		"SELECT type FROM annotations WHERE file_id = $1 ORDER BY created_at DESC LIMIT $2",
		[fileId, limit],
	);
	return rows.map((r) => r.type);
}

export interface AnnotationStats {
	pending: number;
	accepted: number;
	dismissed: number;
}

export async function getAnnotationStats(
	fileId: number,
): Promise<AnnotationStats> {
	const database = await getDb();
	const rows = await database.select<
		{ status: AnnotationStatus; count: number }[]
	>(
		"SELECT status, COUNT(*) as count FROM annotations WHERE file_id = $1 GROUP BY status",
		[fileId],
	);
	const stats: AnnotationStats = { pending: 0, accepted: 0, dismissed: 0 };
	for (const row of rows) {
		stats[row.status] = row.count;
	}
	return stats;
}

// --- Custom Annotation Types ---

export async function getCustomTypes(): Promise<CustomAnnotationType[]> {
	const database = await getDb();
	return database.select<CustomAnnotationType[]>(
		"SELECT * FROM custom_annotation_types ORDER BY name",
	);
}

export async function insertCustomType(
	type: Omit<CustomAnnotationType, "id">,
): Promise<number> {
	const database = await getDb();
	const result = await database.execute(
		"INSERT INTO custom_annotation_types (name, label, color, prompt) VALUES ($1, $2, $3, $4)",
		[type.name, type.label, type.color, type.prompt],
	);
	return result.lastInsertId ?? 0;
}

export async function updateCustomType(
	id: number,
	type: Omit<CustomAnnotationType, "id">,
): Promise<void> {
	const database = await getDb();
	await database.execute(
		"UPDATE custom_annotation_types SET name=$1, label=$2, color=$3, prompt=$4 WHERE id=$5",
		[type.name, type.label, type.color, type.prompt, id],
	);
}

export async function deleteCustomType(id: number): Promise<void> {
	const database = await getDb();
	await database.execute("DELETE FROM custom_annotation_types WHERE id = $1", [
		id,
	]);
}

// --- Prompt Overrides ---

export async function loadPromptOverride(
	typeName: string,
): Promise<string | null> {
	const database = await getDb();
	const rows = await database.select<{ value: string }[]>(
		"SELECT value FROM settings WHERE key = $1",
		[`prompt_override_${typeName}`],
	);
	return rows.length > 0 ? rows[0].value : null;
}

export async function savePromptOverride(
	typeName: string,
	prompt: string,
): Promise<void> {
	await saveSetting(`prompt_override_${typeName}`, prompt);
}

export async function deletePromptOverride(typeName: string): Promise<void> {
	const database = await getDb();
	await database.execute("DELETE FROM settings WHERE key = $1", [
		`prompt_override_${typeName}`,
	]);
}

// --- Global Stats ---

export interface GlobalStats {
	total: number;
	accepted: number;
	dismissed: number;
	pending: number;
	avgLatencyMs: number | null;
}

export async function getGlobalStats(): Promise<GlobalStats> {
	const database = await getDb();
	const rows = await database.select<
		{
			total: number;
			accepted: number;
			dismissed: number;
			pending: number;
			avg_latency_ms: number | null;
		}[]
	>(
		`SELECT
			COUNT(*) as total,
			SUM(CASE WHEN status='accepted' THEN 1 ELSE 0 END) as accepted,
			SUM(CASE WHEN status='dismissed' THEN 1 ELSE 0 END) as dismissed,
			SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) as pending,
			AVG(latency_ms) as avg_latency_ms
		FROM annotations`,
	);
	const r = rows[0];
	return {
		total: r.total,
		accepted: r.accepted,
		dismissed: r.dismissed,
		pending: r.pending,
		avgLatencyMs: r.avg_latency_ms ? Math.round(r.avg_latency_ms) : null,
	};
}

export interface TypeStat {
	type: string;
	total: number;
	accepted: number;
	dismissed: number;
}

export async function getStatsByType(): Promise<TypeStat[]> {
	const database = await getDb();
	return database.select<TypeStat[]>(
		`SELECT type, COUNT(*) as total,
			SUM(CASE WHEN status='accepted' THEN 1 ELSE 0 END) as accepted,
			SUM(CASE WHEN status='dismissed' THEN 1 ELSE 0 END) as dismissed
		FROM annotations GROUP BY type ORDER BY total DESC`,
	);
}

export interface FileStat {
	name: string;
	path: string;
	total: number;
	accepted: number;
}

export async function getStatsByFile(): Promise<FileStat[]> {
	const database = await getDb();
	return database.select<FileStat[]>(
		`SELECT f.name, f.path, COUNT(a.id) as total,
			SUM(CASE WHEN a.status='accepted' THEN 1 ELSE 0 END) as accepted
		FROM annotations a JOIN files f ON a.file_id = f.id
		GROUP BY f.id ORDER BY total DESC LIMIT 10`,
	);
}

// --- Search ---

export interface SearchResult extends Annotation {
	filePath: string;
	fileName: string;
}

interface SearchRow extends AnnotationRow {
	file_path: string;
	file_name: string;
}

export async function searchAnnotations(
	query: string,
	limit = 50,
): Promise<SearchResult[]> {
	const database = await getDb();
	const rows = await database.select<SearchRow[]>(
		`SELECT a.*, f.path as file_path, f.name as file_name
		FROM annotations a JOIN files f ON a.file_id = f.id
		WHERE a.body LIKE '%' || $1 || '%' OR a.anchor_text LIKE '%' || $1 || '%'
		ORDER BY a.created_at DESC LIMIT $2`,
		[query, limit],
	);
	return rows.map((r) => ({
		...rowToAnnotation(r),
		filePath: r.file_path,
		fileName: r.file_name,
	}));
}
