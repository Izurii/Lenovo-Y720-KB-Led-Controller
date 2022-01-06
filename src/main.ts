import { app, ipcMain, BrowserWindow, Tray, Menu, Notification, dialog, clipboard, nativeImage, MenuItemConstructorOptions } from "electron";

app.commandLine.appendSwitch("in-process-gpu");

import AutoLaunch = require("easy-auto-launch");
import Store = require("electron-store");
import path = require("path");
// @ts-ignore
import firstRun = require("electron-first-run");
import fs = require("fs");
import constants = require("constants");
import sudo = require("sudo-prompt");

// LIBS
import { SegmentBrightness, SegmentColor, setKeyboardOptions, getHidrawDevice, BacklightMode } from "./addons/led";
import { listenHotkey, getInputDevice, HotkeyType } from "./addons/hotkey";

const isFirstRun = firstRun();
const LedController = new AutoLaunch({
	name: "y720-kb-led-controller",
	isHidden: true,
});

let mainWindow: null | BrowserWindow = null;
let tray: null | any = null;

var frogIcon = nativeImage.createFromPath(
	path.join(__dirname, "./resources/icon.png")
);

var usualQuit = false;
var menu: MenuItemConstructorOptions[] = [
	{
		label: "Open/Show",
		type: "normal",
		click: () => {
			mainWindow!.show();
		},
	},
	{},
	{
		label: "Start at login",
		type: "checkbox",
		click: (item) => {
			if (item.checked) {
				LedController.enable();
				store.set("runAtLogin", true);
			} else {
				LedController.disable();
				store.set("runAtLogin", false);
			}
		},
	},
	{ label: "Separator", type: "separator" },
	{
		label: "Exit",
		type: "normal",
		click: () => {
			usualQuit = true;
			app.quit();
		},
	},
];

const store = new Store();

export type UserProfile = {
	profileName: string;
	backlightMode: number;
	profileOptions: {
		segmentColor: number,
		segmentBrightness: number,
		'$$hashKey'?: string
	}[];
	'$$hashKey'?: string;
};

const getProfilesFunc = () => {
	let userProfiles: {
		selectedProfile: number;
		profiles: UserProfile[];
		runAtLogin?: boolean;
	} = {
		selectedProfile: store.get("selectedProfile") as number,
		profiles: store.get("profiles") as UserProfile[],
	};

	if (!userProfiles.profiles) {
		userProfiles.selectedProfile = 0;
		userProfiles.profiles = [
			{
				profileName: "Profile 1",
				backlightMode: BacklightMode.ALWAYS_ON,
				profileOptions: [
					{ segmentColor: SegmentColor.CRIMSON, segmentBrightness: SegmentBrightness.HIGH },
					{ segmentColor: SegmentColor.CRIMSON, segmentBrightness: SegmentBrightness.HIGH },
					{ segmentColor: SegmentColor.CRIMSON, segmentBrightness: SegmentBrightness.HIGH },
					{ segmentColor: SegmentColor.CRIMSON, segmentBrightness: SegmentBrightness.HIGH },
				],
			},
		];
		store.set(userProfiles);
	}

	if (
		userProfiles.runAtLogin === undefined ||
		userProfiles.runAtLogin === null
	) {
		userProfiles.runAtLogin = true;
		LedController.enable();
		store.set(userProfiles);
	}

	return userProfiles;
};

const setMenu = () => {
	let profiles: MenuItemConstructorOptions[] = [];
	let profilesSubmenu: MenuItemConstructorOptions & {
		submenu?: MenuItemConstructorOptions[];
	} = {
		label: "Profiles",
		type: "submenu",
	};

	let userProfiles = getProfilesFunc();
	userProfiles.profiles.forEach((item, index) => {
		profiles.push({
			label: item.profileName,
			type: "radio",
			click: () => {
				mainWindow!.webContents.send("selectProfileTray", index);
			},
		});
		if (userProfiles.selectedProfile == index)
			profiles[index].checked = true;
	});

	profilesSubmenu = {
		...profilesSubmenu,
		submenu: profiles,
	};

	let MenuArray = menu;
	MenuArray[1] = profilesSubmenu;

	let contextMenu = Menu.buildFromTemplate(MenuArray);
	contextMenu.items[2].checked = !!userProfiles.runAtLogin;

	tray.setContextMenu(contextMenu);
};

if (!app.requestSingleInstanceLock()) {
	app.quit();
} else {
	app.on("second-instance", () => {
		if (mainWindow) {
			if (mainWindow.isMinimized()) mainWindow.restore();
			else if (!mainWindow.isVisible()) mainWindow.show();
			mainWindow.focus();
		}
	});

	app.on("ready", async () => {
		let profiles = getProfilesFunc();
		let selectedProfile = profiles.profiles[profiles.selectedProfile];

		let backgroundNotification = new Notification({
			icon: frogIcon,
			title: "Lenovo Y720 Keyboard Controller",
			body: "I'm on the background, open me again using the tray menu",
		});

		tray = new Tray(frogIcon);
		tray.setToolTip("Lenovo Y720 Keyboard LED Controller");

		setMenu();

		mainWindow = new BrowserWindow({
			webPreferences: {
				nodeIntegration: true,
				contextIsolation: false,
			},
			minHeight: 625,
			minWidth: 1510,
			maxHeight: 625,
			maxWidth: 1510,
			autoHideMenuBar: true,
			icon: frogIcon,
			show: isFirstRun ? true : false,
		});

		await checkHidrawPermission();
		await checkInputPermission();

		mainWindow.loadFile(path.join(__dirname, "./index.html"));

		try {
			setKeyboardOptions(
				selectedProfile.backlightMode,
				selectedProfile.profileOptions
			);

			listenHotkey((hotkeyType) => {
				if (hotkeyType === HotkeyType.HOTKEY_FN_SPACE) {
					mainWindow!.webContents.send("changeProfileHotKey", null);
				} else if (hotkeyType === HotkeyType.HOTKEY_7) {
					if (mainWindow!.isMinimized()) {
						mainWindow!.restore();
					} else if (!mainWindow!.isVisible()) {
						mainWindow!.show();
					}
					mainWindow!.focus();
				}
			});
		} catch (e) {
			genericError((e as Error).message);
		}

		mainWindow.on("close", (event) => {
			if (!usualQuit) {
				event.preventDefault();
				mainWindow!.hide();
				if (isFirstRun) backgroundNotification.show();
			}
		});
	});
}

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});

ipcMain.on("setKB", async (event, backlightMode, segmentOptions) => {
	try {
		setKeyboardOptions(backlightMode, segmentOptions);
	} catch (e) {
		genericError((e as Error).message);
	}
});

ipcMain.on("getUserProfiles", (event) => {
	event.returnValue = getProfilesFunc();
});

ipcMain.on("saveProfiles", (event, profiles) => {
	store.set(profiles);
	setMenu();
});

const can = async (path: string, permission: number) => {
	return await new Promise<NodeJS.ErrnoException | null>((resolve) => {
		fs.access(`${path}`, permission, (err) => resolve(err));
	});
};

const checkHidrawPermission = async () => {
	try {
		const hidrawDevice = getHidrawDevice();
		await checkPermission(`/dev/${hidrawDevice}`, constants.W_OK);
	} catch (e) {
		genericError((e as Error).message);
	}
};

const checkInputPermission = async () => {
	try {
		const inputDevice = await getInputDevice();
		await checkPermission(`/dev/input/${inputDevice}`, constants.R_OK);
	} catch (e) {
		genericError((e as Error).message);
	}
};

const checkPermission = async (path: string, permission: number) => {
	let permissionDevice = await can(path, permission);
	let shellCommand = `sudo chmod 666 ${path}`;

	if (permissionDevice && permissionDevice.code == "EACCES") {
		await new Promise((resolve) => {
			dialog
				.showMessageBox(mainWindow!, {
					type: "info",
					title: "Permissions to write/read needed",
					message:
						'You need to copy and paste, or click the "Copy to clipboard" button, ' +
						`this into a terminal\n\n ${shellCommand}` +
						'\n\nAlternatively you can use the "Do it for me!" button.' +
						'\n\nIf you click "Do it for me!" you will be prompted to enter your password.' +
						"\n\n To make it permanent, you need to follow the instructions on the readme page",
					buttons: ["Do it for me!", "Copy to clipboard", "Cancel"],
				})
				.then(async (result) => {
					if (!result.response) {
						sudo.exec(
							shellCommand.replace("sudo ", ""),
							{ name: "Lenovo Y720 Keyboard LED Controller" },
							async (err, stdout, stderr) => {
								if (err) genericError(err.message);
								await checkPermissionDialog(
									path,
									permission,
									resolve
								);
							}
						);
					} else {
						if (result.response == 1) {
							clipboard.writeText(shellCommand);
							await checkPermissionDialog(
								path,
								permission,
								resolve
							);
						} else if (result.response == 2) {
							usualQuit = true;
							app.quit();
						}
					}
				});
		});
	}
};

const checkPermissionDialog = async (path: string, permission: number, resolve: (value?: unknown) => void) => {
	dialog
		.showMessageBox(mainWindow!, {
			type: "info",
			title: "Checking permission to write/read file",
			message:
				"Use the buttons to check if the permission was granted correctly.",
			buttons: ["Check permission", "Cancel"],
		})
		.then(async (result) => {
			if (!result.response) {
				let permissionDevice = await can(path, permission);
				if (permissionDevice && permissionDevice.code == "EACCES") {
					dialog.showErrorBox("Error", "Permission not detected!");
					await checkPermissionDialog(path, permission, resolve);
				} else {
					dialog.showMessageBox(mainWindow!, {
						type: "info",
						title: "Success!",
						message:
							"Permission granted you can now proceed to use the software.",
					});
					resolve();
				}
			} else if (result.response == 1) {
				usualQuit = true;
				app.quit();
			}
		});
};

const genericError = (error: string) => {
	dialog.showErrorBox(
		"Error",
		error +
		"\n\nContact the dev for more information izuriihootoh@gmail.com"
	);
	usualQuit = true;
	app.quit();
};
