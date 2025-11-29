/**
 * Archivo de configuración de ejemplo para Midori Wallet Extension
 * 
 * Copia este archivo a config.js y modifica los valores según tus necesidades
 */

const CONFIG = {
  // Configuración de servidores API
  api: {
    // Servidor principal (producción)
    production: 'https://astian.org',
    
    // Servidor de desarrollo local
    development: 'http://localhost:8080',
    
    // Servidor de staging (opcional)
    staging: 'https://staging.astian.org',
    
    // Timeout para peticiones (ms)
    timeout: 30000,
    
    // Reintentos automáticos
    retries: 3
  },

  // Configuración de CORS
  cors: {
    // Orígenes permitidos
    allowedOrigins: [
      'https://astian.org',
      'https://*.astian.org',
      'http://localhost:*',
      'https://*.walletconnect.org',
      'https://*.walletconnect.com',
      'https://*.sentry.io'
    ],
    
    // Métodos HTTP permitidos
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    
    // Headers permitidos
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  },

  // Configuración de almacenamiento
  storage: {
    // Prefijo para las claves de storage
    prefix: 'midori_wallet_',
    
    // Tiempo de expiración de caché (ms)
    cacheExpiration: 3600000, // 1 hora
    
    // Encriptar datos sensibles
    encrypt: true
  },

  // Configuración de la interfaz
  ui: {
    // Tema por defecto ('light', 'dark', 'auto')
    defaultTheme: 'auto',
    
    // Idioma por defecto
    defaultLanguage: 'es',
    
    // Mostrar notificaciones
    showNotifications: true,
    
    // Ancho del popup (px)
    popupWidth: 360,
    
    // Alto del popup (px)
    popupHeight: 500
  },

  // Configuración de seguridad
  security: {
    // Tiempo de sesión antes de bloquear (ms)
    sessionTimeout: 900000, // 15 minutos
    
    // Requerir confirmación para transacciones
    requireConfirmation: true,
    
    // Límite de monto sin confirmación adicional
    confirmationThreshold: 100, // USD
    
    // Habilitar autenticación biométrica
    biometricAuth: false
  },

  // Configuración de blockchain
  blockchain: {
    // Redes soportadas
    networks: {
      ethereum: {
        enabled: true,
        chainId: 1,
        rpcUrl: 'https://mainnet.infura.io/v3/YOUR_KEY'
      },
      polygon: {
        enabled: true,
        chainId: 137,
        rpcUrl: 'https://polygon-rpc.com'
      },
      bsc: {
        enabled: true,
        chainId: 56,
        rpcUrl: 'https://bsc-dataseed.binance.org'
      },
      bitcoin: {
        enabled: true,
        network: 'mainnet'
      }
    },
    
    // Explorador de bloques por defecto
    explorers: {
      ethereum: 'https://etherscan.io',
      polygon: 'https://polygonscan.com',
      bsc: 'https://bscscan.com',
      bitcoin: 'https://blockchair.com/bitcoin'
    }
  },

  // Configuración de logging
  logging: {
    // Nivel de log ('debug', 'info', 'warn', 'error')
    level: 'info',
    
    // Enviar logs a servidor
    remote: false,
    
    // URL del servidor de logs
    remoteUrl: '',
    
    // Logs en consola
    console: true
  },

  // Configuración de features
  features: {
    // Habilitar WalletConnect
    walletConnect: true,
    
    // Habilitar intercambio de tokens
    swap: true,
    
    // Habilitar compra de crypto
    buy: true,
    
    // Habilitar NFTs
    nft: true,
    
    // Habilitar DeFi
    defi: true
  },

  // URLs importantes
  urls: {
    website: 'https://astian.org/midori-wallet/',
    support: 'https://github.com/goastian/midori-wallet/issues',
    terms: 'https://astian.org/terms',
    privacy: 'https://astian.org/privacy',
    documentation: 'https://github.com/goastian/midori-wallet/wiki'
  }
};

// Exportar configuración
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
