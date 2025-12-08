import { NEOFORGE_MAVEN } from "#common/constants/urls.ts";
import {
	transformArgs,
	transformPistonLibrary,
} from "#common/transformation/pistonMeta.ts";
import { defineGoal, type VersionOutput } from "#core/goal.ts";
import neoForgeLoaderVersions from "#provider/neoForgeLoaderVersions.ts";
import type { VersionFileLibrary } from "#schema/format/v1/versionFile.ts";

const FORGEWRAPPER: VersionFileLibrary = {
	downloads: {
		artifact: {
			sha1: "86c6791e32ac6478dabf9663f0ad19f8b6465dfe",
			size: 35483,
			url: "https://files.prismlauncher.org/maven/io/github/zekerzhayard/ForgeWrapper/prism-2024-02-29/ForgeWrapper-prism-2024-02-29.jar",
		},
	},
	name: "io.github.zekerzhayard:ForgeWrapper:prism-2024-02-29",
};

export default defineGoal({
	id: "net.neoforged",
	name: "NeoForge",

	provider: neoForgeLoaderVersions,
	generate(data) {
		return data.map(
			({
				versionData,
				installerArtifact,
				installProfile,
			}): VersionOutput => {
				return {
					version: installerArtifact.version,
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
					minecraftArguments:
						versionData.arguments?.game ?
							transformArgs(versionData.arguments.game)
						:	undefined,

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
