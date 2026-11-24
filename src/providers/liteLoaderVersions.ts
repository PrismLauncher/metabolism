// SPDX-FileCopyrightText: 2026 metabolism contributors
//
// SPDX-License-Identifier: MIT

import { LITELOADER_VERSIONS } from "#common/constants/urls.ts";
import { defineProvider } from "#index.ts";
import { LiteLoaderVersions } from "#schemas/liteloader/liteLoaderVersions.ts";

const VERSIONS_URL = new URL("versions.json", LITELOADER_VERSIONS);

export default defineProvider({
	id: "liteloader-versions",

	async provide() {
		const info = LiteLoaderVersions.parse(
			await fetch(VERSIONS_URL).then((x) => x.json()),
		);

		return info;
	},
});
