import { z } from "zod/v4";

export const AdoptiumJavaReleases = z.object({
    available_lts_releases: z.array(z.int32()),
    available_releases: z.array(z.int32()),
    most_recent_feature_release: z.int32(),
    most_recent_feature_version: z.int32(),
    most_recent_lts: z.int32(),
    tip_version: z.int32(),
});

export type AdoptiumJavaReleases = z.output<typeof AdoptiumJavaReleases>;


export const AdoptiumJavaBinary = z.object({
    architecture: z.string(),
    image_type: z.string(),
    os: z.string(),
    package: z.object({
        checksum: z.string(),
        link: z.string()
    })
});

export type AdoptiumJavaBinary = z.output<typeof AdoptiumJavaBinary>;


export const AdoptiumJavaRuntimeEntry = z.object({
    binaries: z.array(AdoptiumJavaBinary),
    vendor: z.string(),
    timestamp: z.coerce.date(),
    version_data: z.object({
        major: z.int32(),
        minor: z.int32(),
        security: z.int32(),
        build: z.int32()
    })
});

export type AdoptiumJavaRuntimeEntry = z.output<typeof AdoptiumJavaRuntimeEntry>;


export const AdoptiumJavaRuntimeEntries = z.array(AdoptiumJavaRuntimeEntry);

export type AdoptiumJavaRuntimeEntries = z.output<typeof AdoptiumJavaRuntimeEntries>;