const addon = require("./hotkeyAddon");

export function listenHotkey(callbackFn: () => any) {
	addon.listenHotkey(callbackFn);
};

export function getInputDevice(): Error | string {
	return addon.getInputDevice();
};
