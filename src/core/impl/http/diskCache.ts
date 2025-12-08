import { setIfAbsent } from "#common/general.ts";
import { moduleLogger } from "#core/logger.ts";
import { Mutex, omit } from "es-toolkit";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { z, ZodError } from "zod";
import { deleteFileIfExists, digest, readFileIfExists } from "../util.ts";

const logger = moduleLogger();

const FILE_ENCODING: BufferEncoding = "utf-8";
const META_SUFFIX: string = ".entry.json";
const DIGEST_ENCODING: BufferEncoding = "base64";

const CacheEntryMeta = z.object({
	lastModified: z.coerce.date(),
	eTag: z.string(),
	sha1: z.string().transform(value => Buffer.from(value, DIGEST_ENCODING) as Buffer),
}).partial();

type CacheEntryMeta = z.output<typeof CacheEntryMeta>;
type CacheEntryMetaRaw = z.input<typeof CacheEntryMeta>;

interface CacheEntryInfo extends Omit<CacheEntryMeta, "sha1"> { }

export interface CacheEntry extends CacheEntryInfo {
	body?: { sha1: Buffer; value: string; };
}

export type CacheEntryWithBody = CacheEntry & { body: NonNullable<CacheEntry["body"]>; };

export interface CacheEntryWithoutSha1 extends CacheEntryInfo {
	body?: { value: string; };
}

type WithSha1<TEntry extends CacheEntryWithoutSha1> =
	TEntry["body"] extends object
	? TEntry & { body: NonNullable<CacheEntry["body"]>; }
	: TEntry;

export function hasBody(entry: CacheEntry): entry is CacheEntryWithBody {
	return "body" in entry;
}

export class DiskCache {
	private dir: string;
	private locks: Map<string, Mutex>;

	constructor(dir: string) {
		this.dir = path.join(dir, "/");
		this.locks = new Map;
	}

	/**
	 * Take exclusive control of an entry - pauses until the previous call is complete.
	 * @param key The cache key
	 */
	async use<T>(key: string, callback: (ref: CacheEntryAccessor) => T): Promise<Awaited<T>> {
		const lock = setIfAbsent(this.locks, key, new Mutex);
		await lock.acquire();

		try {
			return await callback(new CacheEntryAccessor(this.dir, key));
		} finally {
			lock.release();

			if (!lock.isLocked)
				this.locks.delete(key);
		}
	}

	async useAll<T>(keys: string[], callback: (refs: CacheEntryAccessor[]) => T): Promise<Awaited<T>> {
		const locks = keys.map(key => setIfAbsent(this.locks, key, new Mutex));
		await Promise.all(locks.map(lock => lock.acquire()));

		try {
			return await callback(keys.map(key => new CacheEntryAccessor(this.dir, key)));
		} finally {
			locks.forEach(lock => lock.release());

			for (const [i, lock] of locks.entries()) {
				const key = keys[i]!;

				if (!lock.isLocked)
					this.locks.delete(key);
			}
		}
	}
}


export class CacheEntryAccessor {
	private path: string;

	constructor(dir: string, key: string) {
		this.path = path.join(dir, key);

		if (!this.path.startsWith(dir))
			throw new Error(`Key escapes base directory: '${key}'`);
	}

	async read(): Promise<CacheEntry | null> {
		const metaJSON = await readFileIfExists(this.path + META_SUFFIX, FILE_ENCODING);

		if (metaJSON === null)
			return null;

		try {
			var meta = CacheEntryMeta.parse(JSON.parse(metaJSON));
		} catch (error) {
			if (!(error instanceof SyntaxError || error instanceof ZodError))
				throw error;

			logger.warn(`Corrupt cache entry (${error.message})`);

			return null;
		}

		if (!meta.sha1)
			return meta;

		const body = await readFileIfExists(this.path, FILE_ENCODING);

		if (body === null)
			return null;

		const digestBuffer = await digest("sha-1", body);

		if (!digestBuffer.equals(meta.sha1)) {
			logger.warn(`Modified cache entry (expected sha1sum of ${digestBuffer.toString("hex")})`);

			return null;
		}

		return {
			...omit(meta, ["sha1"]),
			body: { sha1: meta.sha1, value: body }
		};
	}

	async write<TEntry extends CacheEntryWithoutSha1>(entry: TEntry): Promise<WithSha1<TEntry>> {
		const sha1 = entry.body !== undefined
			? await digest("sha-1", entry.body.value)
			: undefined;

		const metaRaw: CacheEntryMetaRaw = {
			eTag: entry.eTag,
			lastModified: entry.lastModified?.toISOString(),
			sha1: sha1?.toString(DIGEST_ENCODING),
		};

		await mkdir(path.dirname(this.path), { recursive: true });

		await writeFile(this.path + META_SUFFIX, JSON.stringify(metaRaw), FILE_ENCODING);

		if (entry.body)
			await writeFile(this.path, entry.body.value);
		else
			await deleteFileIfExists(this.path);

		return {
			...entry,
			body: entry.body ? { value: entry.body.value, sha1 } : undefined
		} as any; // :)
	}
}
