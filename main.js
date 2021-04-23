const { app, ipcMain, BrowserWindow, Tray, Menu, Notification, dialog } = require('electron');
const { setKeyboardOptions } = require('./driver/index');
const { exec, spawn } = require('child_process');

const AutoLaunch = require('auto-launch');
const Store = require('electron-store');
const path = require('path');
const firstRun = require('electron-first-run');

const isFirstRun = firstRun();

const LedController = new AutoLaunch({
	name: 'Lenovo Y720 Led Controller',
	isHidden: true
});

try {
	require('electron-reloader')(module)
} catch (_) {}

let mainWindow;
let tray = null;

var frogIcon = path.join(__dirname, '/src/assets/icon.png');

var trayQuit = false;
var menu = [
	{
		label: 'Open/Show',
		type: 'normal',
		click : () => {
			mainWindow.show();
		}
	},
	null,
	{ label: 'Start at login', type: 'checkbox', click : (item) => {
		if(item.checked) {
			LedController.enable();
			store.set('runAtLogin', true);
		} else {
			LedController.disable();
			store.set('runAtLogin', false);
		}
	}},
	{ label: 'Separator', type: 'separator'},
	{ label: 'Exit', type: 'normal', click: () => { trayQuit = true; app.quit(); }}
];

const store = new Store();

const getProfilesFunc = () => {

	let userProfiles = {
		selectedProfile : store.get('selectedProfile'),
		profiles : store.get('profiles')
	};

	if(!userProfiles.profiles) {
		userProfiles.selectedProfile = 0;
		userProfiles.profiles = [
			{
				profileName: 'Profile 1',
				backlightMode: 3,
				profileOptions: [
					{ segmentColor: 0, segmentBrightness : 4},
					{ segmentColor: 0, segmentBrightness : 4},
					{ segmentColor: 0, segmentBrightness : 4},
					{ segmentColor: 0, segmentBrightness : 4}
				]
			}
		];
		store.set(userProfiles);
	}

	if(userProfiles.runAtLogin === undefined || userProfiles.runAtLogin === null) {
		userProfiles.runAtLogin = true;
		LedController.enable();
		store.set(userProfiles);
	}
	
	return userProfiles;

};

const setMenu = () => {
	
	let profiles = [];
	let profilesSubmenu = {
		label: 'Profiles',
		type: 'submenu'
	};

	let userProfiles = getProfilesFunc();
	userProfiles.profiles.forEach((item, index) => {
		profiles.push({
			label: item.profileName,
			type: 'radio',
			click: () => {
				mainWindow.webContents.send('selectProfileTray', index);
			}
		});
		if(userProfiles.selectedProfile==index) profiles[index].checked = true;
	});

	profilesSubmenu = {
		...profilesSubmenu,
		submenu: profiles
	};

	let MenuArray = menu;
	MenuArray[1] = profilesSubmenu;

	let contextMenu = Menu.buildFromTemplate(MenuArray);
	contextMenu.items[2].checked = userProfiles.runAtLogin;

	tray.setContextMenu(contextMenu);

};

if(!app.requestSingleInstanceLock()) {
	app.quit();
} else {

	app.on('second-instance', () => {
		if (mainWindow) {
			if(mainWindow.isMinimized()) mainWindow.restore(); else if(!mainWindow.isVisible()) mainWindow.show();
			mainWindow.focus();
		}
	});

	app.on('ready', async () => {

		let profiles = getProfilesFunc();
		let selectedProfile = profiles.profiles[profiles.selectedProfile];

		let backgroundNotification = new Notification({
			icon: frogIcon,
			title: 'Lenovo Y720 Keyboard Controller',
			body: "I'm on the background, open me again using the tray menu"
		});

		let res = await setKeyboardOptions(selectedProfile.backlightMode, selectedProfile.profileOptions, app.getPath('userData'));
		res!==true && dialog.showErrorBox('Error', res+"\n\nContact the dev for more information izuriihootoh@gmail.com");
	
		tray = new Tray(frogIcon);
		tray.setToolTip('Lenovo Y720 Keyboard Backlight Controller');

		setMenu();

		mainWindow = new BrowserWindow({
			configName: 'user-settings',
			webPreferences: {
				nodeIntegration: true,
				contextIsolation: false			
			},
			minHeight:625,
			minWidth:1510,
			maxHeight:625,
			maxWidth:1510,
			autoHideMenuBar:true,
			icon: frogIcon,
			show: isFirstRun ? true : false
		});

		app.allowRendererProcessReuse = false;
		mainWindow.loadFile(path.join(__dirname, '/src/index.html'));
		
		listenerForHotKey();
		
		mainWindow.on('close', (event) => {
			if(!trayQuit) {
				event.preventDefault();
				mainWindow.hide();
				if (isFirstRun) backgroundNotification.show();
			}
		});

	}); 

}

app.on('window-all-closed', (event) => {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
});

ipcMain.on('setKB', async (event, backlightMode, segmentOptions) => {
	let res = await setKeyboardOptions(backlightMode, segmentOptions, app.getPath('userData'));
	res!==true && dialog.showErrorBox('Error', res+"\n\nContact the dev for more information izuriihootoh@gmail.com");
});

ipcMain.on('getUserProfiles', (event) => {
	event.returnValue = getProfilesFunc();
});

ipcMain.on('saveProfiles', (event, profiles) => {
	store.set(profiles);
	setMenu();
});

const listenerForHotKey = async () => {
	exec('xinput --list | tee | grep "ITE Device(8910) Consumer Control" | grep "keyboard"', (error, stdout, stderr) => {
		if (stdout) {
			let deviceIdString = stdout.match(/(id=\d*)/g)[0];
			let deviceId = parseInt(deviceIdString.match(/(\d+)/g)[0]);

			let stream = spawn('xinput', ['--test', String(deviceId)]);
			stream.stdout.on('data', (data) => {

				let keyPressed = String(data).match(/(key\s*press\s*)(\d+)/g);
				if (!keyPressed) return;
				let keyPressedCode = parseInt(keyPressed[0].match(/(\d+)/g)[0]);
				if (keyPressedCode!=248) return;

				mainWindow.webContents.send('changeProfileHotKey', null);
				
			});
			
		} else if (stderr) {
			throw Error("Xinput didn't find the correct device.");
		} else if (error) {
			throw Error(error.message);
		}

	});
	
};