import { readdir, readFile, mkdir, writeFile } from "fs/promises";
import { diff as jsonDiff } from "jsondiffpatch";
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
	delete json.order;

	if (json.releaseTime) {
		json.releaseTime = new Date(json.releaseTime).toISOString();
	}

	if (json["+traits"]) {
		json["+traits"] = json["+traits"].filter(
			(trait) => trait !== "XR:Initial",
		);
	}

	return json;
}

await Promise.all(
	toDiff.entries().map(async ([entry, { leftExists, rightExists }]) => {
		let leftContent, rightContent;
		if (leftExists) {
			leftContent = await readFile(joinPath(left, entry), "utf-8");
		}
		if (rightExists) {
			rightContent = await readFile(joinPath(right, entry), "utf-8");
		}

		let leftObj = "Does not exists";
		let rightObj = "Deleted";
		if (leftExists) {
			leftObj = preprocess(JSON.parse(leftContent));
		}
		if (rightExists) {
			rightObj = preprocess(JSON.parse(rightContent));
		}

		const diff = JSON.stringify(jsonDiff(leftObj, rightObj));

		const outputPath = joinPath(output, entry + ".html");
		await mkdir(dirname(outputPath), { recursive: true });
		await writeFile(
			outputPath,
			`<!DOCTYPE html>
<html>
	<head>
		<link rel="stylesheet" href="https://esm.sh/jsondiffpatch@0.6.0/lib/formatters/styles/html.css" type="text/css" />
		<script type="application/json" id="delta">${diff}</script>
		<title>${basename(entry)} - metadiff</title>
		<script type="module">
			import * as htmlFormatter from "https://esm.sh/jsondiffpatch@0.6.0/formatters/html";

			const delta = JSON.parse(document.getElementById("delta").textContent);
			document.body.innerHTML = htmlFormatter.format(delta);
		</script>
	</head>
</html>`,
			{ encoding: "utf-8" },
		);
	}),
);
