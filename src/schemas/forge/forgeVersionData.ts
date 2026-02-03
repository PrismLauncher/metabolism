import { PistonVersion } from "#schemas/pistonMeta/pistonVersion.ts";
import { z } from "zod";

// technically the schema is... literally just a version file but it's nicer to have things more specific to what we actually expect
export const ForgeVersionData = PistonVersion.pick({
	id: true,
	type: true,
	releaseTime: true,
	arguments: true,
	mainClass: true,
	libraries: true,
}).extend({ inheritsFrom: z.string() });

export type ForgeVersionData = z.output<typeof ForgeVersionData>;
