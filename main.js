const { app, BrowserWindow, Menu, shell } = require('electron');
const Store = require('electron-store');
const path = require('path')
const url = require('url')

const store = new Store();
const BASE_DOMAIN = "soapboxhq.com";
const API_HOST = "api.goodtalk.soapboxhq.com";

const electronLinks = [
  'https://slack.com/signin',
  'https://slack.com/oauth',
  'https://accounts.google.com/o/oauth2/v2/auth',
  'https://www.googleapis.com/oauth2/v4/token',
  'https://accounts.google.com/signin/oauth/oauthchooseaccount'
];

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    // titleBarStyle: 'hidden-inset',
    backgroundColor: '#f8f8f8',
    titleBarStyle: 'hidden',
    width: 1200,
    height: 800,
    minWidth: 660,
    minHeight: 400,
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
    pathname: getSoapboxURL(),
    protocol: 'https:',
    slashes: true
  }))

  function getSoapboxURL() {
    var url = 'app.soapboxhq.com';
    
    var token = store.get('token');
    var soapboxUrl = store.get('soapboxUrl');

    if(soapboxUrl && token) {
      var url = soapboxUrl.replace(/(^\w+:|^)\/\//, '');
    }
    return url;
  }

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
    mainWindow = null
  });

  var template = [{
      label: "Application",
      submenu: [
          { label: "About", selector: "orderFrontStandardAboutPanel:" },
          { type: "separator" },
          { label: "Quit", accelerator: "Command+Q", click: function() { app.quit(); }}
      ]}, {
      label: "Edit",
      submenu: [
          { label: "Undo", accelerator: "CmdOrCtrl+Z", selector: "undo:" },
          { label: "Redo", accelerator: "Shift+CmdOrCtrl+Z", selector: "redo:" },
          { type: "separator" },
          { label: "Cut", accelerator: "CmdOrCtrl+X", selector: "cut:" },
          { label: "Copy", accelerator: "CmdOrCtrl+C", selector: "copy:" },
          { label: "Paste", accelerator: "CmdOrCtrl+V", selector: "paste:" },
          { label: "Select All", accelerator: "CmdOrCtrl+A", selector: "selectAll:" }
      ]},{
      label: 'View',
      submenu: [
        { label: 'Reload', accelerator: 'CmdOrCtrl+R', click(item, focusedWindow) { mainWindow.webContents.reload(); } }, 
        { label: 'Toggle Dev Tools', accelerator: 'CmdOrCtrl+I', click(item, focusedWindow) { mainWindow.webContents.openDevTools(); }}
      ]}
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', function ()  {
  createWindow()
})

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