/**
 * Solar position engine.
 * Computes sun azimuth/elevation, sunrise/sunset, and shadow projections.
 * Pure functions — no framework dependency, easy to unit test.
 */
import type { SolarPosition, SunriseSunset } from '$lib/types';

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

function toRad(d: number): number {
	return d * DEG2RAD;
}

function toDeg(r: number): number {
	return r * RAD2DEG;
}

function dayOfYear(date: Date): number {
	const start = new Date(date.getFullYear(), 0, 0);
	return Math.floor((date.getTime() - start.getTime()) / 86400000);
}

/**
 * Compute sun azimuth and elevation for a given location, date, and time.
 * Uses the equation-of-time + declination model.
 */
export function solarPosition(lat: number, lon: number, date: Date, hours: number): SolarPosition {
	const doy = dayOfYear(date);
	const B = (360 / 365) * (doy - 81);
	const Br = toRad(B);

	// Equation of time (minutes)
	const EoT = 9.87 * Math.sin(2 * Br) - 7.53 * Math.cos(Br) - 1.5 * Math.sin(Br);

	// Solar declination
	const decl = toRad(23.45 * Math.sin(toRad((360 / 365) * (doy + 284))));

	// Local solar time correction
	const LSTM = 15 * Math.round(lon / 15);
	const TC = 4 * (lon - LSTM) + EoT;
	const LST = hours + TC / 60;
	const HRA = toRad(15 * (LST - 12));

	const latR = toRad(lat);

	// Elevation angle
	const sinEl =
		Math.sin(latR) * Math.sin(decl) + Math.cos(latR) * Math.cos(decl) * Math.cos(HRA);
	const elevation = Math.asin(Math.max(-1, Math.min(1, sinEl)));

	// Azimuth angle (measured from north, clockwise)
	const cosAz =
		(Math.sin(decl) - Math.sin(elevation) * Math.sin(latR)) /
		(Math.cos(elevation) * Math.cos(latR));
	let azimuth = Math.acos(Math.max(-1, Math.min(1, cosAz)));
	if (HRA > 0) azimuth = 2 * Math.PI - azimuth;

	return { elevation: toDeg(elevation), azimuth: toDeg(azimuth) };
}

/**
 * Find sunrise and sunset times by scanning the day in 5-minute increments.
 */
export function getSunriseSunset(lat: number, lon: number, date: Date): SunriseSunset {
	let rise = 6;
	let set = 18;

	for (let m = 0; m <= 1440; m += 5) {
		const p = solarPosition(lat, lon, date, m / 60);
		if (p.elevation > 0) {
			rise = m / 60;
			break;
		}
	}

	for (let m = 1440; m >= 0; m -= 5) {
		const p = solarPosition(lat, lon, date, m / 60);
		if (p.elevation > 0) {
			set = m / 60;
			break;
		}
	}

	return { rise, set };
}

/**
 * Format decimal hours to HH:MM string.
 */
export function formatTime(hours: number): string {
	const h = Math.floor(hours);
	const m = Math.round((hours - h) * 60);
	return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
