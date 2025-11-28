// Theme management module
const THEME_KEY = '_cs_theme';
const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  AUTO: 'auto',
};

class ThemeManager {
  #currentTheme = THEMES.AUTO;
  #listeners = new Set();

  constructor() {
    this.#loadTheme();
    this.#applyTheme();
    this.#setupMediaQueryListener();
  }

  #loadTheme() {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved && Object.values(THEMES).includes(saved)) {
        this.#currentTheme = saved;
      } else {
        // If no theme is saved or invalid, use AUTO and save it
        this.#currentTheme = THEMES.AUTO;
        this.#saveTheme();
      }
    } catch (err) {
      console.error('Failed to load theme:', err);
      this.#currentTheme = THEMES.AUTO;
    }
  }

  #saveTheme() {
    try {
      localStorage.setItem(THEME_KEY, this.#currentTheme);
    } catch (err) {
      console.error('Failed to save theme:', err);
    }
  }

  #applyTheme() {
    const html = document.documentElement;
    const body = document.body;
    
    // Remove all theme classes
    html.classList.remove('theme--light', 'theme--dark', 'theme--auto');
    
    // Add current theme class
    html.classList.add(`theme--${this.#currentTheme}`);
    
    // Force apply background color directly to body
    const isDark = this.isDarkMode();
    if (isDark) {
      body.style.backgroundColor = '#121614';
      body.style.color = '#e8e8e8';
    } else {
      body.style.backgroundColor = '#ffffff';
      body.style.color = '#222222';
    }
    
    // Update meta theme-color for mobile browsers
    this.#updateMetaThemeColor();
  }

  #updateMetaThemeColor() {
    const isDark = this.isDarkMode();
    const color = isDark ? '#121614' : '#ffffff';
    
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.content = color;
  }

  #setupMediaQueryListener() {
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', () => {
        if (this.#currentTheme === THEMES.AUTO) {
          this.#applyTheme();
          this.#notifyListeners();
        }
      });
    }
  }

  #notifyListeners() {
    this.#listeners.forEach((listener) => {
      try {
        listener(this.#currentTheme, this.isDarkMode());
      } catch (err) {
        console.error('Theme listener error:', err);
      }
    });
  }

  /**
   * Get current theme setting
   * @returns {string} 'light', 'dark', or 'auto'
   */
  getTheme() {
    return this.#currentTheme;
  }

  /**
   * Set theme
   * @param {string} theme - 'light', 'dark', or 'auto'
   */
  setTheme(theme) {
    if (!Object.values(THEMES).includes(theme)) {
      throw new Error(`Invalid theme: ${theme}`);
    }
    
    this.#currentTheme = theme;
    this.#saveTheme();
    this.#applyTheme();
    
    // Force apply styles immediately
    setTimeout(() => {
      const isDark = this.isDarkMode();
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
        console.log('[Dark Mode] Theme changed, applied background to body and #app:', bgColor);
      } else {
        document.body.style.removeProperty('background-color');
        document.body.style.removeProperty('color');
        const appDiv = document.getElementById('app');
        if (appDiv) {
          appDiv.style.removeProperty('background-color');
        }
        console.log('[Light Mode] Theme changed, removed inline styles');
      }
    }, 50);
    
    // Notify listeners
    const isDark = this.isDarkMode();
    this.#listeners.forEach((listener) => listener(theme, isDark));
  }

  /**
   * Check if dark mode is currently active
   * @returns {boolean}
   */
  isDarkMode() {
    if (this.#currentTheme === THEMES.DARK) {
      return true;
    }
    if (this.#currentTheme === THEMES.LIGHT) {
      return false;
    }
    // AUTO mode - check system preference
    if (window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  }

  /**
   * Toggle between light and dark (not auto)
   */
  toggle() {
    const newTheme = this.isDarkMode() ? THEMES.LIGHT : THEMES.DARK;
    this.setTheme(newTheme);
  }

  /**
   * Add listener for theme changes
   * @param {Function} listener - Callback function(theme, isDark)
   * @returns {Function} Unsubscribe function
   */
  addListener(listener) {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  /**
   * Get available themes
   * @returns {Object}
   */
  static get THEMES() {
    return { ...THEMES };
  }
}

// Create singleton instance
const themeManager = new ThemeManager();

export default themeManager;
export { THEMES };
