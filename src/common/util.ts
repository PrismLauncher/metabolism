import { Semaphore } from "es-toolkit";

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

export async function digestStringToBuf(
	algorithm: string,
	data: string,
): Promise<Buffer> {
	return Buffer.from(
		await crypto.subtle.digest(algorithm, Buffer.from(data)),
	);
}
