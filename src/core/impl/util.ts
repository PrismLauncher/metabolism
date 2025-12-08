import { readFile, rm } from "fs/promises";

export async function readFileIfExists(path: string, encoding: BufferEncoding): Promise<string | null> {
	try {
		return await readFile(path, encoding);
	} catch (error) {
		if (!isENOENT(error)) {
			throw error;
		}

		return null;
	}
}

export async function deleteFileIfExists(path: string): Promise<boolean> {
	try {
		await rm(path);

		return true;
	} catch (error) {
		if (!isENOENT(error)) {
			throw error;
		}

		return false;
	}
}

export function isENOENT(error: unknown): boolean {
	if (!(error instanceof Error && "code" in error && typeof "code" === "string")) {
		return false;
	}

	if (error.code !== "ENOENT") {
		return false;
	}

	return true;
}

export async function digest(algorithm: string, data: string): Promise<Buffer> {
	return Buffer.from(await crypto.subtle.digest(algorithm, Buffer.from(data)));
}
