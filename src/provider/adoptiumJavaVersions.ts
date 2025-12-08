import { ADOPTIUM_API } from "#common/constants/urls.ts";
import { moduleLogger } from "#core/logger.ts";
import { defineProvider } from "#core/provider.ts";
import { AdoptiumJavaReleases, AdoptiumJavaRuntimeEntries } from "#schema/java/adoptiumJavaData.ts";

const RUNTIMES_URL = new URL("v3/", ADOPTIUM_API);

const logger = moduleLogger();

export default defineProvider({
	id: "adoptium-java",

	async provide(http): Promise<AdoptiumJavaRuntimeEntries[]> {
		const releases = AdoptiumJavaReleases.parse(
			(await http.getCached(new URL("info/available_releases", RUNTIMES_URL), "available-releases.json")).json()
		);

		return Promise.all(releases.available_releases.flatMap(async version => {
			const options = new URLSearchParams({
				image_type: "jre",
			});

			const response = await http.getCached(new URL(`assets/feature_releases/${version}/ga?${options}`, RUNTIMES_URL), `adoptium-java-runtime-${version}.json`)
				.catch(() => {
					logger.error(`Failed to get Adoptium JRE ${version} with General Access Version`);
					return null;
				});

			if (!response) {
				return [];
			}

			return AdoptiumJavaRuntimeEntries.parse(response?.json())
		}));
	},
})
