<script lang="ts">
	import { onMount } from 'svelte';
	import {
		structures, fences, trees, gardenZones, placedPlants,
		selectedStructure, selectedZoneIndex, selectedPlant,
		activeTool, viewMode, theme, camera, heatmapData,
		sceneConfig, timeConfig,
		addStructure, addGardenZone, addFence, addTree, addPlacedPlant,
		invalidateHeatmap, isPlaying
	} from '$lib/stores';
	import {
		solarPosition, projectStructureShadow, projectFenceShadow,
		projectTreeShadow, computeHeatmap, pointInPolygon
	} from '$lib/engines';
	import type { Point, Structure } from '$lib/types';

	let canvasEl: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D;
	let containerEl: HTMLDivElement;

	const GRID = 10;

	// Drag state (local, not in stores)
	let dragging = false;
	let dragStart: any = null;
	let dragCurrent: any = null;
	let moving: { struct: Structure; offX: number; offY: number } | null = null;
	// Fence drawing state
	let fencePoints: Point[] = [];
	let renderFrame: number | null = null;

	function screenToWorld(sx: number, sy: number) {
		const cam = $camera;
		return { x: (sx - cam.x) / cam.zoom, y: (sy - cam.y) / cam.zoom };
	}

	function snap(v: number) {
		return Math.round(v / GRID) * GRID;
	}

	// ==================== RENDERING ====================
	function render() {
		if (!canvasEl || !ctx) return;
		const cam = $camera;
		const isDark = $theme === 'dark';
		const w = (canvasEl.width = containerEl.clientWidth);
		const h = (canvasEl.height = containerEl.clientHeight);

		ctx.fillStyle = isDark ? '#1a1e1c' : '#f4f1ec';
		ctx.fillRect(0, 0, w, h);

		ctx.save();
		ctx.translate(cam.x, cam.y);
		ctx.scale(cam.zoom, cam.zoom);

		drawGrid(w, h, isDark);

		if ($viewMode === 'heatmap' && $heatmapData) drawHeatmap();
		if ($viewMode === 'shadows') drawShadows(isDark);

		drawGardenZones(isDark);
		drawFences(isDark);
		drawTrees(isDark);
		drawStructures(isDark);
		drawPlacedPlants(isDark);
		drawDragPreview(isDark);
		drawFencePreview(isDark);
		drawCompass(w, h, isDark);

		ctx.restore();
		drawScaleBar(w, h, isDark);
	}

	function scheduleRender() {
		if (renderFrame !== null) return;
		renderFrame = requestAnimationFrame(() => {
			renderFrame = null;
			render();
		});
	}

	function drawGrid(w: number, h: number, isDark: boolean) {
		const cam = $camera;
		const startX = Math.floor(-cam.x / cam.zoom / GRID) * GRID;
		const startY = Math.floor(-cam.y / cam.zoom / GRID) * GRID;
		const endX = startX + w / cam.zoom + GRID;
		const endY = startY + h / cam.zoom + GRID;

		ctx.strokeStyle = isDark ? '#ffffff06' : '#00000008';
		ctx.lineWidth = 0.5 / cam.zoom;
		ctx.beginPath();
		for (let x = startX; x <= endX; x += GRID) { ctx.moveTo(x, startY); ctx.lineTo(x, endY); }
		for (let y = startY; y <= endY; y += GRID) { ctx.moveTo(startX, y); ctx.lineTo(endX, y); }
		ctx.stroke();

		const major = GRID * 10;
		ctx.strokeStyle = isDark ? '#ffffff0f' : '#00000012';
		ctx.lineWidth = 1 / cam.zoom;
		ctx.beginPath();
		const mx = Math.floor(-cam.x / cam.zoom / major) * major;
		const my = Math.floor(-cam.y / cam.zoom / major) * major;
		for (let x = mx; x <= endX; x += major) { ctx.moveTo(x, startY); ctx.lineTo(x, endY); }
		for (let y = my; y <= endY; y += major) { ctx.moveTo(startX, y); ctx.lineTo(endX, y); }
		ctx.stroke();
	}

	function drawShadows(isDark: boolean) {
		const sc = $sceneConfig;
		const tc = $timeConfig;
		const date = new Date(tc.date + 'T12:00');
		const sun = solarPosition(sc.latitude, sc.longitude, date, tc.minutes / 60);
		if (sun.elevation <= 0) return;

		const allShadows: Point[][] = [];

		for (const s of $structures) {
			const shadow = projectStructureShadow(s, sun.azimuth, sun.elevation, sc.northAngle, sc.metersPerPixel);
			if (shadow && shadow.length >= 3) allShadows.push(shadow);
		}
		for (const f of $fences) {
			allShadows.push(...projectFenceShadow(f, sun.azimuth, sun.elevation, sc.northAngle, sc.metersPerPixel));
		}
		for (const t of $trees) {
			const shadow = projectTreeShadow(t, sun.azimuth, sun.elevation, sc.northAngle, sc.metersPerPixel);
			if (shadow) allShadows.push(shadow);
		}

		ctx.fillStyle = isDark ? '#0008' : '#00000022';
		for (const poly of allShadows) {
			if (poly.length < 3) continue;
			ctx.beginPath();
			ctx.moveTo(poly[0].x, poly[0].y);
			for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
			ctx.closePath();
			ctx.fill();
		}
	}

	function drawHeatmap() {
		const hm = $heatmapData!;
		ctx.save();
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		for (let r = 0; r < hm.rows; r++) {
			for (let c = 0; c < hm.cols; c++) {
				ctx.fillStyle = sunHoursColor(hm.data[r * hm.cols + c]);
				ctx.fillRect(c * hm.step, r * hm.step, hm.step, hm.step);
			}
		}
		ctx.restore();
	}

	function sunHoursColor(h: number): string {
		const t = Math.min(h / 14, 1);
		const lerp = (a: number[], b: number[], u: number, alpha: number) => {
			const r = Math.round(a[0] + (b[0] - a[0]) * u);
			const g = Math.round(a[1] + (b[1] - a[1]) * u);
			const bl = Math.round(a[2] + (b[2] - a[2]) * u);
			return `rgba(${r},${g},${bl},${alpha})`;
		};
		if (t < 0.2) return lerp([26,42,64],[42,74,58], t/0.2, 0.5);
		if (t < 0.43) return lerp([42,74,58],[74,122,62], (t-0.2)/0.23, 0.55);
		if (t < 0.7) return lerp([74,122,62],[160,192,64], (t-0.43)/0.27, 0.6);
		return lerp([160,192,64],[240,200,80], (t-0.7)/0.3, 0.65);
	}

	function drawGardenZones(isDark: boolean) {
		const cam = $camera;
		$gardenZones.forEach((g, i) => {
			const isSel = $selectedZoneIndex === i;
			ctx.fillStyle = isSel ? (isDark ? '#2d6a2e55' : '#4aaa4e33') : (isDark ? '#2d6a2e33' : '#4aaa4e22');
			ctx.strokeStyle = isSel ? (isDark ? '#4afa4eaa' : '#2a8a2eaa') : (isDark ? '#4a9a3e88' : '#3a8a3e66');
			ctx.lineWidth = (isSel ? 2 : 1) / cam.zoom;
			ctx.fillRect(g.x, g.y, g.w, g.h);
			ctx.strokeRect(g.x, g.y, g.w, g.h);
			ctx.fillStyle = isDark ? '#4a9a3eaa' : '#2a7a2ecc';
			ctx.font = `${11 / cam.zoom}px DM Sans, sans-serif`;
			let label = g.name || `Zone ${i+1}`;
			if (g.sunData) label += ` — ${g.sunData.avg.toFixed(1)}h sun`;
			ctx.fillText(`🌱 ${label}`, g.x + 4/cam.zoom, g.y + 14/cam.zoom);
		});
	}

	function drawFences(isDark: boolean) {
		const cam = $camera;
		for (const f of $fences) {
			if (f.points.length < 2) continue;
			ctx.strokeStyle = isDark ? '#c4a060' : '#8a6a3e';
			ctx.lineWidth = 3 / cam.zoom;
			ctx.setLineDash([6/cam.zoom, 3/cam.zoom]);
			ctx.beginPath();
			ctx.moveTo(f.points[0].x, f.points[0].y);
			for (let i = 1; i < f.points.length; i++) ctx.lineTo(f.points[i].x, f.points[i].y);
			ctx.stroke();
			ctx.setLineDash([]);
			// Label
			ctx.fillStyle = isDark ? '#c4a060cc' : '#8a6a3ecc';
			ctx.font = `${9/cam.zoom}px DM Sans, sans-serif`;
			ctx.fillText(`${f.name} (h=${f.height}m)`, f.points[0].x + 4/cam.zoom, f.points[0].y - 4/cam.zoom);
		}
	}

	function drawTrees(isDark: boolean) {
		const cam = $camera;
		const mpp = $sceneConfig.metersPerPixel;
		for (const t of $trees) {
			const r = t.canopyRadius / mpp;
			// Canopy
			ctx.fillStyle = isDark ? '#2a6a2e44' : '#4aaa4e33';
			ctx.strokeStyle = isDark ? '#4a9a3e88' : '#3a8a3e66';
			ctx.lineWidth = 1 / cam.zoom;
			ctx.beginPath();
			ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
			ctx.fill();
			ctx.stroke();
			// Trunk
			ctx.fillStyle = isDark ? '#8a6a3e' : '#6a4a2e';
			ctx.beginPath();
			ctx.arc(t.x, t.y, 3/cam.zoom, 0, Math.PI * 2);
			ctx.fill();
			// Label
			ctx.fillStyle = isDark ? '#aaddaacc' : '#2a7a2ecc';
			ctx.font = `${9/cam.zoom}px DM Sans, sans-serif`;
			ctx.textAlign = 'center';
			ctx.fillText(`🌳 ${t.name}`, t.x, t.y - r - 4/cam.zoom);
			ctx.textAlign = 'start';
		}
	}

	function drawStructures(isDark: boolean) {
		const cam = $camera;
		const mpp = $sceneConfig.metersPerPixel;
		for (const s of $structures) {
			const sel = s === $selectedStructure;
			ctx.fillStyle = sel ? (isDark ? '#4a6a5e' : '#a0b0a4') : (isDark ? '#3a4a42' : '#b8c0ba');
			ctx.fillRect(s.x, s.y, s.w, s.h);

			if (s.roofType === 'gable') {
				ctx.strokeStyle = isDark ? '#88aa9966' : '#6a8a6e66';
				ctx.lineWidth = 1/cam.zoom;
				const dir = s.ridgeDir * Math.PI / 180;
				const cx = s.x + s.w/2, cy = s.y + s.h/2;
				const len = Math.max(s.w, s.h) * 0.4;
				ctx.beginPath();
				ctx.moveTo(cx - Math.sin(dir)*len, cy - Math.cos(dir)*len);
				ctx.lineTo(cx + Math.sin(dir)*len, cy + Math.cos(dir)*len);
				ctx.stroke();
			}

			ctx.strokeStyle = sel ? (isDark ? '#7bc47f' : '#2d8a32') : (isDark ? '#5a6a5e' : '#8a9a8e');
			ctx.lineWidth = (sel ? 2 : 1)/cam.zoom;
			ctx.strokeRect(s.x, s.y, s.w, s.h);

			ctx.fillStyle = isDark ? '#d4ddd6cc' : '#3a3832cc';
			ctx.font = `${10/cam.zoom}px DM Sans, sans-serif`;
			ctx.fillText(`${s.name} (${(s.w*mpp).toFixed(1)}×${(s.h*mpp).toFixed(1)}m, h=${s.height}m)`, s.x + 3/cam.zoom, s.y - 4/cam.zoom);
		}
	}

	function drawPlacedPlants(isDark: boolean) {
		const cam = $camera;
		for (const p of $placedPlants) {
			ctx.font = `${14/cam.zoom}px sans-serif`;
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.fillText(p.icon, p.x, p.y);
			ctx.font = `${8/cam.zoom}px DM Sans, sans-serif`;
			ctx.fillStyle = isDark ? '#d4ddd6aa' : '#3a3832aa';
			ctx.fillText(p.name, p.x, p.y + 12/cam.zoom);
			ctx.textAlign = 'start';
			ctx.textBaseline = 'alphabetic';
		}
	}

	function drawDragPreview(isDark: boolean) {
		if (!dragging || !dragStart || !dragCurrent) return;
		if ($activeTool !== 'rect' && $activeTool !== 'garden') return;
		const cam = $camera;
		const mpp = $sceneConfig.metersPerPixel;
		const x = Math.min(dragStart.x, dragCurrent.x);
		const y = Math.min(dragStart.y, dragCurrent.y);
		const w2 = Math.abs(dragCurrent.x - dragStart.x);
		const h2 = Math.abs(dragCurrent.y - dragStart.y);
		const isGarden = $activeTool === 'garden';
		ctx.strokeStyle = isGarden ? (isDark ? '#4a9a3e' : '#2a8a2e') : (isDark ? '#7bc47f' : '#2d8a32');
		ctx.lineWidth = 1.5/cam.zoom;
		ctx.setLineDash([4/cam.zoom, 4/cam.zoom]);
		ctx.strokeRect(x, y, w2, h2);
		ctx.setLineDash([]);
		ctx.fillStyle = isGarden ? (isDark ? '#4a9a3ecc' : '#2a7a2ecc') : (isDark ? '#7bc47fcc' : '#2d8a32cc');
		ctx.font = `${11/cam.zoom}px DM Sans, sans-serif`;
		ctx.fillText(`${(w2*mpp).toFixed(1)} × ${(h2*mpp).toFixed(1)} m`, x + 3/cam.zoom, y - 4/cam.zoom);
	}

	function drawFencePreview(isDark: boolean) {
		if ($activeTool !== 'fence' || fencePoints.length === 0) return;
		const cam = $camera;
		ctx.strokeStyle = isDark ? '#f0c850' : '#c89a20';
		ctx.lineWidth = 2/cam.zoom;
		ctx.setLineDash([4/cam.zoom, 4/cam.zoom]);
		ctx.beginPath();
		ctx.moveTo(fencePoints[0].x, fencePoints[0].y);
		for (let i = 1; i < fencePoints.length; i++) ctx.lineTo(fencePoints[i].x, fencePoints[i].y);
		ctx.stroke();
		ctx.setLineDash([]);
		// Dots at each point
		for (const p of fencePoints) {
			ctx.fillStyle = isDark ? '#f0c850' : '#c89a20';
			ctx.beginPath();
			ctx.arc(p.x, p.y, 3/cam.zoom, 0, Math.PI*2);
			ctx.fill();
		}
	}

	function drawCompass(w: number, h: number, isDark: boolean) {
		const na = $sceneConfig.northAngle;
		ctx.save();
		ctx.setTransform(1,0,0,1,0,0);
		const cx = w-40, cy = 40, r = 20;
		const a = -na * Math.PI / 180;
		ctx.strokeStyle = isDark ? '#ffffff33' : '#00000033';
		ctx.lineWidth = 1;
		ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.stroke();
		ctx.fillStyle = '#c47b7b';
		ctx.beginPath();
		ctx.moveTo(cx + Math.sin(a)*r, cy - Math.cos(a)*r);
		ctx.lineTo(cx + Math.sin(a+2.7)*6, cy - Math.cos(a+2.7)*6);
		ctx.lineTo(cx + Math.sin(a-2.7)*6, cy - Math.cos(a-2.7)*6);
		ctx.closePath(); ctx.fill();
		ctx.fillStyle = isDark ? '#fff' : '#3a3832';
		ctx.font = '10px DM Sans, sans-serif'; ctx.textAlign = 'center';
		ctx.fillText('N', cx + Math.sin(a)*(r+10), cy - Math.cos(a)*(r+10) + 3);
		ctx.restore();
	}

	function drawScaleBar(w: number, h: number, isDark: boolean) {
		ctx.save();
		ctx.setTransform(1,0,0,1,0,0);
		const mpp = $sceneConfig.metersPerPixel;
		const pxPer10m = 10/mpp * $camera.zoom;
		let barM = 10, barPx = pxPer10m;
		if (barPx > 200) { barM = 5; barPx = pxPer10m/2; }
		if (barPx > 200) { barM = 2; barPx = pxPer10m/5; }
		if (barPx < 40) { barM = 20; barPx = pxPer10m*2; }
		if (barPx < 40) { barM = 50; barPx = pxPer10m*5; }
		const x = 16, y = h-20;
		ctx.strokeStyle = isDark ? '#ffffff66' : '#00000044';
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(x, y-4); ctx.lineTo(x, y); ctx.lineTo(x+barPx, y); ctx.lineTo(x+barPx, y-4);
		ctx.stroke();
		ctx.fillStyle = isDark ? '#ffffff99' : '#00000077';
		ctx.font = '10px DM Sans, sans-serif';
		ctx.fillText(`${barM} m`, x + barPx/2 - 10, y-7);
		ctx.restore();
	}

	// ==================== MOUSE HANDLERS ====================
	function onMouseDown(e: MouseEvent) {
		const rect = canvasEl.getBoundingClientRect();
		const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
		const wp = screenToWorld(sx, sy);

		if ($activeTool === 'pan') {
			dragging = true;
			dragStart = { x: sx, y: sy, camX: $camera.x, camY: $camera.y };
			return;
		}

		if ($activeTool === 'plant') {
			if ($selectedPlant) {
				addPlacedPlant($selectedPlant, snap(wp.x), snap(wp.y));
				scheduleRender();
			}
			return;
		}

		if ($activeTool === 'tree') {
			addTree(snap(wp.x), snap(wp.y));
			invalidateHeatmap();
			scheduleRender();
			return;
		}

		if ($activeTool === 'fence') {
			fencePoints.push({ x: snap(wp.x), y: snap(wp.y) });
			scheduleRender();
			return;
		}

		if ($activeTool === 'select') {
			let found: Structure | null = null;
			const structs = $structures;
			for (let i = structs.length - 1; i >= 0; i--) {
				const s = structs[i];
				if (wp.x >= s.x && wp.x <= s.x + s.w && wp.y >= s.y && wp.y <= s.y + s.h) {
					found = s; break;
				}
			}
			selectedStructure.set(found);
			selectedZoneIndex.set(null);
			const zones = $gardenZones;
			for (let i = zones.length - 1; i >= 0; i--) {
				const g = zones[i];
				if (wp.x >= g.x && wp.x <= g.x + g.w && wp.y >= g.y && wp.y <= g.y + g.h) {
					selectedZoneIndex.set(i); break;
				}
			}
			if (found) {
				moving = { struct: found, offX: wp.x - found.x, offY: wp.y - found.y };
				dragging = true;
			}
			scheduleRender();
			return;
		}

		if ($activeTool === 'rect' || $activeTool === 'garden') {
			dragging = true;
			dragStart = { x: snap(wp.x), y: snap(wp.y) };
			dragCurrent = { ...dragStart };
		}
	}

	function onMouseMove(e: MouseEvent) {
		if (!dragging) return;
		const rect = canvasEl.getBoundingClientRect();
		const sx = e.clientX - rect.left, sy = e.clientY - rect.top;

		if ($activeTool === 'pan' && dragStart) {
			camera.set({
				x: dragStart.camX + (sx - dragStart.x),
				y: dragStart.camY + (sy - dragStart.y),
				zoom: $camera.zoom
			});
			scheduleRender(); return;
		}

		if ($activeTool === 'select' && moving) {
			const wp = screenToWorld(sx, sy);
			const s = moving.struct;
			structures.update(arr => arr.map(st =>
				st.id === s.id ? { ...st, x: snap(wp.x - moving!.offX), y: snap(wp.y - moving!.offY) } : st
			));
			// Update selectedStructure reference
			const updated = $structures.find(st => st.id === s.id);
			if (updated) { moving.struct = updated; selectedStructure.set(updated); }
			scheduleRender(); return;
		}

		if (($activeTool === 'rect' || $activeTool === 'garden') && dragStart) {
			const wp = screenToWorld(sx, sy);
			dragCurrent = { x: snap(wp.x), y: snap(wp.y) };
			scheduleRender();
		}
	}

	function onMouseUp() {
		if (!dragging) return;
		dragging = false;

		if ($activeTool === 'rect' && dragStart && dragCurrent) {
			const x = Math.min(dragStart.x, dragCurrent.x);
			const y = Math.min(dragStart.y, dragCurrent.y);
			const w = Math.abs(dragCurrent.x - dragStart.x);
			const h = Math.abs(dragCurrent.y - dragStart.y);
			if (w > GRID && h > GRID) addStructure(x, y, w, h);
		}

		if ($activeTool === 'garden' && dragStart && dragCurrent) {
			const x = Math.min(dragStart.x, dragCurrent.x);
			const y = Math.min(dragStart.y, dragCurrent.y);
			const w = Math.abs(dragCurrent.x - dragStart.x);
			const h = Math.abs(dragCurrent.y - dragStart.y);
			if (w > GRID && h > GRID) addGardenZone(x, y, w, h);
		}

		moving = null;
		dragStart = null;
		dragCurrent = null;
		invalidateHeatmap();
		scheduleRender();
	}

	function onWheel(e: WheelEvent) {
		e.preventDefault();
		const rect = canvasEl.getBoundingClientRect();
		const mx = e.clientX - rect.left, my = e.clientY - rect.top;
		const oldZoom = $camera.zoom;
		const newZoom = Math.max(0.2, Math.min(5, oldZoom * (e.deltaY < 0 ? 1.1 : 0.9)));
		camera.set({
			x: mx - (mx - $camera.x) * (newZoom / oldZoom),
			y: my - (my - $camera.y) * (newZoom / oldZoom),
			zoom: newZoom
		});
		invalidateHeatmap();
		scheduleRender();
	}

	function onDblClick(e: MouseEvent) {
		if ($activeTool === 'fence' && fencePoints.length >= 2) {
			addFence(fencePoints);
			fencePoints = [];
			invalidateHeatmap();
			scheduleRender();
		}
	}

	function onKeyDown(e: KeyboardEvent) {
		if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'SELECT') return;

		if (e.key === 'Delete' || e.key === 'Backspace') {
			if ($selectedStructure) {
				structures.update(arr => arr.filter(s => s.id !== $selectedStructure!.id));
				selectedStructure.set(null);
				invalidateHeatmap();
				scheduleRender();
			} else if ($selectedZoneIndex !== null) {
				gardenZones.update(arr => arr.filter((_, i) => i !== $selectedZoneIndex));
				selectedZoneIndex.set(null);
				scheduleRender();
			}
		}

		if (e.key === 'Escape' && $activeTool === 'fence') {
			fencePoints = [];
			scheduleRender();
		}
	}

	// ==================== REACTIVE RENDERING ====================
	// Re-render when stores change
	$effect(() => {
		// Touch all stores to subscribe
		$structures; $fences; $trees; $gardenZones; $placedPlants;
		$selectedStructure; $selectedZoneIndex;
		$viewMode; $theme; $camera; $heatmapData;
		$sceneConfig; $timeConfig;
		if (!canvasEl || !ctx) return;
		scheduleRender();
	});

	onMount(() => {
		ctx = canvasEl.getContext('2d')!;
		camera.set({
			x: containerEl.clientWidth / 2,
			y: containerEl.clientHeight / 2,
			zoom: 1
		});
		window.addEventListener('keydown', onKeyDown);
		scheduleRender();

		return () => {
			window.removeEventListener('keydown', onKeyDown);
			if (renderFrame !== null) {
				cancelAnimationFrame(renderFrame);
				renderFrame = null;
			}
		};
	});

	// Cursor style
	let cursorClass = $derived(({
		rect: 'cursor-crosshair',
		select: 'cursor-default',
		garden: 'cursor-crosshair',
		plant: 'cursor-copy',
		fence: 'cursor-crosshair',
		tree: 'cursor-copy',
		pan: 'cursor-grab'
	} as Record<string, string>)[$activeTool] || 'cursor-default');
</script>

<div class="canvas-container {cursorClass}" bind:this={containerEl}>
	<canvas
		bind:this={canvasEl}
		onmousedown={onMouseDown}
		onmousemove={onMouseMove}
		onmouseup={onMouseUp}
		onwheel={onWheel}
		ondblclick={onDblClick}
	></canvas>
</div>

<style>
	.canvas-container {
		flex: 1;
		position: relative;
		overflow: hidden;
	}
	canvas { display: block; width: 100%; height: 100%; }
	.cursor-crosshair canvas { cursor: crosshair; }
	.cursor-default canvas { cursor: default; }
	.cursor-copy canvas { cursor: copy; }
	.cursor-grab canvas { cursor: grab; }
	.cursor-grab canvas:active { cursor: grabbing; }
</style>
