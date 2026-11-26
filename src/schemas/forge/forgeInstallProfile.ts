// SPDX-FileCopyrightText: 2026 metabolism contributors
//
// SPDX-License-Identifier: MIT

import { PistonLibrary } from "#schemas/pistonMeta/pistonVersion.ts";
import { z } from "zod";
import { ForgeVersionInfoLegacy } from "./forgeVersionInfo.ts";

// NOTE: we include some fields we don't need just to make sure we're looking at the right file :)
export const ForgeInstallProfile = z.object({
	profile: z.string(),
	version: z.string(),
	// NOTE: for NeoForge, we assume this path
	json: z.literal("/version.json"),
	minecraft: z.string(),

	data: z.union([z.object(), z.array(z.unknown())]),
	processors: z.array(z.object()),
	libraries: z.array(PistonLibrary),
});

export const ForgeInstallProfileMerged = z.object({
	install: z.object({
		profileName: z.string(),
		target: z.string(),
		path: z.string(),
		minecraft: z.string(),
	}),
	versionInfo: ForgeVersionInfoLegacy,
});
export type ForgeInstallProfileMerged = z.infer<
	typeof ForgeInstallProfileMerged
>;

export type ForgeInstallProfile = z.output<typeof ForgeInstallProfile>;
