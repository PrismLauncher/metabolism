import type { VersionFile } from "../schema/format/v1/versionFile.ts";
import type { Provider } from "./provider.ts";

export function defineGoal<const TProviders extends Provider[]>(
	goal: Goal<TProviders>,
): Goal<TProviders> {
	return goal;
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

export type VersionOutput = Omit<VersionFile, "uid" | "name" | "formatVersion">;
