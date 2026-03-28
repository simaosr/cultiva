<script lang="ts">
	import CanvasEditor from '$lib/components/CanvasEditor.svelte';
	import Toolbar from '$lib/components/Toolbar.svelte';
	import RightPanel from '$lib/components/RightPanel.svelte';
	import TimeBar from '$lib/components/TimeBar.svelte';
	import { theme, viewMode, heatmapData, structures, fences, trees, sceneConfig, timeConfig, camera } from '$lib/stores';
	import { computeHeatmap } from '$lib/engines';
	import type { ViewMode } from '$lib/types';

	function toggleTheme() {
		theme.update(t => t === 'dark' ? 'light' : 'dark');
	}

	$effect(() => {
		if (typeof document !== 'undefined') document.documentElement?.setAttribute('data-theme', $theme);
	});

	function setView(v: ViewMode) {
		viewMode.set(v);
		if (v === 'heatmap' && !$heatmapData) {
			const sc = $sceneConfig;
			const date = new Date($timeConfig.date + 'T12:00');
			const canvas = document.querySelector('canvas');
			if (canvas) {
				heatmapData.set(computeHeatmap(
					$structures, $fences, $trees,
					sc.latitude, sc.longitude, date, sc.northAngle, sc.metersPerPixel,
					$camera, canvas.width, canvas.height
				));
			}
		}
	}
</script>

<svelte:head>
	<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Fraunces:opsz,wght@9..144,300;9..144,500;9..144,700&display=swap" rel="stylesheet" />
</svelte:head>

<div class="app">
	<header>
		<h1>Cultiva</h1>
		<div class="header-controls">
			<div class="toggle-group">
				<button class="toggle-opt" class:active={$viewMode === 'shadows'} onclick={() => setView('shadows')}>Shadows</button>
				<button class="toggle-opt" class:active={$viewMode === 'heatmap'} onclick={() => setView('heatmap')}>Sun Hours</button>
			</div>
			<button class="theme-btn" onclick={toggleTheme}>
				{$theme === 'dark' ? '🌙' : '☀️'}
			</button>
		</div>
	</header>

	<div class="main-layout">
		<Toolbar />
		<CanvasEditor />
		<RightPanel />
	</div>

	<TimeBar />
</div>

<style>
	.app {
		height: 100vh;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	header {
		display: flex; align-items: center; justify-content: space-between;
		padding: 10px 20px; background: var(--bg-panel);
		border-bottom: 1px solid var(--border); z-index: 10;
	}
	header h1 {
		font-family: 'Fraunces', serif; font-weight: 500; font-size: 1.25rem;
		color: var(--accent); letter-spacing: -0.02em;
	}
	.sun-icon { color: var(--sun); }
	.header-controls { display: flex; gap: 8px; align-items: center; }

	.toggle-group {
		display: flex; background: var(--bg-input); border-radius: 8px;
		overflow: hidden; border: 1px solid var(--border);
	}
	.toggle-opt {
		padding: 4px 11px; font-size: 0.72rem; border: none; background: transparent;
		color: var(--text-dim); cursor: pointer; font-family: 'DM Sans', sans-serif;
	}
	.toggle-opt.active { background: var(--accent-glow); color: var(--accent); }

	.theme-btn {
		width: 32px; height: 32px; border: 1px solid var(--border); background: var(--bg-card);
		border-radius: 8px; cursor: pointer; font-size: 1rem;
		display: flex; align-items: center; justify-content: center; transition: all 0.15s;
	}
	.theme-btn:hover { border-color: var(--accent-dim); }

	.main-layout { display: flex; flex: 1; overflow: hidden; }
</style>
