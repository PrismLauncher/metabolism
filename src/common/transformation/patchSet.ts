import { patchObject, setIfAbsent } from "#common/util.ts";
import { moduleLogger } from "#logger.ts";

const logger = moduleLogger();

export interface Patch<T> {
	/**
	 * Match specifies a set of keys (determined from itemKey passed into applyPatchSet) to match.
	 * Ranges can be specified using `..`.
	 * For example `1.0..2.0` would match all keys going from `1.0` to `2.0` inclusively, based on the allKeys value passed to compilePatchSet.
	 * If allKeys is specified as `["0.0", "1.0", "1.1", "2.0"]`, this would mean it would expand to `["1.0", "1.1", "2.0"]`.
	 */
	match: string[];
	override?: Partial<T>;
	add?: T[];
	patchAdded?: boolean;
}

export type PatchSet<T> = Map<string, Patch<T>[]>;

/**
 * Compiles a list of patches to a PatchSet to be used in applyPatchSet.
 * @param patches The list of patches.
 * @param allKeys If the keys are unique and refer to something with a logical order like versions, this allows matching ranges based on the supplied order.
 * @returns The compiled patches.
 */
export function compilePatchSet<T>(
	patches: Patch<T>[],
	allKeys?: string[],
): PatchSet<T> {
	const result: PatchSet<T> = new Map();
	const add = (key: string, patch: Patch<T>): number =>
		setIfAbsent(result, key, []).push(patch);

	for (const patch of patches) {
		for (const match of patch.match) {
			const rangeSeparatorIdx = match.indexOf("..");
			if (!allKeys || rangeSeparatorIdx === -1) {
				continue;
			}

			const left = match.slice(0, rangeSeparatorIdx);
			const right = match.slice(rangeSeparatorIdx + 2);

			const leftIdx = allKeys.indexOf(left);
			if (leftIdx === -1) {
				logger.warn(
					`Cannot compile version range ${left}..${right}: ${left} is not present in allKeys`,
				);
				continue;
			}

			const rightIdx = allKeys.indexOf(right);
			if (rightIdx === -1) {
				logger.warn(
					`Cannot compile version range ${left}..${right}: ${right} is not present in allKeys`,
				);
				continue;
			}

			const start = Math.min(leftIdx, rightIdx);
			const end = Math.max(leftIdx, rightIdx);

			for (const rangeKey of allKeys.slice(start, end + 1)) {
				add(rangeKey, patch);
			}
		}
	}

	return result;
}

export function applyPatchSet<T extends object>(
	items: T[],
	patchSet: PatchSet<T>,
	itemKey: (item: T) => string,
	depth = 0,
): T[] {
	if (depth >= 20) {
		throw new Error(
			"applyPatchSet got stuck in recursion - be careful to avoid cycles when using patchAdded",
		);
	}

	return items.flatMap((item) => {
		const addedLibs = [item];

		const matched = patchSet.get(itemKey(item)) ?? [];
		for (const patch of matched) {
			if (patch.override) {
				addedLibs[0] = patchObject(addedLibs[0]!, patch.override);
			}

			if (patch.add) {
				let toAdd = patch.add;
				if (patch.patchAdded) {
					toAdd = applyPatchSet(toAdd, patchSet, itemKey, depth + 1);
				}
				addedLibs.push(...toAdd);
			}
		}

		return addedLibs;
	});
}
