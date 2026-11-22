// SPDX-FileCopyrightText: 2026 metabolism contributors
//
// SPDX-License-Identifier: MIT

import type { Cache } from "#index.ts";
import {
	ForgeInstallProfile,
	ForgeInstallProfileMerged,
} from "#schemas/forge/forgeInstallProfile.ts";
import { ForgeVersionInfo } from "#schemas/forge/forgeVersionInfo.ts";
import type { VersionFileLibrary } from "#schemas/format/v1/versionFile.ts";
import { HttpReader, TextWriter, ZipReader } from "@zip.js/zip.js";
import z from "zod";

export type ForgeInstallerJARData =
	| {
			merged: false;
			installProfile: ForgeInstallProfile;
			versionData: ForgeVersionInfo;
	  }
	| {
			merged: true;
			installProfile: ForgeInstallProfileMerged;
	  };

const AnyForgeInstallProfile = z.union([
	ForgeInstallProfile,
	ForgeInstallProfileMerged,
]);
type AnyForgeInstallProfile = z.infer<typeof AnyForgeInstallProfile>;

function isMergedInstallProfile(
	profile: AnyForgeInstallProfile,
): profile is ForgeInstallProfileMerged {
	return "versionInfo" in profile;
}

export async function getForgeInstallerJARData(
	cache: Cache,
	cachePrefix: string,
	url: URL,
): Promise<ForgeInstallerJARData> {
	const installProfileKey = cachePrefix + ".install_profile.json";
	const versionKey = cachePrefix + ".version.json";

	const cachedInstallProfileJSON = await cache.get(installProfileKey);
	if (cachedInstallProfileJSON !== null) {
		const cachedInstallProfile = AnyForgeInstallProfile.parse(
			JSON.parse(cachedInstallProfileJSON),
		);
		if (isMergedInstallProfile(cachedInstallProfile)) {
			// NOTE: files with the merged install profile format don't use version.json
			return { merged: true, installProfile: cachedInstallProfile };
		}

		const cachedVersionJSON = await cache.get(versionKey);
		if (cachedVersionJSON !== null) {
			const cachedVersion = ForgeVersionInfo.parse(
				JSON.parse(cachedVersionJSON),
			);
			return {
				merged: false,
				installProfile: cachedInstallProfile,
				versionData: cachedVersion,
			};
		}

		// NOTE: we need the version.json but don't have it, continue to request
	}

	const jarReader = new ZipReader(
		new HttpReader(url, { useRangeHeader: true, forceRangeRequests: true }),
	);
	const entries = await jarReader.getEntries();

	const installProfileEntry = entries.find(
		(entry) => entry.filename === "install_profile.json",
	);
	if (!installProfileEntry || installProfileEntry.directory) {
		throw new Error("Could not find install_profile.json in " + url.href);
	}
	const installProfileJSON = await installProfileEntry.getData(
		new TextWriter(),
	);
	await cache.set(installProfileKey, installProfileJSON);

	const installProfile = AnyForgeInstallProfile.parse(
		JSON.parse(installProfileJSON),
	);
	if (isMergedInstallProfile(installProfile)) {
		// NOTE: files with merged install profile format don't use version.json
		return { merged: true, installProfile };
	}

	const versionEntry = entries.find(
		(entry) => entry.filename === "version.json",
	);
	if (!versionEntry || versionEntry.directory) {
		throw new Error("Could not find version.json in " + url.href);
	}
	const versionJSON = await versionEntry.getData(new TextWriter());
	await cache.set(versionKey, versionJSON);

	const version = ForgeVersionInfo.parse(JSON.parse(versionJSON));
	return {
		merged: false,
		installProfile,
		versionData: version,
	};
}

export const FORGEWRAPPER_MAIN_CLASS =
	"io.github.zekerzhayard.forgewrapper.installer.Main";

export const FORGEWRAPPER_LIBRARY: VersionFileLibrary = {
	downloads: {
		artifact: {
			sha1: "4c4653d80409e7e968d3e3209196ffae778b7b4e",
			size: 29731,
			url: "https://files.prismlauncher.org/maven/io/github/zekerzhayard/ForgeWrapper/prism-2025-12-07/ForgeWrapper-prism-2025-12-07.jar",
		},
	},
	name: "io.github.zekerzhayard:ForgeWrapper:prism-2025-12-07",
};
