import type { HTTPClient } from "#httpClient.ts";
import type { VersionFile } from "./schemas/format/v1/versionFile.ts";

export interface Provider<TData = unknown> {
	id: string;

	provide(http: HTTPClient): Promise<TData>;
}

export function defineProvider<D>(provider: Provider<D>): Provider<D> {
	return provider;
}

export type ProviderData<TProviders extends Provider[]> = {
	[I in keyof TProviders]: TProviders[I] extends Provider<infer TData> ? TData
	:	never;
};

export interface Goal<TProviders extends Provider[] = Provider[]> {
	/** ID (based on reverse domain name) for output - e.g. net.minecraft for Minecraft */
	id: string;
	name: string;
	deps: TProviders;

	generate(data: ProviderData<TProviders>): VersionOutput[];
	recommend(first: boolean, version: VersionOutput): boolean;
}

export function defineGoal<const TProviders extends Provider[]>(
	goal: Goal<TProviders>,
): Goal<TProviders> {
	return goal;
}

export type VersionOutput = Omit<VersionFile, "uid" | "name" | "formatVersion">;
