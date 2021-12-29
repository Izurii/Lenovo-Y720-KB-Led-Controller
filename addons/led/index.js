const addon = require("./ledAddon");

module.exports.setKeyboardOptions = (mode, segmentsOptions) => {
	return addon.setKeyboardOptions(mode, segmentsOptions);
};

module.exports.getHidrawDevice = () => {
	return addon.getHidrawDevice();
};
