import {
	PistonArtifact,
	PistonLibrary,
	type PistonAssetIndexRef,
	type PistonLoggingAsset,
} from "#schemas/pistonMeta/pistonVersion.ts";

export interface VersionFile {
	uid: string;
	name: string;
	formatVersion: 1;

	version: string;
	releaseTime: string;
	type?: string;

	volatile?: boolean;
	requires?: VersionFileDependency[];
	conflicts?: VersionFileDependency[];

	"+traits"?: VersionFileTrait[];

	compatibleJavaMajors?: number[];
	compatibleJavaName?: string;
	"+jvmArgs"?: string[];
	"+tweakers"?: string[];
	mainClass?: string;
	minecraftArguments?: string;

	mainJar?: VersionFileLibrary;
	logging?: PistonLoggingAsset;
	libraries?: VersionFileLibrary[];
	mavenFiles?: VersionFileLibrary[];
	assetIndex?: PistonAssetIndexRef;

	runtimes?: VersionFileRuntime[];
}

export type VersionFileArtifact = Omit<PistonArtifact, "path">;

type OS = "windows" | "osx" | "linux" | "freebsd" | "openbsd";
type Arch = "x86_64" | "x86" | "arm64" | "arm32";

// OS alone means x86 or x86_64
export type VersionFilePlatform = OS | `${OS}-${Arch}`;

export type VersionFileLibrary = Omit<
	PistonLibrary,
	"name" | "downloads" | "natives"
> & {
	name: string;

	downloads?: {
		artifact?: VersionFileArtifact;
		classifiers?: Record<string, VersionFileArtifact>;
	};

	natives?: Partial<Record<VersionFilePlatform, string>>;

	"MMC-hint"?: string;
	"MMC-absoluteUrl"?: string;
	"MMC-filename"?: string;
	"MMC-displayname"?: string;
};

export interface VersionFileDependency {
	uid: string;
	equals?: string;
	suggests?: string;
}

export enum VersionFileTrait {
	UseFirstThreadOnMacOS = "FirstThreadOnMacOS",
	LegacyLaunch = "legacyLaunch",
	LaunchWithoutApplet = "noapplet",
	UseOnlineFixes = "legacyServices",
	QuickPlaySingleplayerAware = "feature:is_quick_play_singleplayer",
	QuickPlayMultiplayerAware = "feature:is_quick_play_multiplayer",
}

export interface VersionFileRuntime {
	name: string;
	runtimeOS: string;

	version: {
		name?: string;
		major: number;
		minor?: number;
		security?: number;
		build?: number;
	};
	releaseTime: string;
	vendor: string;
	packageType: string;

	downloadType: "manifest" | "archive";
	checksum: {
		type: "sha256" | "sha1";
		hash: string;
	};
	url: string;
}
