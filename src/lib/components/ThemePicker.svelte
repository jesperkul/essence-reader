<script lang="ts">
	import { themeStore } from '$lib/stores';

	const themes = [
		{ name: 'Light', color: '#fff', value: 'light' },
		{ name: 'Black', color: '#000', value: 'black' },
		{ name: 'Warm', color: '#f6e4bd', value: 'warm' },
		{ name: 'Dark', color: '#032038', value: 'dark' }
	];
</script>

<div>
	<span>Theme</span>
	<div class="theme-picker">
		{#each themes as theme}
			<button
				onclick={() => themeStore.set(theme.value)}
				class={theme.value === $themeStore ? 'theme-button active' : 'theme-button'}>
				<div class="theme-preview" style="background-color: {theme.color};"></div>
				<span>{theme.name}</span>
			</button>
		{/each}
	</div>
</div>

<style>
	.theme-picker {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.25em;
		min-width: 0;
	}

	.theme-preview {
		width: 1.5em;
		height: 1.5em;
		border-radius: 5px;
		border: 1px solid rgb(var(--primary-color));
	}

	.theme-button.active {
		background-color: rgba(var(--highlight-bg), 0.1);
	}

	.theme-button {
		all: unset;
		height: 2.5em;
		padding: 0 0.5em;
		border: 1px solid rgba(var(--primary-color), 0.5);
		border-radius: 10px;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 0.5em;
		min-width: 0;
	}

	.theme-button span {
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	.theme-button:hover {
		background-color: rgba(var(--highlight-bg), 0.2);
	}
</style>
