/**
 * Midori Wallet - Popup Script
 * Carga wallet.astian.org en un iframe
 */

const WALLET_URL = 'https://wallet.astian.org/';
const LOAD_TIMEOUT = 15000; // 15 segundos

// Elementos del DOM
const loading = document.getElementById('loading');
const toolbar = document.getElementById('toolbar');
const frameContainer = document.getElementById('frame-container');
const walletFrame = document.getElementById('wallet-frame');
const errorDiv = document.getElementById('error');
const errorMessage = document.getElementById('error-message');
const loadingLabel = document.getElementById('loading-label');
const connectionStatus = document.getElementById('connection-status');
const retryBtn = document.getElementById('retry-btn');
const refreshBtn = document.getElementById('refresh-btn');
const openTabBtn = document.getElementById('open-tab-btn');
const errorOpenTabBtn = document.getElementById('error-open-tab-btn');

let loadTimeout;
let listenersBound = false;

function setConnectionStatus(text, isOnline = false) {
  if (!connectionStatus) {
    return;
  }

  connectionStatus.textContent = text;
  connectionStatus.classList.toggle('is-online', isOnline);
}

// Inicializar
function initialize() {
  console.log('Midori Wallet - Iniciando popup');

  if (!listenersBound) {
    walletFrame.addEventListener('load', onFrameLoad);
    walletFrame.addEventListener('error', onFrameError);
    listenersBound = true;
  }

  showLoading();
  startLoadSequence();
}

function startLoadSequence() {
  clearTimeout(loadTimeout);
  setConnectionStatus('Sincronizando', false);

  if (loadingLabel) {
    loadingLabel.textContent = 'Iniciando la sesion remota y verificando conectividad.';
  }

  loadTimeout = setTimeout(() => {
    console.error('Timeout al cargar wallet.astian.org');
    showError('Tiempo de espera agotado. Verifica tu conexion a internet.');
  }, LOAD_TIMEOUT);

  loadWallet();
}

// Cargar wallet
function loadWallet() {
  console.log('Cargando wallet desde:', WALLET_URL);

  walletFrame.classList.remove('loaded');
  walletFrame.src = WALLET_URL;
}

// Cuando el iframe carga exitosamente
function onFrameLoad() {
  console.log('Wallet cargado exitosamente');
  clearTimeout(loadTimeout);
  
  // Verificar si realmente cargó el contenido
  try {
    // Intentar acceder al contenido del iframe (puede fallar por CORS)
    const frameDoc = walletFrame.contentDocument || walletFrame.contentWindow.document;
    
    if (frameDoc && frameDoc.readyState === 'complete') {
      showWallet();
    } else {
      // Esperar un poco más
      setTimeout(() => {
        showWallet();
      }, 500);
    }
  } catch (e) {
    // Si hay error de CORS, asumimos que cargó correctamente
    console.log('CORS detectado (normal), mostrando wallet');
    showWallet();
  }
}

// Error al cargar el iframe
function onFrameError(e) {
  console.error('Error al cargar wallet:', e);
  clearTimeout(loadTimeout);
  showError('No se pudo cargar wallet.astian.org. Verifica tu conexion.');
}

// Mostrar loading
function showLoading() {
  loading.classList.remove('hidden');
  toolbar.classList.add('hidden');
  frameContainer.classList.remove('show');
  walletFrame.classList.remove('loaded');
  errorDiv.classList.remove('show');

  setConnectionStatus('Sincronizando', false);
}

// Mostrar wallet
function showWallet() {
  loading.classList.add('hidden');
  toolbar.classList.remove('hidden');
  frameContainer.classList.add('show');
  walletFrame.classList.add('loaded');
  errorDiv.classList.remove('show');

  setConnectionStatus('Online', true);

  console.log('Wallet visible');
}

// Mostrar error
function showError(message) {
  loading.classList.add('hidden');
  toolbar.classList.add('hidden');
  frameContainer.classList.remove('show');
  walletFrame.classList.remove('loaded');
  errorDiv.classList.add('show');
  errorMessage.textContent = message;

  setConnectionStatus('Sin conexion', false);

  console.error('Error mostrado:', message);
}

// Event Listeners

// Botón de reintentar
retryBtn.addEventListener('click', () => {
  console.log('Reintentando carga...');
  showLoading();

  walletFrame.src = '';
  setTimeout(() => {
    startLoadSequence();
  }, 120);
});

// Botón de refrescar
refreshBtn.addEventListener('click', () => {
  console.log('Refrescando wallet...');
  setConnectionStatus('Actualizando', false);
  walletFrame.classList.remove('loaded');
  walletFrame.src = WALLET_URL;
});

// Botón de abrir en nueva pestaña
openTabBtn.addEventListener('click', () => {
  console.log('Abriendo en nueva pestaña');
  browser.tabs.create({ url: WALLET_URL });
});

if (errorOpenTabBtn) {
  errorOpenTabBtn.addEventListener('click', () => {
    browser.tabs.create({ url: WALLET_URL });
  });
}

// Comunicación con el iframe
window.addEventListener('message', (event) => {
  // Verificar origen
  if (event.origin !== 'https://wallet.astian.org') {
    return;
  }
  
  console.log('Mensaje recibido del wallet:', event.data);
  
  // Manejar mensajes del wallet
  if (event.data.type === 'WALLET_READY') {
    console.log('Wallet está listo');
  }
});

// Enviar mensaje al iframe cuando esté listo
function sendMessageToWallet(message) {
  try {
    walletFrame.contentWindow.postMessage(message, 'https://wallet.astian.org');
  } catch (e) {
    console.error('Error enviando mensaje al wallet:', e);
  }
}

// Notificar al wallet que está en una extensión
setTimeout(() => {
  sendMessageToWallet({
    type: 'EXTENSION_CONTEXT',
    source: 'midori-wallet-extension',
    version: '1.0.3',
    browser: 'firefox'
  });
}, 2000);

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

console.log('Midori Wallet - Popup script cargado');
