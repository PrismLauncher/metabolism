import { LITELOADER_VERSIONS } from "#common/constants/urls.ts";
import { defineGoal, type VersionOutput } from "#index.ts";
import liteLoaderVersions from "#providers/liteLoaderVersions.ts";
import type { VersionFileLibrary } from "#schemas/format/v1/versionFile.ts";
import type {
	LiteLoaderArtefact,
	LiteLoaderArtefacts,
	LiteLoaderLibrary,
} from "#schemas/liteloader/liteLoaderVersions.ts";
import { orderBy } from "es-toolkit";

// ignore this for now. It should be a jar mod or something.
const IGNORED_MC_VERSIONS = ["1.5.2"];

export default defineGoal({
	id: "com.mumfrey.liteloader",
	name: "LiteLoader",
	deps: [liteLoaderVersions],

	generate([data]) {
		const result = Object.entries(data.versions)
			.filter(([mcVersion]) => !IGNORED_MC_VERSIONS.includes(mcVersion))
			.flatMap(([mcVersion, entry]) =>
				[
					entry.artefacts ?
						transformArtefacts(mcVersion, entry.artefacts, false)
					:	[],
					entry.snapshots ?
						transformArtefacts(mcVersion, entry.snapshots, true)
					:	[],
				].flat(),
			);

		return orderBy(result, [(version) => version.releaseTime], ["desc"]);
	},
});

function transformArtefacts(
	mcVersion: string,
	artefacts: LiteLoaderArtefacts,
	snapshot: boolean,
): VersionOutput[] {
	const entries = artefacts["com.mumfrey:liteloader"];
	const latest = entries["latest"]?.version ?? "";

	return Object.entries(entries)
		.filter(([key]) => key !== "latest")
		.map(([_, value]) =>
			transformArtefact(mcVersion, value, snapshot, latest),
		);
}

function transformArtefact(
	mcVersion: string,
	artefact: LiteLoaderArtefact,
	snapshot: boolean,
	latest: string,
): VersionOutput {
	const liteLoaderLib: VersionFileLibrary = {
		name: `com.mumfrey:liteloader:${artefact.version}`,
		url: LITELOADER_VERSIONS,
	};

	if (snapshot) {
		liteLoaderLib["MMC-hint"] = "always-stale";
	}

	return {
		version: artefact.version,
		releaseTime: artefact.timestamp.toISOString(),
		type: snapshot ? "snapshot" : "release",

		requires: [{ uid: "net.minecraft", equals: mcVersion }],

		mainClass: "net.minecraft.launchwrapper.Launch",
		"+tweakers": [artefact.tweakClass],

		libraries: [...artefact.libraries.map(transformLibrary), liteLoaderLib],
		recommended: !snapshot && artefact.version === latest,
	};
}

function transformLibrary(lib: LiteLoaderLibrary): VersionFileLibrary {
	const name = lib.name.value;

	// hack to make broken liteloader versions work
	switch (name) {
		case "org.ow2.asm:asm-all:5.0.3":
			return { name, url: "https://repo.maven.apache.org/maven2/" };
		case "org.ow2.asm:asm-all:5.2":
			return { name, url: "http://repo.liteloader.com/" };
	}

	return { name, url: lib.url };
}
