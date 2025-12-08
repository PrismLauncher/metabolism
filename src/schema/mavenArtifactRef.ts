import { z } from "zod";

// TODO: make more general purpose?

export const MavenArtifactRef = z.string().transform((name, context) => {
	const [groupID, artifactID, version, classifier] = name.split(":", 4);

	if (!groupID || !artifactID || !version) {
		context.addIssue("Required: <groupID>:<artifactID>:<version>");
		return z.NEVER;
	}

	return new MavenArtifactRef_(groupID, artifactID, version, classifier) as MavenArtifactRef;
});

class MavenArtifactRef_ {
	constructor(
		public group: string,
		public artifact: string,
		public version: string,
		public classifier?: string
	) {
	}

	get value() {
		if (this.classifier)
			return `${this.group}:${this.artifact}:${this.version}:${this.classifier}`;
		else
			return `${this.group}:${this.artifact}:${this.version}`;
	}

	format(keys: ("group" | "artifact" | "version" | "classifier")[]): string {
		let result = "";

		for (const key of keys) {
			const value = this[key];

			if (!value)
				continue;

			if (result.length !== 0)
				result += ":";

			result += value;
		}

		return result;
	}

	withoutClassifier(): MavenArtifactRef {
		return new MavenArtifactRef_(this.group, this.artifact, this.version);
	}

	url(base: string | URL, extension: string = "jar"): URL {
		const group = encodeURIComponent(this.group).replaceAll(".", "/");
		const artifact = encodeURIComponent(this.artifact);
		const version = encodeURIComponent(this.version);
		const classifier = this.classifier ? "-" + encodeURIComponent(this.classifier) : "";
		const suffix = "." + encodeURIComponent(extension);

		return new URL(`${group}/${artifact}/${version}/${artifact}-${version}${classifier}${suffix}`, base);
	}

	toString(): string {
		return `[MavenArtifactRef ${this.value}]`;
	}
}

export interface MavenArtifactRef extends MavenArtifactRef_ { }
