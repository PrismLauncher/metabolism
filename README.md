# Metabolism

Generation for Minecraft game and loader metadata - possible future implementation in TypeScript.
The [current implementation](https://github.com/PrismLauncher/meta) (which shall be referred to as mmc-meta) is an entirely different python codebase forked from MultiMC.

For the time being [this repo](https://github.com/TheKodeToad/metabolism-test) mirrors the latest commit - and you can use the generated output by setting your Metadata URL to https://thekodetoad.github.io/metabolism-test/output/.

[Click here for the roadmap](https://github.com/PrismLauncher/metabolism/issues/9)

## Usage

Run `pnpm install` then `pnpm start`.

There are two key concepts - providers and goals. Providers are metadata sources, and goals are metadata targets.
For example, the `piston-meta` provider provides data to the `net.minecraft` goal.
Goals specify one or more dependencies on providers.

Pass nothing to see full usage with a list of providers and goals.

Available commands:

### `prepare <provider>...`

Prepare data from the specified providers, or all if none are specified.

### `build <goal>...`

Builds the output of the specified goals, or all if none are specified.

There is also an assortment of tools in the [tools](tools) folder.

## Why

[The Rust rewrite (mcmeta)](https://github.com/PrismLauncher/mcmeta) has been in the works for over two years - it can continue to coexist as a future alternative - but as of May 2025 something to replace mmc-meta feels long overdue.
I (TheKodeToad) chose TypeScript as I am more familiar with it. But the main difference is that this rewrite is less ambition - this only intends to generate metadata in the existing format simply with (hopefully) cleaner code.

Licensing should not be a concern as no code is taken from the original project.
