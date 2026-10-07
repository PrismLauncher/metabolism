import type { VersionFile } from "#schemas/format/v1/versionFile.ts";

export const MINECRAFT_VERSION_PATCHES: Record<string, Partial<VersionFile>> = {
	"a1.0.5_01": {
		mainClass: "y",
	},
	"a1.0.4": {
		mainClass: "ax",
	},
	"inf-20100618": {
		mainClass: "net.minecraft.client.d",
	},
	"c0.30_01c": {
		mainClass: "com.mojang.minecraft.l",
	},
	"c0.0.13a": {
		mainClass: "com.mojang.minecraft.Minecraft",
	},
	"c0.0.13a_03": {
		mainClass: "com.mojang.minecraft.c",
	},
	"c0.0.11a": {
		mainClass: "c0.0.11a",
	},
};
