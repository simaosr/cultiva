<script lang="ts">
	import {
		activeTab, structures, selectedStructure, gardenZones,
		selectedZoneIndex, selectedPlant, placedPlants, fences, trees,
		sceneConfig, viewMode, theme, heatmapData, camera,
		timeConfig, invalidateHeatmap, activeTool
	} from '$lib/stores';
	import { computeZoneSunHours, matchPlantsForZone, getSunCategory, computeHeatmap } from '$lib/engines';
	import { PLANTS } from '$lib/data/plants';
	import type { Plant, PlantCategory, PanelTab, Structure } from '$lib/types';

	let plantSearch = $state('');
	let plantFilter = $state<PlantCategory | 'all'>('all');

	const tabs: { id: PanelTab; label: string }[] = [
		{ id: 'scene', label: 'Scene' },
		{ id: 'plants', label: 'Plants' },
		{ id: 'zones', label: 'Zones' },
	];

	const categories: (PlantCategory | 'all')[] = ['all', 'vegetable', 'fruit', 'herb', 'flower', 'shrub'];

	let filteredPlants = $derived(PLANTS.filter(p => {
		if (plantFilter !== 'all' && p.category !== plantFilter) return false;
		if (plantSearch && !p.name.toLowerCase().includes(plantSearch.toLowerCase()) && !p.latin.toLowerCase().includes(plantSearch.toLowerCase())) return false;
		return true;
	}));

	let mpp = $derived($sceneConfig.metersPerPixel);

	function updateStructProp(key: keyof Structure, value: any) {
		if (!$selectedStructure) return;
		const id = $selectedStructure.id;
		structures.update(arr => arr.map(s => s.id === id ? { ...s, [key]: value } : s));
		selectedStructure.set($structures.find(s => s.id === id) || null);
		invalidateHeatmap();
	}

	function deleteSelected() {
		if (!$selectedStructure) return;
		structures.update(arr => arr.filter(s => s.id !== $selectedStructure!.id));
		selectedStructure.set(null);
		invalidateHeatmap();
	}

	function selectPlant(p: Plant) {
		selectedPlant.set(p);
		activeTool.set('plant');
	}

	function removePlacedPlant(i: number) {
		placedPlants.update(arr => arr.filter((_, idx) => idx !== i));
	}

	function analyzeAllZones() {
		const sc = $sceneConfig;
		const date = new Date($timeConfig.date + 'T12:00');
		gardenZones.update(arr => arr.map(z => ({
			...z,
			sunData: computeZoneSunHours(z, $structures, $fences, $trees, sc.latitude, sc.longitude, date, sc.northAngle, sc.metersPerPixel)
		})));
	}

	function deleteZone(i: number) {
		gardenZones.update(arr => arr.filter((_, idx) => idx !== i));
		if ($selectedZoneIndex === i) selectedZoneIndex.set(null);
	}

	function sunBadgeClass(plant: Plant): string {
		if (plant.sunMin >= 6) return 'sun-full';
		if (plant.sunMin >= 3) return 'sun-partial';
		return 'sun-shade';
	}

	function isActivationKey(event: KeyboardEvent): boolean {
		return event.key === 'Enter' || event.key === ' ';
	}
</script>

<div class="right-panel">
	<div class="panel-tabs">
		{#each tabs as tab}
			<button
				class="panel-tab"
				class:active={$activeTab === tab.id}
				onclick={() => activeTab.set(tab.id)}
			>{tab.label}</button>
		{/each}
	</div>

	<!-- SCENE TAB -->
	{#if $activeTab === 'scene'}
		<div class="panel-section">
			<h3>Location</h3>
			<div class="field-row">
				<div class="field">
					<label for="scene-latitude">Latitude</label>
					<input id="scene-latitude" type="number" value={$sceneConfig.latitude} step="0.1"
						onchange={e => { sceneConfig.update(c => ({ ...c, latitude: +e.currentTarget.value })); invalidateHeatmap(); }} />
				</div>
				<div class="field">
					<label for="scene-longitude">Longitude</label>
					<input id="scene-longitude" type="number" value={$sceneConfig.longitude} step="0.1"
						onchange={e => { sceneConfig.update(c => ({ ...c, longitude: +e.currentTarget.value })); invalidateHeatmap(); }} />
				</div>
			</div>
			<div class="field">
				<label for="scene-north-angle">North Direction (°)</label>
				<input id="scene-north-angle" type="number" value={$sceneConfig.northAngle} step="1" min="0" max="360"
					onchange={e => { sceneConfig.update(c => ({ ...c, northAngle: +e.currentTarget.value })); invalidateHeatmap(); }} />
			</div>
		</div>

		<div class="panel-section">
			<h3>Structures ({$structures.length})</h3>
			<div class="struct-list">
				{#each $structures as s, i (s.id)}
					<div class="struct-item" class:selected={$selectedStructure?.id === s.id}
						role="button" tabindex="0"
						onclick={() => { selectedStructure.set(s); activeTool.set('select'); }}
						onkeydown={(e) => { if (isActivationKey(e)) { e.preventDefault(); selectedStructure.set(s); activeTool.set('select'); } }}>
						<div class="color-dot" style="background:{s.color}"></div>
						<div class="name">{s.name}</div>
						<div class="dims">{(s.w*mpp).toFixed(0)}×{(s.h*mpp).toFixed(0)}m</div>
						<button class="struct-delete" onclick={(e) => {
							e.stopPropagation();
							structures.update(arr => arr.filter(st => st.id !== s.id));
							if ($selectedStructure?.id === s.id) selectedStructure.set(null);
							invalidateHeatmap();
						}}>✕</button>
					</div>
				{:else}
					<div class="empty-msg">No structures yet. Use ▭ to draw.</div>
				{/each}
			</div>
		</div>

		{#if $selectedStructure}
			<div class="panel-section">
				<h3>Properties</h3>
				<div class="field">
					<label for="structure-name">Name</label>
					<input id="structure-name" type="text" value={$selectedStructure.name} onchange={e => updateStructProp('name', e.currentTarget.value)} />
				</div>
				<div class="field-row">
					<div class="field">
						<label for="structure-height">Height (m)</label>
						<input id="structure-height" type="number" value={$selectedStructure.height} step="0.5" min="0.5" max="30"
							onchange={e => updateStructProp('height', +e.currentTarget.value)} />
					</div>
					<div class="field">
						<label for="structure-roof">Roof</label>
						<select id="structure-roof" value={$selectedStructure.roofType} onchange={e => updateStructProp('roofType', e.currentTarget.value)}>
							<option value="flat">Flat</option>
							<option value="gable">Gable</option>
							<option value="shed">Shed</option>
						</select>
					</div>
				</div>
				{#if $selectedStructure.roofType !== 'flat'}
					<div class="field-row">
						<div class="field">
							<label for="structure-ridge-height">Ridge Height (m)</label>
							<input id="structure-ridge-height" type="number" value={$selectedStructure.ridgeHeight} step="0.5"
								onchange={e => updateStructProp('ridgeHeight', +e.currentTarget.value)} />
						</div>
						<div class="field">
							<label for="structure-ridge-dir">Ridge Dir (°)</label>
							<input id="structure-ridge-dir" type="number" value={$selectedStructure.ridgeDir} step="1"
								onchange={e => updateStructProp('ridgeDir', +e.currentTarget.value)} />
						</div>
					</div>
				{/if}
				<button class="btn btn-danger" onclick={deleteSelected}>Delete</button>
			</div>
		{/if}

		{#if $fences.length > 0}
			<div class="panel-section">
				<h3>Fences ({$fences.length})</h3>
				{#each $fences as f, i (f.id)}
					<div class="struct-item">
						<div class="color-dot" style="background:#c4a060"></div>
						<div class="name">{f.name}</div>
						<div class="dims">h={f.height}m</div>
						<button class="struct-delete" onclick={() => { fences.update(arr => arr.filter(fe => fe.id !== f.id)); invalidateHeatmap(); }}>✕</button>
					</div>
				{/each}
			</div>
		{/if}

		{#if $trees.length > 0}
			<div class="panel-section">
				<h3>Trees ({$trees.length})</h3>
				{#each $trees as t, i (t.id)}
					<div class="struct-item">
						<div class="color-dot" style="background:#2a6a2e"></div>
						<div class="name">🌳 {t.name}</div>
						<div class="dims">r={t.canopyRadius}m</div>
						<button class="struct-delete" onclick={() => { trees.update(arr => arr.filter(tr => tr.id !== t.id)); invalidateHeatmap(); }}>✕</button>
					</div>
				{/each}
			</div>
		{/if}

		<div class="panel-section">
			<h3>Illumination</h3>
			<div class="legend">
				<span>0h</span>
				<div class="legend-bar"></div>
				<span>14h+</span>
			</div>
			<p class="legend-labels">Full sun: &gt;6h · Partial: 3–6h · Shade: &lt;3h</p>
		</div>

		<div class="panel-section">
			<h3>Quick Guide</h3>
			<div class="instructions">
				<b>▭</b> Draw structure · <b>⊹</b> Select/move · <b>♣</b> Garden zone<br>
				<b>🌱</b> Place plant · <b>┃</b> Fence (dbl-click to finish) · <b>🌳</b> Tree<br>
				<b>✦</b> Pan · Scroll to zoom · <kbd>Del</kbd> remove
			</div>
		</div>
	{/if}

	<!-- PLANTS TAB -->
	{#if $activeTab === 'plants'}
		<div class="panel-section">
			<h3>Plant Database</h3>
			<input type="text" class="plant-search" placeholder="Search plants…" bind:value={plantSearch} />
			<div class="plant-filters">
				{#each categories as cat}
					<button class="plant-filter-btn" class:active={plantFilter === cat}
						onclick={() => plantFilter = cat}>{cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}</button>
				{/each}
			</div>
			<div class="plant-list">
				{#each filteredPlants as p (p.id)}
					<div class="plant-item" class:selected={$selectedPlant?.id === p.id}
						role="button" tabindex="0"
						onclick={() => selectPlant(p)}
						onkeydown={(e) => { if (isActivationKey(e)) { e.preventDefault(); selectPlant(p); } }}>
						<div class="plant-icon">{p.icon}</div>
						<div class="plant-info">
							<div class="plant-name">{p.name}</div>
							<div class="plant-latin">{p.latin}</div>
							<div class="plant-tags">
								<span class="plant-tag">{p.category}</span>
								<span class="plant-tag">{p.spacing}m</span>
							</div>
						</div>
						<span class="plant-sun-badge {sunBadgeClass(p)}">{p.sunLabel}</span>
					</div>
				{:else}
					<div class="empty-msg">No plants match your search.</div>
				{/each}
			</div>
		</div>

		{#if $selectedPlant}
			<div class="panel-section">
				<h3>Plant Details</h3>
				<div class="plant-detail-header">
					<span class="plant-detail-icon">{$selectedPlant.icon}</span>
					<div>
						<div class="plant-detail-name">{$selectedPlant.name}</div>
						<div class="plant-detail-latin">{$selectedPlant.latin}</div>
					</div>
				</div>
				<p class="plant-detail-desc">{$selectedPlant.description}</p>
				<div class="plant-detail-stats">
					<span>☀ {$selectedPlant.sunMin}–{$selectedPlant.sunMax}h sun</span>
					<span>📏 {$selectedPlant.spacing}m spacing</span>
				</div>
				<button class="btn" onclick={() => activeTool.set('plant')}>🌱 Place on map</button>
			</div>
		{/if}

		<div class="panel-section">
			<h3>Placed Plants ({$placedPlants.length})</h3>
			{#each $placedPlants as p, i (p.id)}
				<div class="placed-item">
					<span>{p.icon}</span>
					<span class="name">{p.name}</span>
					<button onclick={() => removePlacedPlant(i)}>✕</button>
				</div>
			{:else}
				<div class="empty-msg">No plants placed yet.</div>
			{/each}
		</div>
	{/if}

	<!-- ZONES TAB -->
	{#if $activeTab === 'zones'}
		<div class="panel-section">
			<h3>Garden Zones</h3>
			<p class="zone-intro">Draw zones with ♣, then analyze to get plant recommendations.</p>
			<button class="btn" onclick={analyzeAllZones}>☀ Analyze All Zones</button>
			<div class="zone-list">
				{#each $gardenZones as z, i (z.id)}
					<div class="zone-card" class:selected={$selectedZoneIndex === i}
						role="button" tabindex="0"
						onclick={() => selectedZoneIndex.set(i)}
						onkeydown={(e) => { if (isActivationKey(e)) { e.preventDefault(); selectedZoneIndex.set(i); } }}>
						<div class="zone-header">
							<span class="zone-title">🌱 {z.name} <span class="zone-dims">{(z.w*mpp).toFixed(0)}×{(z.h*mpp).toFixed(0)}m</span></span>
							<button class="struct-delete" onclick={(e) => { e.stopPropagation(); deleteZone(i); }}>✕</button>
						</div>
						{#if z.sunData}
							{@const cat = getSunCategory(z.sunData.avg)}
							<div class="zone-sun">
								<span class="plant-sun-badge {cat.category === 'full' ? 'sun-full' : cat.category === 'partial' ? 'sun-partial' : 'sun-shade'}">{cat.label}</span>
								{z.sunData.avg.toFixed(1)}h avg ({z.sunData.min.toFixed(1)}–{z.sunData.max.toFixed(1)}h)
							</div>
							{@const matches = matchPlantsForZone(PLANTS, z.sunData)}
							{#if matches.length > 0}
								<div class="zone-recs">
									<b>Recommended:</b>
									{matches.slice(0, 8).map(m => `${m.plant.icon} ${m.plant.name}`).join(', ')}
									{#if matches.length > 8}
										<span class="more">+{matches.length - 8} more</span>
									{/if}
								</div>
							{/if}
						{:else}
							<div class="empty-msg">Click "Analyze" to compute.</div>
						{/if}
					</div>
				{:else}
					<div class="empty-msg">No zones defined yet.</div>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.right-panel {
		width: 320px; background: var(--bg-panel); border-left: 1px solid var(--border);
		display: flex; flex-direction: column; overflow-y: auto;
	}
	.right-panel::-webkit-scrollbar { width: 6px; }
	.right-panel::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb, #3a4a3e); border-radius: 3px; }

	.panel-tabs { display: flex; border-bottom: 1px solid var(--border); }
	.panel-tab {
		flex: 1; padding: 8px 0; border: none; background: transparent;
		color: var(--text-dim); font-family: 'Fraunces', serif; font-size: 0.78rem;
		cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.15s;
	}
	.panel-tab:hover { color: var(--text); }
	.panel-tab.active { color: var(--accent); border-bottom-color: var(--accent); }

	.panel-section { padding: 14px 16px; border-bottom: 1px solid var(--border); }
	h3 {
		font-family: 'Fraunces', serif; font-weight: 500; font-size: 0.8rem;
		color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 10px;
	}

	.field { margin-bottom: 8px; }
	.field label { display: block; font-size: 0.72rem; color: var(--text-dim); margin-bottom: 3px; }
	.field input, .field select {
		width: 100%; padding: 5px 8px; background: var(--bg-input); border: 1px solid var(--border);
		border-radius: 6px; color: var(--text); font-family: 'DM Sans', sans-serif; font-size: 0.82rem;
	}
	.field input:focus, .field select:focus { outline: none; border-color: var(--accent-dim); box-shadow: 0 0 0 2px var(--accent-glow); }
	.field-row { display: flex; gap: 8px; }
	.field-row .field { flex: 1; }

	.btn {
		padding: 5px 12px; border: 1px solid var(--border); background: var(--bg-card);
		color: var(--text); border-radius: 6px; cursor: pointer; font-family: 'DM Sans', sans-serif;
		font-size: 0.78rem; transition: all 0.15s;
	}
	.btn:hover { border-color: var(--accent-dim); color: var(--accent); }
	.btn-danger:hover { border-color: var(--danger, #c47b7b); color: var(--danger, #c47b7b); }

	.struct-list, .zone-list { display: flex; flex-direction: column; gap: 4px; }
	.struct-item {
		display: flex; align-items: center; gap: 8px; padding: 7px 9px;
		background: var(--bg-input); border-radius: 7px; cursor: pointer;
		border: 1px solid transparent; transition: all 0.15s;
	}
	.struct-item:hover { border-color: var(--border); }
	.struct-item.selected { border-color: var(--accent-dim); background: var(--accent-glow); }
	.color-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
	.struct-item .name { flex: 1; font-size: 0.78rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.dims { font-size: 0.68rem; color: var(--text-dim); }
	.struct-delete {
		background: none; border: none; color: var(--text-dim); cursor: pointer;
		font-size: 0.82rem; padding: 2px; border-radius: 4px;
	}
	.struct-delete:hover { color: var(--danger, #c47b7b); }

	.empty-msg { font-size: 0.72rem; color: var(--text-dim); padding: 4px 0; }

	.legend { display: flex; align-items: center; gap: 4px; margin-top: 6px; }
	.legend-bar {
		flex: 1; height: 10px; border-radius: 5px;
		background: linear-gradient(to right, #1a2a40, #2a4a3a, #4a7a3e, #a0c040, #f0c850);
	}
	.legend span { font-size: 0.62rem; color: var(--text-dim); }
	.legend-labels { font-size: 0.68rem; color: var(--text-dim); margin-top: 6px; }

	.instructions { font-size: 0.68rem; color: var(--text-dim); line-height: 1.6; }
	.instructions kbd {
		background: var(--bg-card); padding: 1px 5px; border-radius: 3px;
		border: 1px solid var(--border); font-size: 0.62rem;
	}

	/* Plant list */
	.plant-search {
		width: 100%; padding: 6px 10px; background: var(--bg-input); border: 1px solid var(--border);
		border-radius: 6px; color: var(--text); font-family: 'DM Sans', sans-serif; font-size: 0.82rem; margin-bottom: 8px;
	}
	.plant-search:focus { outline: none; border-color: var(--accent-dim); box-shadow: 0 0 0 2px var(--accent-glow); }
	.plant-filters { display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 8px; }
	.plant-filter-btn {
		padding: 3px 9px; border: 1px solid var(--border); background: transparent;
		color: var(--text-dim); border-radius: 12px; cursor: pointer; font-size: 0.68rem;
		font-family: 'DM Sans', sans-serif;
	}
	.plant-filter-btn.active { background: var(--accent-glow); color: var(--accent); border-color: var(--accent-dim); }
	.plant-list { max-height: 240px; overflow-y: auto; display: flex; flex-direction: column; gap: 3px; }
	.plant-list::-webkit-scrollbar { width: 4px; }
	.plant-list::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb, #3a4a3e); border-radius: 2px; }

	.plant-item {
		display: flex; align-items: center; gap: 8px; padding: 6px 8px;
		border-radius: 6px; cursor: pointer; border: 1px solid transparent; transition: background 0.1s;
	}
	.plant-item:hover { background: var(--bg-card); }
	.plant-item.selected { border-color: var(--accent-dim); background: var(--accent-glow); }
	.plant-icon { font-size: 1rem; flex-shrink: 0; width: 22px; text-align: center; }
	.plant-info { flex: 1; min-width: 0; }
	.plant-name { font-size: 0.78rem; font-weight: 500; }
	.plant-latin { font-size: 0.65rem; color: var(--text-dim); font-style: italic; }
	.plant-tags { display: flex; gap: 3px; margin-top: 2px; }
	.plant-tag {
		font-size: 0.58rem; padding: 1px 5px; border-radius: 8px;
		background: var(--bg-card); color: var(--accent); border: 1px solid var(--border);
	}
	.plant-sun-badge { font-size: 0.62rem; padding: 2px 6px; border-radius: 8px; font-weight: 600; white-space: nowrap; }
	:global(.sun-full) { background: #f0c85033; color: #f0c850; }
	:global(.sun-partial) { background: #8ac04033; color: #8ac040; }
	:global(.sun-shade) { background: #4080c033; color: #6aaae0; }

	.plant-detail-header { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; }
	.plant-detail-icon { font-size: 1.5rem; }
	.plant-detail-name { font-weight: 600; font-size: 0.9rem; }
	.plant-detail-latin { font-size: 0.72rem; color: var(--text-dim); font-style: italic; }
	.plant-detail-desc { font-size: 0.75rem; line-height: 1.6; margin-bottom: 8px; }
	.plant-detail-stats { font-size: 0.72rem; color: var(--text-dim); display: flex; gap: 12px; margin-bottom: 8px; }

	.placed-item {
		display: flex; align-items: center; gap: 6px; padding: 4px 8px;
		background: var(--bg-input); border-radius: 6px; font-size: 0.72rem;
	}
	.placed-item .name { flex: 1; }
	.placed-item button { background: none; border: none; color: var(--text-dim); cursor: pointer; font-size: 0.72rem; }
	.placed-item button:hover { color: var(--danger, #c47b7b); }

	.zone-intro { font-size: 0.72rem; color: var(--text-dim); margin-bottom: 10px; }
	.zone-card {
		padding: 10px; background: var(--bg-input); border-radius: 8px;
		margin-top: 8px; cursor: pointer; border: 1px solid transparent;
	}
	.zone-card.selected { border-color: var(--accent-dim); }
	.zone-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
	.zone-title { font-size: 0.78rem; font-weight: 600; }
	.zone-dims { font-weight: 300; font-size: 0.68rem; color: var(--text-dim); }
	.zone-sun { font-size: 0.72rem; color: var(--sun, #f0c850); margin-bottom: 4px; display: flex; align-items: center; gap: 6px; }
	.zone-recs { font-size: 0.68rem; color: var(--text-dim); line-height: 1.5; }
	.zone-recs b { color: var(--text); }
	.more { color: var(--accent); }
</style>
