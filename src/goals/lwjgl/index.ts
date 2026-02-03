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
import { LWJGL_EXTRA_NATIVES } from "./extraNatives.ts";

const logger = moduleLogger();

const lwjgl3 = defineGoal({
	id: "org.lwjgl3",
	name: "LWJGL 3",
	deps: [pistonMetaGameVersions],

	generate: ([versions]) =>
		generate(versions, ["org.lwjgl"], isLWJGL3, () => false),
	recommend: () => false,
});

const lwjgl2 = defineGoal({
	id: "org.lwjgl",
	name: "LWJGL 2",
	deps: [pistonMetaGameVersions],

	generate: ([versions]) =>
		generate(versions, ["org.lwjgl3"], isLWJGL2, isLWJGL2Dependency),
	recommend: () => false,
});

export default [lwjgl3, lwjgl2];

type VersionNamePredicate = (name: MavenArtifactRef) => boolean;

interface LWJGLVersion {
	modules: Map<string, LWJGLModule>;
	firstSeen: Date;
	used: boolean;
	preferSplit?: boolean;
}

export type ArtifactWithClassifier = VersionFileArtifact & {
	classifier: string;
};

interface LWJGLModule {
	baseName: MavenArtifactRef;
	javaCode?: VersionFileArtifact;
	nativeCode: Map<VersionFilePlatform, ArtifactWithClassifier>;
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

				if (classifier) {
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
				} else {
					module.javaCode = artifact;
				}
			}

			const classifierLookup = lib.downloads?.classifiers;

			if (lib.natives && !isEmpty(classifierLookup)) {
				for (const [platform, classifier] of Object.entries(
					lib.natives,
				)) {
					if (!Object.hasOwn(classifierLookup, classifier)) {
						continue;
					}

					const artifact = transformPistonArtifact(
						classifierLookup[classifier]!,
					);

					setIfAbsent(
						module.nativeCode,
						platform as keyof typeof lib.natives,
						{ ...artifact, classifier },
					);
				}

				continue;
			}
		}
	}

	sharedDeps.values().forEach(patchModule);

	for (const version of versions.values()) {
		version.modules.forEach(patchModule);
	}

	const conflicts: VersionFileDependency[] = conflictUIDs.map((uid) => ({
		uid,
	}));
	const result = versions
		.entries()
		.filter(([_, version]) => version.used)
		.map(([versionKey, version]): VersionOutput => {
			const transformModule = (
				module: LWJGLModule,
			): VersionFileLibrary[] => {
				if (version.preferSplit) {
					return transformModuleSplit(module);
				} else {
					return transformModuleMerged(module);
				}
			};

			return {
				version: versionKey,
				releaseTime: version.firstSeen.toISOString(),
				type: "release",

				conflicts,
				volatile: true,

				libraries: [
					...sharedDeps.values().flatMap(transformModule),
					...version.modules.values().flatMap(transformModule),
				],
			};
		});

	return [...result];
}

function patchModule(module: LWJGLModule): void {
	const name = module.baseName.value;

	if (!Object.hasOwn(LWJGL_EXTRA_NATIVES, name)) {
		return;
	}

	const patches = LWJGL_EXTRA_NATIVES[name]!;

	for (const [platform, artifact] of Object.entries(patches)) {
		setIfAbsent(
			module.nativeCode,
			platform as keyof (typeof LWJGL_EXTRA_NATIVES)[string],
			artifact,
		);
	}
}

function transformModuleMerged(module: LWJGLModule): VersionFileLibrary[] {
	const result: VersionFileLibrary[] = [];

	if (module.javaCode !== undefined) {
		result.push({
			name: module.baseName.value,
			downloads: { artifact: module.javaCode },
		});
	}

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

		result.push({
			name: module.baseName.value,
			downloads: { classifiers },
			natives,
		});
	}

	return result;
}

function transformModuleSplit(module: LWJGLModule): VersionFileLibrary[] {
	const result: VersionFileLibrary[] = [];

	if (module.javaCode !== undefined) {
		result.push({
			name: module.baseName.value,
			downloads: { artifact: module.javaCode },
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
		case "windows-x86":
		case "windows-arm64":
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
