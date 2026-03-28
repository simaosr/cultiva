<script lang="ts">
	import { activeTool, activeTab } from '$lib/stores';
	import type { Tool } from '$lib/types';
	import Square from 'lucide-svelte/icons/square';
	import MousePointer2 from 'lucide-svelte/icons/mouse-pointer-2';
	import Flower2 from 'lucide-svelte/icons/flower-2';
	import Sprout from 'lucide-svelte/icons/sprout';
	import Fence from 'lucide-svelte/icons/fence';
	import TreeDeciduous from 'lucide-svelte/icons/tree-deciduous';
	import Hand from 'lucide-svelte/icons/hand';

	type ToolEntry = { id: Tool; icon: typeof Square; label: string; tab?: string };

	const groups: ToolEntry[][] = [
		[
			{ id: 'select', icon: MousePointer2, label: 'Select / Move' },
			{ id: 'pan',    icon: Hand,          label: 'Pan View' },
		],
		[
			{ id: 'rect',  icon: Square,        label: 'Draw Structure' },
			{ id: 'fence', icon: Fence,         label: 'Draw Fence' },
			{ id: 'tree',  icon: TreeDeciduous, label: 'Place Tree' },
		],
		[
			{ id: 'garden', icon: Flower2, label: 'Garden Zone' },
		],
		[
			{ id: 'plant', icon: Sprout, label: 'Place Plant', tab: 'plants' },
		],
	];

	function selectTool(t: Tool, tab?: string) {
		activeTool.set(t);
		if (tab) activeTab.set(tab as any);
	}
</script>

<div class="toolbar">
	{#each groups as group, i}
		{#if i > 0}
			<div class="tool-sep"></div>
		{/if}
		{#each group as t}
			<button
				class="tool-btn"
				class:active={$activeTool === t.id}
				title={t.label}
				onclick={() => selectTool(t.id, t.tab)}
			><t.icon size={18} /></button>
		{/each}
	{/each}
</div>

<style>
	.toolbar {
		width: 56px; background: var(--bg-panel); border-right: 1px solid var(--border);
		display: flex; flex-direction: column; align-items: center; padding: 12px 0; gap: 4px;
	}
	.tool-btn {
		width: 40px; height: 40px; border: none; background: transparent;
		color: var(--text-dim); border-radius: 8px; cursor: pointer;
		display: flex; align-items: center; justify-content: center;
		font-size: 1.1rem; transition: all 0.15s;
	}
	.tool-btn:hover { background: var(--bg-card); color: var(--text); }
	.tool-btn.active { background: var(--accent-glow); color: var(--accent); }
	.tool-sep { width: 28px; height: 1px; background: var(--border); margin: 6px 0; }
</style>
