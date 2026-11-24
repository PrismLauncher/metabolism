// SPDX-FileCopyrightText: 2026 metabolism contributors
//
// SPDX-License-Identifier: MIT

import type { Goal, Provider } from "#index.ts";
import { moduleLogger } from "#logger.ts";
import { default as packageJSON } from "#project/package.json" with { type: "json" };
import { Command, InvalidArgumentError } from "commander";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import {
	Agent,
	cacheStores,
	Dispatcher,
	interceptors,
	setGlobalDispatcher,
} from "undici";
import { allGoals, allProviders } from "./registry.ts";
import { build, prepare } from "./runner.ts";

const logger = moduleLogger();

async function setUpHTTP({
	userAgent,
	httpCache,
}: {
	userAgent: string;
	httpCache?: string;
}): Promise<void> {
	const customInterceptor: Dispatcher.DispatcherComposeInterceptor =
		(next) => (options, handler) => {
			const url = new URL(options.path, options.origin);
			logger.debug(`Performing ${options.method} request to ${url.href}`);
			return next(
				{
					...options,
					headers: {
						...options.headers,
						"user-agent": userAgent,
					},
				},
				handler,
			);
		};
	const retryOptions: interceptors.RetryInterceptorOpts = {
		// NOTE: 400 added since piston-meta sometimes responds with this randomly
		statusCodes: [500, 502, 503, 504, 429, 400],
		retry(err, ctx, next) {
			if (ctx.state.counter > 10) {
				next(err);
				return;
			}
			const delay = Math.min(3000 * 2 ** (ctx.state.counter - 1), 30_000);
			const url = new URL(ctx.opts.path, ctx.opts.origin);
			logger.warn(
				err,
				`Retrying ${ctx.opts.method} ${url.href} in ${delay}`,
			);
			setTimeout(() => next(null), delay);
		},
	};

	let agent = new Agent({
		// NOTE: in my testing, too many concurrent connections can cause random timeout errors
		// maybe this should be customisable with a command option?
		connections: 64,
	}).compose(
		customInterceptor,
		interceptors.retry(retryOptions),
		interceptors.responseError(),
	);
	if (httpCache) {
		await mkdir(path.dirname(httpCache), { recursive: true });

		agent = agent.compose(
			interceptors.cache({
				store: new cacheStores.SqliteCacheStore({
					location: httpCache,
				}),
			}),
		);
	}

	setGlobalDispatcher(agent);
}

const command = new Command("pnpm start")
	.description("Metabolism - Prism Launcher Metadata Generator")
	.option(
		"-u, --user-agent <value>",
		"set the User-Agent header",
		"PrismLauncherMeta/" + packageJSON.version,
	)
	.option(
		"-o, --output-dir <path>",
		"set the output directory",
		"./run/output",
	)
	.option("-c, --cache-dir <path>", "set the cache directory", "./run/cache")
	.option(
		"--http-cache <path>",
		"set path for sqlite database to cache HTTP requests",
		"run/http-cache.db",
	)
	// FIXME: put this to use
	.option("-M, --minify", "Minify JSON output", false)
	.version(packageJSON.version)
	.helpCommand(false)
	.helpOption(false);

command.addHelpText(
	"after",
	`
Providers:
  ${[...allProviders.values()]
		.map((provider) => "  " + provider.id)
		.sort()
		.join("\n")}

Goals:
${[...allGoals.values()]
	.map((goal) => "  " + goal.id)
	.sort()
	.join("\n")}`,
);

command
	.command("prepare")
	.alias("p")
	.argument("[<providers...>]", "", parseProviders)
	.description("run specified providers without running any goals")
	.action(async (providers, _, command) => {
		await setUpHTTP(command.optsWithGlobals());

		if (providers === undefined) {
			await prepare(
				new Set(allProviders.values()),
				command.optsWithGlobals(),
			);
		} else {
			await prepare(providers, command.optsWithGlobals());
		}
	});

command
	.command("build")
	.alias("b")
	.argument("[<goals...>]", "", parseGoals)
	.description("run specified goals and their dependencies")
	.action(async (goals, _, command) => {
		await setUpHTTP(command.optsWithGlobals());

		if (goals === undefined) {
			await build(new Set(allGoals.values()), command.optsWithGlobals());
		} else {
			await build(goals, command.optsWithGlobals());
		}
	});

command.parse();

function parseProviders(
	id: string,
	result: Set<Provider> = new Set(),
): Set<Provider> {
	const provider = allProviders.get(id);

	if (!provider) {
		throw new InvalidArgumentError("");
	}

	result.add(provider);

	return result;
}

function parseGoals(id: string, result: Set<Goal> = new Set()): Set<Goal> {
	const goal = allGoals.get(id);

	if (!goal) {
		throw new InvalidArgumentError("");
	}

	result.add(goal);

	return result;
}
