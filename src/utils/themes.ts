import { ThemeType } from '../types';
import type { Monaco } from '@monaco-editor/react';

export interface ThemeConfig {
  id: ThemeType;
  name: string;
  isDark: boolean;
  monacoTheme: string;
  ui: {
    bgApp: string;
    bgTitleBar: string;
    bgActivityBar: string;
    bgActivityBarActive: string;
    bgSidebar: string;
    bgSidebarHeader: string;
    bgEditor: string;
    bgTabs: string;
    bgTabActive: string;
    bgTabInactive: string;
    bgStatusBar: string;
    border: string;
    textMain: string;
    textMuted: string;
    textHeader: string;
    accent: string;
    accentHover: string;
    selection: string;
    lineHighlight: string;
    badgeBg: string;
    badgeText: string;
    inputBg: string;
    modalBg: string;
  };
}

export const THEMES: Record<ThemeType, ThemeConfig> = {
  'vs-dark': {
    id: 'vs-dark',
    name: 'Dark+ (default dark)',
    isDark: true,
    monacoTheme: 'vs-dark',
    ui: {
      bgApp: '#181818',
      bgTitleBar: '#1f1f1f',
      bgActivityBar: '#181818',
      bgActivityBarActive: '#0078d4',
      bgSidebar: '#1e1e1e',
      bgSidebarHeader: '#1e1e1e',
      bgEditor: '#1e1e1e',
      bgTabs: '#181818',
      bgTabActive: '#1e1e1e',
      bgTabInactive: '#2d2d2d',
      bgStatusBar: '#007acc',
      border: '#2b2b2b',
      textMain: '#cccccc',
      textMuted: '#858585',
      textHeader: '#bbbbbb',
      accent: '#0078d4',
      accentHover: '#0066b8',
      selection: '#264f78',
      lineHighlight: '#282828',
      badgeBg: '#4d4d4d',
      badgeText: '#ffffff',
      inputBg: '#3c3c3c',
      modalBg: '#252526',
    },
  },
  'vs-light': {
    id: 'vs-light',
    name: 'Light+ (VS Code Light)',
    isDark: false,
    monacoTheme: 'vs',
    ui: {
      bgApp: '#f3f3f3',
      bgTitleBar: '#dddddd',
      bgActivityBar: '#2c2c2c',
      bgActivityBarActive: '#007acc',
      bgSidebar: '#f3f3f3',
      bgSidebarHeader: '#f3f3f3',
      bgEditor: '#ffffff',
      bgTabs: '#ececec',
      bgTabActive: '#ffffff',
      bgTabInactive: '#e1e1e1',
      bgStatusBar: '#007acc',
      border: '#c8d1d9',
      textMain: '#1e1e1e',
      textMuted: '#4b5563',
      textHeader: '#0969da',
      accent: '#0066b8',
      accentHover: '#005a9e',
      selection: '#c8e1ff',
      lineHighlight: '#f6f8fa',
      badgeBg: '#d0d7de',
      badgeText: '#1f2328',
      inputBg: '#ffffff',
      modalBg: '#ffffff',
    },
  },
  'solarized-dark': {
    id: 'solarized-dark',
    name: 'Solarized Dark',
    isDark: true,
    monacoTheme: 'solarized-dark-custom',
    ui: {
      bgApp: '#00212b',
      bgTitleBar: '#001b24',
      bgActivityBar: '#001820',
      bgActivityBarActive: '#268bd2',
      bgSidebar: '#002b36',
      bgSidebarHeader: '#002b36',
      bgEditor: '#002b36',
      bgTabs: '#00212b',
      bgTabActive: '#002b36',
      bgTabInactive: '#073642',
      bgStatusBar: '#073642',
      border: '#073642',
      textMain: '#93a1a1',
      textMuted: '#586e75',
      textHeader: '#839496',
      accent: '#268bd2',
      accentHover: '#2aa198',
      selection: '#073642',
      lineHighlight: '#073642',
      badgeBg: '#073642',
      badgeText: '#eee8d5',
      inputBg: '#073642',
      modalBg: '#002b36',
    },
  },
  'solarized-light': {
    id: 'solarized-light',
    name: 'Solarized Light',
    isDark: false,
    monacoTheme: 'solarized-light-custom',
    ui: {
      bgApp: '#eee8d5',
      bgTitleBar: '#e0dac8',
      bgActivityBar: '#073642',
      bgActivityBarActive: '#268bd2',
      bgSidebar: '#fdf6e3',
      bgSidebarHeader: '#fdf6e3',
      bgEditor: '#fdf6e3',
      bgTabs: '#eee8d5',
      bgTabActive: '#fdf6e3',
      bgTabInactive: '#e4ddca',
      bgStatusBar: '#002b36',
      border: '#d0c8b0',
      textMain: '#073642',
      textMuted: '#586e75',
      textHeader: '#002b36',
      accent: '#268bd2',
      accentHover: '#2aa198',
      selection: '#dfd8c2',
      lineHighlight: '#eee8d5',
      badgeBg: '#dfd8c2',
      badgeText: '#073642',
      inputBg: '#eee8d5',
      modalBg: '#fdf6e3',
    },
  },
  'monokai': {
    id: 'monokai',
    name: 'Monokai',
    isDark: true,
    monacoTheme: 'monokai-custom',
    ui: {
      bgApp: '#1e1f1c',
      bgTitleBar: '#191a17',
      bgActivityBar: '#191a17',
      bgActivityBarActive: '#a6e22e',
      bgSidebar: '#272822',
      bgSidebarHeader: '#272822',
      bgEditor: '#272822',
      bgTabs: '#1e1f1c',
      bgTabActive: '#272822',
      bgTabInactive: '#383830',
      bgStatusBar: '#fd971f',
      border: '#3e3d32',
      textMain: '#f8f8f2',
      textMuted: '#75715e',
      textHeader: '#a6e22e',
      accent: '#a6e22e',
      accentHover: '#66d9ef',
      selection: '#49483e',
      lineHighlight: '#3e3d32',
      badgeBg: '#f92672',
      badgeText: '#ffffff',
      inputBg: '#3e3d32',
      modalBg: '#272822',
    },
  },
  'high-contrast-dark': {
    id: 'high-contrast-dark',
    name: 'High Contrast Dark',
    isDark: true,
    monacoTheme: 'hc-black',
    ui: {
      bgApp: '#000000',
      bgTitleBar: '#000000',
      bgActivityBar: '#000000',
      bgActivityBarActive: '#f38518',
      bgSidebar: '#000000',
      bgSidebarHeader: '#000000',
      bgEditor: '#000000',
      bgTabs: '#000000',
      bgTabActive: '#000000',
      bgTabInactive: '#121212',
      bgStatusBar: '#000000',
      border: '#6fc1ff',
      textMain: '#ffffff',
      textMuted: '#aaaaaa',
      textHeader: '#ffffff',
      accent: '#f38518',
      accentHover: '#ff9e3b',
      selection: '#004f8b',
      lineHighlight: '#1f1f1f',
      badgeBg: '#6fc1ff',
      badgeText: '#000000',
      inputBg: '#000000',
      modalBg: '#000000',
    },
  },
};

export function registerMonacoThemes(monaco: Monaco) {
  // Solarized Dark
  monaco.editor.defineTheme('solarized-dark-custom', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: '', foreground: '839496', background: '002b36' },
      { token: 'comment', foreground: '586e75', fontStyle: 'italic' },
      { token: 'string', foreground: '2aa198' },
      { token: 'keyword', foreground: '859900', fontStyle: 'bold' },
      { token: 'number', foreground: 'd33682' },
      { token: 'type', foreground: 'b58900' },
      { token: 'identifier', foreground: '268bd2' },
    ],
    colors: {
      'editor.background': '#002b36',
      'editor.foreground': '#839496',
      'editor.lineHighlightBackground': '#073642',
      'editor.selectionBackground': '#073642',
      'editorCursor.foreground': '#839496',
      'editorLineNumber.foreground': '#586e75',
      'editorLineNumber.activeForeground': '#93a1a1',
    },
  });

  // Solarized Light
  monaco.editor.defineTheme('solarized-light-custom', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: '', foreground: '073642', background: 'fdf6e3' },
      { token: 'comment', foreground: '708284', fontStyle: 'italic' },
      { token: 'string', foreground: '1f7a70' },
      { token: 'keyword', foreground: '6d8000', fontStyle: 'bold' },
      { token: 'number', foreground: 'b52668' },
      { token: 'type', foreground: '8c6b00' },
      { token: 'identifier', foreground: '18639b' },
    ],
    colors: {
      'editor.background': '#fdf6e3',
      'editor.foreground': '#073642',
      'editor.lineHighlightBackground': '#eee8d5',
      'editor.selectionBackground': '#e1dbcd',
      'editorCursor.foreground': '#073642',
      'editorLineNumber.foreground': '#708284',
      'editorLineNumber.activeForeground': '#002b36',
    },
  });

  // Monokai
  monaco.editor.defineTheme('monokai-custom', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: '', foreground: 'f8f8f2', background: '272822' },
      { token: 'comment', foreground: '75715e', fontStyle: 'italic' },
      { token: 'string', foreground: 'e6db74' },
      { token: 'keyword', foreground: 'f92672', fontStyle: 'bold' },
      { token: 'number', foreground: 'ae81ff' },
      { token: 'type', foreground: '66d9ef', fontStyle: 'italic' },
      { token: 'identifier', foreground: 'a6e22e' },
    ],
    colors: {
      'editor.background': '#272822',
      'editor.foreground': '#f8f8f2',
      'editor.lineHighlightBackground': '#3e3d32',
      'editor.selectionBackground': '#49483e',
      'editorCursor.foreground': '#f8f8f0',
      'editorLineNumber.foreground': '#75715e',
      'editorLineNumber.activeForeground': '#f8f8f2',
    },
  });
}
