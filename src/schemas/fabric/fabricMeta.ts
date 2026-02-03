import { z } from "zod";
import { MavenArtifactRef } from "../mavenArtifactRef.ts";

export const FabricMetaVersion = z.object({
	maven: MavenArtifactRef,
	version: z.string(),
	separator: z.string().optional(),
});

export type FabricMetaVersion = z.output<typeof FabricMetaVersion>;

export const FabricMetaVersions = z.array(FabricMetaVersion);
