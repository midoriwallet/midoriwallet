# Midori Wallet - Extensión para Firefox

Extensión oficial de Midori Wallet para Firefox. Gestiona tus criptomonedas de forma segura directamente desde tu navegador.

## 🚀 Características

- **Multi-blockchain**: Soporta Bitcoin, Ethereum, y más de 1000 tokens
- **Seguro y Privado**: Tus claves nunca salen de tu dispositivo
- **Sin CORS**: Manejo inteligente de CORS para comunicación con APIs
- **Interfaz Simple**: Diseño limpio y fácil de usar
- **Integración con dApps**: Permite a las aplicaciones web interactuar con tu wallet
- **Protocolos Crypto**: Detecta y maneja enlaces de criptomonedas (bitcoin:, ethereum:, etc.)

## 📦 Instalación

### Instalación en Modo Desarrollo

1. **Clonar o descargar** este repositorio

2. **Abrir Firefox** y navegar a `about:debugging`

3. **Hacer clic** en "Este Firefox" (This Firefox)

4. **Hacer clic** en "Cargar complemento temporal..." (Load Temporary Add-on)

5. **Navegar** a la carpeta `firefox-extension` y seleccionar el archivo `manifest.json`

6. La extensión se cargará y aparecerá el icono en la barra de herramientas

### Instalación desde AMO (Firefox Add-ons)

_Próximamente disponible en Firefox Add-ons_

## 🔧 Configuración

### Servidor API

Por defecto, la extensión se conecta a:
- **Producción**: `https://astian.org`
- **Desarrollo**: `http://localhost:8080`

Puedes modificar estos valores en `background/background.js`:

```javascript
const API_CONFIG = {
  defaultServer: 'https://astian.org',
  localServer: 'http://localhost:8080',
  // ...
};
```

### Permisos

La extensión requiere los siguientes permisos:

- **storage**: Para guardar datos del wallet de forma segura
- **tabs**: Para abrir nuevas pestañas con la aplicación web
- **activeTab**: Para interactuar con la pestaña activa
- **webRequest/webRequestBlocking**: Para manejar CORS
- **<all_urls>**: Para comunicarse con APIs de blockchain

## 📁 Estructura del Proyecto

```
firefox-extension/
├── manifest.json           # Configuración de la extensión
├── background/
│   └── background.js      # Script de fondo (maneja CORS, storage, etc.)
├── content/
│   └── content.js         # Script de contenido (inyecta provider en páginas)
├── popup/
│   ├── popup.html         # Interfaz del popup
│   ├── popup.css          # Estilos del popup
│   └── popup.js           # Lógica del popup
├── icons/
│   ├── icon-48.png        # Icono 48x48
│   ├── icon-96.png        # Icono 96x96
│   └── icon-128.png       # Icono 128x128
└── README.md              # Este archivo
```

## 🔐 Seguridad

### Manejo de Claves Privadas

- Las claves privadas **nunca** se almacenan en la extensión
- Todo el manejo de claves se realiza en la aplicación web
- La extensión solo almacena datos públicos (direcciones, balances)

### Content Security Policy

La extensión implementa una CSP estricta:

```
script-src 'self' 'unsafe-eval'; object-src 'self'
```

### CORS

La extensión maneja CORS de forma transparente:

1. Intercepta peticiones web usando `webRequest`
2. Agrega headers CORS necesarios
3. Permite comunicación con APIs de blockchain sin restricciones

## 🛠️ Desarrollo

### Requisitos

- Firefox 78.0 o superior
- Node.js (para desarrollo del proyecto principal)

### Desarrollo Local

1. **Hacer cambios** en los archivos de la extensión

2. **Recargar la extensión** en `about:debugging`
   - Click en "Recargar" junto a la extensión

3. **Probar** los cambios

### Debug

Para ver los logs de la extensión:

1. **Background Script**: `about:debugging` → "Inspeccionar" en la extensión
2. **Content Script**: Consola de desarrollador de la página (F12)
3. **Popup**: Click derecho en el popup → "Inspeccionar elemento"

## 🌐 Integración con dApps

La extensión inyecta un objeto `window.midoriWallet` en todas las páginas web:

```javascript
// Verificar si Midori Wallet está instalado
if (window.midoriWallet && window.midoriWallet.isInstalled) {
  console.log('Midori Wallet detectado!');
  
  // Conectar wallet
  const address = await window.midoriWallet.connect();
  console.log('Conectado:', address);
  
  // Obtener dirección
  const addr = await window.midoriWallet.getAddress();
  
  // Firmar transacción
  const signed = await window.midoriWallet.signTransaction(tx);
  
  // Desconectar
  await window.midoriWallet.disconnect();
}

// Escuchar cuando el wallet esté listo
window.addEventListener('midoriWalletReady', () => {
  console.log('Midori Wallet está listo!');
});
```

## 📝 API de Mensajes

### Mensajes al Background Script

```javascript
// Obtener datos del wallet
browser.runtime.sendMessage({
  type: 'GET_WALLET_DATA'
});

// Guardar datos del wallet
browser.runtime.sendMessage({
  type: 'SAVE_WALLET_DATA',
  data: { address: '0x...', balance: 100 }
});

// Limpiar datos
browser.runtime.sendMessage({
  type: 'CLEAR_WALLET_DATA'
});

// Abrir wallet
browser.runtime.sendMessage({
  type: 'OPEN_WALLET'
});

// Obtener configuración
browser.runtime.sendMessage({
  type: 'GET_API_CONFIG'
});

// Hacer petición API (evita CORS)
browser.runtime.sendMessage({
  type: 'MAKE_API_REQUEST',
  url: 'https://api.example.com/data',
  options: { method: 'GET' }
});
```

## 🐛 Solución de Problemas

### La extensión no carga

1. Verificar que Firefox sea versión 78.0 o superior
2. Revisar la consola de errores en `about:debugging`
3. Verificar que todos los archivos estén presentes

### CORS no funciona

1. Verificar que los permisos `webRequest` y `webRequestBlocking` estén activos
2. Revisar la consola del background script
3. Verificar que la URL esté en la lista de `allowedOrigins`

### El popup no se muestra

1. Verificar que los archivos en `popup/` existan
2. Revisar errores en la consola del popup (click derecho → inspeccionar)
3. Verificar que los iconos estén presentes

## 📄 Licencia

MIT License - Ver archivo LICENSE en el repositorio principal

## 👥 Contribuir

Las contribuciones son bienvenidas! Por favor:

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📞 Soporte

- **Website**: https://astian.org/midori-wallet/
- **Issues**: https://github.com/goastian/midori-wallet/issues
- **Email**: contact@astian.org

## 🔄 Changelog

### v1.0.2 (2024)
- ✨ Versión inicial de la extensión
- 🔒 Manejo de CORS implementado
- 🌐 Integración con dApps
- 📱 Popup con interfaz moderna
- 🔗 Detección de protocolos crypto

---

**Desarrollado con ❤️ por el equipo de Astian**
