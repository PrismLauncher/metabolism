// SPDX-FileCopyrightText: 2026 metabolism contributors
//
// SPDX-License-Identifier: MIT

import type { Patch } from "#common/transformation/patchSet.ts";
import type { VersionOutput } from "#index.ts";

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
];
