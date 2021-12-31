import { SegmentBrightness, SegmentColor } from "./options";

const addon = require("./ledAddon");

export function setKeyboardOptions(backlightMode: number, segmentsOptions: { segmentColor: typeof SegmentColor, segmentBrightness: typeof SegmentBrightness }[]) {
	return addon.setKeyboardOptions(backlightMode, segmentsOptions);
};

export function getHidrawDevice() {
	return addon.getHidrawDevice();
};
