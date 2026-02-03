## `metadiff.js [left-dir] [right-dir]`

Provides a diff between meta outputs with reduced noise.
For metabolism, the output resides in `run/output` after running.
For mmc-meta, this is the `launcher` directory.

Since the goal is parity with meta, you can put the mmc-meta output on the left and the metabolism output on the right in order to see how metabolism differs.
You can use a clone of [PrismLauncher/meta-launcher](https://github.com/PrismLauncher/meta-launcher) instead of manually running mmc-meta yourself.
