import { FABRIC_MAVEN, QUILT_MAVEN } from "#common/constants/urls.ts";
import { defineGoal, type VersionOutput } from "#core/goal.ts";
import {
	fabricLoaderVersions,
	quiltLoaderVersions,
	type FabricLoaderVersion,
} from "#provider/fabrishLoaderVersions.ts";
import type { FabricLoaderLibrary } from "#schema/fabric/fabricInstallerData.ts";
import type { VersionFileLibrary } from "#schema/format/v1/versionFile.ts";

const fabricLoader = defineGoal({
	id: "net.fabricmc.fabric-loader",
	name: "Fabric Loader",
	provider: fabricLoaderVersions,

	generate: (data) =>
		data.map((info) => ({
			...transformVersion(info, FABRIC_MAVEN),
			type: "release",
		})),
	recommend: (first) => first,
});

const quiltLoader = defineGoal({
	id: "org.quiltmc.quilt-loader",
	name: "Quilt Loader",
	provider: quiltLoaderVersions,

	generate: (data) =>
		data.map((info) => {
			let type = "release";

			if (info.version.includes("-")) {
				let suffix = info.version.substring(
					info.version.lastIndexOf("-") + 1,
				);

				if (info.separator && suffix.includes(info.separator)) {
					suffix = suffix.substring(
						0,
						suffix.indexOf(info.separator),
					);
				}

				if (suffix === "pre") {
					type = "prerelease";
				} else if (suffix.length !== 0) {
					type = suffix;
				}
			}

			return { ...transformVersion(info, QUILT_MAVEN), type };
		}),
	recommend: (first) => first,
});

export default [fabricLoader, quiltLoader];

function transformVersion(
	version: FabricLoaderVersion,
	maven: string,
): VersionOutput {
	const data = version.installerData;

	return {
		version: version.version,
		releaseTime: version.lastModified.toISOString(),

		requires: [{ uid: "net.fabricmc.intermediary" }],

		mainClass: data.mainClass.client,
		"+tweakers": [
			...data.launchWrapper.tweakers.client,
			...data.launchWrapper.tweakers.common,
		],

		libraries: [
			{ name: version.maven.value, url: maven.toString() },
			...data.libraries.client.map(transformLoaderLibrary),
			...data.libraries.common.map(transformLoaderLibrary),
		],
	};
}

function transformLoaderLibrary(
	library: FabricLoaderLibrary,
): VersionFileLibrary {
	return { name: library.name.value, url: library.url };
}
