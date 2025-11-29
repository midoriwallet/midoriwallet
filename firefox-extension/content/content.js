/**
 * Midori Wallet - Content Script
 * Inyecta funcionalidad de wallet en páginas web
 */

(function() {
  'use strict';

  console.log('Midori Wallet - Content script loaded');

  // Inyectar el objeto window.midoriWallet para que las dApps puedan interactuar
  const injectWalletProvider = () => {
    const script = document.createElement('script');
    script.textContent = `
      (function() {
        // Provider de Midori Wallet para dApps
        window.midoriWallet = {
          isInstalled: true,
          version: '1.0.2',
          
          // Detectar si es Midori Wallet
          isMidoriWallet: true,
          
          // Métodos básicos de wallet
          async connect() {
            return new Promise((resolve, reject) => {
              window.postMessage({
                type: 'MIDORI_WALLET_CONNECT',
                source: 'midori-wallet-page'
              }, '*');
              
              const handler = (event) => {
                if (event.data.type === 'MIDORI_WALLET_CONNECTED') {
                  window.removeEventListener('message', handler);
                  resolve(event.data.address);
                }
              };
              
              window.addEventListener('message', handler);
              
              // Timeout después de 30 segundos
              setTimeout(() => {
                window.removeEventListener('message', handler);
                reject(new Error('Connection timeout'));
              }, 30000);
            });
          },
          
          async getAddress() {
            return new Promise((resolve, reject) => {
              window.postMessage({
                type: 'MIDORI_WALLET_GET_ADDRESS',
                source: 'midori-wallet-page'
              }, '*');
              
              const handler = (event) => {
                if (event.data.type === 'MIDORI_WALLET_ADDRESS') {
                  window.removeEventListener('message', handler);
                  resolve(event.data.address);
                }
              };
              
              window.addEventListener('message', handler);
              
              setTimeout(() => {
                window.removeEventListener('message', handler);
                reject(new Error('Get address timeout'));
              }, 10000);
            });
          },
          
          async signTransaction(transaction) {
            return new Promise((resolve, reject) => {
              window.postMessage({
                type: 'MIDORI_WALLET_SIGN_TRANSACTION',
                source: 'midori-wallet-page',
                transaction: transaction
              }, '*');
              
              const handler = (event) => {
                if (event.data.type === 'MIDORI_WALLET_TRANSACTION_SIGNED') {
                  window.removeEventListener('message', handler);
                  resolve(event.data.signedTransaction);
                } else if (event.data.type === 'MIDORI_WALLET_TRANSACTION_REJECTED') {
                  window.removeEventListener('message', handler);
                  reject(new Error('Transaction rejected by user'));
                }
              };
              
              window.addEventListener('message', handler);
              
              setTimeout(() => {
                window.removeEventListener('message', handler);
                reject(new Error('Sign transaction timeout'));
              }, 60000);
            });
          },
          
          async disconnect() {
            window.postMessage({
              type: 'MIDORI_WALLET_DISCONNECT',
              source: 'midori-wallet-page'
            }, '*');
            return true;
          }
        };
        
        // Emitir evento de que el wallet está listo
        window.dispatchEvent(new Event('midoriWalletReady'));
        console.log('Midori Wallet provider injected');
      })();
    `;
    
    (document.head || document.documentElement).appendChild(script);
    script.remove();
  };

  // Inyectar lo antes posible
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectWalletProvider);
  } else {
    injectWalletProvider();
  }

  // Escuchar mensajes de la página
  window.addEventListener('message', (event) => {
    // Solo aceptar mensajes de la misma ventana
    if (event.source !== window) return;
    
    if (event.data.source === 'midori-wallet-page') {
      // Reenviar al background script
      browser.runtime.sendMessage({
        type: 'PAGE_MESSAGE',
        data: event.data
      }).then(response => {
        // Enviar respuesta de vuelta a la página
        if (response) {
          window.postMessage({
            ...response,
            source: 'midori-wallet-content'
          }, '*');
        }
      }).catch(error => {
        console.error('Error communicating with background:', error);
      });
    }
  });

  // Detectar protocolos de criptomonedas (bitcoin:, ethereum:, etc.)
  document.addEventListener('click', (event) => {
    const target = event.target.closest('a');
    if (!target) return;
    
    const href = target.getAttribute('href');
    if (!href) return;
    
    // Protocolos soportados
    const cryptoProtocols = [
      'bitcoin:', 'ethereum:', 'web+bitcoin:', 'web+ethereum:',
      'web+bitcoincash:', 'web+litecoin:', 'web+dogecoin:',
      'web+cardano:', 'web+stellar:', 'web+ripple:', 'web+monero:',
      'web+eos:', 'web+dash:'
    ];
    
    const protocol = cryptoProtocols.find(p => href.startsWith(p));
    
    if (protocol) {
      event.preventDefault();
      
      // Enviar al background para abrir en el wallet
      browser.runtime.sendMessage({
        type: 'HANDLE_CRYPTO_PROTOCOL',
        protocol: protocol,
        url: href
      });
    }
  });

  console.log('Midori Wallet - Content script initialized');
})();
