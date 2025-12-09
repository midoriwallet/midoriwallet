/**
 * Midori Wallet - Background Script
 * Maneja CORS y comunicación con wallet.astian.org
 */

console.log('Midori Wallet Extension - Background script loaded');

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

// Manejo de CORS - Permite peticiones desde wallet.astian.org
browser.webRequest.onBeforeSendHeaders.addListener(
  function(details) {
    const headers = details.requestHeaders;
    
    console.log('Request to:', details.url);
    
    // Agregar headers necesarios para CORS
    if (!headers.find(h => h.name.toLowerCase() === 'origin')) {
      headers.push({
        name: 'Origin',
        value: 'https://wallet.astian.org'
      });
    }

    return { requestHeaders: headers };
  },
  {
    urls: ['<all_urls>']
  },
  ['blocking', 'requestHeaders']
);

// Manejo de respuestas para agregar headers CORS
browser.webRequest.onHeadersReceived.addListener(
  function(details) {
    const headers = details.responseHeaders || [];
    
    // Remover headers restrictivos de X-Frame-Options
    const filteredHeaders = headers.filter(h => {
      const name = h.name.toLowerCase();
      return name !== 'x-frame-options' && name !== 'content-security-policy';
    });
    
    // Agregar headers CORS permisivos
    filteredHeaders.push({
      name: 'Access-Control-Allow-Origin',
      value: '*'
    });
    
    filteredHeaders.push({
      name: 'Access-Control-Allow-Methods',
      value: 'GET, POST, PUT, DELETE, OPTIONS, PATCH'
    });
    
    filteredHeaders.push({
      name: 'Access-Control-Allow-Headers',
      value: '*'
    });
    
    filteredHeaders.push({
      name: 'Access-Control-Allow-Credentials',
      value: 'true'
    });

    return { responseHeaders: filteredHeaders };
  },
  {
    urls: ['<all_urls>']
  },
  ['blocking', 'responseHeaders']
);

// Comunicación entre scripts
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);

  switch (message.type) {
    case 'OPEN_WALLET_TAB':
      // Abrir wallet en nueva pestaña
      browser.tabs.create({
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
browser.runtime.onInstalled.addListener((details) => {
  console.log('Midori Wallet Extension installed:', details.reason);
  
  if (details.reason === 'install') {
    // Primera instalación - registrar en log solamente
    console.log('Midori Wallet installed successfully');
  } else if (details.reason === 'update') {
    console.log('Extension updated to version:', browser.runtime.getManifest().version);
  }
});

// Listener para el icono de la extensión
browser.browserAction.onClicked.addListener(() => {
  console.log('Extension icon clicked');
});

console.log('Midori Wallet Extension - Background script ready');
console.log('Wallet URL:', WALLET_URL);
