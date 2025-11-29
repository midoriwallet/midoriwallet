/**
 * Midori Wallet - Background Script (Chromium)
 * Service Worker para Chrome, Edge, Brave, Opera
 */

console.log('Midori Wallet Extension - Background service worker loaded');

// Configuración
const WALLET_URL = 'https://wallet.astian.org';
const API_CONFIG = {
  walletUrl: WALLET_URL,
  allowedOrigins: [
    'https://wallet.astian.org',
    'https://*.astian.org',
    'http://localhost:*',
    'https://*.walletconnect.org',
    'https://*.walletconnect.com',
    'https://*.sentry.io',
    'https://*.infura.io',
    'https://*.alchemy.com',
    'https://*.quicknode.com'
  ]
};

// Comunicación entre scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);

  switch (message.type) {
    case 'OPEN_WALLET_TAB':
      // Abrir wallet en nueva pestaña
      chrome.tabs.create({
        url: WALLET_URL
      }).then(() => {
        sendResponse({ success: true });
      }).catch(error => {
        sendResponse({ success: false, error: error.message });
      });
      return true;

    case 'GET_CONFIG':
      // Devolver configuración
      sendResponse({ success: true, config: API_CONFIG });
      return false;

    default:
      // Reenviar mensaje al wallet si es necesario
      sendResponse({ success: true, forwarded: true });
      return false;
  }
});

// Listener para cuando se instala la extensión
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Midori Wallet Extension installed:', details.reason);
  
  if (details.reason === 'install') {
    // Primera instalación - abrir wallet
    chrome.tabs.create({
      url: WALLET_URL
    });
  } else if (details.reason === 'update') {
    console.log('Extension updated to version:', chrome.runtime.getManifest().version);
  }
});

// Listener para el icono de la extensión
chrome.action.onClicked.addListener(() => {
  console.log('Extension icon clicked');
});

// Mantener el service worker activo
chrome.alarms.create('keepAlive', { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'keepAlive') {
    console.log('Service worker keepAlive ping');
  }
});

console.log('Midori Wallet Extension - Background service worker ready');
console.log('Wallet URL:', WALLET_URL);
