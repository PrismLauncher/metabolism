// SPDX-FileCopyrightText: 2026 metabolism contributors
//
// SPDX-License-Identifier: MIT

import { MavenArtifactRef } from "#common/maven.ts";
import {
	isLWJGL2,
	isLWJGL2Dependency,
	isLWJGL3,
} from "#common/transformation/maven.ts";
import { applyPatchSet } from "#common/transformation/patchSet.ts";
import {
	isPlatformLibrary,
	transformPistonArtifact,
} from "#common/transformation/pistonMeta.ts";
import { setIfAbsent } from "#common/util.ts";
import { defineGoal, type VersionOutput } from "#index.ts";
import { moduleLogger } from "#logger.ts";
import pistonMetaGameVersions from "#providers/gameVersions/index.ts";
import type {
	VersionFileArtifact,
	VersionFileDependency,
	VersionFileLibrary,
	VersionFilePlatform,
} from "#schemas/format/v1/versionFile.ts";
import { PistonVersion } from "#schemas/pistonMeta/pistonVersion.ts";
import { groupBy } from "es-toolkit";
import { isEmpty } from "es-toolkit/compat";
import { LWJGL_LIBRARY_PATCHES } from "./libraryPatches.ts";

const logger = moduleLogger();

const lwjgl3 = defineGoal({
	id: "org.lwjgl3",
	name: "LWJGL 3",
	deps: [pistonMetaGameVersions],

	generate: ([versions]) =>
		generate(versions, ["org.lwjgl"], isLWJGL3, () => false),
});

const lwjgl2 = defineGoal({
	id: "org.lwjgl",
	name: "LWJGL 2",
	deps: [pistonMetaGameVersions],

	generate: ([versions]) =>
		generate(versions, ["org.lwjgl3"], isLWJGL2, isLWJGL2Dependency),
});

export default [lwjgl3, lwjgl2];

type VersionNamePredicate = (name: MavenArtifactRef) => boolean;

interface LWJGLVersion {
	modules: Map<string, LWJGLModule>;
	firstSeen: Date;
	used: boolean;
}

interface NamedArtifact {
	artifact: VersionFileArtifact;
	name: MavenArtifactRef;
}

interface LWJGLModule {
	javaCode?: NamedArtifact;
	nativeCode: Map<VersionFilePlatform, NamedArtifact>;
	preferSplit?: boolean;
}

function generate(
	data: PistonVersion[],
	conflictUIDs: string[],
	filter: VersionNamePredicate,
	filterDep: VersionNamePredicate,
): VersionOutput[] {
	const versions: Map<string, LWJGLVersion> = new Map();
	const sharedDeps: Map<string, LWJGLModule> = new Map();

	for (const gameVersion of data) {
		for (const lib of gameVersion.libraries) {
			let target: Map<string, LWJGLModule>;

			// NOTE: in case Mojang is using some modified builds and adding a suffix to the version,
			// we remove the suffix for the key to avoid it being considered a distinct version of LWJGL
			const key = lib.name.version.split("-", 1)[0]!;

			if (filter(lib.name)) {
				const version = setIfAbsent(versions, key, {
					modules: new Map(),
					used: false,
					firstSeen: new Date(""),
				});

				// always set - we are going from newest to oldest and want the oldest to have the final say
				version.firstSeen = gameVersion.releaseTime;
				version.used ||= !isPlatformLibrary(lib);

				target = version.modules;
			} else if (filterDep(lib.name)) {
				target = sharedDeps;
			} else {
				continue;
			}

			const module = setIfAbsent(
				target,
				lib.name.format(["group", "artifact"]), // org.lwjgl:lwjgl-thing
				{ nativeCode: new Map() },
			);

			if (lib.downloads?.artifact) {
				const artifact = transformPistonArtifact(
					lib.downloads.artifact,
				);
				const classifier = lib.name.classifier;

				if (classifier && classifier !== "unsafe") {
					module.preferSplit = true;
					const platform = mapClassifier(classifier);

					if (platform) {
						setIfAbsent(module.nativeCode, platform, {
							artifact,
							name: lib.name,
						});
					} else {
						logger.warn(
							`Could not determine platform from LWJGL classifier: '${classifier}'`,
						);
					}

					continue;
				} else if (!module.javaCode) {
					module.javaCode = { artifact, name: lib.name };
				}
			}

			if (lib.natives && lib.downloads?.classifiers) {
				for (const [platform, classifier] of Object.entries(
					lib.natives,
				)) {
					const artifact = lib.downloads.classifiers[classifier];
					if (!artifact) {
						continue;
					}

					setIfAbsent(
						module.nativeCode,
						platform as keyof typeof lib.natives,
						{
							artifact: transformPistonArtifact(artifact),
							name: new MavenArtifactRef({
								...lib.name,
								classifier,
							}),
						},
					);
				}

				continue;
			}
		}
	}

	const conflicts: VersionFileDependency[] = conflictUIDs.map((uid) => ({
		uid,
	}));
	const sharedLibs = applyPatchSet(
		[...sharedDeps.values().flatMap(transformModule)],
		LWJGL_LIBRARY_PATCHES,
		(lib) => lib.name,
	);
	const result = versions
		.entries()
		.filter(([_, version]) => version.used)
		.map(([versionKey, version]): VersionOutput => {
			const libs = applyPatchSet(
				[...version.modules.values().flatMap(transformModule)],
				LWJGL_LIBRARY_PATCHES,
				(lib) => lib.name,
			);

			return {
				version: versionKey,
				releaseTime: version.firstSeen.toISOString(),
				type: "release",

				conflicts,
				volatile: true,

				libraries: [...sharedLibs, ...libs],
			};
		});

	return [...result];
}

function transformModule(module: LWJGLModule): VersionFileLibrary[] {
	if (module.preferSplit) {
		return transformModuleSplit(module);
	} else {
		return transformModuleMerged(module);
	}
}

function transformModuleMerged(module: LWJGLModule): VersionFileLibrary[] {
	const result: VersionFileLibrary[] = [];

	if (module.javaCode !== undefined) {
		result.push({
			name: module.javaCode.name.value,
			downloads: { artifact: module.javaCode.artifact },
		});
	}

	if (!isEmpty(module.nativeCode)) {
		const byBaseName = groupBy(
			[...module.nativeCode.entries()],
			([_, native]) =>
				native.name.format(["group", "artifact", "version"]),
		);

		for (const [baseName, entries] of Object.entries(byBaseName)) {
			const classifiers = Object.fromEntries(
				entries.map(([_, artifact]) => [
					artifact.name.classifier,
					artifact.artifact,
				]),
			);

			const natives = Object.fromEntries(
				module.nativeCode
					.entries()
					.map(([platform, artifact]) => [
						platform,
						artifact.name.classifier,
					]),
			);

			result.push({
				name: baseName,
				downloads: { classifiers },
				natives,
			});
		}
	}

	return result;
}

function transformModuleSplit(module: LWJGLModule): VersionFileLibrary[] {
	const result: VersionFileLibrary[] = [];

	if (module.javaCode !== undefined) {
		result.push({
			name: module.javaCode.name.value,
			downloads: { artifact: module.javaCode.artifact },
		});
	}

	for (const [platform, artifact] of module.nativeCode) {
		result.push({
			name: artifact.name.value,
			downloads: { artifact: artifact.artifact },
			rules: [
				{
					action: "allow",
					os: { name: platform },
				},
			],
		});
	}

	return result;
}

function mapClassifier(classifier: string): VersionFilePlatform | undefined {
	const prefix = "natives-";

	if (!classifier.startsWith(prefix)) {
		return undefined;
	}

	classifier = classifier.substring(prefix.length);

	const optionalSuffix = "-patch";

	if (classifier.endsWith(optionalSuffix)) {
		classifier = classifier.slice(0, -optionalSuffix.length);
	}

	switch (classifier) {
		case "windows":
		case "windows-arm64":
		case "windows-x86":
		case "osx":
		case "linux":
		case "linux-arm64":
		case "linux-arm32":
		case "freebsd":
			return classifier;

		case "macos":
			return "osx";
		case "macos-arm64":
			return "osx-arm64";
	}

	return undefined;
}
