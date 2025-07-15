import { z } from "zod/v4";

export const AzulJavaVersions = z.array(z.object(
	{
		java_version: z.array(z.int()).max(4)
	}
));

export type AzulJavaVersions = z.output<typeof AzulJavaVersions>;


export const AzulJavaPackage = z.object({
	arch: z.string(),
	build_date: z.coerce.date(),
	download_url: z.string(),
	hw_bitness: z.int(),
	java_version: z.array(z.int()).max(4),
	os: z.string(),
	product: z.string(),
	sha256_hash: z.string()
});

export type AzulJavaPackage = z.output<typeof AzulJavaPackage>;


export const AzulJavaPackages = z.array(AzulJavaPackage);

export type AzulJavaPackages = z.output<typeof AzulJavaPackages>;