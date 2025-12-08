import { z } from "zod";

export const PistonVersionRef = z.object({
	id: z.string(),
	type: z.string(),
	url: z.url(),
	sha1: z.string(),
});

export type PistonVersionRef = z.output<typeof PistonVersionRef>;

export const PistonVersionManifest = z.object({
	versions: z.array(PistonVersionRef),
});

export type PistonVersionManifest = z.output<typeof PistonVersionManifest>;
