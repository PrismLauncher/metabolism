import { readdir, readFile, mkdir, writeFile } from "fs/promises";
import { create as createDiffPatcher } from "jsondiffpatch";
import { join as joinPath, dirname, basename } from "path";

const [script, left, right] = process.argv.slice(1);

if (!left || !right) {
	console.error(`usage: metadiff [left-dir] [right-dir]`);
	process.exit(1);
}

const output = joinPath(dirname(script), "metadiff");

async function walkEntries(dir, visitor) {
	await Promise.all(
		(await readdir(dir, { withFileTypes: true })).map(async (entry) => {
			if (entry.name.startsWith(".")) {
				return;
			}

			if (entry.isDirectory()) {
				await walkEntries(joinPath(dir, entry.name), (sub) => {
					visitor(joinPath(entry.name, sub));
				});
			} else {
				visitor(entry.name);
			}
		}),
	);
}

const toDiff = new Map();
await walkEntries(left, (entry) => {
	toDiff.set(entry, { leftExists: true });
});
await walkEntries(right, (entry) => {
	toDiff.set(entry, { ...toDiff.get(entry), rightExists: true });
});

function preprocess(json) {
	// some were changed on purpose
	delete json.name;

	// ignored by launcher
	delete json.order;

	if (json["+traits"]) {
		// ignored by launcher
		json["+traits"] = json["+traits"].filter(
			(trait) => trait !== "XR:Initial",
		);
	}
}

function propertyFilter(name) {
	if (name === "releaseTime") {
		// NOTE: we want to ignore this everywhere, not just in the root
		return false;
	}

	return true;
}

const jsonDiff = createDiffPatcher({ propertyFilter });

await Promise.all(
	toDiff.entries().map(async ([entry, { leftExists, rightExists }]) => {
		let leftContent, rightContent;
		if (leftExists) {
			leftContent = await readFile(joinPath(left, entry), "utf-8");
		}
		if (rightExists) {
			rightContent = await readFile(joinPath(right, entry), "utf-8");
		}

		let leftObj = "Does not exist";
		let rightObj = "Deleted";
		if (leftExists) {
			leftObj = JSON.parse(leftContent);
		}
		if (rightExists) {
			rightObj = JSON.parse(rightContent);
		}
		preprocess(leftObj);
		preprocess(rightObj);

		const delta = jsonDiff.diff(leftObj, rightObj, { propertyFilter });

		const outputPath = joinPath(output, entry + ".html");
		await mkdir(dirname(outputPath), { recursive: true });

		const doc = `<!DOCTYPE html>
<html>
	<head>
		<link rel="stylesheet" href="https://esm.sh/jsondiffpatch@0.6.0/lib/formatters/styles/html.css" type="text/css" />
		<script type="application/json" id="delta">${JSON.stringify(delta)}</script>
		<title>${basename(entry)} - metadiff</title>
		<script type="module">
			import * as htmlFormatter from "https://esm.sh/jsondiffpatch@0.6.0/formatters/html";

			const delta = JSON.parse(document.getElementById("delta").textContent);
			document.body.innerHTML = htmlFormatter.format(delta);
		</script>
	</head>
</html>`;
		await writeFile(outputPath, doc, { encoding: "utf-8" });
	}),
);
