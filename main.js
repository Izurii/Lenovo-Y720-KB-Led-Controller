const {
	app,
	ipcMain,
	BrowserWindow,
	Tray,
	Menu,
	Notification,
	dialog,
	clipboard,
	nativeImage,
} = require("electron");

app.disableHardwareAcceleration();

const { exec, spawn } = require("child_process");

const AutoLaunch = require("easy-auto-launch");
const Store = require("electron-store");
const path = require("path");
const firstRun = require("electron-first-run");
const fs = require("fs");
const isFirstRun = firstRun();
const constants = require("constants");
const sudo = require("sudo-prompt");

// LIBS
const { setKeyboardOptions, getHidrawDevice } = require("./libs/leds");
const { listenHotkey, getInputDevice } = require("./libs/hotkey");

const LedController = new AutoLaunch({
	name: "y720-kb-led-controller",
	isHidden: true,
});

try {
	require("electron-reloader")(module);
} catch (_) {}

let mainWindow;
let tray = null;

var frogIcon = nativeImage.createFromPath(
	path.join(__dirname, "/resources/icon.png")
);

var usualQuit = false;
var menu = [
	{
		label: "Open/Show",
		type: "normal",
		click: () => {
			mainWindow.show();
		},
	},
	null,
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

const getProfilesFunc = () => {
	let userProfiles = {
		selectedProfile: store.get("selectedProfile"),
		profiles: store.get("profiles"),
	};

	if (!userProfiles.profiles) {
		userProfiles.selectedProfile = 0;
		userProfiles.profiles = [
			{
				profileName: "Profile 1",
				backlightMode: 3,
				profileOptions: [
					{ segmentColor: 0, segmentBrightness: 4 },
					{ segmentColor: 0, segmentBrightness: 4 },
					{ segmentColor: 0, segmentBrightness: 4 },
					{ segmentColor: 0, segmentBrightness: 4 },
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
	let profiles = [];
	let profilesSubmenu = {
		label: "Profiles",
		type: "submenu",
	};

	let userProfiles = getProfilesFunc();
	userProfiles.profiles.forEach((item, index) => {
		profiles.push({
			label: item.profileName,
			type: "radio",
			click: () => {
				mainWindow.webContents.send("selectProfileTray", index);
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
	contextMenu.items[2].checked = userProfiles.runAtLogin;

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
			configName: "user-settings",
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

		app.allowRendererProcessReuse = false;
		mainWindow.loadFile(path.join(__dirname, "/src/index.html"));

		let res = setKeyboardOptions(
			selectedProfile.backlightMode,
			selectedProfile.profileOptions
		);
		res !== true && genericError(res);

		listenHotkey(() => {
			mainWindow.webContents.send("changeProfileHotKey", null);
		});

		mainWindow.on("close", (event) => {
			if (!usualQuit) {
				event.preventDefault();
				mainWindow.hide();
				if (isFirstRun) backgroundNotification.show();
			}
		});
	});
}

app.on("window-all-closed", (event) => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});

app.on("activate", () => {
	if (BrowserWindow.getAllWindows().length === 0) {
		createWindow();
	}
});

ipcMain.on("setKB", async (event, backlightMode, segmentOptions) => {
	let res = await setKeyboardOptions(backlightMode, segmentOptions);
	res !== true &&
		dialog.showErrorBox(
			"Error",
			res +
				"\n\nContact the dev for more information izuriihootoh@gmail.com"
		);
});

ipcMain.on("getUserProfiles", (event) => {
	event.returnValue = getProfilesFunc();
});

ipcMain.on("saveProfiles", (event, profiles) => {
	store.set(profiles);
	setMenu();
});

const can = async (path, permission) => {
	return await new Promise((resolve, reject) => {
		fs.access(`${path}`, permission, (err) => resolve(err));
	});
};

const checkHidrawPermission = async () => {
	const hidrawDevice = await getHidrawDevice();
	await checkPermission(`/dev/${hidrawDevice}`, constants.W_OK);
};

const checkInputPermission = async () => {
	const inputDevice = await getInputDevice();
	await checkPermission(`/dev/input/${inputDevice}`, constants.R_OK);
};

const checkPermission = async (path, permission) => {
	let permissionDevice = await can(path, permission);
	let shellCommand = `sudo chmod 666 ${path}`;

	if (permissionDevice && permissionDevice.code == "EACCES") {
		await new Promise((resolve, reject) => {
			dialog
				.showMessageBox(mainWindow, {
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

const checkPermissionDialog = async (path, permission, resolve) => {
	dialog
		.showMessageBox(mainWindow, {
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
					await checkPermissionDialog(path, resolve);
				} else {
					dialog.showMessageBox(mainWindow, {
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

const genericError = (error) => {
	dialog.showErrorBox(
		"Error",
		error +
			"\n\nContact the dev for more information izuriihootoh@gmail.com"
	);
	usualQuit = true;
	app.quit();
};
