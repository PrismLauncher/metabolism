import { setIfAbsent } from "#common/general.ts";
import { defineGoal, type VersionOutput } from "#core/goal.ts";
import adoptiumJavaVersions from "#provider/java/adoptiumJavaVersions.ts";
import type { VersionFileRuntime } from "#schema/format/v1/versionFile.ts";
import type { AdoptiumJavaBinary, AdoptiumJavaRuntimeEntries, AdoptiumJavaRuntimeEntry } from "#schema/java/adoptiumJavaData.ts";
import { orderBy } from "es-toolkit";

export default defineGoal({
	id: "net.adoptium.java",
	name: "Adoptium Provided Java",
	provider: adoptiumJavaVersions,

	generate(info): VersionOutput[] {
		const result: VersionOutput[] = [];

		const majorVersions: Map<number, AdoptiumJavaRuntimeEntries> = new Map;

		for (const entry of info.flat())
			if (entry) setIfAbsent(majorVersions, entry.version_data.major, []).push(entry);

		for (const [majorVersion, entries] of majorVersions) {
			majorVersions.set(
				majorVersion,
				orderBy(entries, [entry => entry.timestamp], ["desc"])
			);
		}

		for (const [majorVersion, entries] of majorVersions) {
			result.push({
				version: "java" + majorVersion,
				releaseTime: entries.at(-1)!.timestamp.toISOString(),

				runtimes: entries.flatMap(transformRuntime)
			});
		}

		return result;
	},
	recommend: () => false,
});

function isAvailableBinary(binary: AdoptiumJavaBinary): boolean {
	if (binary.os != "linux" && binary.os != "windows" && binary.os != "mac") return false;
	if (binary.architecture != "x64" && binary.architecture != "x86" && binary.architecture != "aarch64" && binary.architecture != "arm") return false;
	return true;
}

function getOSType(binary: AdoptiumJavaBinary): string {
	let osName = binary.os;
	if (osName == "mac") osName = 'mac-os';

	let architecture = binary.architecture;
	if (architecture == "aarch64") architecture = "arm64";
	if (architecture == "arm") architecture = "arm32";
	return `${osName}-${architecture}`;
}

function transformRuntime(entry: AdoptiumJavaRuntimeEntry): VersionFileRuntime[] {
	const result: VersionFileRuntime[] = [];

	const name = `${entry.vendor}_termurin_jre${entry.version_data.major}.${entry.version_data.minor}.${entry.version_data.security}+${entry.version_data.build}`;
	const vendor = entry.vendor;
	const downloadType = "archive";
	const packageType = "jre";
	const releaseTime = entry.timestamp.toISOString();

	for (const binary of entry.binaries) {
		if (!isAvailableBinary(binary)) continue;
		result.push({
			name,
			runtimeOS: getOSType(binary),

			version: {
				...entry.version_data
			},
			releaseTime,
			vendor,
			packageType,

			downloadType,
			checksum: {
				type: "sha256",
				hash: binary.package.checksum,
			},
			url: binary.package.link,
		});
	}

	return result;
}

