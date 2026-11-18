// SPDX-FileCopyrightText: 2026 metabolism contributors
//
// SPDX-License-Identifier: MIT

import { PistonLibrary } from "#schemas/pistonMeta/pistonVersion.ts";
import { z } from "zod";

// just what we need
export const ForgeInstallProfile = z.object({
	libraries: z.array(PistonLibrary),
});

export type ForgeInstallProfile = z.output<typeof ForgeInstallProfile>;
