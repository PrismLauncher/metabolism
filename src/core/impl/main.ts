import type { Goal } from "#core/goal.ts";
import type { Provider } from "#core/provider.ts";
import { default as packageJSON } from "#project/package.json" with { type: "json" };
import { Command, InvalidArgumentError } from "commander";
import { GOALS, PROVIDERS } from "./registry.ts";
import { build, prepare, sync } from "./runner.ts";

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
		"-A, --assume-up-to-date",
		"Always assume cache entries are up-to-date",
		false,
	)
	.option("-M, --minify", "Minify JSON output", false)
	.version(packageJSON.version)
	.helpCommand(false)
	.helpOption(false);

command.addHelpText(
	"after",
	`
Providers:
  ${[...PROVIDERS.values()]
		.map((provider) => "  " + provider.id)
		.sort()
		.join("\n")}

Goals:
${[...GOALS.values()]
	.map((goal) => "  " + goal.id)
	.sort()
	.join("\n")}`,
);

command
	.command("prepare")
	.alias("p")
	.argument("<providers...>", "", parseProviders)
	.description("run specified providers without running any goals")
	.action((providers, _, command) =>
		prepare(providers, command.optsWithGlobals()),
	);

command
	.command("sync")
	.alias("s")
	.argument("<providers...>", "", parseProviders)
	.description("run specified providers and their dependent goals")
	.action((providers, _, command) =>
		sync(providers, command.optsWithGlobals()),
	);

command
	.command("build")
	.alias("b")
	.argument("<goals...>", "", parseGoals)
	.description("run specified goals and their dependencies")
	.action((goals, _, command) => build(goals, command.optsWithGlobals()));

command
	.command("all")
	.alias("a")
	.description("run everything")
	.action((_, command) => build(GOALS.values(), command.optsWithGlobals()));

command.parse();

function parseProviders(
	id: string,
	result: Set<Provider> = new Set(),
): Set<Provider> {
	const provider = PROVIDERS.get(id);

	if (!provider) {
		throw new InvalidArgumentError("");
	}

	result.add(provider);

	return result;
}

function parseGoals(id: string, result: Set<Goal> = new Set()): Set<Goal> {
	const goal = GOALS.get(id);

	if (!goal) {
		throw new InvalidArgumentError("");
	}

	result.add(goal);

	return result;
}
