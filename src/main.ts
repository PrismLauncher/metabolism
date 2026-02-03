import type { Goal, Provider } from "#index.ts";
import { default as packageJSON } from "#project/package.json" with { type: "json" };
import { Command, InvalidArgumentError } from "commander";
import { allGoals, allProviders } from "./registry.ts";
import { build, prepare } from "./runner/runner.ts";

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
