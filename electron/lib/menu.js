import { Menu, app, shell } from 'electron';

import openWindow from './openWindow.js';
import updater from './updater.js';
import {
  isDevelopment,
  isMac,
  prettyVersion,
} from './constants.js';

const updateMenu = {
  get label() {
    switch (updater.state) {
      case 'checking-for-update':
        return 'Checking for Updates';
      case 'update-available':
        return 'Updating...';
      case 'update-downloaded':
        return 'Restart to Update';
      default:
        return 'Check for Updates';
    }
  },
  get enabled() {
    return ['update-not-available', 'error'].includes(updater.state);
  },
  click() {
    if (updater.state === 'update-downloaded') {
      updater.quitAndInstall();
    } else {
      updater.checkForUpdates();
    }
  },
};

// eslint-disable-next-line max-len
const FAQ = `https://astian.org/community/forum/faq/`;
const SUPPORT = `https://astian.org/community/forum/midori-wallet/`;

const helpMenu = {
  role: 'help',
  submenu: [
    {
      label: 'FAQ',
      click: async () => {
        await shell.openExternal(FAQ);
      },
    },
    {
      label: 'Support',
      click: async () => {
        await shell.openExternal(SUPPORT);
      },
    },
    ...(!isMac ? [
      { type: 'separator' },
      {
        role: 'about',
        click: async () => {
          await app.showAboutPanel();
        },
      },
      ...(updater.supported ? [updateMenu] : []),
    ] : []),
  ],
};

const appMenu = {
  get label() {
    return app.name;
  },
  submenu: [
    { role: 'about' },
    ...(updater.supported ? [updateMenu] : []),
    { type: 'separator' },
    { role: 'services' },
    { type: 'separator' },
    { role: 'hide' },
    { role: 'hideOthers' },
    { role: 'unhide' },
    { type: 'separator' },
    { role: 'quit' },
  ],
};

const template = [
  ...(isMac ? [appMenu] : []),
  { role: 'fileMenu' },
  { role: 'editMenu' },
  // View submenu
  {
    role: 'viewMenu',
    label: 'View',
    submenu: [
      {
        label: 'Reload',
        role: 'forcereload',
      },
      { type: 'separator' },
      { role: 'resetZoom' },
      { role: 'zoomIn' },
      { role: 'zoomOut' },
      { type: 'separator' },
      ...( isDevelopment ? [{
        role: 'toggledevtools',
      }] : []),
      { role: 'togglefullscreen' },
    ],
  },
  // Window submenu
  {
    role: 'windowMenu',
    label: 'Window',
    submenu: [
      { role: 'minimize' },
      { role: 'zoom' },
      ...(isMac ? [
        { type: 'separator' },
        {
          label: app.name,
          click: () => {
            openWindow();
          },
          accelerator: 'CmdOrCtrl+O',
        },
        { type: 'separator' },
        { role: 'front' },
      ] : [
        { role: 'close' },
      ]),
    ],
  },
  helpMenu,
];

export default Menu.buildFromTemplate(template);
