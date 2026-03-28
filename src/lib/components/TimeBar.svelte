<script lang="ts">
	import { timeConfig, timeDisplay, sceneConfig, isPlaying, invalidateHeatmap, viewMode, heatmapData, structures, fences, trees, camera } from '$lib/stores';
	import { solarPosition, getSunriseSunset, formatTime, computeHeatmap } from '$lib/engines';

	let playTimer: ReturnType<typeof setInterval> | null = null;

	let date = $derived(new Date($timeConfig.date + 'T12:00'));
	let sun = $derived(solarPosition($sceneConfig.latitude, $sceneConfig.longitude, date, $timeConfig.minutes / 60));
	let riseset = $derived(getSunriseSunset($sceneConfig.latitude, $sceneConfig.longitude, date));
	const datePresets = [
		{ label: '🌱', title: 'Spring Equinox', monthDay: '03-20' },
		{ label: '☀️', title: 'Summer Solstice', monthDay: '06-21' },
		{ label: '🍂', title: 'Autumn Equinox', monthDay: '09-22' },
		{ label: '❄️', title: 'Winter Solstice', monthDay: '12-21' }
	] as const;

	function onTimeSlide(e: Event) {
		const val = +(e.target as HTMLInputElement).value;
		timeConfig.update(tc => ({ ...tc, minutes: val }));
	}

	function onDateChange(e: Event) {
		const val = (e.target as HTMLInputElement).value;
		timeConfig.update(tc => ({ ...tc, date: val }));
		invalidateHeatmap();
	}

	function setPresetDate(monthDay: string) {
		const year = $timeConfig.date.slice(0, 4);
		timeConfig.update(tc => ({ ...tc, date: `${year}-${monthDay}` }));
		invalidateHeatmap();
	}

	function isPresetActive(monthDay: string) {
		return $timeConfig.date.slice(5) === monthDay;
	}

	function togglePlay() {
		isPlaying.update(p => !p);
		if ($isPlaying) {
			playTimer = setInterval(() => {
				timeConfig.update(tc => {
					let m = tc.minutes + 10;
					if (m > 1440) m = 0;
					return { ...tc, minutes: m };
				});
			}, 80);
		} else {
			if (playTimer) clearInterval(playTimer);
			playTimer = null;
		}
	}
</script>

<div class="time-bar">
	<button class="play-btn" onclick={togglePlay}>
		{$isPlaying ? '⏸' : '▶'}
	</button>
	<label for="timebar-date">Date</label>
	<input id="timebar-date" type="date" value={$timeConfig.date} onchange={onDateChange} />
	<div class="date-presets">
		{#each datePresets as preset}
			<button class="preset-btn" title={preset.title} class:active={isPresetActive(preset.monthDay)} onclick={() => setPresetDate(preset.monthDay)}>{preset.label}</button>
		{/each}
	</div>
	<label for="timebar-time">Time</label>
	<input id="timebar-time" type="range" min="0" max="1440" step="5" value={$timeConfig.minutes} oninput={onTimeSlide} />
	<div class="time-display">{$timeDisplay}</div>
	<div class="sun-info">
		<span>Az: {sun.azimuth.toFixed(1)}°</span>
		<span>El: {sun.elevation.toFixed(1)}°</span>
		<span>↑ {formatTime(riseset.rise)}</span>
		<span>↓ {formatTime(riseset.set)}</span>
	</div>
</div>

<style>
	.time-bar {
		background: var(--bg-panel);
		border-top: 1px solid var(--border);
		padding: 10px 20px;
		display: flex;
		align-items: center;
		gap: 14px;
		flex-wrap: wrap;
	}
	label { font-size: 0.72rem; color: var(--text-dim); white-space: nowrap; }
	.date-presets { display: flex; gap: 6px; flex-wrap: wrap; }
	.preset-btn {
		padding: 3px 6px;
		font-size: 0.9rem;
		border: 1px solid var(--border);
		border-radius: 6px;
		background: var(--bg-input);
		color: var(--text-dim);
		cursor: pointer;
		font-family: 'DM Sans', sans-serif;
	}
	.preset-btn:hover { border-color: var(--accent-dim); color: var(--text); }
	.preset-btn.active { background: var(--accent-glow); color: var(--accent); border-color: var(--accent-dim); }
	input[type="range"] { flex: 1; accent-color: var(--sun); height: 6px; min-width: 100px; }
	input[type="date"] {
		background: var(--bg-input); border: 1px solid var(--border); border-radius: 6px;
		color: var(--text); padding: 3px 8px; font-family: 'DM Sans', sans-serif; font-size: 0.78rem;
	}
	.time-display {
		font-family: 'Fraunces', serif; font-size: 1.05rem; color: var(--sun);
		min-width: 48px; text-align: center;
	}
	.play-btn {
		width: 30px; height: 30px; border: none; background: var(--sun-glow);
		color: var(--sun); border-radius: 50%; cursor: pointer; font-size: 0.85rem;
		display: flex; align-items: center; justify-content: center;
	}
	.play-btn:hover { background: var(--sun); color: var(--bg); }
	.sun-info { font-size: 0.68rem; color: var(--text-dim); display: flex; gap: 10px; }
	.sun-info span { white-space: nowrap; }
</style>
