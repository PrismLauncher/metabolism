// SPDX-FileCopyrightText: 2026 metabolism contributors
//
// SPDX-License-Identifier: MIT

import {
	FABRIC_MAVEN,
	FABRIC_META,
	QUILT_MAVEN,
	QUILT_META,
} from "#common/constants/urls.ts";
import { throwError } from "#common/util.ts";
import { defineProvider, type Cache } from "#index.ts";
import { FabricInstallerData } from "#schemas/fabric/fabricInstallerData.ts";
import {
	FabricMetaVersion,
	FabricMetaVersions,
} from "#schemas/fabric/fabricMeta.ts";

export const fabricLoaderVersions = defineProvider({
	id: "fabric-loader-versions",

	provide: (cache) =>
		provide(cache, new URL("v2/", FABRIC_META), FABRIC_MAVEN),
});

export const quiltLoaderVersions = defineProvider({
	id: "quilt-loader-versions",

	provide: (cache) => provide(cache, new URL("v3/", QUILT_META), QUILT_MAVEN),
});

export default [fabricLoaderVersions, quiltLoaderVersions];

export interface FabricLoaderVersion extends FabricMetaVersion {
	installerData: FabricInstallerData;
	lastModified: Date;
}

async function provide(
	cache: Cache,
	meta: string | URL,
	maven: string | URL,
): Promise<FabricLoaderVersion[]> {
	const list = FabricMetaVersions.parse(
		await fetch(new URL("versions/loader", meta)).then((x) => x.json()),
	);

	return await Promise.all(
		list.map(async (version): Promise<FabricLoaderVersion> => {
			const installerDataURL = version.maven.url(maven, "json");
			const installerData = FabricInstallerData.parse(
				JSON.parse(
					await cache.getOrCompute(version.version + ".json", () =>
						fetch(installerDataURL).then((x) => x.text()),
					),
				),
			);

			const loaderURL = version.maven.url(maven, "jar");
			const loaderLastModified = new Date(
				await cache.getOrCompute(version.version + "-date.txt", () =>
					fetch(loaderURL, { method: "HEAD" }).then(
						(x) =>
							x.headers.get("Last-Modified")
							?? throwError("Last-Modified header missing"),
					),
				),
			);

			return {
				installerData,
				lastModified: loaderLastModified,
				...version,
			};
		}),
	);
}
