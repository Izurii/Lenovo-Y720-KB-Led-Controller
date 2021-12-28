const { listenHotkey, getInputDevice } = require("./build/Release/hotkeyAddon");

module.exports.listenHotkey = (callbackFn) => {
	listenHotkey(callbackFn);
};

module.exports.getInputDevice = () => {
	return getInputDevice();
};
