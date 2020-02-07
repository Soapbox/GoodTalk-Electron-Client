const { app, BrowserWindow, Menu, shell } = require('electron');
const Store = require('electron-store');
const path = require('path');
const url = require('url');
const fetch = require('electron-fetch').default;
const AsyncPolling = require('async-polling');
const notifier = require('node-notifier');

const store = new Store();
const BASE_DOMAIN = "soapboxhq.com";
const API_HOST = "api.goodtalk.soapboxhq.com";

const electronLinks = [
  'https://slack.com/signin',
  'https://slack.com/oauth',
  'https://accounts.google.com/o/oauth2',
  'https://www.googleapis.com/oauth2',
  'https://accounts.google.com/signin'
];

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
var unreadCount = 0;

function createWindow () {

  if (store.get('unreadCount')) {
    unreadCount = store.get('unreadCount');
  }

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
          { label: "Choose Soapbox", accelerator: "Shift+Command+C", 
            click: function() {
              mainWindow.loadURL(url.format({
                pathname: 'app.soapboxhq.com',
                protocol: 'https:',
                slashes: true
              }))
            }},
          { label: "Sign Out", accelerator: "Shift+Command+L", 
            click: function() { 
                    DeleteStoredData();
                    mainWindow.webContents.session.clearStorageData();
                    mainWindow.reload();
            }},
          { type: "separator" },
          { label: "Quit", accelerator: "Command+Q", 
            click: function() { 
              app.quit(); 
            }}
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
        { label: 'Reload', accelerator: 'CmdOrCtrl+R', 
          click(item, focusedWindow) { 
            mainWindow.reload();
          }}, 
        { label: 'Toggle Dev Tools', accelerator: 'CmdOrCtrl+I', 
          click(item, focusedWindow) { 
            mainWindow.webContents.openDevTools(); 
          }}
      ]}
  ];

  AsyncPolling(function (end) {
    updateUnreadBadgeCount();
    // Then notify the polling when your job is done:
    end();
    // This will schedule the next call.
  }, 15000).run();
  
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.setAppUserModelId("com.soapboxhq.soapbox-desktop-app");

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', function ()  {
  createWindow()
});

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
});

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
  updateUnreadBadgeCount();
});

function DeleteStoredData() {
  store.delete('soapboxUrl');
  store.delete('me');
  store.delete('token');
}

function getSoapboxURL() {
  var url = 'app.soapboxhq.com';
  
  var token = store.get('token');
  var soapboxUrl = store.get('soapboxUrl');

  if(soapboxUrl && token) {
    url = soapboxUrl.replace(/(^\w+:|^)\/\//, '');
  }

  return url;
}

function updateUnreadBadgeCount(){
  var token = store.get('token');
  var soapboxUrl = store.get('soapboxUrl');
  
  if (token && soapboxUrl) {
    var options = {
      method: "GET",
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token,
      },
    }

    var localUnreadCount = 0;
    var apiURL = `https://${API_HOST}/channels`;
    fetch(apiURL, options)
      .then(res => res.json())
      .then(json => {
        json.data.forEach(function(channel){
          var attributes = channel.attributes
          if(attributes['is-read'] != undefined && attributes['is-read'] == false) {
            localUnreadCount++;
          }
        });

        if(localUnreadCount > unreadCount) {
          NotifyUserOfUnreadChannels();
        }

        unreadCount = localUnreadCount;
        app.badgeCount = unreadCount;
        store.set('unreadCount', unreadCount);
      }).catch(function() {
        console.log("error");
      });
  } else {
    app.badgeCount = unreadCount;
  }
}

function NotifyUserOfUnreadChannels() {
  let iconAddress = path.join(__dirname, '/assets/icons/mac/icon.icns');
  notifier.notify({
    title: 'New unread items! 📫 ',
    message: 'You have new unread channels on Soapbox. Check them out now.',
    icon: iconAddress,
    appName: "com.soapboxhq.soapbox-desktop-app",
  });
}

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
