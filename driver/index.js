const fs = require("fs");
const fsPromises = fs.promises;
const constants = require("constants");
const lockfile = require("proper-lockfile");
const ioctl = require("ioctl");
const { SegmentBrightness, SegmentColor, BacklightMode } = require("./options");

const HID_NAME = "HID_NAME=ITE33D1:00 048D:837A";
const HidCommand = 0xc0114806;
const HidrawClassesPath = "/sys/class/hidraw/";

const getHidrawDevices = async () => {
	var files;
	try {
		files = await fsPromises.readdir(HidrawClassesPath);
	} catch (err) {
		console.error(err);
	}
	return files;
};

const findCorrectDevice = async (listOfDevices) => {
	var correctDevice;
	listOfDevices.forEach((device, index) => {
		let dev_file = fs.readFileSync(
			`${HidrawClassesPath}${device}/device/uevent`,
			{ encoding: "utf-8" }
		);
		if (dev_file.includes(HID_NAME)) correctDevice = device;
	});
	return correctDevice;
};

// let exampleSegmentsOptions = [
// 	{
// 		segmentColor: SegmentColor.CRIMSON,
// 		segmentBrightness: SegmentBrightness.HIGH
// 	},
// 	{
// 		segmentColor: SegmentColor.GREEN,
// 		segmentBrightness: SegmentBrightness.LOW
// 	},
// 	{
// 		segmentColor: SegmentColor.BLUE,
// 		segmentBrightness: SegmentBrightness.HIGH
// 	},
// 	{
// 		segmentColor: SegmentColor.ELECTRIC_VIOLET,
// 		segmentBrightness: SegmentBrightness.OFF
// 	}
// ];

const setKeyboardOptions = async (
	backLightMode,
	segmentsOptions,
	lockfilePath
) => {
	try {
		if (Object.values(BacklightMode).indexOf(backLightMode) <= -1)
			throw "Keyboard backlight mode invalid.";

		segmentsOptions.forEach((segmentOption, idx) => {
			if (
				Object.values(SegmentColor).indexOf(
					segmentOption.segmentColor
				) <= -1
			)
				throw "Segment number " + (idx + 1) + " color invalid.";
			if (
				Object.values(SegmentBrightness).indexOf(
					segmentOption.segmentBrightness
				) <= -1
			)
				throw "Segment number " + (idx + 1) + " brightness invalid.";
		});

		var hidrawDevices = await getHidrawDevices();
		if (!hidrawDevices) throw "No hidraw devices found.";

		var correctDevice = await findCorrectDevice(hidrawDevices);
		if (!correctDevice) throw "Correct hidraw device not found.";

		var deviceFile = `${HidrawClassesPath}${correctDevice}/device/uevent`;

		lockfile
			.lock(deviceFile, { lockfilePath: lockfilePath + "lockDir" })
			.then((release) => {
				var fileDescriptor = fs.openSync(
					`/dev/${correctDevice}`,
					constants.O_WRONLY
				);

				/* arrayOfBytes explanation
				 *
				 * First byte  - 204 - 0xCC
				 * Second byte - 0 - 0x00
				 * Third byte  - Keyboard BL Mode 		 - Only the last block needs this third byte to be defined, all others can be 0 (0x00)
				 * Fourth byte - Keyboard segment color   - Specifies the color that the specified segment will be
				 * Fifth byte  - Segment brightness level - Specifies the brightness that the specified segment will be
				 * Sixth byte  - Keyboard segment 		 - Specifies which segment we are setting the options above
				 *
				 */

				let arrayOfBytes = [];
				segmentsOptions.map((item, index) => {
					arrayOfBytes.push([
						204,
						0,
						backLightMode,
						item.segmentColor,
						item.segmentBrightness,
						index,
					]);
				});

				let finalBytes = [204, 9, 0, 0, 0, 0];

				arrayOfBytes.forEach((item) => {
					let buffer = Buffer.from(item);
					ioctl(fileDescriptor, HidCommand, buffer);
				});

				ioctl(fileDescriptor, HidCommand, Buffer.from(finalBytes));

				fs.close(fileDescriptor, (err) => {
					if (err) throw err;
				});

				return release();
			});
		return true;
	} catch (e) {
		return e;
	}
};

exports.getHidrawDevices = getHidrawDevices;
exports.findCorrectDevice = findCorrectDevice;
exports.setKeyboardOptions = setKeyboardOptions;
