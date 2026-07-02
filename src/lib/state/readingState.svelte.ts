import type { Book, Metadata } from '$lib/types';
import type { ZipInfo } from 'unzipit';

class ReadingState {
	meta = $state.raw<Metadata | undefined>(undefined);
	book = $state.raw<Book | undefined>(undefined);
	entries = $state.raw<ZipInfo['entries'] | undefined>(undefined);

	sectionIndex = $state(0);
	sectionProgress = $state(0);
	totalProgress = $state(0);

	setLoaded({ meta, book, entries }: { meta: Metadata; book: Book; entries: ZipInfo['entries'] }) {
		this.meta = meta;
		this.book = book;
		this.entries = entries;
	}

	getLoaded() {
		if (this.meta && this.book && this.entries) {
			return { meta: this.meta, book: this.book, entries: this.entries };
		}
		return undefined;
	}
}

export const readingState = new ReadingState();
