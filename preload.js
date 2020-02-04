/**
 Preload file that will be executed in the renderer process
 */
const {webFrame, ipcRenderer} = require('electron');
const Store = require('electron-store');
const path = require('path');
const fs = require('fs');

const store = new Store();
const BASE_DOMAIN = "soapboxhq.com";
const API_HOST = "api.goodtalk.soapboxhq.com";


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

process.once('document-start', () => {
    var Mousetrap = require('mousetrap')

    // map multiple combinations to the same callback
    Mousetrap.bind(['command+[', 'ctrl+['], () => {
        document.querySelector('[data-auto-id="top-bar-menu-toggle"]').click();
        // return false to prevent default behavior and stop event from bubbling
        return false
    })

    // map multiple combinations to the same callback
    Mousetrap.bind(['command+]', 'ctrl+]'], () => {
        var selection = document.querySelector('[data-auto-id="top-bar-menu-toggle"]'); 
        if(selection) {
            selection.click();
        }
        // return false to prevent default behavior and stop event from bubbling
        return false
    })

    Mousetrap.bind('up', () => {
        var selection = document.querySelector('.item-iterator a[title="Previous"]');
        if(selection) {
            selection.click();
        }
    })

    Mousetrap.bind('down', () => {
        var selection = document.querySelector('.item-iterator a[title="Next"]');
        if(selection) {
            selection.click();
        }
    })

    window.addEventListener('storage', function(e) {
        updateToken();
    });

    function updateToken(){
        var sessionItem = JSON.parse(localStorage.getItem(['ember_simple_auth-session']));
        if (sessionItem && sessionItem.authenticated) {
            var  token = null; // logged out by default
            if (sessionItem.authenticated.token) {
                // if session exists
                // set token
                token = sessionItem.authenticated.token;
            }
            if(token != store.get('token')) {
                store.set('token', token);
                updateUserTraits(token);
            }
        }
    }

    function updateUserTraits(token = ''){
        if (token) {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", `https://${API_HOST}/users/me?include=soapbox`, true);
            xhr.setRequestHeader('Authorization','Bearer ' + token);
            xhr.onreadystatechange = function() {
              if (xhr.readyState == 4) {
                var resp = JSON.parse(xhr.responseText);
                var firstIncluded = resp && resp.included ? resp.included[0] : null;
                var attrs = firstIncluded ? firstIncluded.attributes : null;
                var slug = attrs ? attrs.slug : null;
  
                if (slug) {
                  var url  = "https://" + slug + "." + BASE_DOMAIN;
                  store.set('soapboxUrl', url);
                  store.set('me', resp);
                }

                console.log(store.get('soapboxUrl'));
                console.log(store.get('me'));
              }
            }
            xhr.send();
        }
    }

});

// (function(){
//   // var root = document.documentElement;
//   // root.classList.add('electron-client');
//   document.addEventListener('DOMContentLoaded', function(){
//
//     // Say hi to our new friends.
//     // window.Notification('Did you know?', {
//     //   body: 'If we added web notifications they would appear natively here? (also, they would be pre-approved)'
//     // });
//
//     //Added a class incase the app wants that...
//     document.documentElement.classList.add('electron-client');
//
//     // Adding our own style overrides...
//     var link = document.createElement("link");
//     link.href = path.join('file://',__dirname, 'preload.css');
//     link.type = "text/css";
//     link.rel = "stylesheet";
//     document.getElementsByTagName("head")[0].appendChild(link);
//   }, false);
// })();
