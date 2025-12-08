# Metabolism
Generation for Minecraft game and loader metadata - possible future implementation in TypeScript.

For the time being [this repo](https://github.com/TheKodeToad/metabolism-test) mirrors the latest commit - and you can use the generated output by setting your Metadata URL to https://thekodetoad.github.io/metabolism-test/output/.

## Usage
Run `pnpm install` then `pnpm start`.

There are two key concepts - providers and goals. Providers are metadata sources, and goals are metadata targets.
For example, the `piston-meta` provider provides data to the `net.minecraft` goal.
Goals always specify a single dependency on a source (for the sake of simplicity).

Pass nothing to see full usage with a list of providers and goals.

Available commands:

### `prepare <provider>...`
Prepare data from the specified providers.

### `sync <provider>...`
`prepare`, then run dependent goals. Useful as the directories touched will be exclusive to each provider.

### `build <goal>...`
Runs `prepare` for all dependencies of the specified goals.

### `all`
Prepare and build everything.

## Roadmap
- ☑️ Generate index (useable)
  - only writes what has been added in the last build (needs to keep existing entries)
- ❌ Remove old cache and output files

Generation for...
- ☑️ Minecraft (useable)
  - missing "texturepacks" and "no-texturepacks" trait
  - missing "legacyServices" trait
  - missing "noapplet" trait
- ☑️ LWJGL (useable)
  - (3.x.x) missing backported apple sillicon natives
  - (2.x.x) does not force version to latest on apple sillicon
- ✅ Fabric
- 🚧 NeoForge (does not launch)
  - no versions are recommended
  - all versions are classified as rlease
- ❌ Forge
- ✅ Quilt
- ❌ LiteLoader
- ☑️ Mojang Java (should be good)
- ❌ Adoptium
- ❌ Azul Zulu

## Why

[The Rust rewrite (mcmeta)](https://github.com/PrismLauncher/mcmeta) has been in the works for over two years - it can continue to coexist as a future alternative - but as of May 2025 something to replace [our MultiMC meta fork](https://github.com/prismLauncher/meta) feels long overdue.
I (TheKodeToad) chose TypeScript as I am more familiar with it. But the main difference is that this rewrite is less ambition - this only intends to generate metadata in the existing format simply with (hopefully) cleaner code.

Licensing should not be a concern as no code is taken from the original project.
