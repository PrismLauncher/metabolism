// SPDX-FileCopyrightText: 2026 metabolism contributors
// SPDX-FileCopyrightText: 2026 Prism Launcher meta contributors
//
// SPDX-License-Identifier: MS-PL

import type { LibraryPatch } from "#common/transformation/libraryPatches.ts";

export const MINECRAFT_LIBRARY_PATCHES: LibraryPatch[] = [
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
