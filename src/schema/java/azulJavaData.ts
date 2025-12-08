import { z } from "zod/v4";

export const AzulJavaPackage = z.object({
	arch: z.string(),
	build_date: z.coerce.date(),
	download_url: z.string(),
	hw_bitness: z.int(),
	java_version: z.array(z.int()).min(3).max(4),
	os: z.string(),
	product: z.string(),
	sha256_hash: z.string()
});

export type AzulJavaPackage = z.output<typeof AzulJavaPackage>;
