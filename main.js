const electron = require('electron')
const { shell } = require('electron')
// Module to control application life.
const app = electron.app
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow

const path = require('path')
const url = require('url')

const electronLinks = [
  'https://slack.com/signin',
  'https://slack.com/oauth'
];

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    // titleBarStyle: 'hidden-inset',
    backgroundColor: '#f8f8f8',
    width: 800,
    height: 600,
    minHeight: 500,
    minWidth: 320,
    webPreferences: {
      javascript: true,
      plugins: true,
      nodeIntegration: false, // node globals causes problems with complex web apps
      webSecurity: false,
      preload: path.join(__dirname, 'preload.js'),
    },
    // after webpack path here should reference `resources/app/`
    icon: path.join(__dirname, 'icon.png'),
  });

  mainWindow.loadURL(url.format({
    pathname: 'ideate.io',
    protocol: 'https:',
    // pathname: 'localhost:4200',
    // protocol: 'http:',
    slashes: true
  }))

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()

  // Open links in the browser
  mainWindow.webContents.on('new-window', function(e, url) {
    var openExternally = true;

    for (link of electronLinks) {
      test = url.toLowerCase();
      link = link.toLowerCase();
      openExternally = !test.includes(link) && openExternally;
    }

    if (openExternally) {
      e.preventDefault();
      shell.openExternal(url);
    }
  });

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
