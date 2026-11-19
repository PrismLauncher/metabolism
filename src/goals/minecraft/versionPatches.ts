// SPDX-FileCopyrightText: 2026 metabolism contributors
//
// SPDX-License-Identifier: MIT

import type { Patch } from "#common/transformation/patchSet.ts";
import type { VersionOutput } from "#index.ts";
import { VersionFileTrait } from "#schemas/format/v1/versionFile.ts";

export const MINECRAFT_VERSION_PATCHES: Patch<VersionOutput>[] = [
	{
		match: ["a1.0.5_01"],
		override: { mainClass: "y" },
	},
	{
		match: ["a1.0.4"],
		override: { mainClass: "y" },
	},
	{
		match: ["inf-20100618"],
		override: { mainClass: "net.minecraft.client.d" },
	},
	{
		match: ["c0.30_01c"],
		override: { mainClass: "com.mojang.minecraft.l" },
	},
	{
		match: ["c0.0.11a", "c0.0.13a"],
		override: { mainClass: "com.mojang.minecraft.Minecraft" },
	},
	{
		match: ["c0.0.13a_03"],
		override: { mainClass: "com.mojang.minecraft.c" },
	},
	{
		match: ["rd-132211..a1.2.1_01"],
		override: { "+traits": [VersionFileTrait.NoTexturePacks] },
	},
	{
		match: ["a1.2.2a..13w23b"],
		override: { "+traits": [VersionFileTrait.TexturePacks] },
	},
	{
		match: ["c0.30_01c..14w11a"],
		override: { "+traits": [VersionFileTrait.LegacyServices] },
	},
	{
		// See https://github.com/PrismLauncher/meta/issues/6
		match: ["inf-20100618..a1.1.2_01"],
		override: {
			"+jvmArgs": ["-Djava.util.Arrays.useLegacyMergeSort=true"],
		},
	},
];
