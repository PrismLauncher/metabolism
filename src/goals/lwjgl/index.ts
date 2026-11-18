// SPDX-FileCopyrightText: 2026 metabolism contributors
//
// SPDX-License-Identifier: MIT

import { applyLibraryPatches } from "#common/transformation/libraryPatches.ts";
import {
	isLWJGL2,
	isLWJGL2Dependency,
	isLWJGL3,
} from "#common/transformation/maven.ts";
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
import { MavenArtifactRef } from "#schemas/mavenArtifactRef.ts";
import { PistonVersion } from "#schemas/pistonMeta/pistonVersion.ts";
import { omit } from "es-toolkit";
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

interface LWJGLModule {
	baseName: MavenArtifactRef;
	javaCode?: VersionFileArtifact & { classifier?: string };
	nativeCode: Map<
		VersionFilePlatform,
		VersionFileArtifact & { classifier: string }
	>;
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

			if (filter(lib.name)) {
				const version = setIfAbsent(versions, lib.name.version, {
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
				{
					baseName: lib.name.withoutClassifier(),
					nativeCode: new Map(),
				},
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
							...artifact,
							classifier,
						});
					} else {
						logger.warn(
							`Could not determine platform from LWJGL classifier: '${classifier}'`,
						);
					}

					continue;
				} else if (!module.javaCode) {
					module.javaCode = { ...artifact, classifier };
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
						{ ...transformPistonArtifact(artifact), classifier },
					);
				}

				continue;
			}
		}
	}

	const conflicts: VersionFileDependency[] = conflictUIDs.map((uid) => ({
		uid,
	}));
	const sharedLibs = applyLibraryPatches(
		[...sharedDeps.values().flatMap(transformModule)],
		LWJGL_LIBRARY_PATCHES,
	);
	const result = versions
		.entries()
		.filter(([_, version]) => version.used)
		.map(([versionKey, version]): VersionOutput => {
			const libs = applyLibraryPatches(
				[...version.modules.values().flatMap(transformModule)],
				LWJGL_LIBRARY_PATCHES,
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
	let javaCodeLib: VersionFileLibrary | null = null;
	if (module.javaCode !== undefined) {
		javaCodeLib = {
			name: module.baseName.withClassifier(module.javaCode.classifier)
				.value,
			downloads: { artifact: omit(module.javaCode, ["classifier"]) },
		};
	}

	let nativeCodeLib: VersionFileLibrary | null = null;
	if (!isEmpty(module.nativeCode)) {
		const classifiers = Object.fromEntries(
			module.nativeCode
				.values()
				.map((artifact) => [
					artifact.classifier,
					omit(artifact, ["classifier"]),
				]),
		);

		const natives = Object.fromEntries(
			module.nativeCode
				.entries()
				.map(([platform, artifact]) => [platform, artifact.classifier]),
		);

		nativeCodeLib = {
			name: module.baseName.value,
			downloads: { classifiers },
			natives,
		};
	}

	if (
		javaCodeLib
		&& nativeCodeLib
		&& javaCodeLib.name === nativeCodeLib.name
	) {
		return [
			{
				name: javaCodeLib.name,
				downloads: {
					...javaCodeLib.downloads,
					...nativeCodeLib.downloads,
				},
				natives: nativeCodeLib.natives,
			},
		];
	}

	return [javaCodeLib, nativeCodeLib].filter((x) => x !== null);
}

function transformModuleSplit(module: LWJGLModule): VersionFileLibrary[] {
	const result: VersionFileLibrary[] = [];

	if (module.javaCode !== undefined) {
		result.push({
			name: module.baseName.withClassifier(module.javaCode.classifier)
				.value,
			downloads: { artifact: omit(module.javaCode, ["classifier"]) },
		});
	}

	for (const [platform, artifact] of module.nativeCode) {
		result.push({
			name:
				module.baseName.format(["group", "artifact"])
				+ "-"
				+ artifact.classifier
				+ ":"
				+ module.baseName.version, // workaround
			downloads: { artifact: omit(artifact, ["classifier"]) },
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
		case "osx":
		case "linux":
		case "linux-arm64":
		case "linux-arm32":
		case "freebsd":
			return classifier;

		case "windows-x86":
			return "windows";

		case "macos":
			return "osx";
		case "macos-arm64":
			return "osx-arm64";
	}

	return undefined;
}
