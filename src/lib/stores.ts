import { writable } from 'svelte/store';
import { browser } from '$app/environment';

const theme = browser ? document.documentElement.getAttribute('data-theme') || 'light' : 'light';

export const themeStore = writable<string>(theme);

themeStore.subscribe((value) => {
	if (browser) {
		localStorage.setItem('theme', value);
		document.documentElement.setAttribute('data-theme', value);
	}
});

export const shouldSaveStore = writable<boolean>(true);

if (browser && localStorage.getItem('shouldSave') !== null) {
	try {
		shouldSaveStore.set(JSON.parse(localStorage.getItem('shouldSave') as string));
	} catch {
		localStorage.removeItem('shouldSave');
	}
}

shouldSaveStore.subscribe((value) => {
	if (browser) {
		localStorage.setItem('shouldSave', JSON.stringify(value));
	}
});
