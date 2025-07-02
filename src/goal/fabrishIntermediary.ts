import { FABRIC_MAVEN } from "#common/constants/urls.ts";
import { defineGoal, type VersionOutput } from "#core/goal.ts";
import { fabricIntermediaryVersions, type FabricIntermediaryVersion } from "#provider/fabricIntermediaryVersions.ts";

const fabricIntermediary = defineGoal({
	id: "net.fabricmc.intermediary",
	name: "Fabric Intermediary",
	provider: fabricIntermediaryVersions,

	generate: data => data.map(transformVersion),
	recommend: () => true,
});

export default [fabricIntermediary];

function transformVersion(version: FabricIntermediaryVersion): VersionOutput {
	return {
		version: version.version,
		releaseTime: version.lastModified.toISOString(),
		type: "release",

		requires: [{ uid: "net.minecraft", equals: version.version }],
		volatile: true,

		libraries: [{ name: version.maven.value, url: FABRIC_MAVEN, }],
	};
}
