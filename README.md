<!--
SPDX-FileCopyrightText: 2026 metabolism contributors

SPDX-License-Identifier: MIT
-->

# Metabolism

Generation for Minecraft game and loader metadata - possible future implementation in TypeScript.
The [current implementation](https://github.com/PrismLauncher/meta) (which shall be referred to as mmc-meta) is an entirely different Python codebase forked from MultiMC's meta scripts. Unlike [mcmeta](https://github.com/PrismLauncher/mcmeta), the goal of metabolism is to keep the output more-or-less the same.

For the time being [this repo](https://github.com/TheKodeToad/metabolism-test) mirrors the latest commit - and you can use the generated output by setting your Metadata URL to https://thekodetoad.github.io/metabolism-test/output/.

[Click here for the roadmap](https://github.com/PrismLauncher/metabolism/issues/9)

## Usage

Requires [Node.js](https://nodejs.org/en) (other runtimes are not tested) and [pnpm](https://pnpm.io/).

After you have cloned this repository, run `pnpm install`.

Once you have done that, `pnpm start` can be used to invoke the tool. If no arguments are supplied, an overview of the usage will appear.

There are two key concepts - providers and goals. Providers are metadata sources, and goals are metadata targets.
For example, the `game-versions` provider sources versions mainly from piston-meta and provides data to the `net.minecraft` goal.
Goals specify one or more dependencies on providers.

Available commands:

### `prepare <provider>...`

Prepare data from the specified providers, or all if none are specified.

### `build <goal>...`

Builds the output of the specified goals, or all if none are specified.

There is also an assortment of tools in the [tools](tools) folder.
