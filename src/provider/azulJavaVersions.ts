import { AZUL_API } from "#common/constants/urls.ts";
import { defineProvider } from "#core/provider.ts";
import { AzulJavaPackage } from "#schema/java/azulJavaData.ts";

const RUNTIMES_URL = new URL("v1/", AZUL_API);

export default defineProvider({
	id: "azul-java",

	async provide(http): Promise<AzulJavaPackage[]> {
		const versionsOptions = new URLSearchParams({
			release_status: "ga",
			latest: "true",
			archive_type: "zip",
			javafx_bundled: "false",
			java_package_type: "jre",
			include_fields: ["sha256_hash", "build_date", "os", "arch", "hw_bitness"].join(",")
		});

		const versions = AzulJavaPackage.array().parse(
			(await http.getCached(new URL("zulu/packages?" + versionsOptions.toString(), RUNTIMES_URL), "azul-java-packages.json")).json()
		);

		return versions;
	},
})
