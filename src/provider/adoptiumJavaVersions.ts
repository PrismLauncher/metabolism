import { ADOPTIUM_API } from "#common/constants/urls.ts";
import { moduleLogger } from "#core/logger.ts";
import { defineProvider } from "#core/provider.ts";
import { AdoptiumJavaReleases, AdoptiumJavaRuntimeEntry } from "#schema/java/adoptiumJavaData.ts";
import z from "zod";

const RUNTIMES_URL = new URL("v3/", ADOPTIUM_API);

const logger = moduleLogger();

export default defineProvider({
	id: "adoptium-java",

	async provide(http): Promise<AdoptiumJavaRuntimeEntry[]> {
		const releases = AdoptiumJavaReleases.parse(
			(await http.getCached(new URL("info/available_releases", RUNTIMES_URL), "available-releases.json")).json()
		);

		return Promise.all(releases.available_releases.map(async version => {
			const response = await http.getCached(new URL(`assets/feature_releases/${version}/ga?image_type=jre`, RUNTIMES_URL), `adoptium-java-runtime-${version}.json`)
				.catch(() => {
					logger.error(`Failed to get Adoptium JRE ${version} with General Access Version`);
					return null;
				});

			if (!response) {
				return [];
			}

			return z.array(AdoptiumJavaRuntimeEntry).parse(response?.json());
		})).then(x => x.flat());
	},
})
