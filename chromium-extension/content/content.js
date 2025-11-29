/**
 * Midori Wallet - Content Script (Chromium)
 * Inyecta funcionalidad en páginas web
 */

console.log('Midori Wallet - Content script loaded (Chromium)');

// Detectar enlaces de criptomonedas
const cryptoProtocols = [
  'bitcoin:', 'bitcoincash:', 'ethereum:', 'litecoin:',
  'dogecoin:', 'monero:', 'stellar:', 'ripple:',
  'web+bitcoin:', 'web+bitcoincash:', 'web+ethereum:'
];

// Escuchar clicks en enlaces de criptomonedas
document.addEventListener('click', (e) => {
  const target = e.target.closest('a');
  if (!target) return;
  
  const href = target.getAttribute('href');
  if (!href) return;
  
  // Verificar si es un enlace de criptomoneda
  const isCryptoLink = cryptoProtocols.some(protocol => href.startsWith(protocol));
  
  if (isCryptoLink) {
    e.preventDefault();
    console.log('Crypto link detected:', href);
    
    // Abrir en Midori Wallet
    chrome.runtime.sendMessage({
      type: 'OPEN_CRYPTO_LINK',
      url: href
    });
  }
}, true);

console.log('Midori Wallet - Content script ready');
