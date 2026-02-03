import { digestStringToBuf, setIfAbsent } from "#common/util.ts";
import type { Provider } from "#index.ts";
import { type Goal, type VersionOutput } from "#index.ts";
import { moduleLogger } from "#logger.ts";
import type { IndexFile } from "#schemas/format/v1/indexFile.ts";
import type {
	PackageIndexFile,
	PackageIndexFileVersion,
} from "#schemas/format/v1/packageIndexFile.ts";
import type { VersionFile } from "#schemas/format/v1/versionFile.ts";
import { pick, sortBy } from "es-toolkit";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { DiskCachedClient } from "./diskCachedClient.ts";

const logger = moduleLogger();

export interface RunnerOptions {
	userAgent: string;
	cacheDir: string;
	outputDir: string;
	assumeUpToDate: boolean;
	minify: boolean;
}

export async function prepare(
	providers: Set<Provider>,
	options: RunnerOptions,
): Promise<void> {
	await run(providers, new Map(), options);
}

export async function build(
	goals: Set<Goal>,
	options: RunnerOptions,
): Promise<void> {
	const providers: Set<Provider> = new Set();
	const dependents: Map<Provider, Goal[]> = new Map();

	for (const goal of goals) {
		for (const dep of goal.deps) {
			providers.add(dep);
			setIfAbsent(dependents, dep, []).push(goal);
		}
	}

	await run(providers, dependents, options);
}

async function run(
	providers: Set<Provider>,
	dependents: Map<Provider, Goal[]>,
	options: RunnerOptions,
): Promise<void> {
	const startTime = Date.now();

	const satisfiedDeps: Map<Goal, number> = new Map();

	const providerResults: Map<Provider, unknown> = new Map();
	const goalResults: { goal: Goal; sha256: string }[] = [];

	await Promise.all(
		providers.values().map(async (provider) => {
			logger.info(`Running provider '${provider.id}'`);

			providerResults.set(provider, await runProvider(provider, options));

			logger.info(`Got data from provider '${provider.id}'!`);

			const providerDependents = dependents.get(provider);

			if (!providerDependents) {
				return;
			}

			const tasks = providerDependents
				.map((goal) => {
					const counter = (satisfiedDeps.get(goal) ?? 0) + 1;

					if (counter > goal.deps.length) {
						throw new Error(
							`Satisfied counter exceeded number of deps (${goal.deps.length}) for goal '${goal.name}'`,
						);
					}

					satisfiedDeps.set(goal, counter);

					if (counter !== goal.deps.length) {
						return null;
					}

					const data = goal.deps.map((dep) =>
						providerResults.get(dep),
					);

					logger.info(`Running goal '${goal.id}'`);

					return runGoal(goal, data, options).then((sha256) => {
						goalResults.push({ goal, sha256 });

						logger.info(`Done goal '${goal.id}'!`);
					});
				})
				.filter((x) => x != null);

			return await Promise.all(tasks);
		}),
	);

	const elapsedTime = Date.now() - startTime;
	const formattedTime =
		elapsedTime < 1000 ? elapsedTime + "ms" : elapsedTime / 1000 + "s";

	logger.info(
		{ providerCount: providers.size, goalCount: goalResults.length },
		"Summary",
	);

	// TODO: placeholder
	const rootIndex: IndexFile = {
		formatVersion: 1,
		packages: sortBy(
			goalResults.map(({ goal, sha256 }) => ({
				uid: goal.id,
				name: goal.name,
				sha256,
			})),
			[(v) => v.uid],
		),
	};

	await writeFile(
		path.join(options.outputDir, "index.json"),
		JSON.stringify(rootIndex, undefined, 2),
	);

	logger.info(`Done in ${formattedTime}!`);
}

async function runProvider(
	provider: Provider,
	options: RunnerOptions,
): Promise<unknown> {
	const http = new DiskCachedClient({
		dir: path.join(options.cacheDir, provider.id),
		userAgent: options.userAgent,
		assumeUpToDate: options.assumeUpToDate,
	});

	return await provider.provide(http);
}

async function runGoal(
	goal: Goal,
	data: unknown[],
	options: RunnerOptions,
): Promise<string> {
	const outputs = goal.generate(data);
	const outputDir = path.join(options.outputDir, goal.id, path.sep);

	await mkdir(outputDir, { recursive: true });

	const space = options.minify ? 0 : 2;

	let anyRecommended = false;

	const indexVersions = await Promise.all(
		outputs.map(async (output): Promise<PackageIndexFileVersion> => {
			if (
				output.version === "index"
				|| output.version.includes("/")
				|| output.version.includes("\\")
			) {
				throw new Error(`Invalid version: '${output.version}'`);
			}

			const outputPath = path.join(outputDir, output.version + ".json");

			if (outputPath.includes("\0")) {
				throw new Error("Version contains null bytes");
			}

			if (!outputPath.startsWith(outputDir)) {
				// should never happen - just to be extra sure
				throw new Error(
					`Version '${output.version}' escapes output directory`,
				);
			}

			const recommended = goal.recommend(!anyRecommended, output);
			anyRecommended ||= recommended;

			const versionFile = generateVersionFile(goal, output);
			const outputData = JSON.stringify(versionFile, undefined, space);

			await writeFile(outputPath, outputData);

			logger.debug(`Wrote '${outputPath}'`);

			const sha256 = await digestStringToBuf("sha-256", outputData).then(
				(sum) => sum.toString("hex"),
			);

			logger.debug(`sha-256 of '${outputPath}' is ${sha256}`);

			return {
				...pick(output, [
					"version",
					"type",
					"releaseTime",
					"conflicts",
					"requires",
				]),
				recommended,
				sha256,
			};
		}),
	);

	const indexFile: PackageIndexFile = {
		uid: goal.id,
		name: goal.name,
		formatVersion: 1,
		versions: indexVersions,
	};

	const indexPath = path.join(outputDir, "index.json");
	const indexData = JSON.stringify(indexFile, undefined, 2);

	await writeFile(indexPath, indexData);

	logger.debug(`Wrote '${indexPath}'`);

	const indexSha256 = await digestStringToBuf("sha-256", indexData).then(
		(sum) => sum.toString("hex"),
	);

	logger.debug(`sha-256 of '${indexPath}' index is ${indexSha256}`);

	return indexSha256;
}

function generateVersionFile(goal: Goal, output: VersionOutput): VersionFile {
	const file: VersionFile = {
		uid: goal.id,
		name: goal.name,
		formatVersion: 1,
		...output,
	};

	// give it a little trim :)
	if (file.requires?.length === 0) {
		delete file.requires;
	}

	if (file["+traits"]?.length === 0) {
		delete file["+traits"];
	}

	if (file["+tweakers"]?.length === 0) {
		delete file["+tweakers"];
	}

	if (file.compatibleJavaMajors?.length === 0) {
		delete file.compatibleJavaMajors;
	}

	if (file["+jvmArgs"]?.length === 0) {
		delete file["+jvmArgs"];
	}

	if (file.libraries?.length === 0) {
		delete file.libraries;
	}

	return file;
}
