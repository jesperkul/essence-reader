import type { Book, Metadata, Progress } from '$lib/types';
import type { ZipInfo } from 'unzipit';

class ReadingState {
	meta = $state.raw<Metadata | undefined>(undefined);
	book = $state.raw<Book | undefined>(undefined);
	entries = $state.raw<ZipInfo['entries'] | undefined>(undefined);

	spineIndex = $state(0);
	sectionProgress = $state(0);
	totalProgress = $state(0);

	setLoaded({
		meta,
		book,
		entries,
		progress
	}: {
		meta: Metadata;
		book: Book;
		entries: ZipInfo['entries'];
		progress?: Progress;
	}) {
		this.meta = meta;
		this.book = book;
		this.entries = entries;
		this.spineIndex = progress?.spineIndex ?? 0;
		this.sectionProgress = progress?.sectionProgress ?? 0;
		this.totalProgress = progress?.totalProgress ?? 0;
	}

	getLoaded() {
		if (this.meta && this.book && this.entries) {
			return { meta: this.meta, book: this.book, entries: this.entries };
		}
		return undefined;
	}
}

export const readingState = new ReadingState();
