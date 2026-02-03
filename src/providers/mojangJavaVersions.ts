import { PISTON_META } from "#common/constants/urls.ts";
import { defineProvider } from "#index.ts";
import { PistonJavaRuntimeInfo } from "#schemas/pistonMeta/pistonJavaRuntimeInfo.ts";

const RUNTIMES_URL = new URL(
	"v1/products/java-runtime/2ec0cc96c44e5a76b9c8b7c39df7210883d12871/all.json",
	PISTON_META,
);

export default defineProvider({
	id: "mojang-java",

	async provide(http) {
		const info = PistonJavaRuntimeInfo.parse(
			(
				await http.getCached(RUNTIMES_URL, "java-runtime-all.json")
			).json(),
		);

		return info;
	},
});
