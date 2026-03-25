import { getTypeConfig } from "./type-registry";

export async function buildPrompt(
	typeName: string,
	anchor: string,
	context: string,
): Promise<string> {
	const config = await getTypeConfig(typeName);
	return config.prompt(anchor, context);
}
