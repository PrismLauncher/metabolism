import { relative } from "node:path";
import { fileURLToPath } from "node:url";
import { getCallSites } from "node:util";
import {
	pino,
	type Bindings,
	type ChildLoggerOptions,
	type Logger,
} from "pino";

const mainLogger = pino({
	level: process.env.PINO_LOG_LEVEL || "info",
});

export function moduleLogger<ChildCustomLevels extends string = never>(
	bindings?: Bindings,
	options?: ChildLoggerOptions<ChildCustomLevels>,
): Logger<ChildCustomLevels> {
	const scriptName = fileURLToPath(getCallSites()[1]!.scriptName);
	let module = relative("src", scriptName);

	if (module.endsWith(".ts")) {
		module = module.substring(0, module.lastIndexOf("."));
	}

	if (module.endsWith("/index")) {
		module = module.substring(0, module.lastIndexOf("/"));
	}

	return mainLogger.child({ ...bindings, module }, options);
}
