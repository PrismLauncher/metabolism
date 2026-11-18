// SPDX-FileCopyrightText: 2026 metabolism contributors
//
// SPDX-License-Identifier: MS-PL

import { patchObject } from "#common/util.ts";
import type { VersionFileLibrary } from "#schemas/format/v1/versionFile.ts";

export interface LibraryPatch {
	match: string[];
	additionalLibraries?: VersionFileLibrary[];
	// TODO: evaluate whether this is needed?
	patchAdditionalLibraries?: boolean;
	override?: Partial<VersionFileLibrary>;
}

export function applyLibraryPatches(
	libraries: VersionFileLibrary[],
	patches: LibraryPatch[],
	depth = 0,
): VersionFileLibrary[] {
	if (depth >= 20) {
		throw new Error(
			"applyLibraryPatches got stuck in recursion - be careful to avoid cycles when using patchAdditionalLibraries",
		);
	}

	return libraries.flatMap((lib) => {
		const addedLibs = [lib];

		for (const patch of patches) {
			if (!patch.match.includes(lib.name)) {
				continue;
			}

			if (patch.override) {
				addedLibs[0] = patchObject(addedLibs[0]!, patch.override);
			}

			if (patch.additionalLibraries) {
				let addnLibs = patch.additionalLibraries;
				if (patch.patchAdditionalLibraries) {
					addnLibs = applyLibraryPatches(
						addnLibs,
						patches,
						depth + 1,
					);
				}
				addedLibs.push(...addnLibs);
			}
		}

		return addedLibs;
	});
}
