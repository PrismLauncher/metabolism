// SPDX-FileCopyrightText: 2026 metabolism contributors
//
// SPDX-License-Identifier: MIT

import { NEOFORGE_MAVEN, NEOFORGE_MAVEN_API } from "#common/constants/urls.ts";
import { MavenArtifactRef } from "#common/maven.ts";
import { concurrencyLimit } from "#common/util.ts";
import { defineProvider, type Cache } from "#index.ts";
import { ForgeInstallProfile } from "#schemas/forge/forgeInstallProfile.ts";
import { ForgeVersionData } from "#schemas/forge/forgeVersionData.ts";
import { HttpReader, TextWriter, ZipReader } from "@zip.js/zip.js";
import { z } from "zod";

const ReposiliteVersions = z.object({
	isSnapshot: z.boolean(),
	versions: z.array(z.string()),
});

const CRINGE_VERSIONS = ["47.1.82", "1.20.1-47.1.7"];

export default defineProvider({
	id: "neoforge-loader-versions",
	provide: async (cache) => [
		...(await provide(cache, "net.neoforged", "neoforge")),
		...(await provide(cache, "net.neoforged", "forge")),
	],
});

export interface NeoForgeVersion {
	installerArtifact: MavenArtifactRef;
	versionData: ForgeVersionData;
	installProfile: ForgeInstallProfile;
}

async function provide(
	cache: Cache,
	group: string,
	artifact: string,
): Promise<NeoForgeVersion[]> {
	const basePath = group.replaceAll(".", "/") + "/" + artifact;

	const { versions } = ReposiliteVersions.parse(
		await fetch(
			new URL("versions/releases/" + basePath, NEOFORGE_MAVEN_API),
		).then((x) => x.json()),
	);

	const basedVersions = versions.filter(
		(version) => !CRINGE_VERSIONS.includes(version),
	);

	// NOTE: requesting all the JARs is quite demanding and we can easily reach the heap limit
	const limit = concurrencyLimit(6);

	return await Promise.all(
		basedVersions.map(async (version) => {
			const installerArtifact = new MavenArtifactRef({
				group,
				artifact,
				version,
				classifier: "installer",
			});

			const [versionJSON, installProfileJSON] = await limit(() =>
				getZipData(
					cache,
					`${artifact}-${version}`,
					installerArtifact.url(NEOFORGE_MAVEN, "jar"),
				),
			);

			const versionData = ForgeVersionData.parse(JSON.parse(versionJSON));
			const installProfile = ForgeInstallProfile.parse(
				JSON.parse(installProfileJSON),
			);

			return { installerArtifact, versionData, installProfile };
		}),
	);
}

async function getZipData(
	cache: Cache,
	cachePrefix: string,
	url: URL,
): Promise<[versionJSON: string, installProfileJSON: string]> {
	const versionKey = cachePrefix + ".version.json";
	const installProfileKey = cachePrefix + ".install_profile.json";

	const cachedVersionJSON = await cache.get(versionKey);
	const cachedInstallProfileJSON = await cache.get(installProfileKey);
	if (cachedVersionJSON !== null && cachedInstallProfileJSON !== null) {
		return [cachedVersionJSON, cachedInstallProfileJSON];
	}

	const jarReader = new ZipReader(
		new HttpReader(url, { useRangeHeader: true, forceRangeRequests: true }),
	);
	const entries = await jarReader.getEntries();

	const versionEntry = entries.find(
		(entry) => entry.filename === "version.json",
	);
	if (!versionEntry || versionEntry.directory) {
		throw new Error("Could not find version.json in " + url.href);
	}
	const versionJSON = await versionEntry.getData(new TextWriter());
	await cache.set(versionKey, versionJSON);

	const installProfileEntry = entries.find(
		(entry) => entry.filename === "install_profile.json",
	);
	if (!installProfileEntry || installProfileEntry.directory) {
		throw new Error("Could not find install_profile.json in " + url.href);
	}
	const installProfileJSON = await installProfileEntry.getData(
		new TextWriter(),
	);
	await cache.set(installProfileKey, installProfileJSON);

	return [versionJSON, installProfileJSON];
}
