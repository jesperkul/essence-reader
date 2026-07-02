import { addBook } from '$lib/db';
import { goto, invalidateAll } from '$app/navigation';
import { shouldSaveStore } from '$lib/stores';
import { parseEpub } from './services/parse';
import { page } from '$app/state';
import { get } from 'svelte/store';
import { unzip } from 'unzipit';
import { readingState } from './state/readingState.svelte';

export const readFile = async (file: File) => {
	try {
		if (!file.type.includes('epub') && !file.type.includes('zip')) {
			throw new Error('File is not of type .epub or .zip');
		}

		const { meta, book } = await parseEpub(file);
		const id = get(shouldSaveStore) ? await addBook(meta, book) : undefined;

		if (id && page.params.slug === String(id)) return;

		const { entries } = await unzip(file);
		readingState.setLoaded({ meta, book, entries });

		if (!id && page.url.pathname === '/reading') {
			// When reading without saving, we need to manually re-run
			// load function since the books share the same route.
			await invalidateAll();
		} else {
			const isAlreadyReading = page.route.id?.includes('reading') ?? false;
			const url = id ? `/reading/${id}` : '/reading';
			await goto(url, { replaceState: isAlreadyReading });
		}
	} catch (e) {
		alert(e);
	}
};

export const relativeToAbs = (href: string, relativeTo: string) => {
	const url = new URL(href, `http://localhost/${relativeTo}`);
	return decodeURI(url.pathname.slice(1));
};

export const removeHash = (path: string) => {
	const hashIndex = path.indexOf('#');
	return hashIndex === -1 ? path : path.slice(0, hashIndex);
};
