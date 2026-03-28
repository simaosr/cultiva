/**
 * Svelte stores for reactive state management.
 * Centralizes all app state — components subscribe and react.
 */
import { writable, derived } from 'svelte/store';
import type {
	Structure,
	Fence,
	TreeInstance,
	GardenZone,
	PlacedPlant,
	Plant,
	Camera,
	Tool,
	ViewMode,
	Theme,
	PanelTab,
	SceneConfig,
	TimeConfig,
	HeatmapData
} from '$lib/types';

// ==================== Scene Config ====================
export const sceneConfig = writable<SceneConfig>({
	latitude: 43.6,
	longitude: 1.44,
	northAngle: 0,
	metersPerPixel: 0.1
});

// ==================== Time ====================
export const timeConfig = writable<TimeConfig>({
	date: '2026-06-21',
	minutes: 720
});

export const timeDate = derived(timeConfig, ($tc) => new Date($tc.date + 'T12:00'));
export const timeHours = derived(timeConfig, ($tc) => $tc.minutes / 60);
export const timeDisplay = derived(timeConfig, ($tc) => {
	const h = Math.floor($tc.minutes / 60);
	const m = $tc.minutes % 60;
	return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
});

// ==================== Scene Objects ====================
export const structures = writable<Structure[]>([]);
export const fences = writable<Fence[]>([]);
export const trees = writable<TreeInstance[]>([]);
export const gardenZones = writable<GardenZone[]>([]);
export const placedPlants = writable<PlacedPlant[]>([]);

// ==================== Selection ====================
export const selectedStructure = writable<Structure | null>(null);
export const selectedZoneIndex = writable<number | null>(null);
export const selectedPlant = writable<Plant | null>(null);

// ==================== UI State ====================
export const activeTool = writable<Tool>('rect');
export const viewMode = writable<ViewMode>('shadows');
export const theme = writable<Theme>('light');
export const activeTab = writable<PanelTab>('scene');
export const camera = writable<Camera>({ x: 0, y: 0, zoom: 1 });

// ==================== Computed / Cached ====================
export const heatmapData = writable<HeatmapData | null>(null);
export const isPlaying = writable<boolean>(false);

// ==================== Helpers ====================

let structCounter = 0;

export function addStructure(x: number, y: number, w: number, h: number) {
	structCounter++;
	const s: Structure = {
		id: `struct-${Date.now()}`,
		name: `Building ${structCounter}`,
		x,
		y,
		w,
		h,
		height: 3,
		roofType: 'flat',
		ridgeHeight: 5,
		ridgeDir: 0,
		color: `hsl(${140 + structCounter * 30}, 30%, 35%)`
	};
	structures.update((arr) => [...arr, s]);
	selectedStructure.set(s);
	return s;
}

let fenceCounter = 0;

export function addFence(points: { x: number; y: number }[], height: number = 1.8) {
	fenceCounter++;
	const f: Fence = {
		id: `fence-${Date.now()}`,
		name: `Fence ${fenceCounter}`,
		points: [...points],
		height,
		color: '#8a6a3e'
	};
	fences.update((arr) => [...arr, f]);
	return f;
}

let treeCounter = 0;

export function addTree(x: number, y: number, species: string = 'Deciduous') {
	treeCounter++;
	const t: TreeInstance = {
		id: `tree-${Date.now()}`,
		name: `Tree ${treeCounter}`,
		x,
		y,
		trunkHeight: 3,
		canopyRadius: 2.5,
		species
	};
	trees.update((arr) => [...arr, t]);
	return t;
}

let zoneCounter = 0;

export function addGardenZone(x: number, y: number, w: number, h: number) {
	zoneCounter++;
	const z: GardenZone = {
		id: `zone-${Date.now()}`,
		name: `Zone ${zoneCounter}`,
		x,
		y,
		w,
		h,
		sunData: null
	};
	gardenZones.update((arr) => [...arr, z]);
	return z;
}

export function addPlacedPlant(plant: Plant, x: number, y: number) {
	const pp: PlacedPlant = {
		id: `placed-${Date.now()}`,
		plantId: plant.id,
		name: plant.name,
		icon: plant.icon,
		x,
		y,
		spacing: plant.spacing,
		plantedDate: new Date().toISOString().split('T')[0]
	};
	placedPlants.update((arr) => [...arr, pp]);
	return pp;
}

export function invalidateHeatmap() {
	heatmapData.set(null);
}
