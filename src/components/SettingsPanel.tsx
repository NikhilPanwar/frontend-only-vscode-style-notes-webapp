import React from 'react';
import {
  Palette,
  Sliders,
  HardDrive,
  Download,
  RotateCcw,
  Check,
  WrapText,
  Type,
  ListOrdered,
  Eye,
  FileCode,
  ShieldCheck,
  Layers,
} from 'lucide-react';
import { EditorSettings, ThemeType } from '../types';
import { THEMES } from '../utils/themes';

interface SettingsPanelProps {
  currentTheme: ThemeType;
  onThemeChange: (theme: ThemeType) => void;
  settings: EditorSettings;
  onUpdateSettings: (newSettings: Partial<EditorSettings>) => void;
  totalNotes: number;
  totalFolders: number;
  totalSizeFormatted: string;
  onExportZip: () => void;
  onResetWorkspace: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  currentTheme,
  onThemeChange,
  settings,
  onUpdateSettings,
  totalNotes,
  totalFolders,
  totalSizeFormatted,
  onExportZip,
  onResetWorkspace,
}) => {
  const theme = THEMES[currentTheme];

  const themeList: { id: ThemeType; name: string; isDark: boolean; colors: string[] }[] = [
    { id: 'vs-dark', name: 'Dark+ (VS Code Dark)', isDark: true, colors: ['#1e1e1e', '#007acc', '#cccccc'] },
    { id: 'vs-light', name: 'Light+ (VS Code Light)', isDark: false, colors: ['#ffffff', '#007acc', '#333333'] },
    { id: 'solarized-dark', name: 'Solarized Dark', isDark: true, colors: ['#002b36', '#268bd2', '#839496'] },
    { id: 'solarized-light', name: 'Solarized Light', isDark: false, colors: ['#fdf6e3', '#2aa198', '#657b83'] },
    { id: 'monokai', name: 'Monokai', isDark: true, colors: ['#272822', '#a6e22e', '#f8f8f2'] },
    { id: 'high-contrast-dark', name: 'High Contrast Dark', isDark: true, colors: ['#000000', '#f38518', '#ffffff'] },
  ];

  return (
    <div
      className="flex flex-col h-full select-none text-xs overflow-y-auto scrollbar-thin"
      style={{ color: theme.ui.textMain }}
    >
      {/* Header */}
      <div
        className="px-3 py-2 border-b uppercase tracking-wider font-semibold text-[11px] shrink-0"
        style={{
          borderColor: theme.ui.border,
          color: theme.ui.textHeader,
        }}
      >
        <span>Preferences & Themes</span>
      </div>

      <div className="p-3 flex flex-col gap-5">
        {/* Theme Picker Section */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 font-semibold text-xs" style={{ color: theme.ui.textHeader }}>
            <Palette size={14} className="text-blue-500" />
            <span>Color Theme</span>
          </div>

          <div className="grid grid-cols-1 gap-1.5">
            {themeList.map((t) => {
              const isSelected = currentTheme === t.id;
              return (
                <button
                  key={t.id}
                  id={`theme-select-${t.id}`}
                  onClick={() => onThemeChange(t.id)}
                  className="flex items-center justify-between p-2 rounded border text-left transition-all"
                  style={{
                    borderColor: isSelected ? theme.ui.accent : theme.ui.border,
                    backgroundColor: isSelected
                      ? `${theme.ui.accent}20`
                      : theme.isDark
                      ? 'rgba(255,255,255,0.03)'
                      : 'rgba(0,0,0,0.02)',
                    color: isSelected ? (theme.isDark ? '#ffffff' : theme.ui.textHeader) : theme.ui.textMain,
                  }}
                >
                  <div className="flex items-center gap-2">
                    {/* Theme color swatch */}
                    <div
                      className="flex items-center gap-0.5 p-0.5 rounded border"
                      style={{
                        borderColor: theme.ui.border,
                        backgroundColor: theme.isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.08)',
                      }}
                    >
                      {t.colors.map((c, i) => (
                        <span key={i} className="w-2.5 h-4 rounded-xs" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                    <span className="text-xs font-medium" style={{ color: theme.ui.textMain }}>
                      {t.name}
                    </span>
                  </div>
                  {isSelected && <Check size={14} className="text-blue-500 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Editor Settings */}
        <div className="flex flex-col gap-2 border-t pt-3" style={{ borderColor: theme.ui.border }}>
          <div className="flex items-center gap-1.5 font-semibold text-xs" style={{ color: theme.ui.textHeader }}>
            <Sliders size={14} className="text-blue-500" />
            <span>Editor Preferences</span>
          </div>

          {/* Word Wrap */}
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2" style={{ color: theme.ui.textMain }}>
              <WrapText size={14} style={{ color: theme.ui.textMuted }} />
              <span>Word Wrap</span>
            </div>
            <button
              onClick={() => onUpdateSettings({ wordWrap: !settings.wordWrap })}
              className="w-9 h-5 rounded-full p-0.5 transition-colors"
              style={{
                backgroundColor: settings.wordWrap
                  ? theme.ui.accent
                  : theme.isDark
                  ? '#3f3f46'
                  : '#d1d5db',
              }}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white shadow-xs transition-transform ${
                  settings.wordWrap ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Font Size */}
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2" style={{ color: theme.ui.textMain }}>
              <Type size={14} style={{ color: theme.ui.textMuted }} />
              <span>Font Size</span>
            </div>
            <select
              value={settings.fontSize}
              onChange={(e) => onUpdateSettings({ fontSize: Number(e.target.value) })}
              className="border rounded px-2 py-0.5 text-xs outline-none focus:border-blue-500 transition-colors"
              style={{
                backgroundColor: theme.ui.inputBg,
                borderColor: theme.ui.border,
                color: theme.ui.textMain,
              }}
            >
              <option value="12">12 px</option>
              <option value="14">14 px (Default)</option>
              <option value="16">16 px</option>
              <option value="18">18 px</option>
            </select>
          </div>

          {/* Tab Size */}
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2" style={{ color: theme.ui.textMain }}>
              <FileCode size={14} style={{ color: theme.ui.textMuted }} />
              <span>Tab Size</span>
            </div>
            <select
              value={settings.tabSize}
              onChange={(e) => onUpdateSettings({ tabSize: Number(e.target.value) })}
              className="border rounded px-2 py-0.5 text-xs outline-none focus:border-blue-500 transition-colors"
              style={{
                backgroundColor: theme.ui.inputBg,
                borderColor: theme.ui.border,
                color: theme.ui.textMain,
              }}
            >
              <option value="2">2 Spaces</option>
              <option value="4">4 Spaces</option>
            </select>
          </div>

          {/* Minimap */}
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2" style={{ color: theme.ui.textMain }}>
              <Eye size={14} style={{ color: theme.ui.textMuted }} />
              <span>Show Minimap</span>
            </div>
            <button
              onClick={() => onUpdateSettings({ minimap: !settings.minimap })}
              className="w-9 h-5 rounded-full p-0.5 transition-colors"
              style={{
                backgroundColor: settings.minimap
                  ? theme.ui.accent
                  : theme.isDark
                  ? '#3f3f46'
                  : '#d1d5db',
              }}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white shadow-xs transition-transform ${
                  settings.minimap ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Line Numbers */}
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2" style={{ color: theme.ui.textMain }}>
              <ListOrdered size={14} style={{ color: theme.ui.textMuted }} />
              <span>Line Numbers</span>
            </div>
            <select
              value={settings.lineNumbers}
              onChange={(e) =>
                onUpdateSettings({ lineNumbers: e.target.value as 'on' | 'off' | 'relative' })
              }
              className="border rounded px-2 py-0.5 text-xs outline-none focus:border-blue-500 transition-colors"
              style={{
                backgroundColor: theme.ui.inputBg,
                borderColor: theme.ui.border,
                color: theme.ui.textMain,
              }}
            >
              <option value="on">On</option>
              <option value="off">Off</option>
              <option value="relative">Relative</option>
            </select>
          </div>

          {/* Max Open Tabs */}
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2" style={{ color: theme.ui.textMain }}>
              <Layers size={14} style={{ color: theme.ui.textMuted }} />
              <span>Max Open Tabs</span>
            </div>
            <select
              id="settings-max-open-tabs"
              value={settings.maxOpenTabs || 10}
              onChange={(e) => onUpdateSettings({ maxOpenTabs: Number(e.target.value) })}
              className="border rounded px-2 py-0.5 text-xs outline-none focus:border-blue-500 transition-colors font-mono"
              style={{
                backgroundColor: theme.ui.inputBg,
                borderColor: theme.ui.border,
                color: theme.ui.textMain,
              }}
            >
              <option value="5">5 Tabs</option>
              <option value="8">8 Tabs</option>
              <option value="10">10 Tabs (Default)</option>
              <option value="15">15 Tabs</option>
              <option value="20">20 Tabs</option>
              <option value="30">30 Tabs</option>
              <option value="50">50 Tabs</option>
            </select>
          </div>
        </div>

        {/* Offline & Storage Details */}
        <div className="flex flex-col gap-2 border-t pt-3" style={{ borderColor: theme.ui.border }}>
          <div className="flex items-center gap-1.5 font-semibold text-xs" style={{ color: theme.ui.textHeader }}>
            <HardDrive size={14} className="text-emerald-500" />
            <span>Offline Workspace Stats</span>
          </div>

          <div
            className="p-2.5 rounded border flex flex-col gap-1.5 text-[11px]"
            style={{
              backgroundColor: theme.isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.03)',
              borderColor: theme.ui.border,
              color: theme.ui.textMain,
            }}
          >
            <div className="flex justify-between">
              <span style={{ color: theme.ui.textMuted }}>Total Notes:</span>
              <span className="font-mono font-semibold" style={{ color: theme.ui.textHeader }}>
                {totalNotes}
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: theme.ui.textMuted }}>Folders:</span>
              <span className="font-mono font-semibold" style={{ color: theme.ui.textHeader }}>
                {totalFolders}
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: theme.ui.textMuted }}>IndexedDB Usage:</span>
              <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                {totalSizeFormatted}
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: theme.ui.textMuted }}>Max Note Limit:</span>
              <span className="font-mono font-semibold text-sky-600 dark:text-sky-400">1.0 MB</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
              <ShieldCheck size={13} className="shrink-0" />
              <span>100% Offline, Zero Server Sync Needed</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 border-t pt-3" style={{ borderColor: theme.ui.border }}>
          <button
            onClick={onExportZip}
            className="w-full flex items-center justify-center gap-2 py-1.5 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium transition-colors shadow-xs"
          >
            <Download size={13} />
            <span>Export Workspace (ZIP)</span>
          </button>

          <button
            id="settings-btn-reset-workspace"
            onClick={onResetWorkspace}
            className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded border transition-colors text-[11px] font-semibold hover:border-red-500 hover:text-red-600 dark:hover:text-red-400 shadow-2xs"
            style={{
              backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : theme.ui.inputBg,
              borderColor: theme.ui.border,
              color: theme.isDark ? '#e4e4e7' : theme.ui.textMain,
            }}
          >
            <RotateCcw size={13} className="text-red-500 shrink-0" />
            <span>Reset to Default Samples</span>
          </button>
        </div>
      </div>
    </div>
  );
};
