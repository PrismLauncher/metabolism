import type { VersionFilePlatform } from "#schemas/format/v1/versionFile.ts";
import type { ArtifactWithClassifier } from "./index.ts";

type ExtraNatives = Record<
	string,
	Partial<Record<VersionFilePlatform, ArtifactWithClassifier>>
>;

export const LWJGL_EXTRA_NATIVES: ExtraNatives = {
	// == x86 natives (LWJGL 3) ==

	// missing native due to the fact that versions using tinyfd on 3.2.2 force LWJGL 3.2.1 on intel mac (presumably for a workaround)
	"org.lwjgl:lwjgl-tinyfd:3.2.2": {
		osx: {
			classifier: "natives-osx",
			url: "https://libraries.minecraft.net/org/lwjgl/lwjgl-tinyfd/3.2.2/lwjgl-tinyfd-3.2.2-natives-macos.jar",
			sha1: "46d0798228b8a28e857a2a0f02310fd6ba2a4eab",
			size: 42136,
		},
	},
	// only intel mac has LWJGL 3.2.1 natives for tinyfd
	// if an instance only works on intel mac that is bad for portability :)
	"org.lwjgl:lwjgl-tinyfd:3.2.1": {
		windows: {
			classifier: "natives-windows",
			url: "https://libraries.minecraft.net/org/lwjgl/lwjgl-tinyfd/3.2.1/lwjgl-tinyfd-3.2.1-natives-windows.jar",
			sha1: "85750d2ca022852e15f58c0b94b3d1d4e7f0ba52",
			size: 207577,
		},
		linux: {
			classifier: "natives-linux",
			url: "https://libraries.minecraft.net/org/lwjgl/lwjgl-tinyfd/3.2.1/lwjgl-tinyfd-3.2.1-natives-linux.jar",
			sha1: "4ad49108397322596d7b85c2c687e5de6ee52157",
			size: 38192,
		},
	},

	// == ARM natives (LWJGL 2) ==

	"net.java.jinput:jinput-platform:2.0.5": {
		"osx-arm64": {
			classifier: "natives-osx-arm64",
			url: "https://github.com/r58Playz/jinput-m1/raw/main/plugins/OSX/bin/jinput-platform-2.0.5.jar",
			sha1: "5189eb40db3087fb11ca063b68fa4f4c20b199dd",
			size: 10031,
		},
		"linux-arm64": {
			classifier: "natives-linux-arm64",
			url: "https://github.com/theofficialgman/lwjgl3-binaries-arm64/raw/lwjgl-2.9.4/jinput-platform-2.0.5-natives-linux.jar",
			sha1: "42b388ccb7c63cec4e9f24f4dddef33325f8b212",
			size: 10932,
		},
		"linux-arm32": {
			classifier: "natives-linux-arm32",
			url: "https://github.com/theofficialgman/lwjgl3-binaries-arm32/raw/lwjgl-2.9.4/jinput-platform-2.0.5-natives-linux.jar",
			sha1: "f3c455b71c5146acb5f8a9513247fc06db182fd5",
			size: 4521,
		},
	},
	"org.lwjgl.lwjgl:lwjgl-platform:2.9.4-nightly-20150209": {
		"osx-arm64": {
			classifier: "natives-osx-arm64",
			url: "https://github.com/MinecraftMachina/lwjgl/releases/download/2.9.4-20150209-mmachina.2/lwjgl-platform-2.9.4-nightly-20150209-natives-osx.jar",
			sha1: "eff546c0b319d6ffc7a835652124c18089c67f36",
			size: 488316,
		},
		"linux-arm64": {
			classifier: "natives-linux-arm64",
			url: "https://github.com/theofficialgman/lwjgl3-binaries-arm64/raw/lwjgl-2.9.4/lwjgl-platform-2.9.4-nightly-20150209-natives-linux.jar",
			sha1: "63ac7da0f4a4785c7eadc0f8edc1e9dcc4dd08cb",
			size: 579979,
		},
		"linux-arm32": {
			classifier: "natives-linux-arm32",
			url: "https://github.com/theofficialgman/lwjgl3-binaries-arm32/raw/lwjgl-2.9.4/lwjgl-platform-2.9.4-nightly-20150209-natives-linux.jar",
			sha1: "fa483e540a9a753a5ffbb23dcf7879a5bf752611",
			size: 475177,
		},
	},
};
