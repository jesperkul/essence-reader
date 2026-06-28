<script lang="ts">
	import ThemePicker from '$lib/components/ThemePicker.svelte';
	import CarbonBook from '~icons/carbon/book';
	import CarbonTextLineSpacing from '~icons/carbon/text-line-spacing';
	import CarbonTextFont from '~icons/carbon/text-font';
	import CarbonTextScale from '~icons/carbon/text-scale';
	import CarbonSidePanelOpenFilled from '~icons/carbon/side-panel-open-filled';
	import type { ReaderSettings } from '$lib/types';

	let {
		settings = $bindable(),
		onScaleChange
	}: { settings: ReaderSettings; onScaleChange: () => void } = $props();

	$effect(() => localStorage.setItem('settings', JSON.stringify(settings)));
</script>

<div class="readerSettings">
	<div id="modeSettings">
		<span>Mode</span>
		<button class={settings.paginated ? 'active' : ''} onclick={() => (settings.paginated = true)}>
			<CarbonBook style="vertical-align: middle; height: 1.5em; width: 1.5em;" />
			<span>Paginated</span>
		</button>
		<button class={settings.paginated ? '' : 'active'} onclick={() => (settings.paginated = false)}>
			<CarbonTextLineSpacing style="vertical-align: middle; height: 1.5em; width: 1.5em;" />
			<span>Scrolled</span>
		</button>
	</div>

	{#if settings.paginated}
		<div id="animationSettings">
			Animations
			<label class={settings.animations ? 'active' : ''}>
				<CarbonSidePanelOpenFilled style="vertical-align: middle; height: 1.5em; width: 1.5em;" />

				<span>Page Slide</span>
				<input type="checkbox" bind:checked={settings.animations} />
			</label>
		</div>
	{/if}
	<ThemePicker />

	<div id="fontSettings">
		<span>Font</span>
		<label id="fontSelector">
			<CarbonTextFont style="vertical-align: middle; height: 1.5em; width: 1.5em;" />
			<select name="fontpicker" bind:value={settings.fontFamily} style="width: 100%;">
				<option>Default</option>
				<option style="font-family:'Verdana'">Verdana</option>
				<option style="font-family:'Arial'">Arial</option>
				<option style="font-family:'Courier New '">Courier New </option>
				<option style="font-family:'Helvetica'">Helvetica</option>
				<option style="font-family:'Times New Roman'">Times New Roman</option>
			</select>
		</label>

		<label id="fontScaleSlider">
			<CarbonTextScale style="vertical-align: middle; height: 1.5em; width: 1.5em;" />
			<span>Scale</span>
			<input
				name="scale"
				type="range"
				min="5"
				max="30"
				bind:value={settings.scale}
				onchange={onScaleChange} />
		</label>
	</div>
</div>

<style>
	.readerSettings {
		display: flex;
		flex-direction: column;
		gap: 0.5em;
		width: 100%;
	}

	#modeSettings,
	#animationSettings,
	#fontSettings {
		display: flex;
		flex-direction: column;
		gap: 0.25em;
	}

	#modeSettings > span,
	#fontSettings > span {
		margin-bottom: -0.25em;
	}

	#modeSettings button,
	#animationSettings label,
	#fontSettings label {
		all: unset;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 0.5em;
		padding: 0 0.5em;
		border-radius: 10px;
		border: 1px solid rgba(var(--primary-color), 0.5);
		height: 2.5em;
		width: 100%;
		box-sizing: border-box;
	}

	#animationSettings input[type='checkbox'] {
		width: 1.5em;
		height: 1.5em;
		margin-left: auto;
	}

	#modeSettings button.active,
	#animationSettings label.active {
		background-color: rgba(var(--highlight-bg), 0.1);
	}

	#modeSettings button:hover,
	#animationSettings label:hover,
	#fontSettings label:hover {
		background-color: rgba(var(--highlight-bg), 0.2);
	}

	#fontScaleSlider > input {
		min-width: 0;
		flex-grow: 1;
	}

	span,
	label,
	button {
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	#fontSelector > select {
		height: 100%;
		font-size: 1em;
		border: none;
		cursor: pointer;
		color: var(--text-color);
		background-color: transparent;
	}
</style>
