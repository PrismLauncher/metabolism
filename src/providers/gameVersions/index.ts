// SPDX-FileCopyrightText: 2026 metabolism contributors
//
// SPDX-License-Identifier: MIT

import { FABRIC_MAVEN, PISTON_META } from "#common/constants/urls.ts";
import { defineProvider, type Cache } from "#index.ts";
import { PistonVersion } from "#schemas/pistonMeta/pistonVersion.ts";
import {
	PistonVersionManifest,
	PistonVersionRef,
} from "#schemas/pistonMeta/pistonVersionManifest.ts";
import { orderBy } from "es-toolkit";
import { OLD_SNAPSHOTS } from "./oldSnapshots.ts";

export default defineProvider({
	id: "game-versions",

	async provide(cache): Promise<PistonVersion[]> {
		return Promise.all([
			pistonMetaVersions(cache),
			fabricMavenVersions(cache),
			oldSnapshots(cache),
		]).then((versions) =>
			orderBy(
				versions.flat(),
				[(version) => version.releaseTime],
				["desc"],
			),
		);
	},
});

async function pistonMetaVersions(cache: Cache): Promise<PistonVersion[]> {
	const base = "piston-meta";

	const manifest = PistonVersionManifest.parse(
		await fetch(
			new URL("mc/game/version_manifest_v2.json", PISTON_META),
		).then((x) => x.json()),
	);

	return await getVersions(cache, base, manifest.versions);
}

async function fabricMavenVersions(cache: Cache): Promise<PistonVersion[]> {
	const base = "fabric-maven";

	const manifest = PistonVersionManifest.parse(
		await fetch(
			new URL("net/minecraft/experimental_versions.json", FABRIC_MAVEN),
		).then((x) => x.json()),
	);

	return (await getVersions(cache, base, manifest.versions)).map((v) => ({
		...v,
		type: "experiment",
	}));
}

const OldSnapshotVersion = PistonVersion.omit({ downloads: true });

async function oldSnapshots(cache: Cache): Promise<PistonVersion[]> {
	const base = "old-snapshots";

	return await Promise.all(
		OLD_SNAPSHOTS.map(async (version): Promise<PistonVersion> => {
			const response = JSON.parse(
				await cache.getOrCompute(
					base + "/" + version.id + ".json",
					() => fetch(version.url).then((x) => x.text()),
				),
			);

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
	cache: Cache,
	base: string,
	versions: PistonVersionRef[],
): Promise<PistonVersion[]> {
	return await Promise.all(
		versions.map(async (version): Promise<PistonVersion> => {
			const response = JSON.parse(
				await cache.getOrCompute(
					base + "/" + version.id + ".json",
					() => fetch(version.url).then((x) => x.text()),
					{
						algorithm: "sha-1",
						expected: version.sha1,
					},
				),
			);

			// manifest ID and type should take precidence - in some cases we override it
			return {
				...PistonVersion.parse(response),
				id: version.id,
				type: version.type,
			};
		}),
	);
}
