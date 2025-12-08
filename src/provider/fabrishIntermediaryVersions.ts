import { FABRIC_MAVEN, FABRIC_META } from "#common/constants/urls.ts";
import type { HTTPClient } from "#core/httpClient.ts";
import { defineProvider } from "#core/provider.ts";
import { FabricMetaVersion, FabricMetaVersions } from "#schema/fabric/fabricMeta.ts";

export const fabricIntermediaryVersions = defineProvider({
	id: "fabric-intermediary-versions",
	provide: http => provide(http, new URL("v2/", FABRIC_META), FABRIC_MAVEN),
});

export default [fabricIntermediaryVersions];

export interface FabricIntermediaryVersion extends FabricMetaVersion {
	lastModified: Date;
}

async function provide(http: HTTPClient, meta: string | URL, maven: string | URL): Promise<FabricIntermediaryVersion[]> {
	const list = FabricMetaVersions.parse(
		(await http.getCached(
			new URL("versions/intermediary", meta),
			"intermediary-versions.json",
		)).json()
	);

	return await Promise.all(list.map(async (version): Promise<FabricIntermediaryVersion> => {
		const infoResponse = await http.headCached(
			version.maven.url(maven, "jar"),
			version.version + ".jar"
		);

		if (!infoResponse.lastModified) {
			throw new Error("Missing Last-Modified header");
		}

		return {
			...version,
			lastModified: infoResponse.lastModified,
		};
	}));
}
