import { openDB } from 'idb';
import type { LibraryBook, Progress, TableOfContentsItem } from '$lib/types';

const DB_NAME = 'libraryDB';
const DB_VERSION = 1;

const BOOKS_STORE = 'books';
const COVERS_STORE = 'covers';
const METADATA_STORE = 'metadata';
const PROGRESS_STORE = 'progress';

if (typeof indexedDB !== 'undefined') {
	indexedDB.deleteDatabase('bookDB'); // Delete old database if it exists.
}

const openLibraryDB = openDB(DB_NAME, DB_VERSION, {
	upgrade(db) {
		const metadataStore = db.createObjectStore(METADATA_STORE, {
			keyPath: 'id',
			autoIncrement: true
		});
		metadataStore.createIndex('identifier', 'identifier', { unique: false });
		db.createObjectStore(COVERS_STORE, { keyPath: 'id' });
		db.createObjectStore(BOOKS_STORE, { keyPath: 'id' });
		db.createObjectStore(PROGRESS_STORE, { keyPath: 'id' });
	}
});

export interface NewBook {
	title: string;
	authors: string[];
	identifier: string;
	spine: string[];
	toc: TableOfContentsItem[];
	fileSize: number;
	file: Blob;
	cover?: Blob;
}

export const addBook = async (newBook: NewBook) => {
	const db = await openLibraryDB;
	const tx = db.transaction([METADATA_STORE, BOOKS_STORE, COVERS_STORE], 'readwrite');

	const sameIdentifier = await tx
		.objectStore(METADATA_STORE)
		.index('identifier')
		.getAll(newBook.identifier);

	const alreadySaved = sameIdentifier.find(
		(existing) => existing.fileSize === newBook.fileSize && existing.title === newBook.title
	);

	if (alreadySaved) return alreadySaved.id;

	const bookId = (await tx.objectStore(METADATA_STORE).add({
		title: newBook.title,
		authors: newBook.authors,
		identifier: newBook.identifier,
		fileSize: newBook.fileSize,
		addedAt: Date.now()
	})) as number;

	await tx.objectStore(BOOKS_STORE).add({
		file: newBook.file,
		spine: newBook.spine,
		toc: newBook.toc,
		id: bookId
	});

	if (newBook.cover) {
		await tx.objectStore(COVERS_STORE).add({
			id: bookId,
			cover: newBook.cover
		});
	}

	await tx.done;
	return bookId;
};

export const getBookFromDB = async (bookId: number) => {
	const db = await openLibraryDB;
	const tx = db.transaction([METADATA_STORE, BOOKS_STORE, PROGRESS_STORE], 'readonly');

	const [metadata, book, progress] = await Promise.all([
		tx.objectStore(METADATA_STORE).get(bookId),
		tx.objectStore(BOOKS_STORE).get(bookId),
		tx.objectStore(PROGRESS_STORE).get(bookId)
	]);
	await tx.done;

	if (!metadata || !book) throw new Error(`Book with ID ${bookId} not found in the database`);

	return {
		id: bookId,
		title: metadata.title,
		authors: metadata.authors,
		identifier: metadata.identifier,
		spine: book.spine,
		toc: book.toc,
		file: book.file,
		progress: progress
	};
};

export const deleteBookFromDB = async (bookId: number) => {
	const db = await openLibraryDB;
	const tx = db.transaction(
		[METADATA_STORE, BOOKS_STORE, PROGRESS_STORE, COVERS_STORE],
		'readwrite'
	);

	await tx.objectStore(METADATA_STORE).delete(bookId);
	await tx.objectStore(BOOKS_STORE).delete(bookId);
	await tx.objectStore(PROGRESS_STORE).delete(bookId);
	await tx.objectStore(COVERS_STORE).delete(bookId);

	await tx.done;
};

export const deleteAllBooksFromDB = async () => {
	const db = await openLibraryDB;
	const tx = db.transaction(
		[METADATA_STORE, BOOKS_STORE, PROGRESS_STORE, COVERS_STORE],
		'readwrite'
	);

	await tx.objectStore(METADATA_STORE).clear();
	await tx.objectStore(BOOKS_STORE).clear();
	await tx.objectStore(PROGRESS_STORE).clear();
	await tx.objectStore(COVERS_STORE).clear();

	await tx.done;
};

export const getLibraryBooks = async (): Promise<LibraryBook[]> => {
	const db = await openLibraryDB;

	const [metadata, progress, covers] = await Promise.all([
		db.getAll(METADATA_STORE),
		db.getAll(PROGRESS_STORE),
		db.getAll(COVERS_STORE)
	]);

	const progressMap = new Map(progress.map((p) => [p.id, p.totalProgress]));
	const coversMap = new Map(covers.map((c) => [c.id, c.cover]));

	return metadata.map((meta) => ({
		id: meta.id,
		title: meta.title,
		authors: meta.authors,
		cover: coversMap.get(meta.id),
		totalProgress: progressMap.get(meta.id) ?? 0
	}));
};

export const saveProgressToDB = async (bookId: number, progress: Progress) => {
	const db = await openLibraryDB;
	await db.put(PROGRESS_STORE, { id: bookId, ...progress, updatedAt: Date.now() });
};
