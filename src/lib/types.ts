export type Book = {
	id?: number;
	spine: string[];
	toc: TableOfContentsItem[];
	file: Blob;
};

export type Metadata = {
	id?: number;
	title: string;
	authors: string[];
	cover: Blob | undefined;
	identifier: string;
	fileSize?: number;
	addedAt?: number;
};

export interface Progress {
	spineIndex: number;
	sectionProgress: number;
	totalProgress: number;
}

export type TableOfContentsItem = {
	title: string;
	href: string;
	index: number;
	children?: TableOfContentsItem[];
};

export interface ReaderSettings {
	scale: number;
	fontFamily: string;
	paginated: boolean;
	animations: boolean;
}

export interface LibraryBook {
	id: number;
	title: string;
	authors: string[];
	cover: Blob | undefined;
	totalProgress: number;
}
