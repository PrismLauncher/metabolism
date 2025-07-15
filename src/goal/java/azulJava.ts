import { setIfAbsent } from "#common/general.ts";
import { defineGoal, type VersionOutput } from "#core/goal.ts";
import azulJavaVersions from "#provider/java/azulJavaVersions.ts";
import type { VersionFileRuntime } from "#schema/format/v1/versionFile.ts";
import type { AzulJavaPackage, AzulJavaPackages } from "#schema/java/azulJavaData.ts";
import { orderBy } from "es-toolkit";

export default defineGoal({
	id: "com.azul.java",
	name: "Azul Provided Java",
	provider: azulJavaVersions,

	generate(info): VersionOutput[] {
		const result: VersionOutput[] = [];

		const majorVersions: Map<number, AzulJavaPackages> = new Map;

		for (const entry of info.flat())
			if (isAvailablePackage(entry)) {
				setIfAbsent(majorVersions, entry.java_version[0] || 0, []).push(entry);
			}

		for (const [majorVersion, entries] of majorVersions) {
			majorVersions.set(
				majorVersion,
				orderBy(entries, [entry => entry.build_date], ["desc"])
			);
		}

		for (const [majorVersion, entries] of majorVersions) {
			result.push({
				version: "java" + majorVersion,
				releaseTime: entries.at(-1)!.build_date.toISOString(),

				runtimes: entries.map(transformRuntime)
			});
		}

		return result;
	},
	recommend: () => false,
});

function isAvailablePackage(entry: AzulJavaPackage): boolean {
	if (entry.os != "linux" && entry.os != "windows" && entry.os != "macos") return false;
	if (entry.arch != "x86" && entry.arch != "arm") return false;
	return true;
}

function getOSType(entry: AzulJavaPackage): string {
	let osName = entry.os;
	if (osName == "macos") osName = 'mac-os';

	let architecture = entry.arch;
	if (architecture == "arm") architecture = "arm" + entry.hw_bitness;
	if (architecture == "x86") architecture = "x" + entry.hw_bitness;
	return `${osName}-${architecture}`;
}

function transformRuntime(entry: AzulJavaPackage): VersionFileRuntime {
	const name = `azul_${entry.product}_jre${entry.java_version[0]}.${entry.java_version[1]}.${entry.java_version[2]}`;
	const vendor = "azul";
	const downloadType = "archive";
	const packageType = "jre";
	const releaseTime = entry.build_date.toISOString();

	return {
		name,
		runtimeOS: getOSType(entry),

		version: {
			major: entry.java_version[0] || 0,
			minor: entry.java_version[1] || 0,
			security: entry.java_version[2] || 0
		},
		releaseTime,
		vendor,
		packageType,

		downloadType,
		checksum: {
			type: "sha256",
			hash: entry.sha256_hash,
		},
		url: entry.download_url,
	};
}

