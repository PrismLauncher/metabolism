import type { Goal } from "#core/goal.ts";
import type { Provider } from "#core/provider.ts";
import { readdir } from "node:fs/promises";
import path from "node:path";

export const GOALS = await importGoals();
export const PROVIDERS = await importProviders();

async function* importValues(dir: string): AsyncGenerator<any, void, unknown> {
	const entries = await readdir(path.join(import.meta.dirname, dir), { withFileTypes: true });

	for (const entry of entries) {
		if (!entry.isDirectory() && !entry.name.endsWith(".ts"))
			continue;

		let importPath = path.join(entry.parentPath, entry.name);

		if (entry.isDirectory())
			importPath = path.join(importPath, "index.ts");

		const relativePath = path.relative(".", importPath);
		const defaultExport = await import(importPath).then(module => module.default);

		if (Array.isArray(defaultExport)) {
			for (const item of defaultExport)
				yield [relativePath, item];
		} else
			yield [relativePath, defaultExport];
	}
}

async function importGoals(): Promise<Map<string, Goal>> {
	const result: Map<string, Goal> = new Map;

	for await (const [path, defaultExport] of importValues("../../goal")) {
		if (typeof defaultExport?.generate !== "function")
			throw new Error(`Expected \`export default exportGoal\` (@'${path}')!`);

		result.set(defaultExport.id, defaultExport);
	}

	return result;
}

async function importProviders(): Promise<Map<string, Provider>> {
	const result: Map<string, Provider> = new Map;

	for await (const [path, defaultExport] of importValues("../../provider")) {
		if (typeof defaultExport.provide !== "function")
			throw new Error(`Expected \`export default exportProvider\` (@$'${path}')!`);

		result.set(defaultExport.id, defaultExport);
	}

	return result;
}
