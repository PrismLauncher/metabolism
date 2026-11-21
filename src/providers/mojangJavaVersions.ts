// SPDX-FileCopyrightText: 2026 metabolism contributors
//
// SPDX-License-Identifier: MIT

import { PISTON_META } from "#common/constants/urls.ts";
import { defineProvider } from "#index.ts";
import { PistonJavaRuntimeInfo } from "#schemas/pistonMeta/pistonJavaRuntimeInfo.ts";

const RUNTIMES_URL = new URL(
	"v1/products/java-runtime/2ec0cc96c44e5a76b9c8b7c39df7210883d12871/all.json",
	PISTON_META,
);

export default defineProvider({
	id: "mojang-java",

	async provide() {
		const info = PistonJavaRuntimeInfo.parse(
			await fetch(RUNTIMES_URL).then((x) => x.json()),
		);

		return info;
	},
});
