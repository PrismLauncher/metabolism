// SPDX-FileCopyrightText: 2026 metabolism contributors
//
// SPDX-License-Identifier: MIT

import { MavenArtifactString } from "#schemas/maven.ts";
import { PistonVersion } from "#schemas/pistonMeta/pistonVersion.ts";
import z from "zod";

export const ForgeVersionInfo = PistonVersion.omit({
	downloads: true,
});
export type ForgeVersionInfo = z.infer<typeof ForgeVersionInfo>;

export const ForgeLibraryLegacy = z.object({
	name: MavenArtifactString,
	url: z.string().optional(),
});
export type ForgeLibraryLegacy = z.infer<typeof ForgeLibraryLegacy>;

export const ForgeVersionInfoLegacy = z.object({
	id: z.string(),
	time: z.coerce.date(),
	minecraftArguments: z.string(),
	inheritsFrom: z.string().optional(),
	mainClass: z.string(),
	libraries: ForgeLibraryLegacy.array(),
});
export type ForgeVersionInfoLegacy = z.infer<typeof ForgeVersionInfoLegacy>;
