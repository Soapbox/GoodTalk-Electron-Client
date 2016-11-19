/**
 Preload file that will be executed in the renderer process
 */
const {webFrame, ipcRenderer} = require('electron')
const path = require('path')
const fs = require('fs')

// const INJECT_JS_PATH = path.join(__dirname, '', 'inject/inject.js');

setNotificationCallback((title, opt) => {
    ipcRenderer.send('notification', title, opt);
});

ipcRenderer.on('params', (event, message) => {
    const appArgs = JSON.parse(message);
    console.log('nativefier.json', appArgs);
});

ipcRenderer.on('debug', (event, message) => {
    console.log('debug:', message);
});

ipcRenderer.on('change-zoom', (event, message) => {
    webFrame.setZoomFactor(message);
});

/**
 * Patches window.Notification to set a callback on a new Notification
 * @param callback
 */
function setNotificationCallback(callback) {

    const OldNotify = window.Notification;
    const newNotify = (title, opt) => {
        callback(title, opt);
        return new OldNotify(title, opt);
    };
    newNotify.requestPermission = OldNotify.requestPermission.bind(OldNotify);
    Object.defineProperty(newNotify, 'permission', {
        get: () => {
            return OldNotify.permission;
        }
    });

    window.Notification = newNotify;
}

function clickSelector(element) {
    const mouseEvent = new MouseEvent('click');
    element.dispatchEvent(mouseEvent);
}
