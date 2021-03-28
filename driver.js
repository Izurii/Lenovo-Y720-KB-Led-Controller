const fs = require('fs');
const fsPromises = require('fs/promises');
const constants = require('constants');
const lockfile = require('proper-lockfile');
const ioctl = require('ioctl');

const HID_NAME = 'HID_NAME=ITE33D1:00 048D:837A';
const HidCommand = 0xC0114806;

const getHidrawDevices = async () => {
	var files;
	try {
		files = await fsPromises.readdir('/sys/class/hidraw');
	} catch (err) {
		console.error(err);
	}
	return files;
};

const findCorrectDevice = async (listOfDevices) => {

	var correctDevice;
	listOfDevices.forEach((device, index) => {
		let dev_file = fs.readFileSync(`/sys/class/hidraw/${device}/device/uevent`, {encoding: 'utf-8'});
		if(dev_file.includes(HID_NAME))
			correctDevice = device
	});
	return correctDevice;
};

const main = async () => {

	var hidrawDevices = await getHidrawDevices();
	var correctDevice = await findCorrectDevice(hidrawDevices);
	
	var deviceFile = `/sys/class/hidraw/${correctDevice}/device/uevent`;

	fs.open(deviceFile, constants.O_WRONLY, (err, fileDescriptor) => {
		if(err) console.error(err);

		lockfile.lock(deviceFile, {lockfilePath: __dirname+'lockDir'}).then((release) => {

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
			
			let arrayOfBytes = [
				[204, 0, 0, 13, 3, 0],
				[204, 0, 0, 15, 3, 1],
				[204, 0, 0, 16, 3, 2],
				[204, 0, 2, 18, 3, 3],
			];

			let finalBytes = [204, 9, 0, 0, 0, 0];

			arrayOfBytes.forEach((item) => {
				let buffer = Buffer.from(item);
				ioctl(fileDescriptor, HidCommand, buffer);
			});

			ioctl(fileDescriptor, HidCommand, Buffer.from(finalBytes));

			fs.close(fileDescriptor, (err) => {
				if(err) console.error(err);
			});

			return release();
		});

	});

};

main();