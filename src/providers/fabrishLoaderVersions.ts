import {
	FABRIC_MAVEN,
	FABRIC_META,
	QUILT_MAVEN,
	QUILT_META,
} from "#common/constants/urls.ts";
import { HTTPCacheMode, type HTTPClient } from "#httpClient.ts";
import { defineProvider } from "#index.ts";
import { FabricInstallerData } from "#schemas/fabric/fabricInstallerData.ts";
import {
	FabricMetaVersion,
	FabricMetaVersions,
} from "#schemas/fabric/fabricMeta.ts";

export const fabricLoaderVersions = defineProvider({
	id: "fabric-loader-versions",

	provide: (http) => provide(http, new URL("v2/", FABRIC_META), FABRIC_MAVEN),
});

export const quiltLoaderVersions = defineProvider({
	id: "quilt-loader-versions",

	provide: (http) => provide(http, new URL("v3/", QUILT_META), QUILT_MAVEN),
});

export default [fabricLoaderVersions, quiltLoaderVersions];

export interface FabricLoaderVersion extends FabricMetaVersion {
	installerData: FabricInstallerData;
	lastModified: Date;
}

async function provide(
	http: HTTPClient,
	meta: string | URL,
	maven: string | URL,
): Promise<FabricLoaderVersion[]> {
	const list = FabricMetaVersions.parse(
		(
			await http.getCached(
				new URL("versions/loader", meta),
				"loader-versions.json",
			)
		).json(),
	);

	return await Promise.all(
		list.map(async (version): Promise<FabricLoaderVersion> => {
			const installerDataResponse = await http.getCached(
				version.maven.url(maven, "json"),
				version.version + ".json",
				{ mode: HTTPCacheMode.Eternal },
			);

			if (!installerDataResponse.lastModified) {
				throw new Error("Missing Last-Modified header");
			}

			const installerData = FabricInstallerData.parse(
				installerDataResponse.json(),
			);

			return {
				installerData,
				lastModified: installerDataResponse.lastModified,
				...version,
			};
		}),
	);
}
