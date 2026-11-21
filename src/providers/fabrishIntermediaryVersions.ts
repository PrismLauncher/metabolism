// SPDX-FileCopyrightText: 2026 metabolism contributors
//
// SPDX-License-Identifier: MIT

import { FABRIC_MAVEN, FABRIC_META } from "#common/constants/urls.ts";
import { throwError } from "#common/util.ts";
import { defineProvider, type Cache } from "#index.ts";
import {
	FabricMetaVersion,
	FabricMetaVersions,
} from "#schemas/fabric/fabricMeta.ts";

export const fabricIntermediaryVersions = defineProvider({
	id: "fabric-intermediary-versions",
	provide: (cache) =>
		provide(cache, new URL("v2/", FABRIC_META), FABRIC_MAVEN),
});

export default [fabricIntermediaryVersions];

export interface FabricIntermediaryVersion extends FabricMetaVersion {
	lastModified: Date;
}

async function provide(
	cache: Cache,
	meta: string | URL,
	maven: string | URL,
): Promise<FabricIntermediaryVersion[]> {
	const list = FabricMetaVersions.parse(
		await fetch(new URL("versions/intermediary", meta)).then((x) =>
			x.json(),
		),
	);

	return await Promise.all(
		list.map(async (version): Promise<FabricIntermediaryVersion> => {
			const jarURL = version.maven.url(maven, "jar");
			const lastModified = new Date(
				await cache.getOrCompute(version.version + "-date.txt", () =>
					fetch(jarURL, { method: "HEAD" }).then(
						(x) =>
							x.headers.get("Last-Modified")
							?? throwError("Last-Modified header missing"),
					),
				),
			);

			return { ...version, lastModified };
		}),
	);
}
