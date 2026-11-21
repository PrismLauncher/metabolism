// SPDX-FileCopyrightText: 2026 metabolism contributors
//
// SPDX-License-Identifier: MIT

import { ADOPTIUM_API } from "#common/constants/urls.ts";
import { defineProvider } from "#index.ts";
import { moduleLogger } from "#logger.ts";
import {
	AdoptiumJavaReleases,
	AdoptiumJavaRuntimeEntry,
} from "#schemas/java/adoptiumJavaData.ts";
import z from "zod";

const RUNTIMES_URL = new URL("v3/", ADOPTIUM_API);

const logger = moduleLogger();

export default defineProvider({
	id: "adoptium-java",

	async provide(): Promise<AdoptiumJavaRuntimeEntry[]> {
		const releases = AdoptiumJavaReleases.parse(
			await fetch(new URL("info/available_releases", RUNTIMES_URL)).then(
				(x) => x.json(),
			),
		);

		return Promise.all(
			releases.available_releases.map(async (version) => {
				const response = await fetch(
					new URL(
						`assets/feature_releases/${version}/ga?image_type=jre`,
						RUNTIMES_URL,
					),
				)
					.then((x) => x.json())
					.catch(() => {
						logger.error(
							`Failed to get Adoptium JRE ${version} with General Access Version`,
						);
						return null;
					});

				if (!response) {
					return [];
				}

				return z.array(AdoptiumJavaRuntimeEntry).parse(response);
			}),
		).then((x) => x.flat());
	},
});
