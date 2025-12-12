import { setIfAbsent } from "#common/general.ts";
import { defineGoal, type VersionOutput } from "#core/goal.ts";
import mojangJavaVersions from "#provider/mojangJavaVersions.ts";
import type { VersionFileRuntime } from "#schema/format/v1/versionFile.ts";
import type {
	PistonJavaRuntimeEntry,
	PistonJavaRuntimeInfo,
} from "#schema/pistonMeta/pistonJavaRuntimeInfo.ts";
import { orderBy } from "es-toolkit";

export default defineGoal({
	id: "net.minecraft.java",
	name: "Mojang Provided Java",
	deps: [mojangJavaVersions],

	generate([versions]) {
		const result: VersionOutput[] = [];

		const majorVersions: Map<number, FullRuntimeInfo[]> = new Map();

		for (const entry of flattenInfo(versions)) {
			setIfAbsent(majorVersions, entry.version.parsed.major, []).push(
				entry,
			);
		}

		for (const [majorVersion, entries] of majorVersions) {
			majorVersions.set(
				majorVersion,
				orderBy(entries, [(entry) => entry.version.released], ["desc"]),
			);
		}

		for (const [majorVersion, entries] of majorVersions) {
			result.push({
				version: "java" + majorVersion,
				releaseTime: entries.at(-1)!.version.released.toISOString(),

				runtimes: entries.map(transformRuntime),
			});
		}

		return result;
	},
	recommend: () => false,
});

type FullRuntimeInfo = PistonJavaRuntimeEntry & { os: string; name: string };

function* flattenInfo(info: PistonJavaRuntimeInfo): Generator<FullRuntimeInfo> {
	for (const [os, entriesByName] of Object.entries(info)) {
		for (const [name, entries] of Object.entries(entriesByName)) {
			for (const entry of entries) {
				yield { ...entry, os, name };
			}
		}
	}
}
function transformRuntime(entry: FullRuntimeInfo): VersionFileRuntime {
	const os =
		entry.os === "mac-os" || !entry.os.includes("-") ?
			entry.os + "-x64"
		:	entry.os;

	return {
		name: entry.name,
		runtimeOS: os,

		version: {
			...entry.version.parsed,
			name: entry.version.name,
		},
		releaseTime: entry.version.released.toISOString(),
		vendor: "mojang",
		packageType: "jre",

		downloadType: "manifest",
		checksum: {
			type: "sha1",
			hash: entry.manifest.sha1,
		},
		url: entry.manifest.url,
	};
}
