import { FABRIC_MAVEN, PISTON_META } from "#common/constants/urls.ts";
import { HTTPCacheMode, type HTTPClient } from "#httpClient.ts";
import { defineProvider } from "#index.ts";
import { PistonVersion } from "#schemas/pistonMeta/pistonVersion.ts";
import {
	PistonVersionManifest,
	PistonVersionRef,
} from "#schemas/pistonMeta/pistonVersionManifest.ts";
import { orderBy } from "es-toolkit";
import { OLD_SNAPSHOTS } from "./oldSnapshots.ts";

export default defineProvider({
	id: "game-versions",

	async provide(http): Promise<PistonVersion[]> {
		return Promise.all([
			pistonMetaVersions(http),
			fabricMavenVersions(http),
			oldSnapshots(http),
		]).then((versions) =>
			orderBy(
				versions.flat(),
				[(version) => version.releaseTime],
				["desc"],
			),
		);
	},
});

async function pistonMetaVersions(http: HTTPClient): Promise<PistonVersion[]> {
	const base = "piston-meta";

	const manifest = PistonVersionManifest.parse(
		(
			await http.get(
				new URL("mc/game/version_manifest_v2.json", PISTON_META),
			)
		).json(),
	);

	return await getVersions(http, base, manifest.versions);
}

async function fabricMavenVersions(http: HTTPClient): Promise<PistonVersion[]> {
	const base = "fabric-maven";

	const manifest = PistonVersionManifest.parse(
		(
			await http.get(
				new URL(
					"net/minecraft/experimental_versions.json",
					FABRIC_MAVEN,
				),
			)
		).json(),
	);

	return await getVersions(http, base, manifest.versions);
}

const OldSnapshotVersion = PistonVersion.omit({ downloads: true });

async function oldSnapshots(http: HTTPClient): Promise<PistonVersion[]> {
	const base = "old-snapshots";

	return await Promise.all(
		OLD_SNAPSHOTS.map(async (version): Promise<PistonVersion> => {
			const response = (
				await http.getCached(
					version.url,
					base + "/" + version.id + ".json",
					{ mode: HTTPCacheMode.Eternal },
				)
			).json();

			// manifest ID and type should take precidence - in some cases we override it
			return {
				...OldSnapshotVersion.parse(response),
				type: "old_snapshot",
				javaVersion: {
					component: "jre-legacy",
					majorVersion: 8,
				},
				downloads: {
					client: {
						url: version.jar,
						sha1: version.sha1,
						size: version.size,
					},
				},
			};
		}),
	);
}

async function getVersions(
	http: HTTPClient,
	base: string,
	versions: PistonVersionRef[],
): Promise<PistonVersion[]> {
	return await Promise.all(
		versions.map(async (version): Promise<PistonVersion> => {
			const response = (
				await http.getCached(
					version.url,
					base + "/" + version.id + ".json",
					{
						mode: HTTPCacheMode.CompareLocalDigest,
						algorithm: "sha-1",
						expected: version.sha1,
					},
				)
			).json();

			// manifest ID and type should take precidence - in some cases we override it
			return {
				...PistonVersion.parse(response),
				id: version.id,
				type: version.type,
			};
		}),
	);
}
