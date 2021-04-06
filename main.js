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
		minHeight:548,
		minWidth:1400,
		maxHeight:548,
		maxWidth:1400,
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
	setKeyboardOptions(backlightMode, segmentOptions);
});

ipcMain.on('getUserProfiles', (event) => {
	let userProfiles = {
		selectedProfile : store.get('selectedProfile'),
		profiles : store.get('profiles')
	};
	event.returnValue = userProfiles;
});