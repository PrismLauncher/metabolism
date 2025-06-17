import type { VersionFileRuntime } from "#schema/format/v1/versionFile.ts";
import { mapValues } from "es-toolkit";
import { z } from "zod/v4";

const VERSION_PATTERN = /^(?<major>\d+)(?:\.(?<minor>\d+))?(?:\.(?<security>\d+))?(?:\.(?<build>\d+))?/;
const LEGACY_VERSION_PATTERN = /^(?<major>\d+)u(?<security>\d+)(?:b(?<build>\d+))?/;

export const PistonJavaRuntimeEntry = z.object({
	manifest: z.object({
		sha1: z.string(),
		size: z.number(),
		url: z.string(),
	}),
	version: z.object({
		name: z.string(),
		released: z.coerce.date(),
	}).transform((version, context) => {
		let match = version.name.match(LEGACY_VERSION_PATTERN);

		if (!match)
			match = version.name.match(VERSION_PATTERN);

		if (!match) {
			context.addIssue(`Got '${version.name}' - must match ${VERSION_PATTERN} or ${LEGACY_VERSION_PATTERN}`);
			return z.NEVER;
		}

		const parsed = mapValues(match.groups!, x => {
			const parsed = parseInt(x);

			if (isNaN(parsed))
				return undefined;
			else
				return parsed;
		}) as Omit<VersionFileRuntime["version"], "name">;

		return { ...version, parsed };
	})
});

export type PistonJavaRuntimeEntry = z.output<typeof PistonJavaRuntimeEntry>;

export const PistonJavaRuntimeInfo = z.record(
	z.string(),
	z.record(
		z.string(),
		z.array(PistonJavaRuntimeEntry)
	)
);

export type PistonJavaRuntimeInfo = z.output<typeof PistonJavaRuntimeInfo>;
