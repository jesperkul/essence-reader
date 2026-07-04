import type { ZipInfo } from 'unzipit';

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

export interface ActiveBook {
	id?: number;
	title: string;
	authors: string[];
	spine: string[];
	toc: TableOfContentsItem[];
	entries: ZipInfo['entries'];
}
