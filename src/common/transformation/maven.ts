import type { MavenArtifactRef } from "#schemas/mavenArtifactRef.ts";

export function isLWJGL3(name: MavenArtifactRef): boolean {
	return name.group === "org.lwjgl" && name.version.startsWith("3.");
}

export function isLWJGL2(name: MavenArtifactRef): boolean {
	return name.group === "org.lwjgl.lwjgl" && name.version.startsWith("2.");
}

/**
 * Is it an indirect dependency from LWJGL 2?
 * @param name Library name
 * @returns true for jinput and -> jutils - libraries which Minecraft does not require directly but LWJGL does
 */
export function isLWJGL2Dependency(name: MavenArtifactRef): boolean {
	return name.group === "net.java.jinput" || name.group === "net.java.jutils";
}
