const electron = require('electron');
const { app, BrowserWindow, Menu, shell, TouchBar, nativeImage} = require('electron');

const Store = require('electron-store');
const path = require('path');
const url = require('url');
const fetch = require('electron-fetch').default;
const AsyncPolling = require('async-polling');
const notifier = require('node-notifier');

const { TouchBarLabel, TouchBarButton, TouchBarSpacer } = TouchBar;

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
var unreadChannelInfo = [];


const agendaButton = new TouchBarButton({
  label: '📒 Agenda',
  backgroundColor: '#97E5FF',
  click: () => {
    console.log('Agenda open!');
    //document.querySelector('.channel-header__footer .tab-bar a:nth-child(1)');
  }
});

const pastMeetingButton = new TouchBarButton({
  label: '🗓 Past Meetings',
  backgroundColor: '#97FFE5',
  click: () => {
    console.log('Agenda open!');
    //document.querySelector('.channel-header__footer .tab-bar a:nth-child(2)');
  }
});

const insightsButton = new TouchBarButton({
  label: '📈 Insights',
  backgroundColor: '#E597FF',
  click: () => {
    console.log('Agenda open!');
    //document.querySelector('.channel-header__footer .tab-bar a:nth-child(3)');
  }
});

const notesButton = new TouchBarButton({
  label: '📝 Notes',
  backgroundColor: '#FFE597',
  click: () => {
    console.log('Agenda open!');
  }
});

const settingsButton = new TouchBarButton({
  label: '⚙️ Settings',
  backgroundColor: '#828282',
  click: () => {
    
  }
});


const touchBar = new TouchBar({
  items: [
    agendaButton,
    pastMeetingButton,
    insightsButton,
    new TouchBarSpacer({size: 'flexible'}),
    notesButton,
    settingsButton
  ]
});
  

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

  mainWindow.setTouchBar(touchBar);
  
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
        { label: "Back", accelerator: "CmdOrCtrl+Left", click: function() { 
            if(mainWindow.webContents.canGoBack()) {
              mainWindow.webContents.goBack();
            }
          }},
        { label: "Forward", accelerator: "CmdOrCtrl+Right", click: function() { 
            if(mainWindow.webContents.canGoForward()) {
              mainWindow.webContents.goForward();
            }
          }},   
        { label: 'Toggle Dev Tools', accelerator: 'CmdOrCtrl+I', 
          click(item, focusedWindow) { 
            mainWindow.webContents.openDevTools(); 
          }},
        { label: 'Load test notification', accelerator: 'CmdOrCtrl+N', 
          click(item, focusedWindow) { 
            NotifyUserOfUnreadChannels();
          }},
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
  createWindow();
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
  console.log("activate window");
  checkIfShouldReloadContent();
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

function checkIfShouldReloadContent() {
  var shouldReloadAppContent = false;
  var currentDatetime = new Date();
  var storedDatetime = null;

  if(!store.get('lastRefreshDatetime')) {
    store.set('lastRefreshDatetime', currentDatetime.getTime());
    storedDatetime = currentDatetime;
  } else {
    var storedDateAsLong = store.get('lastRefreshDatetime');
    storedDatetime = new Date(storedDateAsLong);
  }

  var timeDiff = Math.abs(currentDatetime.getTime() - storedDatetime.getTime());
  var diffHours = Math.floor(timeDiff / (1000 * 60 * 60));

  shouldReloadAppContent = (diffHours > 4) ? true : false;
    
  if(shouldReloadAppContent) {
    store.set('lastRefreshDatetime', currentDatetime.getTime());
    mainWindow.reload();
  }
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
    unreadChannelInfo = [];
    var apiURL = `https://${API_HOST}/channels`;
    fetch(apiURL, options)
      .then(res => res.json())
      .then(json => {
        json.data.forEach(function(channel){
          //console.log(channel);
          var attributes = channel.attributes
          if(attributes['is-read'] != undefined && attributes['is-read'] == false) {
            localUnreadCount++;
            
            var item = [];
            item['channelId'] = channel['id'];
            item['name'] = attributes['name'];
            item['avatar'] = attributes['avatar'];
            item['background-gradient'] = attributes['background-gradient'];
            item['mascot'] = attributes['mascot'];
            unreadChannelInfo.push(item);
          }
        });

        if(localUnreadCount > unreadCount) {
          NotifyUserOfUnreadChannels();
        }

        UpdateUnreadTouchBarItems();
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

function NotifyUserOfUnreadChannels(desiredURL) {
  var url = desiredURL ? desiredURL : undefined;
  //url = 'com.soapboxhq.soapbox-desktop-app';
  
  notifier.notify({
    title: 'New unread items! 📫 ',
    appID: 'com.soapboxhq.soapbox-desktop-app',
    message: 'You have new unread channels on Soapbox. Check them out now.',
    //open: url,
    sound: true,
    appName: "com.soapboxhq.soapbox-desktop-app",
  }).on('click', function() {
    //console.log(arguments);
    mainWindow.show();
  });
}

function UpdateUnreadTouchBarItems() {
  var touchBarItems = [];
  var todayButton = new TouchBarButton({
    'label': '📅 Today', 
    'backgroundColor': '#97E5FF',
    'click': () => {
      mainWindow.loadURL(url.format({
        pathname: getSoapboxURL(),
        protocol: 'https:',
        slashes: true
      }));
    }
  });
  touchBarItems.push(todayButton);

  if(unreadChannelInfo.length > 0) {
    unreadChannelInfo.forEach(function(channel) {
      var color = '#' + channel['background-gradient'].split('-')[0];
      var link = getSoapboxURL() + '/channels/'+ channel['channelId'] + '/inbox';
      //var image = nativeImage.createFromDataURL(channel.avatar).resize({width: 16,height: 16});
      var unreadButton = new TouchBarButton({
        'label': channel.name, //channel.mascot + ' ' + 
        'backgroundColor': color,
        'click': () => {
          mainWindow.loadURL(url.format({
            pathname: link,
            protocol: 'https:',
            slashes: true
          }));
        },
        // 'icon': image,
        // 'iconPosition': 'center',
      });
      
      touchBarItems.push(unreadButton);
    });
  }
  
  var newTouchBar = new TouchBar({
    items: touchBarItems
  });

  mainWindow.setTouchBar(newTouchBar);
}

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
