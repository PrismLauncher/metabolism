import { throwError } from "#common/general.ts";
import {
	isLWJGL2,
	isLWJGL2Dependency,
	isLWJGL3,
} from "#common/transformation/maven.ts";
import {
	isPlatformLibrary,
	transformArgs,
	transformPistonLibrary,
} from "#common/transformation/pistonMeta.ts";
import { defineGoal, type VersionOutput } from "#core/goal.ts";
import gameVersions from "#provider/gameVersions/index.ts";
import {
	VersionFileTrait,
	type VersionFileDependency,
} from "#schema/format/v1/versionFile.ts";
import type {
	PistonLibrary,
	PistonVersion,
} from "#schema/pistonMeta/pistonVersion.ts";

export default defineGoal({
	id: "net.minecraft",
	name: "Minecraft",
	deps: [gameVersions],

	generate: ([versions]) => versions.map(transformVersion),
	recommend: (first, version) => first && version.type === "release",
});

function transformVersion(version: PistonVersion): VersionOutput {
	const requires: VersionFileDependency[] = [];
	const traits: VersionFileTrait[] = [];
	let mainClass: string | undefined = version.mainClass;

	let libraries = version.libraries;

	libraries = libraries.filter((x) => !processLWJGL(x, requires, traits));

	if (mainClass?.startsWith("net.minecraft.launchwrapper.")) {
		libraries = libraries.filter(
			(x) =>
				!x.name.value.startsWith("net.minecraft:launchwrapper:")
				&& x.name.group !== "net.sf.jopt-simple"
				&& x.name.group !== "org.ow2.asm",
		);

		mainClass = undefined;
		traits.push(VersionFileTrait.LegacyLaunch);
	}

	if (version.arguments?.game) {
		const featureObjects = version.arguments.game
			.filter((x) => typeof x === "object")
			.flatMap((x) => x.rules)
			.map((x) => x.features)
			.filter((x) => typeof x === "object");

		if (featureObjects.some((x) => x.is_quick_play_singleplayer)) {
			traits.push(VersionFileTrait.QuickPlaySingleplayerAware);
		}

		if (featureObjects.some((x) => x.is_quick_play_multiplayer)) {
			traits.push(VersionFileTrait.QuickPlayMultiplayerAware);
		}
	}

	return {
		version: version.id,
		type: version.type,
		releaseTime: version.releaseTime.toISOString(),

		requires,

		"+traits": traits,

		compatibleJavaMajors: [version?.javaVersion?.majorVersion].filter(
			(x) => x !== undefined,
		),
		compatibleJavaName: version.javaVersion?.component,
		mainClass,
		minecraftArguments:
			version.minecraftArguments
			?? (version.arguments?.game ?
				transformArgs(version.arguments.game)
			:	undefined)
			?? throwError(
				"Neither minecraftArguments nor arguments.game present",
			),

		mainJar: {
			name: `com.mojang:minecraft:${version.id}:client`,
			downloads: { artifact: version.downloads.client },
		},
		logging: version.logging?.client,
		assetIndex: version.assetIndex,
		libraries: libraries.map(transformPistonLibrary),
	};
}

function processLWJGL(
	lib: PistonLibrary,
	requires: VersionFileDependency[],
	traits: VersionFileTrait[],
): boolean {
	if (isLWJGL2Dependency(lib.name)) {
		return true;
	}

	const lwjgl2 = isLWJGL2(lib.name);
	const lwjgl3 = isLWJGL3(lib.name);

	if (lwjgl2 || lwjgl3) {
		// determine version based on non-pltaform-specific libraries in case the version varies
		if (isPlatformLibrary(lib)) {
			return true;
		}

		const uid = lwjgl3 ? "org.lwjgl3" : "org.lwjgl";
		const existing = requires.find((x) => x.uid === uid);

		if (existing) {
			if (existing.suggests !== lib.name.version) {
				throw new Error(
					`Multiple versions of LWJGL specified! (both '${existing.suggests!}' and '${lib.name.version}' present)`,
				);
			} else {
				return true;
			}
		}

		if (lwjgl3) {
			traits.push(VersionFileTrait.UseFirstThreadOnMacOS);
		}

		requires.push({ uid, suggests: lib.name.version });
		return true;
	}

	return false;
}
