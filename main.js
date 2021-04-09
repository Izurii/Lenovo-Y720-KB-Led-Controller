const { app, ipcMain, BrowserWindow, Tray, Menu } = require('electron');
const { setKeyboardOptions } = require('./driver/index');

const Store = require('electron-store');
const path = require('path');

try {
	require('electron-reloader')(module)
} catch (_) {}

let mainWindow;
let tray = null;

var menu = [
	{
		label: 'Open',
		type: 'normal',
		click : () => {
			mainWindow.show();
		}
	},
	null,
	{ label: 'Info', type: 'normal' },
	{ label: 'Exit', type: 'normal', click: () => { app.quit();	}}
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
			type: 'radio'
		});
		if(userProfiles.selectedProfile==index) profiles[index].checked = true;
	});

	profilesSubmenu = {
		...profilesSubmenu,
		submenu: profiles
	};

	let MenuArray = menu;
	MenuArray[1] = profilesSubmenu;

	tray.setContextMenu(Menu.buildFromTemplate(MenuArray));
};

app.on('ready', () => {
	
	tray = new Tray('./src/assets/icon.png');
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
		icon:path.join(__dirname, '/src/assets/icon.png')
	});
	app.allowRendererProcessReuse = false;
	mainWindow.loadFile(path.join(__dirname, '/src/index.html'));
}); 

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
});

ipcMain.on('setKB', (event, backlightMode, segmentOptions) => {
	setKeyboardOptions(backlightMode, segmentOptions, app.getPath('userData'));
});

ipcMain.on('getUserProfiles', (event) => {
	event.returnValue = getProfilesFunc();
});

ipcMain.on('saveProfiles', (event, profiles) => {
	store.set(profiles);
	setMenu();
});