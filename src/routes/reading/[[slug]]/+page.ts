export const prerender = false;
import { getBookFromDB } from '$lib/db.js';
import { readingState } from '$lib/state/readingState.svelte';
import type { PageLoad } from './$types';
import { error } from '@sveltejs/kit';
import { unzip } from 'unzipit';

export const load = (async ({ params }) => {
	const slugID = Number(params.slug);
	let activeBook = readingState.activeBook;

	if (activeBook && (!params.slug || activeBook.id === slugID)) {
		return { book: activeBook };
	}

	if (!params.slug) error(400, 'No book loaded and no book ID provided');

	if (isNaN(slugID) || !Number.isInteger(slugID) || slugID <= 0) {
		error(400, 'Invalid or non-numeric book ID provided');
	}

	const { file, progress, ...book } = await getBookFromDB(slugID);

	if (!book) error(404, `Book with ID ${slugID} not found in your library`);

	const { entries } = await unzip(file);

	activeBook = { ...book, entries };

	readingState.setState({ activeBook, progress });

	return { book: activeBook };
}) satisfies PageLoad;
