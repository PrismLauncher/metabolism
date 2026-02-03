import type {
	VersionFileArtifact,
	VersionFileLibrary,
} from "#schemas/format/v1/versionFile.ts";
import type {
	PistonArgument,
	PistonArtifact,
	PistonLibrary,
	PistonRule,
} from "#schemas/pistonMeta/pistonVersion.ts";
import { mapValues, omit } from "es-toolkit";
import { isEmpty } from "es-toolkit/compat";

export function ruleSetAppliesByDefault(rules: PistonRule[]): boolean {
	if (rules.length === 0) {
		return true;
	}

	const highestPrecedence = rules.findLast(
		(rule) => isEmpty(rule.features) && isEmpty(rule.os),
	);

	return highestPrecedence?.action === "allow";
}

export function transformPistonLibrary(lib: PistonLibrary): VersionFileLibrary {
	return {
		...omit(lib, ["extract"]),
		name: lib.name.value,
		downloads:
			lib.downloads ?
				{
					artifact:
						lib.downloads.artifact ?
							transformPistonArtifact(lib.downloads.artifact)
						:	undefined,
					classifiers:
						lib.downloads.classifiers ?
							mapValues(
								lib.downloads.classifiers,
								transformPistonArtifact,
							)
						:	undefined,
				}
			:	undefined,
	};
}

export function transformPistonArtifact(
	artifact: PistonArtifact,
): VersionFileArtifact {
	return omit(artifact, ["path"]);
}

export function isPlatformLibrary(lib: PistonLibrary): boolean {
	return (
		(lib.rules != null && !ruleSetAppliesByDefault(lib.rules))
		|| (lib.natives != null && !isEmpty(lib.natives))
	);
}

const ARG_REF_PATTERN = /\$\{(\w+)\}/g;
const KNOWN_ARG_REFS = [
	"assets_index_name",
	"assets_root",
	"auth_access_token",
	"auth_player_name",
	"auth_session",
	"auth_uuid",
	"game_assets",
	"game_directory",
	"profile_name",
	"user_properties",
	"user_type",
	"version_name",
	"version_type",
];

// transform new arguments to legacy arguments because we're *still* using them :D
// NOTE: this might break in edge cases - but it's very unlikely
export function transformArgs(args: PistonArgument[]): string {
	const result = [...flattenArgs(args)];

	for (let i = result.length - 1; i >= 0; --i) {
		const arg = result[i]!;
		const prevArg = result[i - 1];

		const refs = [...arg.matchAll(ARG_REF_PATTERN)].map(
			(match) => match[1]!,
		);

		if (refs.every((ref) => KNOWN_ARG_REFS.includes(ref))) {
			continue;
		}

		// if we have unknown references, remove them
		result.splice(i, 1);

		if (arg.startsWith("-")) {
			continue;
		}

		// if the previous argument expects a value, remove it too
		if (prevArg?.startsWith("-") && !prevArg.includes("=")) {
			result.splice(i - 1, 1);
			--i;
		}
	}

	return result.join(" ");
}

function* flattenArgs(args: PistonArgument[]): Generator<string> {
	for (const arg of args) {
		if (typeof arg === "string") {
			yield arg;
		} else {
			if (arg.rules && !ruleSetAppliesByDefault(arg.rules)) {
				continue;
			}

			if (typeof arg.value === "string") {
				yield arg.value;
			} else {
				yield* arg.value;
			}
		}
	}
}
