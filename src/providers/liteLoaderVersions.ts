import { LITELOADER_VERSIONS } from "#common/constants/urls.ts";
import { defineProvider } from "#index.ts";
import { LiteLoaderVersions } from "#schemas/liteloader/liteLoaderVersions.ts";

export default defineProvider({
	id: "liteloader-versions",

	async provide(http): Promise<LiteLoaderVersions> {
		return LiteLoaderVersions.parse(
			(
				await http.get(new URL("versions.json", LITELOADER_VERSIONS))
			).json(),
		);
	},
});
