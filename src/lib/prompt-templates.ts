import type { AnnotationType } from "../types";

export const ANNOTATION_PROMPTS: Record<
	AnnotationType,
	(anchor: string, context: string) => string
> = {
	clarify: (anchor, context) =>
		`You are a writing editor reviewing a markdown document. The writer wrote: "${anchor}"\n\nContext (surrounding text): ${context.slice(0, 400)}\n\nWrite a short margin note (1-2 sentences, max 30 words) suggesting how to make this passage clearer. Start with "Clarify:" and be specific. Do not repeat the text back.`,

	expand: (anchor, context) =>
		`You are a writing editor reviewing a markdown document. The writer wrote: "${anchor}"\n\nContext: ${context.slice(0, 400)}\n\nWrite a short margin note (1-2 sentences, max 30 words) suggesting what detail, example, or explanation could be added here. Start with "Expand:" and be specific.`,

	simplify: (anchor, context) =>
		`You are a writing editor. The writer wrote: "${anchor}"\n\nContext: ${context.slice(0, 400)}\n\nWrite a short margin note (1-2 sentences, max 30 words) suggesting how to make this simpler or more direct. Start with "Simplify:" and be specific.`,

	question: (anchor, context) =>
		`You are a writing editor. The writer wrote: "${anchor}"\n\nContext: ${context.slice(0, 400)}\n\nWrite a short margin note (1-2 sentences, max 30 words) raising a question a reader might have. Start with "Question:" and be specific.`,

	alternative: (anchor, context) =>
		`You are a writing editor. The writer wrote: "${anchor}"\n\nContext: ${context.slice(0, 400)}\n\nWrite a short margin note (1-2 sentences, max 30 words) suggesting an alternative phrasing or approach. Start with "Alternative:" and be specific.`,
};
