// SPDX-FileCopyrightText: 2026 metabolism contributors
//
// SPDX-License-Identifier: MIT

import { AZUL_API } from "#common/constants/urls.ts";
import { defineProvider } from "#index.ts";
import { AzulJavaPackage } from "#schemas/java/azulJavaData.ts";

const RUNTIMES_URL = new URL("v1/", AZUL_API);

export default defineProvider({
	id: "azul-java",

	async provide(): Promise<AzulJavaPackage[]> {
		const versionsOptions = new URLSearchParams({
			release_status: "ga",
			latest: "true",
			archive_type: "zip",
			javafx_bundled: "false",
			java_package_type: "jre",
			include_fields: [
				"sha256_hash",
				"build_date",
				"os",
				"arch",
				"hw_bitness",
			].join(","),
		});

		const versions = AzulJavaPackage.array().parse(
			await fetch(
				new URL(
					"zulu/packages?" + versionsOptions.toString(),
					RUNTIMES_URL,
				),
			).then((x) => x.json()),
		);

		return versions;
	},
});
