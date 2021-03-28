const fs = require('fs');
const fsPromises = require('fs/promises');
const constants = require('constants');
const lockfile = require('proper-lockfile');
const ioctl = require('ioctl');

const HID_NAME = 'HID_NAME=ITE33D1:00 048D:837A';
const HidCommand = 0xC0114806;
const HidrawClassesPath = '/sys/class/hidraw/';

const SegmentColor = {
	CRIMSON: 0,
	TORCH_RED: 1,
	HOLLYWOOD_CERISE: 2,
	MAGENTA: 3,
	ELECTRIC_VIOLET: 4,
	ELECTRIC_VIOLET_2: 5,
	BLUE: 6,
	BLUE_RIBBON: 7,
	AZURE_RADIANCE: 8,
	CYAN: 9,
	SPRING_GREEN: 10,
	SPRING_GREEN_2: 11,
	GREEN: 12,
	BRIGHT_GREEN: 13,
	LIME: 14,
	YELLOW: 15,
	WEB_ORANGE: 16,
	INTERNATIONAL_ORANGE: 17,
	WHITE: 18,
	NO_COLOR: 19
};

const SegmentBrightness = {
	OFF: 0,
	LOW: 1,
	MEDIUM: 2,
	HIGH: 3,
	ULTRA: 4,
	ENOUGH: 5
};

const BacklightMode = {
	HEARTBEAT: 0,
	BREATH: 1,
	SMOOTH: 2,
	ALWAYS_ON: 3,
	WAVE: 4
};

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
		let dev_file = fs.readFileSync(`${HidrawClassesPath}${device}/device/uevent`, { encoding: 'utf-8' });
		if (dev_file.includes(HID_NAME))
			correctDevice = device
	});
	return correctDevice;
};

// let exampleSegmentsOptions = [
// 	{
// 		segmentColor: SegmentColor.CRIMSON,
// 		SegmentBrightness: SegmentBrightness.HIGH
// 	},
// 	{
// 		segmentColor: SegmentColor.GREEN,
// 		SegmentBrightness: SegmentBrightness.LOW
// 	},
// 	{
// 		segmentColor: SegmentColor.BLUE,
// 		SegmentBrightness: SegmentBrightness.HIGH
// 	},
// 	{
// 		segmentColor: SegmentColor.ELECTRIC_VIOLET,
// 		SegmentBrightness: SegmentBrightness.OFF
// 	}
// ];

const setKeyboardOptions = async (backLightMode, segmentsOptions) => {

	if(Object.values(BacklightMode).indexOf(backLightMode) <= -1)
		throw Error('Keyboard backlight mode invalid.')

	segmentsOptions.forEach((segmentOption, idx) => {
		if(Object.values(SegmentColor).indexOf(segmentOption.segmentColor) <= -1)
			throw Error('Segment number '+(idx+1)+' color invalid.');
		if(Object.values(SegmentBrightness).indexOf(segmentOption.SegmentBrightness) <= -1)
			throw Error('Segment number '+(idx+1)+' brightness invalid.');
	});

	var hidrawDevices = await getHidrawDevices();
	if(!hidrawDevices) throw Error('No hidraw devices found.');

	var correctDevice = await findCorrectDevice(hidrawDevices);
	if (!correctDevice) throw Error('Correct hidraw device not found.');

	var deviceFile = `${HidrawClassesPath}${correctDevice}/device/uevent`;

	fs.open(deviceFile, constants.O_WRONLY, (err, fileDescriptor) => {
		if (err) throw Error(err);

		lockfile.lock(deviceFile, { lockfilePath: __dirname + 'lockDir' }).then((release) => {

			var fileDescriptor = fs.openSync(`/dev/${correctDevice}`, constants.O_WRONLY);

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
			segmentsOptions.map((item, index) => arrayOfBytes.push([204, 0, backLightMode, item.segmentColor, item.SegmentBrightness, index]));
			
			let finalBytes = [204, 9, 0, 0, 0, 0];

			arrayOfBytes.forEach((item) => {
				let buffer = Buffer.from(item);
				ioctl(fileDescriptor, HidCommand, buffer);
			});

			ioctl(fileDescriptor, HidCommand, Buffer.from(finalBytes));

			fs.close(fileDescriptor, (err) => {
				if (err) throw Error(err);
			});

			return release();
		});

	});

};

exports.setKeyboardOptions = setKeyboardOptions;
exports.BacklightMode = BacklightMode;
exports.SegmentColor = SegmentColor;
exports.SegmentBrightness = SegmentBrightness;