// SPDX-FileCopyrightText: 2026 metabolism contributors
// SPDX-FileCopyrightText: 2026 Prism Launcher meta contributors
//
// SPDX-License-Identifier: MS-PL

import type { LibraryPatch } from "#common/transformation/libraryPatches.ts";

export const MINECRAFT_LIBRARY_PATCHES: LibraryPatch[] = [
	{
		match: [
			"org.apache.logging.log4j:log4j-core:2.0-beta9",
			"org.apache.logging.log4j:log4j-core:2.0-rc2",
		],
		override: {
			downloads: {
				artifact: {
					sha1: "677991ea2d7426f76309a73739cecf609679492c",
					size: 677588,
					url: "https://files.prismlauncher.org/maven/org/apache/logging/log4j/log4j-core/2.0-beta9-fixed/log4j-core-2.0-beta9-fixed.jar",
				},
			},
			name: "org.apache.logging.log4j:log4j-core:2.0-beta9-fixed",
		},
	},
	{
		match: ["org.apache.logging.log4j:log4j-api:2.0-beta9"],
		override: {
			downloads: {
				artifact: {
					sha1: "b61eaf2e64d8b0277e188262a8b771bbfa1502b3",
					size: 107347,
					url: "https://files.prismlauncher.org/maven/org/apache/logging/log4j/log4j-api/2.0-beta9-fixed/log4j-api-2.0-beta9-fixed.jar",
				},
			},
			name: "org.apache.logging.log4j:log4j-api:2.0-beta9-fixed",
		},
	},
	{
		match: [
			"org.apache.logging.log4j:log4j-core:2.17.0",
			"org.apache.logging.log4j:log4j-core:2.16.0",
			"org.apache.logging.log4j:log4j-core:2.14.1",
			"org.apache.logging.log4j:log4j-core:2.8.1",
		],
		override: {
			downloads: {
				artifact: {
					sha1: "779f60f3844dadc3ef597976fcb1e5127b1f343d",
					size: 1790452,
					url: "https://repo1.maven.org/maven2/org/apache/logging/log4j/log4j-core/2.17.1/log4j-core-2.17.1.jar",
				},
			},
			name: "org.apache.logging.log4j:log4j-core:2.17.1",
		},
	},
	{
		match: [
			"org.apache.logging.log4j:log4j-api:2.17.0",
			"org.apache.logging.log4j:log4j-api:2.16.0",
			"org.apache.logging.log4j:log4j-api:2.14.1",
			"org.apache.logging.log4j:log4j-api:2.8.1",
		],
		override: {
			downloads: {
				artifact: {
					sha1: "d771af8e336e372fb5399c99edabe0919aeaf5b2",
					size: 301872,
					url: "https://repo1.maven.org/maven2/org/apache/logging/log4j/log4j-api/2.17.1/log4j-api-2.17.1.jar",
				},
			},
			name: "org.apache.logging.log4j:log4j-api:2.17.1",
		},
	},

	{
		// Add additional library just for osx-arm64. No override needed
		match: ["ca.weblite:java-objc-bridge:1.0.0"],
		additionalLibraries: [
			{
				downloads: {
					artifact: {
						sha1: "369a83621e3c65496348491e533cb97fe5f2f37d",
						size: 91947,
						url: "https://github.com/MinecraftMachina/Java-Objective-C-Bridge/releases/download/1.1.0-mmachina.1/java-objc-bridge-1.1.jar",
					},
				},
				name: "ca.weblite:java-objc-bridge:1.1.0-mmachina.1",
				rules: [
					{
						action: "allow",
						os: {
							name: "osx-arm64",
						},
					},
				],
			},
		],
	},
	{
		// Use a newer version on osx-arm64
		match: [
			"com.mojang:text2speech:1.0.10",
			"com.mojang:text2speech:1.5",
			"com.mojang:text2speech:1.6",
			"com.mojang:text2speech:1.7",
			"com.mojang:text2speech:1.10.1",
			"com.mojang:text2speech:1.10.3",
			"com.mojang:text2speech:1.11.2",
		],
		override: {
			rules: [
				{
					action: "allow",
				},
				{
					action: "disallow",
					os: {
						name: "osx-arm64",
					},
				},
			],
		},
		additionalLibraries: [
			{
				downloads: {
					artifact: {
						sha1: "f378f889797edd7df8d32272c06ca80a1b6b0f58",
						size: 13164,
						url: "https://libraries.minecraft.net/com/mojang/text2speech/1.11.3/text2speech-1.11.3.jar",
					},
				},
				name: "com.mojang:text2speech:1.11.3",
				rules: [
					{
						action: "allow",
						os: {
							name: "osx-arm64",
						},
					},
				],
			},
		],
	},
	{
		// Only allow osx-arm64 for existing java-objc-bridge:1.1
		match: ["ca.weblite:java-objc-bridge:1.1"],
		override: {
			rules: [
				{
					action: "allow",
					os: {
						name: "osx-arm64",
					},
				},
			],
		},
	},
	{
		// Use newer JNA on macOS to prevent crashes due to faulty assertion
		match: [
			"net.java.dev.jna:jna:5.6.0",
			"net.java.dev.jna:jna:5.8.0",
			"net.java.dev.jna:jna:5.9.0",
			"net.java.dev.jna:jna:5.10.0",
			"net.java.dev.jna:jna:5.12.1",
		],
		override: {
			rules: [
				{
					action: "allow",
				},
				{
					action: "disallow",
					os: {
						name: "osx",
					},
				},
				{
					action: "disallow",
					os: {
						name: "osx-arm64",
					},
				},
			],
		},
		additionalLibraries: [
			{
				downloads: {
					artifact: {
						sha1: "1200e7ebeedbe0d10062093f32925a912020e747",
						size: 1879325,
						url: "https://libraries.minecraft.net/net/java/dev/jna/jna/5.13.0/jna-5.13.0.jar",
					},
				},
				name: "net.java.dev.jna:jna:5.13.0",
				rules: [
					{
						action: "allow",
						os: {
							name: "osx",
						},
					},
					{
						action: "allow",
						os: {
							name: "osx-arm64",
						},
					},
				],
			},
		],
	},
	{
		// Use newer JNA on macOS to prevent crashes due to faulty assertion
		match: [
			"net.java.dev.jna:jna-platform:5.6.0",
			"net.java.dev.jna:jna-platform:5.8.0",
			"net.java.dev.jna:jna-platform:5.9.0",
			"net.java.dev.jna:jna-platform:5.10.0",
			"net.java.dev.jna:jna-platform:5.12.1",
		],
		override: {
			rules: [
				{
					action: "allow",
				},
				{
					action: "disallow",
					os: {
						name: "osx",
					},
				},
				{
					action: "disallow",
					os: {
						name: "osx-arm64",
					},
				},
			],
		},
		additionalLibraries: [
			{
				downloads: {
					artifact: {
						sha1: "88e9a306715e9379f3122415ef4ae759a352640d",
						size: 1363209,
						url: "https://libraries.minecraft.net/net/java/dev/jna/jna-platform/5.13.0/jna-platform-5.13.0.jar",
					},
				},
				name: "net.java.dev.jna:jna-platform:5.13.0",
				rules: [
					{
						action: "allow",
						os: {
							name: "osx",
						},
					},
					{
						action: "allow",
						os: {
							name: "osx-arm64",
						},
					},
				],
			},
		],
	},
];
