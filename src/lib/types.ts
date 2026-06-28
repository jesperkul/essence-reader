export type Book = {
	id?: number;
	spine: string[];
	toc: TableOfContentsItem[];
	file: File;
};

export type Metadata = {
	id?: number;
	title: string;
	author: string[];
	cover: Blob | undefined;
	progress: number;
	length: number;
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
