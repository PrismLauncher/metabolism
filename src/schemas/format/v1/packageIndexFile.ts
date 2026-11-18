// SPDX-FileCopyrightText: 2026 metabolism contributors
//
// SPDX-License-Identifier: MIT

import type { VersionFile } from "./versionFile.ts";

export interface PackageIndexFile {
	uid: string;
	name: string;
	formatVersion: 1;

	versions: PackageIndexFileVersion[];
}

export interface PackageIndexFileVersion extends Pick<
	VersionFile,
	"releaseTime" | "version" | "type" | "requires" | "conflicts"
> {
	recommended: boolean;
	sha256: string;
}
