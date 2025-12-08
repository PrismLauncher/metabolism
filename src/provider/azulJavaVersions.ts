import { AZUL_API } from "#common/constants/urls.ts";
import { defineProvider } from "#core/provider.ts";
import { AzulJavaPackages, AzulJavaVersions } from "#schema/java/azulJavaData.ts";

const RUNTIMES_URL = new URL("v1/", AZUL_API);

export default defineProvider({
	id: "azul-java",

	async provide(http): Promise<AzulJavaPackages[]> {
		const versionsOptions = new URLSearchParams({
			release_status: "ga",
			latest: "true",
			os: "windows",
			arch: "x64",
			archive_type: "zip",
			javafx_bundled: "false",
			java_package_type: "jre",
		});

		const versions = AzulJavaVersions.parse(
			(await http.getCached(new URL("zulu/packages?" + versionsOptions, RUNTIMES_URL), "azul-java-windows-versions.json")).json()
		);

		const majorJavaVersions = [...new Set([...versions.map(x => x.java_version[0])])];
		return Promise.all(majorJavaVersions.map(async version => {
			const runtimeOptions = new URLSearchParams({
				java_version: String(version),
				release_status: "ga",
				latest: "true",
				archive_type: "zip",
				javafx_bundled: "false",
				java_package_type: "jre",
				include_fields: ["sha256_hash", "build_date", "os", "arch", "hw_bitness"].join(",")
			});
			const response = await http.getCached(new URL("zulu/packages?" + runtimeOptions, RUNTIMES_URL), `azul-java-runtime-${version}.json`)
			return AzulJavaPackages.parse(response.json())
		}));
	},
})
