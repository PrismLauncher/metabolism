// SPDX-FileCopyrightText: 2026 metabolism contributors
//
// SPDX-License-Identifier: MIT

import { z } from "zod";
import { MavenArtifactString } from "../maven.ts";

export const FabricMetaVersion = z.object({
	maven: MavenArtifactString,
	version: z.string(),
	separator: z.string().optional(),
});

export type FabricMetaVersion = z.output<typeof FabricMetaVersion>;

export const FabricMetaVersions = z.array(FabricMetaVersion);
