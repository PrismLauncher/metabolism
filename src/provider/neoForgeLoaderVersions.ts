import { NEOFORGE_MAVEN, NEOFORGE_MAVEN_API } from "#common/constants/urls.ts";
import { concurrencyLimit } from "#common/promises.ts";
import type { HTTPClient } from "#core/httpClient.ts";
import { defineProvider } from "#core/provider.ts";
import { ForgeInstallProfile } from "#schema/forge/forgeInstallProfile.ts";
import { ForgeVersionData } from "#schema/forge/forgeVersionData.ts";
import { MavenArtifactRef } from "#schema/mavenArtifactRef.ts";
import { z } from "zod";

const ReposiliteVersions = z.object({
	isSnapshot: z.boolean(),
	versions: z.array(z.string()),
});

const CRINGE_VERSIONS = ["47.1.82", "1.20.1-47.1.7"];

export default defineProvider({
	id: "neoforge-loader-versions",
	provide: async http => [
		...await provide(http, "net.neoforged", "neoforge"),
		...await provide(http, "net.neoforged", "forge"),
	]
});

export interface NeoForgeVersion {
	installerArtifact: MavenArtifactRef;
	versionData: ForgeVersionData;
	installProfile: ForgeInstallProfile;
}

async function provide(http: HTTPClient, group: string, artifact: string): Promise<NeoForgeVersion[]> {
	const basePath = group.replaceAll(".", "/") + "/" + artifact;

	const { versions } = ReposiliteVersions.parse(
		(await http.getCached(
			new URL("versions/releases/" + basePath, NEOFORGE_MAVEN_API),
			artifact + "-versions.json",
		)).json()
	);

	const basedVersions = versions.filter(version => !CRINGE_VERSIONS.includes(version));

	const limit = concurrencyLimit(6);

	return await Promise.all(basedVersions.map(async version => {
		const installerArtifact = MavenArtifactRef.parse(group + ":" + artifact + ":" + version + ":installer");
		const prefix = `${artifact}-${version}`;

		const [versionJSON, installProfileJSON] = await limit(() => http.unzipCached(
			installerArtifact.url(NEOFORGE_MAVEN, "jar"),
			[
				{ path: "version.json", key: prefix + ".version.json" },
				{ path: "install_profile.json", key: prefix + ".install-profile.json" }
			]
		));

		if (!versionJSON)
			throw new Error("Missing version.json for " + version);

		if (!installProfileJSON)
			throw new Error("Missing install_profile.json for " + version);

		const versionData = ForgeVersionData.parse(JSON.parse(versionJSON));
		const installProfile = ForgeInstallProfile.parse(JSON.parse(installProfileJSON));

		return { installerArtifact, versionData, installProfile };
	}));
};
