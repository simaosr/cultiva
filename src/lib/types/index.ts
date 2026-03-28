// ==================== Geometry Types ====================
export interface Point {
	x: number;
	y: number;
}

export interface Rect {
	x: number;
	y: number;
	w: number;
	h: number;
}

// ==================== Scene Types ====================
export type RoofType = 'flat' | 'gable' | 'shed';

export interface Structure extends Rect {
	id: string;
	name: string;
	height: number;
	roofType: RoofType;
	ridgeHeight: number;
	ridgeDir: number;
	color: string;
}

export interface Fence {
	id: string;
	name: string;
	points: Point[];
	height: number;
	color: string;
}

export interface TreeInstance {
	id: string;
	name: string;
	x: number;
	y: number;
	trunkHeight: number;
	canopyRadius: number;
	species: string;
}

export interface GardenZone extends Rect {
	id: string;
	name: string;
	sunData: SunHoursResult | null;
}

export interface PlacedPlant {
	id: string;
	plantId: string;
	name: string;
	icon: string;
	x: number;
	y: number;
	spacing: number;
	plantedDate?: string;
}

// ==================== Solar Types ====================
export interface SolarPosition {
	elevation: number;
	azimuth: number;
}

export interface SunriseSunset {
	rise: number;
	set: number;
}

export interface SunHoursResult {
	avg: number;
	min: number;
	max: number;
}

export interface HeatmapData {
	data: Float32Array;
	cols: number;
	rows: number;
	step: number;
}

// ==================== Plant Types ====================
export type SunCategory = 'full' | 'partial' | 'shade';
export type PlantCategory = 'vegetable' | 'fruit' | 'herb' | 'flower' | 'shrub';

export interface Plant {
	id: string;
	name: string;
	latin: string;
	icon: string;
	category: PlantCategory;
	sunMin: number;
	sunMax: number;
	sunLabel: string;
	description: string;
	spacing: number;
}

export interface PlantMatch {
	plant: Plant;
	score: number; // 0-1, how well the sun hours match
}

// ==================== App State Types ====================
export type Tool = 'rect' | 'select' | 'garden' | 'plant' | 'fence' | 'tree' | 'pan';
export type ViewMode = 'shadows' | 'heatmap';
export type Theme = 'dark' | 'light';
export type PanelTab = 'scene' | 'plants' | 'zones';

export interface Camera {
	x: number;
	y: number;
	zoom: number;
}

export interface SceneConfig {
	latitude: number;
	longitude: number;
	northAngle: number;
	metersPerPixel: number;
}

export interface TimeConfig {
	date: string; // ISO date string
	minutes: number; // 0-1440
}
