import { PistonLibrary } from "#schema/pistonMeta/pistonVersion.ts";
import { z } from "zod";

// just what we need
export const ForgeInstallProfile = z.object({ libraries: z.array(PistonLibrary) });

export type ForgeInstallProfile = z.output<typeof ForgeInstallProfile>;
