import { relativeToAbs } from '$lib/utils';
import type { ZipInfo } from 'unzipit';

const processCSS = async (
	css: string,
	cssPath: string,
	entries: ZipInfo['entries'],
	registerBlobUrl: (url: string) => void
): Promise<string> => {
	const urlRegex = /url\(([^)]+)\)/g;

	const matches = css.matchAll(urlRegex);
	for (const [match, relPath] of matches) {
		const filename = relativeToAbs(relPath, cssPath);
		if (!entries[filename]) {
			continue;
		}
		try {
			const blob = await entries[filename].blob();
			const blobUrl = URL.createObjectURL(blob);
			registerBlobUrl(blobUrl);
			css = css.replace(match, `url("${blobUrl}")`);
		} catch (e) {
			console.error(e);
			continue;
		}
	}

	return css;
};

const domParser = new DOMParser();

export const assembleChapter = async (
	chapterPath: string,
	entries: ZipInfo['entries'],
	registerBlobUrl: (url: string) => void,
	customCSS: string,
	rootAttributes: Record<string, string>
): Promise<string> => {
	const html = await entries[chapterPath].text();

	let newHTML = domParser.parseFromString(html, 'application/xhtml+xml');

	const errorNode = newHTML.querySelector('parsererror');
	if (errorNode) {
		// Try parsing as HTML if error when parsing as XHTML.
		// Can solve issues with mismatched tags
		newHTML = domParser.parseFromString(html, 'text/html');
	}

	newHTML.querySelectorAll('script').forEach((script) => script.remove());

	for (const e of newHTML.head.querySelectorAll('link[rel="stylesheet"], style')) {
		if (e.tagName.toLowerCase() === 'link') {
			const href = e.getAttribute('href');
			if (!href) continue;
			const filename = relativeToAbs(href, chapterPath);

			if (entries[filename]) {
				let css = await entries[filename].text();
				css = await processCSS(css, filename, entries, registerBlobUrl);

				const styleE = newHTML.createElement('style');
				styleE.innerHTML = css;
				newHTML.head.appendChild(styleE);
			}
		} else {
			const styleE = newHTML.createElement('style');
			const css = await processCSS(e.innerHTML, chapterPath, entries, registerBlobUrl);
			styleE.innerHTML = css;
			newHTML.head.appendChild(styleE);
		}

		e.remove();
	}

	newHTML.head.querySelectorAll('link').forEach((link) => link.remove());

	for (const e of newHTML.body.querySelectorAll('[src], svg image')) {
		const attribute = e.tagName.toLowerCase() === 'img' ? 'src' : 'xlink:href';
		const url = e.getAttribute(attribute);

		if (url && !url.includes('http')) {
			const filename = relativeToAbs(url, chapterPath);
			if (!entries[filename]) {
				continue;
			}
			const blob = await entries[filename].blob();
			const blobUrl = URL.createObjectURL(blob);
			registerBlobUrl(blobUrl);
			e.setAttribute(attribute, blobUrl);

			// Fixes some SVGs not playing nicely
			if (e.parentElement?.tagName.toLowerCase() === 'svg') {
				e.parentElement.removeAttribute('width');
				e.parentElement.removeAttribute('height');
				e.parentElement.style.width = 'auto';
				e.parentElement.style.height = 'auto';
			}
		}
	}

	const csp = newHTML.createElement('meta');
	csp.setAttribute('http-equiv', 'Content-Security-Policy');
	csp.setAttribute(
		'content',
		"default-src 'none'; img-src blob: data:; font-src blob: data:; media-src blob: data:; style-src 'unsafe-inline';"
	);

	newHTML.head.prepend(csp);

	if (customCSS) {
		const styleE = newHTML.createElement('style');
		styleE.id = 'essence-reader';
		styleE.innerHTML = customCSS;
		newHTML.head.appendChild(styleE);
	}

	if (rootAttributes && Object.keys(rootAttributes).length > 0) {
		for (const [key, value] of Object.entries(rootAttributes)) {
			newHTML.documentElement.setAttribute(key, value);
		}
	}

	return newHTML.documentElement.outerHTML;
};
