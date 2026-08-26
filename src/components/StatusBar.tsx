import React from 'react';
import {
  Check,
  RotateCw,
  HardDrive,
  WrapText,
  Palette,
  GitBranch,
  ShieldCheck,
  FileCode,
  AlertCircle,
} from 'lucide-react';
import { CursorPosition, EditorSettings, FileNode, ThemeType, MAX_NOTE_SIZE_BYTES } from '../types';
import { THEMES } from '../utils/themes';
import { detectLanguageByFilename } from '../utils/languageDetector';
import { formatBytes } from '../utils/storage';

interface StatusBarProps {
  activeFile: FileNode | null;
  cursorPos: CursorPosition;
  currentTheme: ThemeType;
  settings: EditorSettings;
  isSaving: boolean;
  onOpenLanguageSelector: () => void;
  onOpenThemeSelector: () => void;
  onToggleWordWrap: () => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  activeFile,
  cursorPos,
  currentTheme,
  settings,
  isSaving,
  onOpenLanguageSelector,
  onOpenThemeSelector,
  onToggleWordWrap,
}) => {
  const theme = THEMES[currentTheme];
  const lang = activeFile ? detectLanguageByFilename(activeFile.name) : null;
  const fileSize = activeFile ? activeFile.size : 0;
  const sizePercentage = Math.min(100, Math.round((fileSize / MAX_NOTE_SIZE_BYTES) * 100));

  return (
    <footer
      id="vscode-status-bar"
      className="h-6 flex items-center justify-between px-3 text-[11px] select-none shrink-0 z-20 transition-colors font-sans text-white font-medium"
      style={{
        backgroundColor: theme.ui.bgStatusBar,
      }}
    >
      {/* Left side items */}
      <div className="flex items-center gap-3">
        {/* Offline Status */}
        <div
          className="flex items-center gap-1 hover:bg-white/20 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
          title="100% Offline Notes persistent via browser IndexedDB"
        >
          <GitBranch size={12} />
          <span>offline/main</span>
        </div>

        {/* Auto-Save Status */}
        <div className="flex items-center gap-1">
          {isSaving ? (
            <>
              <RotateCw size={11} className="animate-spin text-amber-200" />
              <span className="text-white/90">Saving...</span>
            </>
          ) : (
            <>
              <Check size={11} className="text-emerald-200" />
              <span className="text-white/90">Saved</span>
            </>
          )}
        </div>

        {/* Note Size vs 1MB Max */}
        {activeFile && (
          <div
            className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded cursor-pointer ${
              fileSize > MAX_NOTE_SIZE_BYTES * 0.9 ? 'bg-red-500/30 text-amber-200' : 'hover:bg-white/20'
            }`}
            title={`Current Note Size: ${formatBytes(fileSize)} (Max: 1.00 MB / 1,048,576 bytes)`}
          >
            <HardDrive size={11} />
            <span>
              {formatBytes(fileSize)} / 1.0 MB ({sizePercentage}%)
            </span>
          </div>
        )}
      </div>

      {/* Right side items */}
      <div className="flex items-center gap-2 font-mono text-[11px]">
        {/* Cursor Coordinates */}
        {activeFile && (
          <div className="hover:bg-white/20 px-1.5 py-0.5 rounded cursor-pointer transition-colors">
            Ln {cursorPos.lineNumber}, Col {cursorPos.column}
          </div>
        )}

        {/* Indent / Spaces */}
        <div className="hidden sm:block hover:bg-white/20 px-1.5 py-0.5 rounded cursor-pointer transition-colors">
          Spaces: {settings.tabSize}
        </div>

        {/* Encoding */}
        <div className="hidden md:block hover:bg-white/20 px-1.5 py-0.5 rounded cursor-pointer transition-colors">
          UTF-8
        </div>

        {/* Word Wrap Status */}
        <button
          onClick={onToggleWordWrap}
          className="hover:bg-white/20 px-1.5 py-0.5 rounded transition-colors flex items-center gap-1"
          title="Toggle Word Wrap (Alt+Z)"
        >
          <WrapText size={11} />
          <span>Wrap: {settings.wordWrap ? 'On' : 'Off'}</span>
        </button>

        {/* Language Mode Picker */}
        {lang && (
          <button
            onClick={onOpenLanguageSelector}
            className="hover:bg-white/20 px-1.5 py-0.5 rounded transition-colors flex items-center gap-1 font-sans"
            title="Select Language Mode (Click to change syntax)"
          >
            <FileCode size={11} />
            <span>{lang.name}</span>
          </button>
        )}

        {/* Theme Quick Click */}
        <button
          onClick={onOpenThemeSelector}
          className="hover:bg-white/20 px-1.5 py-0.5 rounded transition-colors flex items-center gap-1 font-sans"
          title="Theme: Click to change"
        >
          <Palette size={11} />
          <span className="hidden lg:inline">{theme.name.split(' ')[0]}</span>
        </button>
      </div>
    </footer>
  );
};
