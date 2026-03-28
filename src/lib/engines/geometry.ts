/**
 * Geometry engine.
 * Shadow projection, convex hull, point-in-polygon tests, heatmap computation.
 * Handles structures, fences, and trees.
 */
import type {
	Point,
	Structure,
	Fence,
	TreeInstance,
	Camera,
	HeatmapData,
	SunHoursResult
} from '$lib/types';
import { solarPosition } from './solar';

const DEG2RAD = Math.PI / 180;

// ==================== Shadow Projection ====================

function getStructCorners(s: Structure): Point[] {
	return [
		{ x: s.x, y: s.y },
		{ x: s.x + s.w, y: s.y },
		{ x: s.x + s.w, y: s.y + s.h },
		{ x: s.x, y: s.y + s.h }
	];
}

function getStructHeights(s: Structure): number[] {
	const corners = getStructCorners(s);
	if (s.roofType === 'flat') return [s.height, s.height, s.height, s.height];

	const ridgeH = s.ridgeHeight || s.height + 2;
	const dir = s.ridgeDir * DEG2RAD;
	const cx = s.x + s.w / 2;
	const cy = s.y + s.h / 2;

	if (s.roofType === 'gable') {
		return corners.map((c) => {
			const perp = Math.abs((c.x - cx) * Math.cos(dir) + (c.y - cy) * Math.sin(dir));
			const maxPerp = Math.max(s.w, s.h) / 2;
			return s.height + (ridgeH - s.height) * (1 - Math.min(perp / (maxPerp || 1), 1));
		});
	}

	// shed
	return corners.map((c) => {
		const proj = (c.x - cx) * Math.sin(dir) + (c.y - cy) * Math.cos(dir);
		const maxProj = Math.max(s.w, s.h) / 2;
		return s.height + (ridgeH - s.height) * ((proj / (maxProj || 1) + 1) / 2);
	});
}

/**
 * Project a structure's shadow onto the ground plane.
 * Returns the convex hull of the structure footprint + projected top corners.
 */
export function projectStructureShadow(
	struct: Structure,
	sunAz: number,
	sunEl: number,
	northAngle: number,
	metersPerPixel: number
): Point[] | null {
	if (sunEl <= 0) return null;

	const shadowLen = 1 / Math.tan(sunEl * DEG2RAD);
	const shadowAngle = (sunAz + 180 - northAngle) * DEG2RAD;
	const dx = Math.sin(shadowAngle);
	const dy = -Math.cos(shadowAngle);

	const corners = getStructCorners(struct);
	const heights = getStructHeights(struct);

	const projected = heights.map((h, i) => ({
		x: corners[i].x + (dx * h * shadowLen) / metersPerPixel,
		y: corners[i].y + (dy * h * shadowLen) / metersPerPixel
	}));

	return convexHull([...corners, ...projected]);
}

/**
 * Project a fence segment's shadow.
 * A fence is a line with height — its shadow is a parallelogram per segment.
 */
export function projectFenceShadow(
	fence: Fence,
	sunAz: number,
	sunEl: number,
	northAngle: number,
	metersPerPixel: number
): Point[][] {
	if (sunEl <= 0 || fence.points.length < 2) return [];

	const shadowLen = 1 / Math.tan(sunEl * DEG2RAD);
	const shadowAngle = (sunAz + 180 - northAngle) * DEG2RAD;
	const dx = Math.sin(shadowAngle);
	const dy = -Math.cos(shadowAngle);
	const h = fence.height;

	const polys: Point[][] = [];

	for (let i = 0; i < fence.points.length - 1; i++) {
		const a = fence.points[i];
		const b = fence.points[i + 1];
		const ap = {
			x: a.x + (dx * h * shadowLen) / metersPerPixel,
			y: a.y + (dy * h * shadowLen) / metersPerPixel
		};
		const bp = {
			x: b.x + (dx * h * shadowLen) / metersPerPixel,
			y: b.y + (dy * h * shadowLen) / metersPerPixel
		};
		polys.push([a, b, bp, ap]);
	}

	return polys;
}

/**
 * Project a tree's canopy shadow.
 * Modeled as an ellipse projected from a sphere canopy.
 * Returns polygon approximation of the shadow ellipse.
 */
export function projectTreeShadow(
	tree: TreeInstance,
	sunAz: number,
	sunEl: number,
	northAngle: number,
	metersPerPixel: number
): Point[] | null {
	if (sunEl <= 0) return null;

	const shadowLen = 1 / Math.tan(sunEl * DEG2RAD);
	const shadowAngle = (sunAz + 180 - northAngle) * DEG2RAD;
	const dx = Math.sin(shadowAngle);
	const dy = -Math.cos(shadowAngle);

	// Center of canopy shadow on the ground
	const canopyCenterHeight = tree.trunkHeight + tree.canopyRadius;
	const cx = tree.x + (dx * canopyCenterHeight * shadowLen) / metersPerPixel;
	const cy = tree.y + (dy * canopyCenterHeight * shadowLen) / metersPerPixel;

	// Ellipse: minor axis = canopy radius, major axis stretched by sun angle
	const rMinor = tree.canopyRadius / metersPerPixel;
	const rMajor = rMinor / Math.max(Math.sin(sunEl * DEG2RAD), 0.1);

	// Generate polygon approximation (24 points)
	const points: Point[] = [];
	const ellipseAngle = shadowAngle; // elongation direction
	for (let i = 0; i < 24; i++) {
		const a = (i / 24) * Math.PI * 2;
		const px = rMinor * Math.cos(a);
		const py = rMajor * Math.sin(a);
		// Rotate by shadow direction
		points.push({
			x: cx + px * Math.cos(ellipseAngle) - py * Math.sin(ellipseAngle),
			y: cy + px * Math.sin(ellipseAngle) + py * Math.cos(ellipseAngle)
		});
	}

	return points;
}

// ==================== Convex Hull ====================

export function convexHull(points: Point[]): Point[] {
	if (points.length < 3) return points;
	const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
	const cross = (O: Point, A: Point, B: Point) =>
		(A.x - O.x) * (B.y - O.y) - (A.y - O.y) * (B.x - O.x);

	const lower: Point[] = [];
	for (const p of sorted) {
		while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0)
			lower.pop();
		lower.push(p);
	}

	const upper: Point[] = [];
	for (const p of [...sorted].reverse()) {
		while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0)
			upper.pop();
		upper.push(p);
	}

	upper.pop();
	lower.pop();
	return lower.concat(upper);
}

// ==================== Point-in-Polygon ====================

export function pointInPolygon(x: number, y: number, poly: Point[]): boolean {
	let inside = false;
	for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
		const xi = poly[i].x,
			yi = poly[i].y;
		const xj = poly[j].x,
			yj = poly[j].y;
		if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
			inside = !inside;
		}
	}
	return inside;
}

// ==================== Shadow Collection ====================

interface ShadowSample {
	polygons: Point[][];
	dt: number; // hours per sample
}

/**
 * Pre-compute all shadow polygons for a given sun position.
 */
function computeShadowsAtTime(
	structures: Structure[],
	fences: Fence[],
	trees: TreeInstance[],
	sunAz: number,
	sunEl: number,
	northAngle: number,
	metersPerPixel: number
): Point[][] {
	const polys: Point[][] = [];

	for (const s of structures) {
		const shadow = projectStructureShadow(s, sunAz, sunEl, northAngle, metersPerPixel);
		if (shadow && shadow.length >= 3) polys.push(shadow);
	}

	for (const f of fences) {
		const fenceShadows = projectFenceShadow(f, sunAz, sunEl, northAngle, metersPerPixel);
		polys.push(...fenceShadows);
	}

	for (const t of trees) {
		const treeShadow = projectTreeShadow(t, sunAz, sunEl, northAngle, metersPerPixel);
		if (treeShadow) polys.push(treeShadow);
	}

	return polys;
}

/**
 * Check if a world-space point is inside any structure footprint.
 */
function isInsideAnyStructure(wx: number, wy: number, structures: Structure[]): boolean {
	for (const s of structures) {
		if (wx >= s.x && wx <= s.x + s.w && wy >= s.y && wy <= s.y + s.h) return true;
	}
	return false;
}

/**
 * Check if a world-space point is in shadow from any polygon.
 */
function isInAnyShadow(wx: number, wy: number, polygons: Point[][]): boolean {
	for (const poly of polygons) {
		if (pointInPolygon(wx, wy, poly)) return true;
	}
	return false;
}

// ==================== Heatmap ====================

/**
 * Compute sun-hours heatmap for the visible canvas area.
 * Samples every 20 minutes through the day.
 */
export function computeHeatmap(
	structures: Structure[],
	fences: Fence[],
	trees: TreeInstance[],
	lat: number,
	lon: number,
	date: Date,
	northAngle: number,
	metersPerPixel: number,
	camera: Camera,
	canvasWidth: number,
	canvasHeight: number
): HeatmapData {
	const step = 8;
	const cols = Math.ceil(canvasWidth / step);
	const rows = Math.ceil(canvasHeight / step);
	const data = new Float32Array(cols * rows);

	// Pre-compute shadow samples for the entire day
	const samples: ShadowSample[] = [];
	for (let m = 0; m <= 1440; m += 20) {
		const sun = solarPosition(lat, lon, date, m / 60);
		if (sun.elevation <= 0) continue;
		const polygons = computeShadowsAtTime(
			structures,
			fences,
			trees,
			sun.azimuth,
			sun.elevation,
			northAngle,
			metersPerPixel
		);
		samples.push({ polygons, dt: 20 / 60 });
	}

	// For each pixel, accumulate sun hours
	for (let r = 0; r < rows; r++) {
		for (let c = 0; c < cols; c++) {
			const wx = (c * step - camera.x) / camera.zoom;
			const wy = (r * step - camera.y) / camera.zoom;
			let sunHours = 0;

			for (const sample of samples) {
				if (!isInsideAnyStructure(wx, wy, structures) && !isInAnyShadow(wx, wy, sample.polygons)) {
					sunHours += sample.dt;
				}
			}
			data[r * cols + c] = sunHours;
		}
	}

	return { data, cols, rows, step };
}

// ==================== Zone Analysis ====================

/**
 * Compute average, min, and max sun hours for a rectangular garden zone.
 */
export function computeZoneSunHours(
	zone: { x: number; y: number; w: number; h: number },
	structures: Structure[],
	fences: Fence[],
	trees: TreeInstance[],
	lat: number,
	lon: number,
	date: Date,
	northAngle: number,
	metersPerPixel: number
): SunHoursResult {
	// Pre-compute samples
	const samples: ShadowSample[] = [];
	for (let m = 0; m <= 1440; m += 20) {
		const sun = solarPosition(lat, lon, date, m / 60);
		if (sun.elevation <= 0) continue;
		const polygons = computeShadowsAtTime(
			structures,
			fences,
			trees,
			sun.azimuth,
			sun.elevation,
			northAngle,
			metersPerPixel
		);
		samples.push({ polygons, dt: 20 / 60 });
	}

	const step = 10;
	let totalHours = 0;
	let count = 0;
	let minH = 999;
	let maxH = 0;

	for (let wx = zone.x; wx <= zone.x + zone.w; wx += step) {
		for (let wy = zone.y; wy <= zone.y + zone.h; wy += step) {
			let sunHours = 0;
			for (const sample of samples) {
				if (!isInsideAnyStructure(wx, wy, structures) && !isInAnyShadow(wx, wy, sample.polygons)) {
					sunHours += sample.dt;
				}
			}
			totalHours += sunHours;
			minH = Math.min(minH, sunHours);
			maxH = Math.max(maxH, sunHours);
			count++;
		}
	}

	return { avg: totalHours / (count || 1), min: minH, max: maxH };
}
