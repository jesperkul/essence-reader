<script lang="ts">
	import { onDestroy, onMount, tick } from 'svelte';
	import { fade } from 'svelte/transition';
	import type { Book, Metadata } from '$lib/types';
	import Topbar from '$lib/components/Topbar.svelte';
	import ReaderSettings from './ReaderSettings.svelte';
	import Drawer from '$lib/components/Drawer.svelte';
	import { assembleChapter } from './reader';
	import { themeStore } from '$lib/stores';

	// Icons:
	import CarbonSettings from '~icons/carbon/settings';
	import CarbonTableOfContents from '~icons/carbon/table-of-contents';
	import CarbonArrowRight from '~icons/carbon/arrow-right';
	import CarbonArrowLeft from '~icons/carbon/arrow-left';
	import CarbonChevronLeft from '~icons/carbon/chevron-left';
	import CarbonDirectionLoopLeft from '~icons/carbon/direction-loop-left';

	import { unzip, type ZipInfo } from 'unzipit';
	import { openBookDB } from '$lib/db';
	import TocNode from './TocNode.svelte';
	import { relativeToAbs } from '$lib/utils.js';

	const { data } = $props();
	let meta: Metadata = $derived(data.meta);
	let book: Book = $derived(data.book);

	let section: number = $state(0);
	let scrolled: number = $state(0);

	type settingsType = {
		scale: number;
		fontFamily: string;
		paginated: boolean;
		animations: boolean;
	};

	let storedSettingsJson = localStorage.getItem('settings');
	let settings: settingsType = $state(
		storedSettingsJson
			? JSON.parse(storedSettingsJson)
			: {
					scale: 10,
					fontFamily: 'Default',
					paginated: window.innerWidth > 1000, // Default to paginated if screen is big enough
					animations: false
				}
	);

	let entries: ZipInfo['entries'];
	let previousJumps: number[] = $state([]);

	let chapterHTML = $state('');
	let iframeElement: HTMLIFrameElement | undefined = $state();
	let blobUrls: string[] = [];

	const registerBlobUrl = (url: string) => {
		blobUrls.push(url);
	};

	onMount(async () => {
		try {
			entries = (await unzip(book.file)).entries;
		} catch (e) {
			if ((e as Error).message.includes('permission')) {
				// Workaround to fix error in Chromium incognito mode.
				// See: https://github.com/GoogleChrome/developer.chrome.com/issues/2563
				const buffer = await book.file.arrayBuffer();
				entries = (await unzip(buffer)).entries;
			}
		}
		updateSection(meta.progress);
	});

	onDestroy(() => {
		blobUrls.forEach(URL.revokeObjectURL);
	});

	const updateSection = async (index: number) => {
		if (0 <= index && index < book.spine.length) {
			blobUrls.forEach(URL.revokeObjectURL);
			blobUrls = [];

			section = index;
			scrolled = 0;
			meta.progress = section;
			if (meta.id) {
				(await openBookDB).put('metas', $state.snapshot(meta));
			}

			const computedStyles = getComputedStyle(document.documentElement);
			const primaryColor = computedStyles.getPropertyValue('--primary-color') || '0, 0, 0';

			let readerCSS = `
				:root {
					--essence-scale: ${settings.scale / 10};
					--essence-font: ${settings.fontFamily};
					--essence-color: rgb(${primaryColor});
				}

				html {
					box-sizing: border-box !important;
					width: 100% !important;
					height: 100% !important;
					overflow-x: hidden !important;
					padding: 3em 0 2em 0 !important;
				}

				body {
					margin: 0 !important;
					box-sizing: border-box !important;
					zoom: var(--essence-scale) !important;
					column-gap: 4em !important;
				}

				img,
				svg {
					max-height: calc(100vh - 6em) !important;
					max-width: 100% !important;
					object-fit: scale-down !important;
				}

				html,
				body {
					color: var(--essence-color) !important;
					background: transparent !important;
				}

				html[data-essence-mode='paginated'] {
					overflow-y: hidden !important;
				}

				html[data-essence-mode='paginated'] body {
					width: 100% !important;
					height: 100% !important;
					padding: 0 2em !important;
					column-count: 2 !important;
					column-fill: auto !important;
				}

				html[data-essence-mode='scrolled'] {
					overflow-y: auto !important;
				}

				html[data-essence-mode='scrolled'] body {
					margin: 0 auto !important;
					width: 50% !important;
					height: auto !important;
					padding: 0 0 2em 0 !important;
				}

				@media (max-width: 1000px) {
					html[data-essence-mode='scrolled'] body {
						width: 90% !important;
					}
				}

				html[data-essence-font]:not([data-essence-font='Default']) * {
					font-family: var(--essence-font) !important;
					line-height: normal !important;
				}
			`;

			const rootAttributes: Record<string, string> = {
				'data-essence-mode': settings.paginated ? 'paginated' : 'scrolled',
				'data-essence-font': settings.fontFamily
			};

			chapterHTML = await assembleChapter(
				book.spine[index],
				entries,
				registerBlobUrl,
				readerCSS,
				rootAttributes
			);
		}
	};

	const getClientWidth = () => iframeElement?.clientWidth || 0;
	const getScrollWidth = () =>
		iframeElement?.contentWindow?.document.documentElement.scrollWidth || 0;

	const jumpTo = async (href: string) => {
		previousJumps = [...previousJumps, section];
		const [chapter, elemId] = href.split('#');

		if (settings.paginated) {
			pagesScrolled = 0;
			iframeElement?.contentWindow?.scrollTo({ left: 0 });
		}
		if (chapter) {
			const chapterIndex = book.spine.indexOf(chapter);
			await updateSection(chapterIndex);
		}
		if (elemId) {
			// if there is an element that is to be focused
			await tick(); // Wait until chapter has been loaded
			const iframeDocument = iframeElement?.contentWindow?.document;
			if (!iframeDocument) return;
			const element = iframeDocument.getElementById(elemId);
			if (!element) return;
			if (settings.paginated) {
				const left = element.getBoundingClientRect().left;
				pagesScrolled = Math.floor(left / getClientWidth());
				iframeElement?.contentWindow?.scrollTo({
					left: pagesScrolled * getClientWidth(),
					behavior: settings.animations ? 'smooth' : 'instant'
				});
			} else {
				element.scrollIntoView({
					behavior: 'auto',
					block: 'center',
					inline: 'center'
				});
			}
		}
	};

	let pagesScrolled = $state(0);

	const nextPage = () => {
		const clientWidth = getClientWidth();
		const scrollWidth = getScrollWidth();

		if ((pagesScrolled + 1) * clientWidth < scrollWidth) {
			pagesScrolled++;
		} else if (section + 1 < book.spine.length) {
			updateSection(section + 1);
			pagesScrolled = 0;
		}
		iframeElement?.contentWindow?.scrollTo({
			left: pagesScrolled * clientWidth,
			behavior: settings.animations ? 'smooth' : 'instant'
		});
	};

	const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

	const prevPage = async () => {
		const clientWidth = getClientWidth();

		if (pagesScrolled > 0) {
			pagesScrolled--;
		} else {
			await updateSection(section - 1);
			await delay(50); // Wait so that CSS styles can be applied on previous chapter
			// Necessary since the width changes when styles are applied

			const scrollWidth = getScrollWidth();
			if (scrollWidth > clientWidth) {
				pagesScrolled = Math.floor(scrollWidth / clientWidth);
			} else {
				pagesScrolled = 0;
			}
		}

		iframeElement?.contentWindow?.scrollTo({
			left: pagesScrolled * clientWidth,
			behavior: settings.animations ? 'smooth' : 'instant'
		});
	};

	const incrementSection = (inc: number) => {
		if (!settings.paginated) {
			updateSection(section + inc);
		} else {
			if (inc > 0) {
				nextPage();
			} else {
				prevPage();
			}
		}
		if (previousJumps.length !== 0) {
			previousJumps = [];
		}
	};

	const handleKeydown = ({ key }: { key: string }) => {
		switch (key) {
			case 'ArrowLeft':
				incrementSection(-1);
				break;
			case 'ArrowRight':
				incrementSection(1);
				break;
			default:
				break;
		}
	};

	let timeout: number;

	const handleResize = () => {
		if (settings.paginated) {
			clearTimeout(timeout);
			timeout = window.setTimeout(updateAfterResize, 100);
		}
	};

	const updateAfterResize = () => {
		if (settings.paginated) {
			iframeElement?.contentWindow?.scrollTo({
				left: pagesScrolled * getClientWidth(),
				behavior: settings.animations ? 'smooth' : 'instant'
			});
		}
	};

	$effect(() => {
		const currentScale = settings.scale / 10;
		const font = settings.fontFamily;
		const isPaginated = settings.paginated;
		$themeStore;

		const iframeDocument = iframeElement?.contentWindow?.document;
		if (!iframeDocument) return;

		const root = iframeDocument.documentElement;
		const computedStyles = getComputedStyle(document.documentElement);
		const primaryColor = computedStyles.getPropertyValue('--primary-color') || '0, 0, 0';

		root.style.setProperty('--essence-scale', currentScale.toString());
		root.style.setProperty('--essence-font', font);
		root.style.setProperty('--essence-color', `rgb(${primaryColor})`);

		root.setAttribute('data-essence-mode', isPaginated ? 'paginated' : 'scrolled');
		root.setAttribute('data-essence-font', font);

		if (isPaginated) updateAfterResize();
	});

	const setupIframe = (node: HTMLIFrameElement) => {
		const addListeners = () => {
			const iframeDocument = node.contentWindow?.document;
			if (!iframeDocument) return;

			iframeDocument.addEventListener('keydown', (e) => {
				handleKeydown({ key: e.key });
			});

			iframeDocument.addEventListener('click', (e) => {
				const target = (e.target as HTMLElement).closest('a');
				if (target) {
					const href = target.getAttribute('href');
					if (!href) return;

					if (href.startsWith('http://') || href.startsWith('https://')) {
						e.preventDefault();
						window.open(href, '_blank', 'noopener,noreferrer');
					} else if (href.startsWith('mailto:')) {
						return;
					} else if (href.startsWith('#')) {
						e.preventDefault();
						jumpTo(href);
					} else {
						e.preventDefault();
						const absHref = relativeToAbs(href, book.spine[section]);
						jumpTo(absHref);
					}
				} else {
					node.dispatchEvent(
						new MouseEvent('click', {
							bubbles: true,
							cancelable: true
						})
					);
				}
			});
		};

		node.addEventListener('load', addListeners);

		return {
			destroy() {
				node.removeEventListener('load', addListeners);
			}
		};
	};
</script>

<svelte:head>
	<title>
		{meta.title + ' - ' + meta.author}
	</title>
</svelte:head>

<div in:fade={{ duration: 200 }}>
	<Topbar toned={scrolled > 100}>
		{#snippet leftbar()}
			<a href="/">
				<CarbonChevronLeft />
			</a>
		{/snippet}

		{#snippet toptext()}
			<h4>
				<b>{meta.title} - </b>
				{meta.author}
			</h4>
			<p>{section}/{meta.length}</p>
		{/snippet}

		{#snippet rightbar()}
			{#if previousJumps.length !== 0}
				<button
					transition:fade={{ duration: 200 }}
					id="jumpbtn"
					onclick={() => {
						let lastJump = previousJumps.pop();
						previousJumps = previousJumps;
						if (lastJump !== undefined) {
							updateSection(lastJump);
						}
					}}>
					<CarbonDirectionLoopLeft />
					{previousJumps[previousJumps.length - 1]}
				</button>
			{/if}
			<Drawer>
				{#snippet icon()}
					<CarbonTableOfContents />
				{/snippet}
				{#each book.toc as tocitem}
					<TocNode {tocitem} onClick={jumpTo} currentSection={section} />
				{/each}
			</Drawer>
			<Drawer>
				{#snippet icon()}
					<CarbonSettings />
				{/snippet}
				<ReaderSettings bind:settings onScaleChange={updateAfterResize} />
			</Drawer>
			<button onclick={() => incrementSection(-1)}><CarbonArrowLeft /></button>
			<button onclick={() => incrementSection(1)}><CarbonArrowRight /></button>
		{/snippet}
	</Topbar>

	<div class="iframe-container" class:paginated={settings.paginated}>
		{#if chapterHTML}
			<iframe bind:this={iframeElement} srcdoc={chapterHTML} title="Book" use:setupIframe></iframe>
		{/if}
	</div>
</div>

<svelte:window bind:scrollY={scrolled} onresize={handleResize} onkeydown={handleKeydown} />

<style>
	.iframe-container {
		width: 100%;
		height: 100vh;
		overflow: hidden;
	}

	.iframe-container.paginated {
		width: 90%;
		margin: auto;
	}

	iframe {
		width: 100%;
		height: 100%;
		border: none;
		background: transparent;
	}

	#jumpbtn {
		border-radius: 0.25em;
		font-size: 1em;
		line-height: 1em;
	}
</style>
