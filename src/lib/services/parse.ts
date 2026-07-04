import { type ZipInfo } from 'unzipit';
import type { TableOfContentsItem } from '$lib/types';
import { relativeToAbs, removeHash } from '$lib/utils';
const domParser = new DOMParser();

const parseOpf = (opfContent: string, opfPath: string) => {
	const opfDocument = domParser.parseFromString(opfContent, 'application/xml');

	const packageElement = opfDocument.querySelector('package');
	const metadataElement = opfDocument.querySelector('metadata');
	const manifestElement = opfDocument.querySelector('manifest');
	const spineElement = opfDocument.querySelector('spine');
	if (!packageElement) throw new Error('Package element not found in OPF');
	if (!metadataElement) throw new Error('Metadata element not found in OPF');
	if (!manifestElement) throw new Error('Manifest element not found in OPF');
	if (!spineElement) throw new Error('Spine element not found in OPF');

	const { title, authors } = parseMeta(metadataElement);
	const identifier = getIdentifier(packageElement);
	const coverPath = getCoverPath(manifestElement, metadataElement, opfPath);
	const manifestItems = parseManifest(manifestElement, opfPath);
	const spine = parseSpine(spineElement, manifestItems);
	const ncxPath = getNcxPath(manifestElement, opfPath);

	return { title, authors, identifier, coverPath, spine, ncxPath };
};

const getIdentifier = (packageElement: Element): string => {
	const identifierId = packageElement.getAttribute('unique-identifier');
	if (!identifierId) return '';

	const identifierElement = packageElement.querySelector(`metadata > [id='${identifierId}']`);
	return identifierElement?.textContent || '';
};

const getNcxPath = (manifest: Element, opfPath: string): string | undefined => {
	const ncxItem = manifest.querySelector("item[media-type='application/x-dtbncx+xml']");
	const href = ncxItem?.getAttribute('href');
	if (!href) return undefined;
	return relativeToAbs(href, opfPath);
};

const getCoverPath = (manifest: Element, meta: Element, opfPath: string): string | undefined => {
	const coverId = meta.querySelector("[name='cover']")?.getAttribute('content');

	const coverItem = manifest.querySelector(`item[id='${coverId}']`);
	const href = coverItem?.getAttribute('href');
	if (!href) {
		// Try epub 3 cover image if epub 2 cover image not found
		const coverItem = manifest.querySelector("item[properties='cover-image']");
		const href = coverItem?.getAttribute('href');
		if (!href) return undefined;
		return relativeToAbs(href, opfPath);
	}
	return relativeToAbs(href, opfPath);
};

const parseMeta = (meta: Element): { title: string; authors: string[] } => {
	const titleElement: Element | null = meta.querySelector('title');
	const title: string = titleElement?.textContent || '';

	const authorElements: NodeListOf<Element> = meta.querySelectorAll('creator');
	const authors: string[] = Array.from(authorElements).map((v: Element) => v.textContent || '');

	return { title, authors };
};

const parseManifest = (manifest: Element, opfPath: string): Map<string, string> => {
	const manifestItems: Map<string, string> = new Map();

	for (const item of manifest.children) {
		const id = item.getAttribute('id');
		const href = item.getAttribute('href');
		if (!(id && href)) continue;
		manifestItems.set(id, relativeToAbs(href, opfPath));
	}

	return manifestItems;
};

const parseSpine = (spine: Element, manifestItems: Map<string, string>): string[] =>
	Array.from(spine.children).map((x) => manifestItems.get(x.getAttribute('idref') ?? '') ?? '');

const TocRecursive = (navPoint: Element, spine: string[], ncxPath: string): TableOfContentsItem => {
	const title = navPoint.querySelector('text')?.textContent || '';

	const contentElement = navPoint.querySelector('content');
	const src = contentElement?.getAttribute('src');

	const href = src ? relativeToAbs(src, ncxPath) : '';

	const index = spine.indexOf(removeHash(href));

	const navPoints = Array.from(navPoint.children).filter((x) => x.tagName === 'navPoint');
	const children = navPoints.map((x) => TocRecursive(x, spine, ncxPath));

	return { title, href, index, children: children.length > 0 ? children : undefined };
};

const parseToc = (ncx: string, ncxPath: string, spine: string[]): TableOfContentsItem[] => {
	const TOC: TableOfContentsItem[] = [];
	const navMap = domParser.parseFromString(ncx, 'application/xml').querySelector('navMap');
	if (!navMap) return [];

	for (const navPoint of navMap.children) {
		TOC.push(TocRecursive(navPoint, spine, ncxPath));
	}
	return TOC;
};

const parseContainer = (containerFileContent: string): string => {
	const containerDocument = domParser.parseFromString(containerFileContent, 'text/xml');

	const opfPath = containerDocument.querySelector('rootfile')?.getAttribute('full-path');

	if (!opfPath) throw new Error('OPF file not found in container.xml');

	return opfPath;
};

interface ParserResult {
	title: string;
	authors: string[];
	identifier: string;
	coverPath?: string;
	spine: string[];
	toc: TableOfContentsItem[];
}

export const parseEpub = async (entries: ZipInfo['entries']): Promise<ParserResult> => {
	try {
		const container = await entries['META-INF/container.xml'].text();
		const opfPath = parseContainer(container);
		const opf = await entries[opfPath].text();

		const { title, authors, identifier, coverPath, spine, ncxPath } = parseOpf(opf, opfPath);

		let toc: TableOfContentsItem[] = [];
		if (ncxPath) {
			// Allowing for books without a ncx file
			const ncx = await entries[ncxPath].text();
			toc = parseToc(ncx, ncxPath, spine);
		}

		return { title, authors, identifier, coverPath, spine, toc };
	} catch (e) {
		console.error(e);
		if (e instanceof Error) {
			throw new Error(`Error parsing EPUB file - ${e.message}`);
		}
		throw new Error('Error parsing EPUB file');
	}
};
