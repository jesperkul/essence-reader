<script lang="ts">
	import { onDestroy, onMount, tick } from 'svelte';
	import { fade } from 'svelte/transition';
	import type { Book, Metadata } from '$lib/types';
	import Topbar from '$lib/components/Topbar.svelte';
	import ReaderSettings from './ReaderSettings.svelte';
	import Drawer from '$lib/components/Drawer.svelte';
	import { assembleChapter } from './reader';

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

	const { data } = $props();
	let meta: Metadata = data.meta;
	let book: Book = data.book;

	let container: HTMLElement;
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
		document.head.querySelectorAll('.essence-reader').forEach((styleE) => styleE.remove());
	});

	const updateSection = async (index: number) => {
		if (0 <= index && index < book.spine.length) {
			section = index;
			scrolled = 0;
			meta.progress = section;
			if (meta.id) {
				(await openBookDB).put('metas', $state.snapshot(data.meta));
			}
			container.replaceChildren(await assembleChapter(book.spine[section], entries, jumpTo));
		}
	};

	const jumpTo = async (href: string) => {
		previousJumps = [...previousJumps, section];
		const [chapter, elemId] = href.split('#');

		if (settings.paginated) {
			pagesScrolled = 0;
			container.scrollTo({ left: 0 });
		}
		if (chapter) {
			const chapterIndex = book.spine.indexOf(chapter);
			await updateSection(chapterIndex);
		}
		if (elemId) {
			// if there is an element that is to be focused
			await tick(); // Wait until chapter has been loaded
			const element = document.getElementById(elemId);
			if (!element) return;
			if (settings.paginated) {
				const left = element.getBoundingClientRect().left - container.getBoundingClientRect().left;
				pagesScrolled = Math.floor(left / container.clientWidth);
				container.scrollTo({
					left: pagesScrolled * container.clientWidth,
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
		if ((pagesScrolled + 1) * container.clientWidth < container.scrollWidth) {
			pagesScrolled++;
		} else {
			updateSection(section + 1);
			pagesScrolled = 0;
		}
		container.scrollTo({
			left: pagesScrolled * container.clientWidth,
			behavior: settings.animations ? 'smooth' : 'instant'
		});
	};

	const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

	const prevPage = async () => {
		if (pagesScrolled > 0) {
			pagesScrolled--;
		} else {
			await updateSection(section - 1);
			await delay(50); // Wait so that CSS styles can be applied on previous chapter
			// Necessary since the width changes when styles are applied

			if (container.scrollWidth > container.clientWidth) {
				pagesScrolled = Math.floor(container.scrollWidth / container.clientWidth);
			} else {
				pagesScrolled = 0;
			}
		}
		container.scrollTo({
			left: pagesScrolled * container.clientWidth,
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
			container.scrollTo({
				left: pagesScrolled * container.clientWidth,
				behavior: settings.animations ? 'smooth' : 'instant'
			});
		}
	};

	const ContainerClasses = () => {
		let classes = settings.paginated ? 'paginated' : 'scrolled';
		if (settings.fontFamily !== 'Default') {
			classes += ' applyFont';
		}
		return classes;
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
	<div
		id={settings.paginated ? 'containerContainer' : ''}
		style={`--scale: ${settings.scale / 10}; --fontFamily: ${settings.fontFamily}`}>
		<div
			id="container"
			class={ContainerClasses()}
			data-sveltekit-preload-data="off"
			bind:this={container}>
		</div>
	</div>
</div>

<svelte:window bind:scrollY={scrolled} onresize={handleResize} onkeydown={handleKeydown} />

<style>
	#container {
		transform-origin: top;
		margin: auto;
	}

	.applyFont :global(p),
	.applyFont :global(a),
	.applyFont :global(span) {
		line-height: normal !important;
		font-family: var(--fontFamily) !important;
	}

	#container :global(img),
	#container :global(svg) {
		max-height: calc(calc(100vh - 6em) / max(var(--scale), 1));
		max-width: 100%;
		object-fit: scale-down;
	}

	.paginated {
		padding: 0 2em;
		column-count: 2;
		column-gap: 4em;
		width: auto;
		margin-bottom: 2em;
		height: calc(calc(100vh - 5em) / max(var(--scale), 1));
		overflow: hidden;
	}

	.scrolled {
		padding-top: 3em;
		padding-bottom: 2em;
		transform: scale(var(--scale));
		transform-origin: top;
		width: calc(50% / var(--scale));
	}

	@media (max-width: 1000px) {
		.scrolled {
			width: calc(90% / max(var(--scale), 1));
		}

		/* Doesn't work with iOS, so recommending scrolled
		for smaller screens for now. See similar issue: 
		https://developer.apple.com/forums/thread/22213 */
		/* .paginated {
			column-count: 1;			
		} */
	}

	#containerContainer {
		overflow: hidden;
		margin: auto;
		transform: scale(var(--scale));
		transform-origin: top;
		width: calc(90% / max(var(--scale), 1));
		padding-top: calc(3em / var(--scale));
	}

	#jumpbtn {
		border-radius: 0.25em;
		font-size: 1em;
		line-height: 1em;
	}
</style>
