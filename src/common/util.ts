// SPDX-FileCopyrightText: 2026 metabolism contributors
//
// SPDX-License-Identifier: MIT

import { isPlainObject, Semaphore } from "es-toolkit";
import { readFile } from "node:fs/promises";

export function throwError(error: Error | string): never {
	if (typeof error === "string") {
		throw new Error(error);
	} else {
		throw error;
	}
}

// we need to do this for inheritence without interference
type InferKey<T extends Map<any, any>> =
	T extends Map<infer K, infer _> ? K : never;
type InferValue<T extends Map<any, any>> =
	T extends Map<infer _, infer V> ? V : never;

/** Roughly equivilent to map[key] ??= defaultValue */
export function setIfAbsent<TMap extends Map<any, any>>(
	map: TMap,
	key: InferKey<TMap>,
	value: InferValue<TMap>,
): InferValue<TMap> {
	if (map.has(key)) {
		return map.get(key);
	} else {
		map.set(key, value);
		return value;
	}
}

export function concurrencyLimit(max: number) {
	const semaphore = new Semaphore(max);

	return async function limit<T>(callback: () => T): Promise<Awaited<T>> {
		await semaphore.acquire();

		try {
			return await callback();
		} finally {
			semaphore.release();
		}
	};
}

export async function digestStringToHex(
	algorithm: string,
	data: string,
): Promise<string> {
	return Buffer.from(
		await crypto.subtle.digest(algorithm, Buffer.from(data)),
	).toString("hex");
}

export function getErrorCode(error: unknown): string | undefined {
	if (!(error instanceof Error)) {
		return undefined;
	}
	if (typeof error["code"] !== "string") {
		return undefined;
	}

	return error["code"];
}

export async function readFileIfExists(
	path: string,
	encoding: BufferEncoding,
): Promise<string | null> {
	try {
		return await readFile(path, encoding);
	} catch (error) {
		if (getErrorCode(error) !== "ENOENT") {
			throw error;
		}

		return null;
	}
}

type Patch<T> = {
	[TKey in keyof T]?: Patch<T[TKey]>;
};

export function patchObject<T extends object>(obj: T, patch: Patch<T>): T {
	// FIXME: is there anything better which could work
	const result = { ...obj };

	for (const key in patch) {
		if (!Object.hasOwn(patch, key)) {
			continue;
		}

		const entry = patch[key]!;
		if (entry === undefined) {
			continue;
		}

		if (isPlainObject(entry) && isPlainObject(result[key])) {
			result[key] = patchObject(result[key], entry) as any;
		} else if (Array.isArray(entry) && Array.isArray(result[key])) {
			result[key].push(...entry);
		} else {
			result[key] = entry as any;
		}
	}

	return result;
}
