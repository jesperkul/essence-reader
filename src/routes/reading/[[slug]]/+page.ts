export const prerender = false;
import type { PageLoad } from './$types';
import { getLoaded, setLoaded } from '$lib/stores';
import { error } from '@sveltejs/kit';

export const load = (async ({ params }) => {
	const loaded = getLoaded();

	if (loaded && (!params.slug || loaded.meta.id === Number(params.slug))) {
		return loaded;
	}

	if (!params.slug) error(400, 'No book loaded and no book ID provided');

	const slugID = Number(params.slug);

	if (isNaN(slugID) || !Number.isInteger(slugID) || slugID <= 0) {
		error(400, 'Invalid or non-numeric book ID provided');
	}

	const db = await (await import('$lib/db')).openBookDB;

	const tx = db.transaction(['metas', 'books'], 'readonly');
	const meta = await tx.objectStore('metas').get(slugID);
	const book = await tx.objectStore('books').get(slugID);
	await tx.done;

	if (!book) error(404, `Book with ID ${slugID} not found in your library`);

	const stored = { meta, book };
	setLoaded(stored);

	return stored;
}) satisfies PageLoad;
