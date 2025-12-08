import { MavenArtifactRef } from "#schema/mavenArtifactRef.ts";
import { z } from "zod";

export const FabricLoaderLibrary = z.object({
	name: MavenArtifactRef,
	url: z.string().optional(),
	sha1: z.string().optional(),
	size: z.number().optional(),
});

export type FabricLoaderLibrary = z.output<typeof FabricLoaderLibrary>;

export const FabricInstallerData = z
	.object({
		version: z.union([z.literal(1), z.literal(2)]),
		libraries: z.object({
			client: z.array(FabricLoaderLibrary).default([]),
			common: z.array(FabricLoaderLibrary).default([]),
		}),
		min_java_version: z.number().optional(),
		mainClass: z
			.union([z.object({ client: z.string() }), z.string()])
			.transform((input) =>
				typeof input === "string" ? { client: input } : input,
			),
		launchwrapper: z
			.object({
				tweakers: z
					.object({
						client: z.array(z.string()).default([]),
						common: z.array(z.string()).default([]),
					})
					.prefault({}),
			})
			.prefault({}),
	})
	.transform((input) => ({
		formatVersion: input.version,
		minJavaVersion: input.min_java_version,
		libraries: input.libraries,
		mainClass: input.mainClass,
		launchWrapper: input.launchwrapper,
	}));

export type FabricInstallerData = z.output<typeof FabricInstallerData>;
