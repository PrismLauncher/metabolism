import { patchObject } from "#common/util.ts";

export interface Patch<T> {
	match: string[];
	override?: Partial<T>;
	add?: T[];
	patchAdded?: boolean;
}

export function applyPatchSet<T extends object>(
	items: T[],
	patches: Patch<T>[],
	itemID: (item: T) => string,
	depth = 0,
): T[] {
	if (depth >= 20) {
		throw new Error(
			"applyPatchSet got stuck in recursion - be careful to avoid cycles when using patchAdded",
		);
	}

	return items.flatMap((item) => {
		const addedLibs = [item];

		for (const patch of patches) {
			if (!patch.match.includes(itemID(item))) {
				continue;
			}

			if (patch.override) {
				addedLibs[0] = patchObject(addedLibs[0]!, patch.override);
			}

			if (patch.add) {
				let toAdd = patch.add;
				if (patch.patchAdded) {
					toAdd = applyPatchSet(toAdd, patches, itemID, depth + 1);
				}
				addedLibs.push(...toAdd);
			}
		}

		return addedLibs;
	});
}
