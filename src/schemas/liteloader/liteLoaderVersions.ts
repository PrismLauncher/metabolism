import { z } from "zod";
import { MavenArtifactRef } from "../mavenArtifactRef.ts";

export const LiteLoaderLibrary = z.object({
	name: MavenArtifactRef,
	url: z.string().optional(),
});

export type LiteLoaderLibrary = z.output<typeof LiteLoaderLibrary>;

/*
    "53639d52340479ccf206a04f5e16606f":{
        "tweakClass":"com.mumfrey.liteloader.launch.LiteLoaderTweaker",
        "libraries":[
            {
                "name":"net.minecraft:launchwrapper:1.5"
            },
            {
                "name":"net.sf.jopt-simple:jopt-simple:4.5"
            },
            {
                "name":"org.ow2.asm:asm-all:4.1"
            }
        ],
        "stream":"RELEASE",
        "file":"liteloader-1.5.2_01.jar",
        "version":"1.5.2_01",
        "md5":"53639d52340479ccf206a04f5e16606f",
        "timestamp":"1367366420"
    },
*/
export const LiteLoaderArtefact = z.object({
	tweakClass: z.string(),
	libraries: z.array(LiteLoaderLibrary),
	stream: z.string(),
	file: z.string(),
	version: z.string(),
	md5: z.string(),
	timestamp: z.coerce
		.number()
		.transform((seconds) => new Date(seconds * 1000)),
});

export type LiteLoaderArtefact = z.output<typeof LiteLoaderArtefact>;

export const LiteLoaderArtefacts = z.object({
	"com.mumfrey:liteloader": z.record(z.string(), LiteLoaderArtefact),
});

export type LiteLoaderArtefacts = z.output<typeof LiteLoaderArtefacts>;

/*
	{
		"meta":{
			"description":"LiteLoader is a lightweight mod bootstrap designed to provide basic loader functionality for mods which don't need to modify game mechanics.",
			"authors":"Mumfrey",
			"url":"http://dl.liteloader.com",
			"updated":"2017-02-22T11:34:07+00:00",
			"updatedTime":1487763247
		},
		"versions":{
			"1.10.2":{
				"artefacts":{
					"com.mumfrey:liteloader":{ },
					...
				},
				"snapshots":{
					...
				}
		}
}
*/
export const LiteLoaderVersions = z.object({
	meta: z.object({
		description: z.string(),
		authors: z.string(),
		url: z.string(),
	}),
	versions: z.record(
		z.string(),
		z.object({
			artefacts: LiteLoaderArtefacts.optional(),
			snapshots: LiteLoaderArtefacts.optional(),
		}),
	),
});

export type LiteLoaderVersions = z.output<typeof LiteLoaderVersions>;
