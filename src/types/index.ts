export type BuiltInAnnotationType =
	| "clarify"
	| "expand"
	| "simplify"
	| "question"
	| "alternative";

export type AnnotationType = string;
export type AnnotationStatus = "pending" | "accepted" | "dismissed";

export interface CustomAnnotationType {
	id: number;
	name: string;
	label: string;
	color: string;
	prompt: string;
}

export interface TypeConfig {
	name: string;
	label: string;
	color: string;
	borderClass: string;
	badgeClass: string;
	prompt: (anchor: string, context: string) => string;
}

export interface WorkspaceFile {
	id: number;
	path: string;
	name: string;
	lastOpened: string | null;
	wordCount: number;
}

export interface Annotation {
	id: number;
	fileId: number;
	type: AnnotationType;
	body: string;
	startOffset: number;
	endOffset: number;
	anchorText: string;
	status: AnnotationStatus;
	modelUsed: string;
	latencyMs: number | null;
	createdAt: string;
}

export interface PositionedAnnotation extends Annotation {
	yPx: number;
	visible: boolean;
}

export interface WorkspaceSettings {
	ollamaEndpoint: string;
	ollamaModel: string;
	annotationDensity: 0 | 1 | 2 | 3;
	debounceMs: number;
	lastWorkspace: string;
}

export interface OllamaAnnotationRequest {
	fullText: string;
	anchorText: string;
	startOffset: number;
	endOffset: number;
	annotationType: AnnotationType;
	model: string;
}

export interface OllamaAnnotationResponse {
	body: string;
	latencyMs: number;
}

export interface FileNode {
	name: string;
	path: string;
	is_dir: boolean;
	children?: FileNode[];
}

export interface OllamaModel {
	name: string;
	size: number;
}

export interface OllamaStatus {
	connected: boolean;
	models: OllamaModel[];
}
