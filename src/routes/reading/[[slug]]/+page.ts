export const prerender = false;
import { openLibraryDB } from '$lib/db.js';
import { readingState } from '$lib/state/readingState.svelte';
import type { PageLoad } from './$types';
import { error } from '@sveltejs/kit';
import { unzip } from 'unzipit';

export const load = (async ({ params }) => {
	const slugID = Number(params.slug);
	const loaded = readingState.getLoaded();

	if (loaded && (!params.slug || loaded.meta.id === slugID)) {
		return loaded;
	}

	if (!params.slug) error(400, 'No book loaded and no book ID provided');

	if (isNaN(slugID) || !Number.isInteger(slugID) || slugID <= 0) {
		error(400, 'Invalid or non-numeric book ID provided');
	}

	const db = await openLibraryDB;

	const tx = db.transaction(['metadata', 'books'], 'readonly');
	const meta = await tx.objectStore('metadata').get(slugID);
	const book = await tx.objectStore('books').get(slugID);
	await tx.done;

	if (!book) error(404, `Book with ID ${slugID} not found in your library`);

	const { entries } = await unzip(book.file);
	const stored = { meta, book, entries };
	readingState.setLoaded(stored);

	return stored;
}) satisfies PageLoad;
