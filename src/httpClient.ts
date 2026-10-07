export interface HTTPClient {
	get(url: string | URL): Promise<Response>;

	/**
	 * Fetch text over HTTP and store for later use or reuse stored data if it is up-to-date.
	 * @param url URL to GET
	 * @param key Cache key
	 * @param strategy Caching strategy
	 * @returns metadata and body
	 */
	getCached(
		url: string | URL,
		key: string,
		strategy: HTTPCacheStrategy,
	): Promise<Response>;

	/**
	 * Fetch metadata over HTTP and store for later use or reuse stored data if it is up-to-date. Simply uses Eternal cache strategy.
	 * @param url URL to HEAD
	 * @param key Cache key
	 * @param contentType Content-Type header
	 * @param strategy Caching strategy
	 * @returns metadata
	 */
	headCached(url: string | URL, key: string): Promise<Metadata>;

	/**
	 * Extract text out of a remote ZIP file. Simply uses Eternal cache strategy.
	 * @param url URL to extract from using
	 * @param files zip entry to cache key mapping
	 * @return array of zip entry content ordered the same as the files parameter
	 */
	unzipCached(
		url: string | URL,
		files: { path: string; key: string }[],
	): Promise<string[]>;
}

export interface Metadata {
	lastModified?: Date;
}

export interface Response extends Metadata {
	body: string;
	json(): unknown;
}

export const enum HTTPCacheMode {
	/**
	 * Check the digest of the locally cached value, and only perform a HTTP request if it does not match.
	 */
	CompareLocalDigest,
	/**
	 * Cache forever - never invalidate.
	 */
	Eternal,
}

export interface CompareLocalDigestStrategy {
	mode: HTTPCacheMode.CompareLocalDigest;
	algorithm: DigestAlgorithm;
	expected: string | Buffer;
}

export interface EternalStrategy {
	mode: HTTPCacheMode.Eternal;
}

export type HTTPCacheStrategy = CompareLocalDigestStrategy | EternalStrategy;

export type DigestAlgorithm = "sha-1" | "sha-256" | "sha-384" | "sha-512";
