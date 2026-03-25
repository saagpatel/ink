import type { CustomAnnotationType, TypeConfig } from "../types";
import { getCustomTypes, loadPromptOverride } from "./db";

const TAILWIND_COLORS: Record<string, { border: string; badge: string }> = {
	blue: {
		border: "border-l-blue-500",
		badge: "bg-blue-500/20 text-blue-400",
	},
	emerald: {
		border: "border-l-emerald-500",
		badge: "bg-emerald-500/20 text-emerald-400",
	},
	amber: {
		border: "border-l-amber-500",
		badge: "bg-amber-500/20 text-amber-400",
	},
	purple: {
		border: "border-l-purple-500",
		badge: "bg-purple-500/20 text-purple-400",
	},
	rose: {
		border: "border-l-rose-500",
		badge: "bg-rose-500/20 text-rose-400",
	},
	sky: {
		border: "border-l-sky-500",
		badge: "bg-sky-500/20 text-sky-400",
	},
	teal: {
		border: "border-l-teal-500",
		badge: "bg-teal-500/20 text-teal-400",
	},
	orange: {
		border: "border-l-orange-500",
		badge: "bg-orange-500/20 text-orange-400",
	},
	pink: {
		border: "border-l-pink-500",
		badge: "bg-pink-500/20 text-pink-400",
	},
	indigo: {
		border: "border-l-indigo-500",
		badge: "bg-indigo-500/20 text-indigo-400",
	},
};

const DEFAULT_COLOR = {
	border: "border-l-zinc-500",
	badge: "bg-zinc-500/20 text-zinc-400",
};

function colorClasses(color: string) {
	return TAILWIND_COLORS[color] ?? DEFAULT_COLOR;
}

const DEFAULT_PROMPTS: Record<
	string,
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

export const BUILT_IN_TYPES: TypeConfig[] = [
	{
		name: "clarify",
		label: "Clarify",
		color: "blue",
		borderClass: "border-l-blue-500",
		badgeClass: "bg-blue-500/20 text-blue-400",
		prompt: DEFAULT_PROMPTS.clarify,
	},
	{
		name: "expand",
		label: "Expand",
		color: "emerald",
		borderClass: "border-l-emerald-500",
		badgeClass: "bg-emerald-500/20 text-emerald-400",
		prompt: DEFAULT_PROMPTS.expand,
	},
	{
		name: "simplify",
		label: "Simplify",
		color: "amber",
		borderClass: "border-l-amber-500",
		badgeClass: "bg-amber-500/20 text-amber-400",
		prompt: DEFAULT_PROMPTS.simplify,
	},
	{
		name: "question",
		label: "Question",
		color: "purple",
		borderClass: "border-l-purple-500",
		badgeClass: "bg-purple-500/20 text-purple-400",
		prompt: DEFAULT_PROMPTS.question,
	},
	{
		name: "alternative",
		label: "Alternative",
		color: "rose",
		borderClass: "border-l-rose-500",
		badgeClass: "bg-rose-500/20 text-rose-400",
		prompt: DEFAULT_PROMPTS.alternative,
	},
];

export const BUILT_IN_TYPE_NAMES = BUILT_IN_TYPES.map((t) => t.name);

function customToTypeConfig(ct: CustomAnnotationType): TypeConfig {
	const colors = colorClasses(ct.color);
	return {
		name: ct.name,
		label: ct.label,
		color: ct.color,
		borderClass: colors.border,
		badgeClass: colors.badge,
		prompt: (anchor: string, context: string) =>
			ct.prompt
				.replace(/\{anchor\}/g, anchor)
				.replace(/\{context\}/g, context.slice(0, 400)),
	};
}

export async function getAllTypes(): Promise<TypeConfig[]> {
	const custom = await getCustomTypes();
	const customConfigs = custom.map(customToTypeConfig);

	// Check for prompt overrides on built-in types
	const builtInWithOverrides = await Promise.all(
		BUILT_IN_TYPES.map(async (bt) => {
			const override = await loadPromptOverride(bt.name);
			if (override) {
				return {
					...bt,
					prompt: (anchor: string, context: string) =>
						override
							.replace(/\{anchor\}/g, anchor)
							.replace(/\{context\}/g, context.slice(0, 400)),
				};
			}
			return bt;
		}),
	);

	return [...builtInWithOverrides, ...customConfigs];
}

export async function getTypeConfig(name: string): Promise<TypeConfig> {
	const all = await getAllTypes();
	return (
		all.find((t) => t.name === name) ?? {
			name,
			label: name.charAt(0).toUpperCase() + name.slice(1),
			color: "zinc",
			borderClass: DEFAULT_COLOR.border,
			badgeClass: DEFAULT_COLOR.badge,
			prompt: DEFAULT_PROMPTS.clarify,
		}
	);
}

export function getTypeConfigSync(
	name: string,
	allTypes: TypeConfig[],
): TypeConfig {
	return (
		allTypes.find((t) => t.name === name) ?? {
			name,
			label: name.charAt(0).toUpperCase() + name.slice(1),
			color: "zinc",
			borderClass: DEFAULT_COLOR.border,
			badgeClass: DEFAULT_COLOR.badge,
			prompt: DEFAULT_PROMPTS.clarify,
		}
	);
}
