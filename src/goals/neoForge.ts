// SPDX-FileCopyrightText: 2026 metabolism contributors
//
// SPDX-License-Identifier: MIT

import { NEOFORGE_MAVEN } from "#common/constants/urls.ts";
import {
	FORGEWRAPPER_LIBRARY,
	FORGEWRAPPER_MAIN_CLASS,
} from "#common/transformation/forge.ts";
import {
	transformArgs,
	transformPistonLibrary,
} from "#common/transformation/pistonMeta.ts";
import { defineGoal, type VersionOutput } from "#index.ts";
import gameVersions from "#providers/gameVersions/index.ts";
import neoForgeLoaderVersions from "#providers/neoForgeLoaderVersions.ts";

export default defineGoal({
	id: "net.neoforged",
	name: "NeoForge",

	deps: [neoForgeLoaderVersions, gameVersions],
	generate([versions, mcVersions]) {
		const mcVersionsById = new Map(mcVersions.map((ver) => [ver.id, ver]));

		const result = versions.map(
			({
				versionData,
				installerArtifact,
				installProfile,
			}): VersionOutput => {
				let minecraftArguments: string | undefined;

				if (versionData.arguments?.game) {
					const baseArgs =
						mcVersionsById.get(installProfile.minecraft)?.arguments
							?.game ?? [];
					minecraftArguments = transformArgs([
						...baseArgs,
						...versionData.arguments.game,
					]);
				}

				let version = installerArtifact.version;
				const legacyPrefix = "1.20.1-";

				if (version.startsWith(legacyPrefix)) {
					version = version.substring(legacyPrefix.length);
				}

				return {
					version,
					releaseTime: versionData.releaseTime.toISOString(),
					type: versionData.type,

					requires: [
						{
							uid: "net.minecraft",
							equals: installProfile.minecraft,
						},
					],

					mainClass: FORGEWRAPPER_MAIN_CLASS,
					minecraftArguments,

					libraries: [
						FORGEWRAPPER_LIBRARY,
						...versionData.libraries.map(transformPistonLibrary),
					],
					mavenFiles: [
						{
							name: installerArtifact.value,
							url: NEOFORGE_MAVEN,
						},
						...installProfile.libraries.map(transformPistonLibrary),
					],
				};
			},
		);

		const firstRelease = result.find((x) => x.type === "release");
		if (firstRelease) {
			firstRelease.recommended = true;
		}

		return result;
	},
});
