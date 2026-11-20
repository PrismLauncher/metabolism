// SPDX-FileCopyrightText: 2026 metabolism contributors
//
// SPDX-License-Identifier: MIT

import { MavenArtifactRef } from "#common/maven.ts";
import { z } from "zod";

export const MavenArtifactString = z.string().transform((name, context) => {
	const [group, artifact, version, classifier] = name.split(":", 4);

	if (!group || !artifact || !version) {
		context.addIssue("Required: <group>:<artifact>:<version>");
		return z.NEVER;
	}

	return new MavenArtifactRef({
		group: group,
		artifact: artifact,
		version,
		classifier,
	});
});
