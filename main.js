const { app, ipcMain, BrowserWindow } = require('electron');
const path = require('path');
const { setKeyboardOptions } = require('./driver/index');

try {
	require('electron-reloader')(module)
} catch (_) {}

let mainWindow;

app.on('ready', () => {
	mainWindow = new BrowserWindow({
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false			
		},
		minHeight:640,
		minWidth:1150,
		maxHeight:640,
		maxWidth:1150
	});
	app.allowRendererProcessReuse = false;
	mainWindow.loadFile(path.join(__dirname, 'index.html'));
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