import { AZUL_API } from "#common/constants/urls.ts";
import { defineProvider } from "#core/provider.ts";
import { AzulJavaPackages, AzulJavaVersions } from "#schema/java/azulJavaData.ts";

const RUNTIMES_URL = new URL("v1/", AZUL_API);

export default defineProvider({
	id: "azul-java",

	async provide(http): Promise<AzulJavaPackages[]> {
		const versions = AzulJavaVersions.parse(
			(await http.getCached(new URL("zulu/packages?availability=GA&latest=true&os=windows&arch=x64&archive_type=zip&javafx_bundled=false&java_package_type=jre", RUNTIMES_URL), "azul-java-windows-versions.json")).json()
		);

		const majorJavaVersions = [...new Set([...versions.map(x => x.java_version[0])])];
		return Promise.all(majorJavaVersions.map(async version => {
			const response = await http.getCached(new URL(`zulu/packages/?java_version=${version}&archive_type=zip&java_package_type=jre&latest=true&release_status=ga&javafx_bundled=false&include_fields=sha256_hash,build_date,os,arch,hw_bitness`, RUNTIMES_URL), `azul-java-runtime-${version}.json`)
			return AzulJavaPackages.parse(response.json())
		}));
	},
})