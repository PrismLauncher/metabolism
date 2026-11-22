// SPDX-FileCopyrightText: 2026 metabolism contributors
//
// SPDX-License-Identifier: MIT

import { FORGE_FILES, FORGE_MAVEN } from "#common/constants/urls.ts";
import { MavenArtifactRef } from "#common/maven.ts";
import {
	getForgeInstallerJARData,
	type ForgeInstallerJARData,
} from "#common/transformation/forge.ts";
import { concurrencyLimit, throwError } from "#common/util.ts";
import { defineProvider, type Cache } from "#index.ts";
import z from "zod";

const ForgeArtifactInfo = z.object({
	sha1: z.string(),
	size: z.number(),
	lastModified: z.coerce.date(),
});
export type ForgeArtifactInfo = z.output<typeof ForgeArtifactInfo>;

interface ForgeVersionBase {
	version: string;
	bareVersion: string;
	gameVersion: string;
}

export interface ModernForgeVersion extends ForgeVersionBase {
	legacy: false;
	installer: MavenArtifactRef;
	installerInfo: ForgeArtifactInfo;
	installerJARData: ForgeInstallerJARData;
	universal?: MavenArtifactRef;
	universalInfo?: ForgeArtifactInfo;
}

export interface LegacyForgeVersion extends ForgeVersionBase {
	legacy: true;
	jarMod: MavenArtifactRef;
	jarModInfo: ForgeArtifactInfo;
}

export type ForgeVersion = ModernForgeVersion | LegacyForgeVersion;

export default defineProvider({
	id: "forge-loader-versions",

	async provide(http): Promise<ForgeVersion[]> {
		return provide(http, "net.minecraftforge", "forge");
	},
});

// Minecraft version -> Forge version
const MavenMetadata = z.record(z.string(), z.string().array());
type MavenMetadata = z.infer<typeof MavenMetadata>;

const VersionMeta = z.object({
	classifiers: z.record(
		z.string(),
		z.record(z.string(), z.string().nullable()), // classifier extensions -> md5 (thanks Forge)
	),
});
type VersionMeta = z.infer<typeof VersionMeta>;

async function getArtifactInfo(
	cache: Cache,
	key: string,
	url: URL,
): Promise<ForgeArtifactInfo> {
	const json = await cache.getOrCompute(key, async () => {
		const headers = await fetch(url, { method: "HEAD" }).then(
			(resp) => resp.headers,
		);
		const size = parseInt(
			headers.get("Content-Length")
				?? throwError("Content-Length header missing on " + url.href),
		);
		if (isNaN(size)) {
			throw new Error(
				"Could not determine response size from " + url.href,
			);
		}

		const lastModified =
			headers.get("Last-Modified")
			?? throwError("Last-Modified header missing on " + url.href);

		const sha1 = await fetch(url.href + ".sha1").then((resp) =>
			resp.text(),
		);

		return JSON.stringify({ size, sha1, lastModified });
	});
	return ForgeArtifactInfo.parse(JSON.parse(json));
}

async function provide(
	cache: Cache,
	group: string,
	artifactID: string,
): Promise<ForgeVersion[]> {
	const basePath = group.replaceAll(".", "/") + "/" + artifactID;

	const mavenMetadata = MavenMetadata.parse(
		await fetch(
			new URL(basePath + "/maven-metadata.json", FORGE_FILES),
		).then((x) => x.json()),
	);

	// NOTE: requesting all the JARs is quite demanding and we can easily reach the heap limit without this
	const limit = concurrencyLimit(6);

	const fetchVersion = async (
		version: string,
		gameVersion: string,
	): Promise<ForgeVersion | null> => {
		// NOTE: we use the meta.json only to determine the presence of classifiers
		// the md5 checksums are useless
		const { classifiers } = VersionMeta.parse(
			JSON.parse(
				await cache.getOrCompute(
					artifactID + "-" + version + ".meta.json",
					() =>
						fetch(
							new URL(
								`${basePath}/${version}/meta.json`,
								FORGE_FILES,
							),
						).then((x) => x.text()),
				),
			),
		);

		const splitVersion = version.split("-", 3);
		// HACK: skip the prefix and suffix
		const bareVersion = splitVersion[1] ?? splitVersion[0]!;

		const baseArtifact = new MavenArtifactRef({
			group,
			artifact: artifactID,
			version,
		});

		if (classifiers.client?.zip || classifiers.universal?.zip) {
			// we're a jarmod-based (therefore legacy) version
			// NOTE: jarmod based versions use a client.zip or universal.zip but not universal.jar

			const classifier = classifiers.client?.zip ? "client" : "universal";
			const jarMod = new MavenArtifactRef({
				...baseArtifact,
				classifier,
			});

			const jarModInfo = await getArtifactInfo(
				cache,
				`${artifactID}-${version}-${classifier}.info.json`,
				jarMod.url(FORGE_MAVEN, "zip"),
			);
			return {
				version,
				bareVersion,
				gameVersion,
				legacy: true,
				jarMod,
				jarModInfo,
			};
		} else if (classifiers.installer?.jar) {
			const installer = new MavenArtifactRef({
				...baseArtifact,
				classifier: "installer",
			});

			const installerCachePrefix = `${artifactID}-${version}-${installer.classifier!}`;
			const installerURL = installer.url(FORGE_MAVEN, "jar");
			const installerInfo = await getArtifactInfo(
				cache,
				installerCachePrefix + ".info.json",
				installerURL,
			);
			const installerJARData = await limit(() =>
				getForgeInstallerJARData(
					cache,
					installerCachePrefix,
					installerURL,
				),
			);

			let universal: MavenArtifactRef | undefined;
			let universalInfo: ForgeArtifactInfo | undefined;
			if (classifiers?.universal?.jar) {
				// NOTE: only present before 1.13 (when LaunchWrapper was used)
				// we need to add this library to the classpath otherwise the tweaker can't be found

				universal = new MavenArtifactRef({
					...baseArtifact,
					classifier: "universal",
				});

				if (!installerJARData.merged) {
					// NOTE: for non-merged format we need size and hash too
					const universalCachePrefix = `${artifactID}-${version}-${universal.classifier!}`;
					const universalURL = universal.url(FORGE_MAVEN, "jar");
					universalInfo = await getArtifactInfo(
						cache,
						universalCachePrefix + ".info.json",
						universalURL,
					);
				}
			}

			return {
				version,
				bareVersion,
				gameVersion,
				legacy: false,
				installer,
				installerInfo,
				installerJARData,
				universal,
				universalInfo,
			};
		} else {
			// no applicable files
			return null;
		}
	};

	return Promise.all(
		Object.entries(mavenMetadata).flatMap(([gameVersion, versions]) =>
			versions.map((version) => fetchVersion(version, gameVersion)),
		),
	).then((versions) => versions.filter((x) => x !== null));
}
