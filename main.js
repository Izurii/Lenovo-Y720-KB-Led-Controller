// The current version of your app.
const APP_VERSION = require('./package.json').version

// The url that the application is going to query for new release
const AUTO_UPDATE_URL =
  'https://api.update.rocks/update/github.com/Izurii/Lenovo-Y720-KB-LED-Controller/stable/' + process.platform + '/' + APP_VERSION

const { app, ipcMain, BrowserWindow, Tray, Menu } = require('electron');
const { setKeyboardOptions } = require('./driver/index');

const Store = require('electron-store');
const path = require('path');

try {
	require('electron-reloader')(module)
} catch (_) {}

let mainWindow;
let tray = null;

const store = new Store();

app.on('ready', () => {
	
	// tray = new Tray('./assets/icon.png');
	// const contextMenu = Menu.buildFromTemplate([
	// 	{ label: 'Item1', type: 'radio' },
	// 	{ label: 'Item2', type: 'radio' },
	// 	{ label: 'Item3', type: 'radio', checked: true },
	// 	{ label: 'Item4', type: 'radio' }
	// ]);
	// tray.setToolTip('Lenovo Y720 Keyboard Backlight Controller');
	// tray.setContextMenu(contextMenu);

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
	
	event.returnValue = userProfiles;

});

ipcMain.on('saveProfiles', (event, profiles) => {
	store.set(profiles);
});