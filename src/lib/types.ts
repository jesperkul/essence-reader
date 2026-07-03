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
	progress: number;
	length: number;
	identifier: string;
	fileSize?: number;
	addedAt?: number;
};

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
