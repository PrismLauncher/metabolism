import { NEOFORGE_MAVEN } from "#common/constants/urls.ts";
import {
	transformArgs,
	transformPistonLibrary,
} from "#common/transformation/pistonMeta.ts";
import { defineGoal, type VersionOutput } from "#index.ts";
import gameVersions from "#providers/gameVersions/index.ts";
import neoForgeLoaderVersions from "#providers/neoForgeLoaderVersions.ts";
import type { VersionFileLibrary } from "#schemas/format/v1/versionFile.ts";

const FORGEWRAPPER: VersionFileLibrary = {
	downloads: {
		artifact: {
			sha1: "4c4653d80409e7e968d3e3209196ffae778b7b4e",
			size: 29731,
			url: "https://files.prismlauncher.org/maven/io/github/zekerzhayard/ForgeWrapper/prism-2025-12-07/ForgeWrapper-prism-2025-12-07.jar",
		},
	},
	name: "io.github.zekerzhayard:ForgeWrapper:prism-2025-12-07",
};

export default defineGoal({
	id: "net.neoforged",
	name: "NeoForge",

	deps: [neoForgeLoaderVersions, gameVersions],
	generate([versions, mcVersions]) {
		const mcVersionsById = new Map(mcVersions.map((ver) => [ver.id, ver]));

		return versions.map(
			({
				versionData,
				installerArtifact,
				installProfile,
			}): VersionOutput => {
				let minecraftArguments: string | undefined;

				if (versionData.arguments?.game) {
					const baseArgs =
						mcVersionsById.get(versionData.inheritsFrom)?.arguments
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
							equals: versionData.inheritsFrom,
						},
					],

					mainClass:
						"io.github.zekerzhayard.forgewrapper.installer.Main",
					minecraftArguments,

					libraries: [
						FORGEWRAPPER,
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
	},
	recommend: (first, version) => first && version.type === "release",
});
