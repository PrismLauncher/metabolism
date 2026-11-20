// SPDX-FileCopyrightText: 2026 metabolism contributors
//
// SPDX-License-Identifier: MIT

interface MavenArtifactComponents {
	group: string;
	artifact: string;
	version: string;
	classifier?: string;
}

export class MavenArtifactRef implements MavenArtifactComponents {
	group: string;
	artifact: string;
	version: string;
	classifier?: string;

	constructor(components: MavenArtifactComponents) {
		this.group = components.group;
		this.artifact = components.artifact;
		this.version = components.version;
		this.classifier = components.classifier;
	}

	get value(): string {
		if (this.classifier) {
			return `${this.group}:${this.artifact}:${this.version}:${this.classifier}`;
		} else {
			return `${this.group}:${this.artifact}:${this.version}`;
		}
	}

	format(keys: ("group" | "artifact" | "version" | "classifier")[]): string {
		let result = "";

		for (const key of keys) {
			const value = this[key];

			if (!value) {
				continue;
			}

			if (result.length !== 0) {
				result += ":";
			}

			result += value;
		}

		return result;
	}

	url(base: string | URL, extension: string = "jar"): URL {
		const group = encodeURIComponent(this.group).replaceAll(".", "/");
		const artifact = encodeURIComponent(this.artifact);
		const version = encodeURIComponent(this.version);
		const classifier =
			this.classifier ? "-" + encodeURIComponent(this.classifier) : "";
		const suffix = "." + encodeURIComponent(extension);

		return new URL(
			`${group}/${artifact}/${version}/${artifact}-${version}${classifier}${suffix}`,
			base,
		);
	}

	toString(): string {
		return `[MavenArtifactRef ${this.value}]`;
	}
}
