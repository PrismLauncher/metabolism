// SPDX-FileCopyrightText: 2026 metabolism contributors
//
// SPDX-License-Identifier: MIT

import { NEOFORGE_MAVEN, NEOFORGE_MAVEN_API } from "#common/constants/urls.ts";
import { MavenArtifactRef } from "#common/maven.ts";
import { getForgeInstallerJARData } from "#common/transformation/forge.ts";
import { concurrencyLimit } from "#common/util.ts";
import { defineProvider, type Cache } from "#index.ts";
import { ForgeInstallProfile } from "#schemas/forge/forgeInstallProfile.ts";
import type { ForgeVersionInfo } from "#schemas/forge/forgeVersionInfo.ts";
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
	installProfile: ForgeInstallProfile;
	versionData: ForgeVersionInfo;
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

	// NOTE: requesting all the JARs is quite demanding and we can easily reach the heap limit without this
	const limit = concurrencyLimit(6);

	return await Promise.all(
		basedVersions.map(async (version) => {
			const installerArtifact = new MavenArtifactRef({
				group,
				artifact,
				version,
				classifier: "installer",
			});

			const jarData = await limit(() =>
				getForgeInstallerJARData(
					cache,
					`${artifact}-${version}`,
					installerArtifact.url(NEOFORGE_MAVEN, "jar"),
				),
			);
			if (jarData.merged) {
				throw new Error(
					version + ": NeoForge does not use legacy install_profile",
				);
			}

			return {
				installerArtifact,
				installProfile: jarData.installProfile,
				versionData: jarData.versionData,
			};
		}),
	);
}
