// SPDX-FileCopyrightText: 2026 metabolism contributors
//
// SPDX-License-Identifier: MIT

import {
	isLWJGL2,
	isLWJGL2Dependency,
	isLWJGL3,
} from "#common/transformation/maven.ts";
import {
	applyPatchSet,
	compilePatchSet,
} from "#common/transformation/patchSet.ts";
import {
	isPlatformLibrary,
	ruleSetAppliesByDefault,
	transformArgs,
	transformPistonLibrary,
} from "#common/transformation/pistonMeta.ts";
import { throwError } from "#common/util.ts";
import { defineGoal, type VersionOutput } from "#index.ts";
import gameVersions from "#providers/gameVersions/index.ts";
import {
	VersionFileTrait,
	type VersionFileDependency,
} from "#schemas/format/v1/versionFile.ts";
import type {
	PistonArgument,
	PistonAssetIndexRef,
	PistonLibrary,
	PistonVersion,
} from "#schemas/pistonMeta/pistonVersion.ts";
import { MINECRAFT_LIBRARY_PATCHES } from "./libraryPatches.ts";
import { MINECRAFT_VERSION_PATCHES } from "./versionPatches.ts";

export default defineGoal({
	id: "net.minecraft",
	name: "Minecraft",
	deps: [gameVersions],

	generate: ([versions]) => {
		const versionPatches = compilePatchSet(
			MINECRAFT_VERSION_PATCHES,
			versions.map((v) => v.id),
		);

		const result = applyPatchSet(
			versions.map(transformVersion),
			versionPatches,
			(v) => v.version,
		);

		const firstRelease = result.find((x) => x.type === "release");
		if (firstRelease) {
			firstRelease.recommended = true;
		}

		return result;
	},
});

function transformVersion(version: PistonVersion): VersionOutput {
	const requires: VersionFileDependency[] = [];
	const traits: VersionFileTrait[] = [];
	let mainClass: string | undefined = version.mainClass;

	let libraries = version.libraries;

	const lwjglVersion = selectLWJGLVersion(libraries);
	if (lwjglVersion !== null) {
		const lwjgl3 = lwjglVersion.startsWith("3.");

		requires.push({
			uid: lwjgl3 ? "org.lwjgl3" : "org.lwjgl",
			suggests: lwjglVersion,
		});

		if (lwjgl3) {
			traits.push(VersionFileTrait.UseFirstThreadOnMacOS);
		}
	}

	libraries = libraries.filter(filterLWJGL);

	if (mainClass?.startsWith("net.minecraft.launchwrapper.")) {
		mainClass = undefined;
		traits.push(VersionFileTrait.LegacyLaunch);
	}

	const isLaunchWrapperLib = (x: PistonLibrary): boolean =>
		x.name.value.startsWith("net.minecraft:launchwrapper:");
	if (libraries.some(isLaunchWrapperLib)) {
		// NOTE: we always want to remove launchwrapper but it's not always being used as the mainclass
		libraries = libraries.filter(
			(x) =>
				!isLaunchWrapperLib(x)
				&& x.name.group !== "net.sf.jopt-simple"
				&& x.name.group !== "org.ow2.asm",
		);
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

	const javaMajors = transformJavaMajor(
		version.javaVersion?.majorVersion ?? 8,
	);

	const jvmArgs: string[] = transformJVMArgs(version?.arguments?.jvm ?? []);
	if (Math.max(...javaMajors) >= 17) {
		jvmArgs.push(
			"-XX:+UnlockDiagnosticVMOptions",
			"-XX:-UseBASE64Intrinsics",
		);
	}

	return {
		version: version.id,
		type: version.type,
		releaseTime: version.releaseTime.toISOString(),

		requires,

		"+traits": traits,

		compatibleJavaMajors: javaMajors,
		compatibleJavaName: version.javaVersion?.component ?? "jre-legacy",
		"+jvmArgs": jvmArgs,
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
		assetIndex:
			version.assetIndex ?
				transformAssetsIndex(version.assetIndex)
			:	undefined,
		libraries: applyPatchSet(
			libraries.map(transformPistonLibrary),
			MINECRAFT_LIBRARY_PATCHES,
			(lib) => lib.name,
		),
	};
}

function filterLWJGL(lib: PistonLibrary): boolean {
	return (
		!isLWJGL2Dependency(lib.name)
		&& !isLWJGL2(lib.name)
		&& !isLWJGL3(lib.name)
	);
}

function selectLWJGLVersion(libs: PistonLibrary[]): string | null {
	const versions: string[] = [];

	for (const lib of libs) {
		const lwjgl3 = isLWJGL3(lib.name);
		const lwjgl2 = isLWJGL2(lib.name);
		if (!lwjgl3 && !lwjgl2) {
			continue;
		}

		// determine version based on non-platform-specific libraries in case the version varies
		if (isPlatformLibrary(lib)) {
			continue;
		}

		// NOTE: for some strange reason we always select the same version of LWJGL 2
		const version =
			lwjgl3 ? lib.name.version.split("-")[0]! : "2.9.4-nightly-20150209";
		if (versions.includes(version)) {
			continue;
		}

		versions.push(version);
	}

	if (versions.length > 1) {
		throw new Error(
			`Could not determine a single LWJGL version - picked ${versions.length} versions: ${versions.join(", ")}`,
		);
	}

	return versions[0] ?? null;
}

function transformJVMArgs(args: PistonArgument[]): string[] {
	return args
		.filter(
			(arg) =>
				typeof arg === "string" || ruleSetAppliesByDefault(arg.rules),
		)
		.flatMap((arg) => (typeof arg === "string" ? arg : arg.value))
		.filter((arg) => arg.startsWith("-XX:StackShadowPages="));
}

const JAVA_SUBSTITUTES = { 16: [17] };

function transformJavaMajor(majorVersion: number): number[] {
	const result = [majorVersion];

	if (majorVersion in JAVA_SUBSTITUTES) {
		result.push(...JAVA_SUBSTITUTES[majorVersion]);
	}

	return result;
}

function transformAssetsIndex(index: PistonAssetIndexRef): PistonAssetIndexRef {
	const url = new URL(index.url);

	if (url.host !== "launchermeta.mojang.com") {
		return index;
	}

	url.host = "piston-meta.mojang.com";
	return { ...index, url: url.toString() };
}
