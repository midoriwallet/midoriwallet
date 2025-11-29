# 🧪 Guía de Pruebas - Midori Wallet Extension

## ✅ Lista de Verificación

### Instalación
- [ ] La extensión se carga sin errores en `about:debugging`
- [ ] El icono aparece en la barra de herramientas
- [ ] No hay errores en la consola del background script

### Popup
- [ ] El popup se abre al hacer click en el icono
- [ ] Se muestra la vista de bienvenida correctamente
- [ ] Los botones responden al click
- [ ] Los estilos se aplican correctamente
- [ ] El modo oscuro funciona (si está configurado)

### CORS
- [ ] Las peticiones a APIs externas funcionan
- [ ] No hay errores de CORS en la consola
- [ ] Los headers se agregan correctamente

### Content Script
- [ ] El objeto `window.midoriWallet` está disponible en las páginas
- [ ] El evento `midoriWalletReady` se dispara
- [ ] Los enlaces de criptomonedas se detectan

### Comunicación
- [ ] Los mensajes entre popup y background funcionan
- [ ] Los mensajes entre content y background funcionan
- [ ] El storage guarda y recupera datos

---

## 🔍 Pruebas Detalladas

### 1. Prueba de Instalación

```bash
# En Firefox
1. Ir a about:debugging
2. Click en "Este Firefox"
3. Click en "Cargar complemento temporal..."
4. Seleccionar manifest.json
5. Verificar que no hay errores
```

**Resultado esperado**: ✅ Extensión cargada sin errores

---

### 2. Prueba del Popup

```bash
# Abrir el popup
1. Click en el icono de Midori Wallet
2. Verificar que se muestra la vista de bienvenida
3. Click en cada botón
4. Verificar que las acciones funcionan
```

**Resultado esperado**: ✅ Popup funcional con todos los botones

---

### 3. Prueba de CORS

```javascript
// En la consola del background script (about:debugging → Inspeccionar)
// Ejecutar:
fetch('https://api.example.com/test')
  .then(r => r.json())
  .then(d => console.log('CORS OK:', d))
  .catch(e => console.error('CORS Error:', e));
```

**Resultado esperado**: ✅ No hay errores de CORS

---

### 4. Prueba del Content Script

```javascript
// En la consola de cualquier página web (F12)
// Ejecutar:
console.log('Midori Wallet instalado:', window.midoriWallet);
console.log('Versión:', window.midoriWallet?.version);

// Escuchar evento
window.addEventListener('midoriWalletReady', () => {
  console.log('✅ Midori Wallet está listo!');
});
```

**Resultado esperado**: ✅ Objeto disponible y evento disparado

---

### 5. Prueba de Detección de Protocolos

```html
<!-- Crear una página HTML de prueba -->
<!DOCTYPE html>
<html>
<body>
  <a href="bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa?amount=0.001">
    Enviar Bitcoin
  </a>
  <a href="ethereum:0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb">
    Enviar Ethereum
  </a>
</body>
</html>
```

**Resultado esperado**: ✅ Los enlaces se detectan y se manejan

---

### 6. Prueba de Storage

```javascript
// En la consola del background script
// Guardar datos
browser.runtime.sendMessage({
  type: 'SAVE_WALLET_DATA',
  data: { address: '0x123...', balance: 100 }
}).then(r => console.log('Guardado:', r));

// Recuperar datos
browser.runtime.sendMessage({
  type: 'GET_WALLET_DATA'
}).then(r => console.log('Recuperado:', r));

// Limpiar datos
browser.runtime.sendMessage({
  type: 'CLEAR_WALLET_DATA'
}).then(r => console.log('Limpiado:', r));
```

**Resultado esperado**: ✅ Datos se guardan y recuperan correctamente

---

### 7. Prueba de Comunicación

```javascript
// En el popup (popup.js)
browser.runtime.sendMessage({
  type: 'GET_API_CONFIG'
}).then(response => {
  console.log('Config:', response.config);
});

// En el background (background.js)
browser.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log('Mensaje recibido:', msg);
  sendResponse({ success: true });
});
```

**Resultado esperado**: ✅ Mensajes se envían y reciben correctamente

---

### 8. Prueba de Integración con dApp

```javascript
// Crear una página de prueba
<!DOCTYPE html>
<html>
<head>
  <title>Test dApp</title>
</head>
<body>
  <h1>Test Midori Wallet</h1>
  <button id="connect">Conectar Wallet</button>
  <div id="result"></div>

  <script>
    document.getElementById('connect').addEventListener('click', async () => {
      try {
        if (window.midoriWallet) {
          const address = await window.midoriWallet.connect();
          document.getElementById('result').textContent = 'Conectado: ' + address;
        } else {
          document.getElementById('result').textContent = 'Midori Wallet no detectado';
        }
      } catch (error) {
        document.getElementById('result').textContent = 'Error: ' + error.message;
      }
    });
  </script>
</body>
</html>
```

**Resultado esperado**: ✅ La dApp puede conectarse al wallet

---

## 🐛 Casos de Error a Probar

### Error 1: Manifest Inválido
```bash
# Modificar manifest.json con JSON inválido
# Intentar cargar la extensión
```
**Resultado esperado**: ❌ Error claro en about:debugging

### Error 2: Archivo Faltante
```bash
# Renombrar background.js temporalmente
# Recargar la extensión
```
**Resultado esperado**: ❌ Error indicando archivo faltante

### Error 3: Permiso Faltante
```bash
# Quitar permiso "storage" del manifest
# Intentar guardar datos
```
**Resultado esperado**: ❌ Error de permiso denegado

---

## 📊 Métricas de Rendimiento

### Tiempo de Carga
```javascript
// En background.js
console.time('Extension Load');
// ... código de inicialización ...
console.timeEnd('Extension Load');
```
**Objetivo**: < 100ms

### Uso de Memoria
```bash
# En about:memory
1. Buscar "Midori Wallet"
2. Verificar uso de memoria
```
**Objetivo**: < 50MB

### Tamaño del Paquete
```bash
cd firefox-extension
du -sh .
```
**Objetivo**: < 1MB

---

## 🔒 Pruebas de Seguridad

### 1. Verificar CSP
```javascript
// En la consola del popup
// Intentar ejecutar código inline (debería fallar)
eval('console.log("test")');
```
**Resultado esperado**: ❌ Error de CSP

### 2. Verificar Permisos
```bash
# Revisar manifest.json
# Verificar que solo tiene permisos necesarios
```
**Resultado esperado**: ✅ Solo permisos esenciales

### 3. Verificar Storage
```javascript
// Verificar que no se guardan claves privadas
browser.storage.local.get().then(data => {
  console.log('Storage:', data);
  // No debería haber claves privadas
});
```
**Resultado esperado**: ✅ Sin datos sensibles

---

## 📱 Pruebas de Compatibilidad

### Navegadores
- [ ] Firefox Desktop (Windows)
- [ ] Firefox Desktop (macOS)
- [ ] Firefox Desktop (Linux)
- [ ] Firefox Android (opcional)

### Versiones de Firefox
- [ ] Firefox 78 (mínima)
- [ ] Firefox ESR
- [ ] Firefox Beta
- [ ] Firefox Nightly

---

## 🎨 Pruebas de UI/UX

### Responsive
- [ ] Popup se ve bien en 360px de ancho
- [ ] Textos legibles
- [ ] Botones accesibles
- [ ] Sin scroll horizontal

### Modo Oscuro
- [ ] Colores correctos en modo oscuro
- [ ] Contraste adecuado
- [ ] Transición suave

### Accesibilidad
- [ ] Navegación con teclado funciona
- [ ] Textos alternativos en imágenes
- [ ] Contraste suficiente (WCAG AA)

---

## 📝 Reporte de Pruebas

### Plantilla

```markdown
## Prueba: [Nombre]
**Fecha**: [DD/MM/YYYY]
**Tester**: [Nombre]
**Versión**: 1.0.2

### Resultado
- [ ] ✅ Pasó
- [ ] ❌ Falló
- [ ] ⚠️ Parcial

### Detalles
[Descripción de lo que se probó]

### Errores Encontrados
1. [Error 1]
2. [Error 2]

### Notas
[Observaciones adicionales]
```

---

## 🚀 Checklist Final Pre-Lanzamiento

- [ ] Todas las pruebas pasan
- [ ] No hay errores en consola
- [ ] Documentación completa
- [ ] README actualizado
- [ ] Versión correcta en manifest.json
- [ ] Iconos de alta calidad
- [ ] Código comentado
- [ ] Sin console.log en producción
- [ ] Permisos mínimos necesarios
- [ ] CSP configurado correctamente

---

**¡Cuando todas las pruebas pasen, la extensión está lista para producción! 🎉**
