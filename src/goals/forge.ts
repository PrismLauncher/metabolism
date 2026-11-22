// SPDX-FileCopyrightText: 2026 metabolism contributors
//
// SPDX-License-Identifier: MIT

import { FORGE_MAVEN } from "#common/constants/urls.ts";
import type { MavenArtifactRef } from "#common/maven.ts";
import {
	FORGEWRAPPER_LIBRARY,
	FORGEWRAPPER_MAIN_CLASS,
} from "#common/transformation/forge.ts";
import {
	transformArgs,
	transformPistonLibrary,
} from "#common/transformation/pistonMeta.ts";
import { throwError } from "#common/util.ts";
import { defineGoal, type VersionOutput } from "#index.ts";
import forgeLoaderVersions, {
	type LegacyForgeVersion,
	type ModernForgeVersion,
} from "#providers/forgeLoaderVersions.ts";
import gameVersions from "#providers/gameVersions/index.ts";
import { VersionFileTrait } from "#schemas/format/v1/versionFile.ts";
import type {
	PistonLibrary,
	PistonVersion,
} from "#schemas/pistonMeta/pistonVersion.ts";

export default defineGoal({
	id: "net.minecraftforge",
	name: "Forge",
	// FIXME: we should NOT depend on gameVersions, but we need to for the current format
	// support Mojang's new (not really) argument format in the launcher
	deps: [forgeLoaderVersions, gameVersions],
	generate([versions, mcVersions]) {
		const mcVersionsById = new Map(mcVersions.map((ver) => [ver.id, ver]));

		return versions.map((version): VersionOutput => {
			const output =
				!version.legacy ?
					processModernVersion(version, mcVersionsById)
				:	processLegacyVersion(version);

			return {
				...output,
				version: version.bareVersion,
				requires: [
					{ uid: "net.minecraft", equals: version.gameVersion },
				],
			};
		});
	},
});

function processModernVersion(
	{
		gameVersion,
		bareVersion,
		installer,
		installerInfo,
		installerJARData,
		universal,
		universalInfo,
	}: ModernForgeVersion,
	mcVersionsById: Map<string, PistonVersion>,
): Omit<VersionOutput, "version"> {
	if (!installerJARData.merged) {
		const { installProfile, versionData } = installerJARData;
		if (
			installerJARData.versionData.mainClass
			=== "net.minecraft.launchwrapper.Launch"
		) {
			// it's using LaunchWrapper so we don't need ForgeWrapper

			if (!versionData.minecraftArguments) {
				throw new Error(
					`v${bareVersion}: Expected version.json to contain minecraftArguments (should be present on LaunchWrapper versions)`,
				);
			}

			if (!universal || !universalInfo) {
				throw new Error(
					`v${bareVersion}: Missing universal.jar (should be present on LaunchWrapper versions)`,
				);
			}

			return {
				releaseTime: versionData.releaseTime.toISOString(),

				mainClass: versionData.mainClass,
				"+tweakers": extractTweakClasses(
					versionData.minecraftArguments,
				),

				libraries: [
					...versionData.libraries
						.filter(skipGeneratedLibraries)
						.map(transformPistonLibrary),
					{
						name: universal.value,
						downloads: {
							artifact: {
								url: universal.url(FORGE_MAVEN, "jar").href,
								sha1: universalInfo.sha1,
								size: universalInfo.size,
							},
						},
					},
				],
			};
		} else {
			if (!versionData.arguments?.game) {
				throw new Error(
					`v${bareVersion}: Expected version.json to contain arguments.game (should be present on non-LaunchWrapper versions)`,
				);
			}

			const baseArgs =
				mcVersionsById.get(installProfile.minecraft)?.arguments?.game
				?? [];

			let minecraftArguments = transformArgs([
				...baseArgs,
				...versionData.arguments.game,
			]);

			// FIXME: legacy arguments which Forge no longer uses but ForgeWrapper requires
			if (!minecraftArguments.includes("--fml.forgeGroup")) {
				minecraftArguments += " --fml.forgeGroup net.minecraftforge";
			}
			if (!minecraftArguments.includes("--fml.forgeVersion")) {
				minecraftArguments += " --fml.forgeVersion " + bareVersion;
			}
			if (!minecraftArguments.includes("--fml.mcVersion")) {
				minecraftArguments += " --fml.mcVersion " + gameVersion;
			}

			return {
				releaseTime: versionData.releaseTime.toISOString(),

				mainClass: FORGEWRAPPER_MAIN_CLASS,
				minecraftArguments,

				libraries: [
					...versionData.libraries
						.filter(skipGeneratedLibraries)
						.map(transformPistonLibrary),
					FORGEWRAPPER_LIBRARY,
				],
				mavenFiles: [
					{
						name: installer.value,
						downloads: {
							artifact: {
								url: installer.url(FORGE_MAVEN, "jar").href,
								sha1: installerInfo.sha1,
								size: installerInfo.size,
							},
						},
					},
					...installProfile.libraries
						.filter(skipGeneratedLibraries)
						.map(transformPistonLibrary),
				],
			};
		}
	} else {
		// NOTE: merged format should imply pre-ForgeWrapper versions

		const { installProfile } = installerJARData;
		const { versionInfo } = installProfile;

		if (versionInfo.mainClass !== "net.minecraft.launchwrapper.Launch") {
			throw new Error(
				`v${bareVersion}: Expected LaunchWrapper as main class (missing version.json in installer implies LaunchWrapper)`,
			);
		}

		if (!universal) {
			throw new Error(
				`v${bareVersion}: Missing universal.jar (should be present on LaunchWrapper versions)`,
			);
		}

		const mcVersion =
			mcVersionsById.get(
				(versionInfo.inheritsFrom ?? gameVersion).replaceAll("_", "-"),
			)
			?? throwError(
				`v${bareVersion}: Cannot find Minecraft ${gameVersion}`,
			);
		const mcLibNames = new Set(
			mcVersion.libraries.map((lib) => lib.name.value),
		);
		const isAutoGenerated = (name: MavenArtifactRef) =>
			name.group === "net.minecraftforge"
			&& (name.artifact === "forge" || name.artifact === "minecraftforge")
			&& !name.classifier;

		return {
			releaseTime: versionInfo.time.toISOString(),

			mainClass: versionInfo.mainClass,
			"+tweakers": extractTweakClasses(versionInfo.minecraftArguments),

			libraries: [
				{
					name: universal.value,
					url: FORGE_MAVEN,
				},
				...versionInfo.libraries
					.filter(
						(lib) =>
							!isAutoGenerated(lib.name)
							&& !mcLibNames.has(lib.name.value),
					)
					.map((lib) => ({ ...lib, name: lib.name.value })),
			],
		};
	}
}

function extractTweakClasses(mcArgs: string): string[] {
	const splitArgs = mcArgs.split(" ");
	const result: string[] = [];
	for (let i = 0; i < splitArgs.length - 1; ++i) {
		if (splitArgs[i] === "--tweakClass") {
			result.push(splitArgs[i + 1]!);
		}
	}

	return result;
}

function skipGeneratedLibraries(lib: PistonLibrary): boolean {
	return !lib.downloads?.artifact || lib.downloads.artifact.url !== "";
}

function processLegacyVersion({
	jarMod,
	jarModInfo,
}: LegacyForgeVersion): Omit<VersionOutput, "version"> {
	return {
		"+traits": [VersionFileTrait.LegacyFML],
		releaseTime: jarModInfo.lastModified.toISOString(),
		jarMods: [
			{
				name: jarMod.value,
				downloads: {
					artifact: {
						url: jarMod.url(FORGE_MAVEN, "zip").href,
						sha1: jarModInfo.sha1,
						size: jarModInfo.size,
					},
				},
			},
		],
	};
}
