export interface IndexFile {
	formatVersion: 1;
	packages: IndexFilePackage[];
}

export interface IndexFilePackage {
	uid: string;
	name: string;
	sha256: string;
}
