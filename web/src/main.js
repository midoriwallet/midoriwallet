// polyfills
import 'core-js/es/string/replace-all';
import 'core-js/es/array/at';
import 'core-js/es/array/to-sorted';

import './assets/styles/app.scss';

import { addSentryVueIntegration } from './lib/sentry.js';

import App from './App.vue';
import { createAccount } from './lib/account.js';
import { createApp } from './lib/app.js';
import router from './router/router.js';
import i18n, { setLanguage } from './lib/i18n/i18n.js';

async function main() {
  document.addEventListener('touchstart', () => {}, false); // fix safari :active css bug
  if (import.meta.env.VITE_BUILD_TYPE === 'phonegap') {
    await (await import('../../phonegap/lib/deviceready.js')).default();
  }

  const app = createApp({ App, router });
  addSentryVueIntegration(app);
  await createAccount({ app, router });
  await setLanguage();
  app.use(i18n);
  app.use(router);
  app.mount('#app');
  
  // Force apply dark mode styles after Vue mounts
  setTimeout(() => {
    const theme = localStorage.getItem('_cs_theme') || 'auto';
    let isDark = false;
    if (theme === 'dark') {
      isDark = true;
    } else if (theme === 'auto') {
      isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    
    if (isDark) {
      const bgColor = window.innerWidth >= 1024 ? '#1e2421' : '#121614';
      // Apply to body
      document.body.style.setProperty('background-color', bgColor, 'important');
      document.body.style.setProperty('color', '#e8e8e8', 'important');
      // CRITICAL: Apply to #app div too!
      const appDiv = document.getElementById('app');
      if (appDiv) {
        appDiv.style.setProperty('background-color', bgColor, 'important');
      }
      console.log('[Dark Mode] Applied background to body and #app:', bgColor);
    }
  }, 100);
}

main().catch(console.error);
