import { OMNIARCHIVE_META, PISTON_META } from "#common/constants/urls.ts";
import { HTTPCacheMode, type HTTPClient } from "#httpClient.ts";
import { defineProvider } from "#metabolism.ts";
import { PistonVersion } from "#schemas/pistonMeta/pistonVersion.ts";
import {
	PistonVersionManifest,
	PistonVersionRef,
} from "#schemas/pistonMeta/pistonVersionManifest.ts";
import { orderBy } from "es-toolkit";
import { OMNIARCHIVE_MAPPINGS } from "./omniarchiveMappings.ts";

export default defineProvider({
	id: "game-versions",

	async provide(http): Promise<PistonVersion[]> {
		return Promise.all([
			pistonMetaVersions(http),
			omniarchiveVersions(http),
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
			await http.getCached(
				new URL("mc/game/version_manifest_v2.json", PISTON_META),
				base + "/versions.json",
			)
		).json(),
	);

	return await getVersions(http, base, manifest.versions);
}

// not all omniarchive versions - just enough to maintain backwards compat :)
async function omniarchiveVersions(http: HTTPClient): Promise<PistonVersion[]> {
	const base = "omniarchive";

	const manifest = PistonVersionManifest.parse(
		(
			await http.getCached(
				new URL("v1/manifest.json", OMNIARCHIVE_META),
				base + "/manifest.json",
			)
		).json(),
	);

	const versions = manifest.versions
		.filter((x) => Object.hasOwn(OMNIARCHIVE_MAPPINGS, x.id))
		.map((x) => ({ ...x, ...OMNIARCHIVE_MAPPINGS[x.id]! }));

	return getVersions(http, base, versions);
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
