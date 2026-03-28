/* eslint-disable no-undef */
import Taptic from './Taptic.js';

const DEVICE_READY_TIMEOUT = 12000;

async function runSafely(label, callback) {
  try {
    await callback();
  } catch (err) {
    console.error(`[deviceready] ${label} failed`, err);
  }
}

export default async function deviceready() {
  let isDeviceReady = false;
  await Promise.race([
    new Promise((resolve) => {
      document.addEventListener('deviceready', () => {
        isDeviceReady = true;
        resolve();
      }, { once: true });
    }),
    new Promise((resolve) => {
      setTimeout(resolve, DEVICE_READY_TIMEOUT);
    }),
  ]);

  if (!isDeviceReady) {
    console.warn(`[deviceready] timed out after ${DEVICE_READY_TIMEOUT}ms`);
  }

  // fix: force fallback (cordova doesn't set Content-Type: application/wasm)
  if (window.WebAssembly) WebAssembly.instantiateStreaming = false;

  document.addEventListener('backbutton', (e) => {
    e.preventDefault();
    if (window.backButtonModal) return window.backButtonModal();
    if (window.backButton) return window.backButton();
    if (window.navigator.app?.exitApp) window.navigator.app.exitApp();
  }, false);

  await runSafely('Zendesk', async () => {
    if (!window.Zendesk?.initialize) return;
    window.Zendesk.initialize(
      import.meta.env.VITE_ZENDESK_APP_ID,
      import.meta.env.VITE_ZENDESK_CLIENT_ID,
      import.meta.env.VITE_ZENDESK_URL
    );
    window.Zendesk.setAnonymousIdentity?.();
  });

  const taptic = new Taptic();
  await runSafely('Taptic', async () => {
    await taptic.init();
  });
  window.taptic = taptic;

  window.permissionDenied = async (message, buttonLabel, buttonLabels) => {
    const qrScanner = window.QRScanner;
    const { canOpenSettings = false } = qrScanner?.getStatus
      ? await new Promise((resolve) => {
        try {
          qrScanner.getStatus((status) => resolve(status || {}));
        } catch (err) {
          console.error('[deviceready] QRScanner.getStatus failed', err);
          resolve({});
        }
      })
      : {};
    await new Promise((resolve) => {
      const title = 'Midori Wallet';
      if (canOpenSettings && navigator.notification?.confirm) {
        navigator.notification.confirm(
          message,
          (buttonIndex) => {
            if (buttonIndex === 2 && qrScanner?.openSettings) qrScanner.openSettings();
            resolve();
          },
          title,
          buttonLabels
        );
      } else if (navigator.notification?.alert) {
        navigator.notification.alert(
          message,
          resolve,
          title,
          buttonLabel
        );
      } else {
        window.alert(message);
        resolve();
      }
    });
  };

  if (!navigator.clipboard) {
    navigator.clipboard = {};
  }

  if (window.cordova?.plugins?.clipboard) {
    navigator.clipboard.writeText = (text) => {
      window.cordova.plugins.clipboard.copy(text);
      taptic.tap();
      return Promise.resolve();
    };
    navigator.clipboard.readText = () => {
      return new Promise((resolve) => {
        window.cordova.plugins.clipboard.paste(resolve);
      });
    };
  }

  if (window.cordova?.InAppBrowser?.open) {
    window.open = (url, target, options) => {
      return window.cordova.InAppBrowser.open(url, target || '_system', options);
    };
  }

  if (window.SafariViewController?.isAvailable) {
    window.SafariViewController.isAvailable((available) => {
      if (!available) return;
      window.open = (url) => {
        window.SafariViewController.show({ url });
      };
    });
  }

  window.handleOpenURL = function(url) {
    setTimeout(() => {
      if (url.startsWith('coinspace://')) {
        window.SafariViewController?.hide?.();
        window.closeWindowExtra?.(url);
        return;
      }
      window.navigateHandler?.(`/bip21/${encodeURIComponent(url)}`);
    }, 1);
  };

  if (import.meta.env.VITE_PLATFORM === 'ios') {
    if (window.ThreeDeeTouch) {
      window.ThreeDeeTouch.onHomeIconPressed = ({ type }) => {
        const cryptoId = type.split('.').pop();
        window.navigateHandler?.(`/${cryptoId}`);
      };
    }
    window.Watch?.initialize(() => {
      window.Watch.isEnabled = true;
    }, () => {});
    window.saveCryptosForExtensions = (cryptos) => {
      const value = cryptos ? JSON.stringify(cryptos
        .filter((crypto) => crypto.market && crypto.balance.value)
        .map((crypto) => {
          return {
            _id: crypto.crypto._id,
            balance: crypto.balance.toString(),
          };
        })
      ) : '';
      window.UserDefaults.save(
        {
          suite: 'group.org.midoriwallet.shared',
          key: 'portfolioCryptos',
          value,
        },
        () => {
          window.WidgetCenter?.reloadTimelines?.(
            'PortfolioExtension',
            () => {},
            (err) => console.error(err)
          );
        },
        (err) => console.error(err)
      );
      if (window.Watch.isEnabled) {
        window.Watch.updateAppContext(
          { data: value, ts: Date.now() },
          () => {},
          () => {}
        );
      }
    };
    window.StatusBar?.styleDefault?.();
    window.StatusBar?.show?.();
  }
}
