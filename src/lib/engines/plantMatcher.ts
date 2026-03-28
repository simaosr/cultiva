/**
 * Plant matching engine.
 * Cross-references garden zone sun hours with plant requirements.
 */
import type { Plant, PlantMatch, SunHoursResult, SunCategory } from '$lib/types';

/**
 * Match plants to a zone's sun hours. Returns scored matches sorted by fit.
 */
export function matchPlantsForZone(plants: Plant[], sunHours: SunHoursResult): PlantMatch[] {
	const matches: PlantMatch[] = [];

	for (const plant of plants) {
		// Score: 1.0 = perfect match, lower = worse fit
		const avg = sunHours.avg;

		if (avg >= plant.sunMin - 1 && avg <= plant.sunMax + 2) {
			// How centered is the zone's sun within the plant's range?
			const rangeMid = (plant.sunMin + plant.sunMax) / 2;
			const rangeSpan = plant.sunMax - plant.sunMin;
			const distance = Math.abs(avg - rangeMid);
			const score = Math.max(0, 1 - distance / (rangeSpan + 2));

			matches.push({ plant, score });
		}
	}

	return matches.sort((a, b) => b.score - a.score);
}

/**
 * Categorize sun hours into full/partial/shade.
 */
export function getSunCategory(avgHours: number): { label: string; category: SunCategory } {
	if (avgHours >= 6) return { label: 'Full Sun', category: 'full' };
	if (avgHours >= 3) return { label: 'Partial Shade', category: 'partial' };
	return { label: 'Shade', category: 'shade' };
}

/**
 * Given a plant, suggest the best placement strategy.
 */
export function getPlantAdvice(plant: Plant, zoneSunHours: number): string {
	const diff = zoneSunHours - (plant.sunMin + plant.sunMax) / 2;

	if (Math.abs(diff) < 1) {
		return `Excellent match — ${plant.name} thrives in these conditions.`;
	} else if (diff > 2) {
		return `This spot gets more sun than ${plant.name} prefers. Consider afternoon shade or mulching to keep roots cool.`;
	} else if (diff < -2) {
		return `This spot is shadier than ideal for ${plant.name}. Expect slower growth and less yield.`;
	} else if (diff > 0) {
		return `Good match. Slightly more sun than optimal but ${plant.name} will do well here.`;
	} else {
		return `Acceptable. Slightly less sun than ideal — ${plant.name} will still grow but may be less productive.`;
	}
}
