import { FABRIC_MAVEN } from "#common/constants/urls.ts";
import { defineGoal, type VersionOutput } from "#metabolism.ts";
import {
	fabricIntermediaryVersions,
	type FabricIntermediaryVersion,
} from "#providers/fabrishIntermediaryVersions.ts";

const fabricIntermediary = defineGoal({
	id: "net.fabricmc.intermediary",
	name: "Fabric Intermediary",
	deps: [fabricIntermediaryVersions],

	generate: ([versions]) =>
		versions.map((version) => transformVersion(version, FABRIC_MAVEN)),
	recommend: () => true,
});

export default [fabricIntermediary];

function transformVersion(
	version: FabricIntermediaryVersion,
	maven: string,
): VersionOutput {
	return {
		version: version.version,
		releaseTime: version.lastModified.toISOString(),
		type: "release",

		requires: [{ uid: "net.minecraft", equals: version.version }],
		volatile: true,

		libraries: [{ name: version.maven.value, url: maven }],
	};
}
