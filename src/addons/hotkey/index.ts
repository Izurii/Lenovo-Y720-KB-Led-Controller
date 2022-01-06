const addon = require("./hotkeyAddon");

export enum HotkeyType {
	HOTKEY_FN_SPACE = 786512,
 	HOTKEY_7 = 786515
};

export function listenHotkey(callbackFn: (type: HotkeyType) => any) {
	addon.listenHotkey(callbackFn);
};

export function getInputDevice(): Error | string {
	return addon.getInputDevice();
};
