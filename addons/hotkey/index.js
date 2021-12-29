const { listenHotkey, getInputDevice } = require("./hotkeyAddon");

module.exports.listenHotkey = (callbackFn) => {
	listenHotkey(callbackFn);
};

module.exports.getInputDevice = () => {
	return getInputDevice();
};
