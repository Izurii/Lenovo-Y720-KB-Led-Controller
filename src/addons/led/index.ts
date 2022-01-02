const addon = require("./ledAddon");

export function setKeyboardOptions(
	backlightMode: number,
	segmentsOptions: {
		segmentColor: number,
		segmentBrightness: number
	}[]): Error | boolean {
	return addon.setKeyboardOptions(backlightMode, segmentsOptions);
};

export function getHidrawDevice(): Error | string {
	return addon.getHidrawDevice();
};

export const SegmentColor = {
	CRIMSON: 0,
	TORCH_RED: 1,
	HOLLYWOOD_CERISE: 2,
	MAGENTA: 3,
	ELECTRIC_PURPLE: 4,
	ELECTRIC_INDIGO: 5,
	BLUE: 6,
	BLUE_RIBBON: 7,
	AZURE_RADIANCE: 8,
	CYAN: 9,
	SPRING_GREEN: 10,
	MALACHITE: 11,
	GREEN: 12,
	BRIGHT_GREEN: 13,
	LIME: 14,
	YELLOW: 15,
	WEB_ORANGE: 16,
	INTERNATIONAL_ORANGE: 17,
	WHITE: 18,
	NO_COLOR: 19,
};

export const SegmentBrightness = {
	OFF: 0,
	LOW: 1,
	MEDIUM: 2,
	HIGH: 3,
	ULTRA: 4,
	ENOUGH: 5,
};

export const BacklightMode = {
	HEARTBEAT: 0,
	BREATH: 1,
	SMOOTH: 2,
	ALWAYS_ON: 3,
	WAVE: 4,
};