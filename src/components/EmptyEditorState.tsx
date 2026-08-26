import React from 'react';
import {
  Code2,
  FilePlus,
  Search,
  Palette,
  HardDrive,
  Keyboard,
  ShieldCheck,
  FolderOpen,
} from 'lucide-react';
import { ThemeType } from '../types';
import { THEMES } from '../utils/themes';

interface EmptyEditorStateProps {
  currentTheme: ThemeType;
  onCreateNewFile: () => void;
  onOpenQuickOpen: () => void;
  onOpenThemeSettings: () => void;
}

export const EmptyEditorState: React.FC<EmptyEditorStateProps> = ({
  currentTheme,
  onCreateNewFile,
  onOpenQuickOpen,
  onOpenThemeSettings,
}) => {
  const theme = THEMES[currentTheme];

  return (
    <div
      className="h-full flex items-center justify-center p-6 select-none overflow-y-auto"
      style={{
        backgroundColor: theme.ui.bgEditor,
        color: theme.ui.textMain,
      }}
    >
      <div className="max-w-md w-full flex flex-col items-center text-center space-y-6">
        {/* VS Code Logo */}
        <div className="w-16 h-16 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center shadow-lg border border-blue-500/30">
          <Code2 size={36} className="stroke-[2.2]" />
        </div>

        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight" style={{ color: theme.ui.textHeader }}>
            VS Code Notes
          </h2>
          <p className="text-xs" style={{ color: theme.ui.textMuted }}>
            Offline-first code & markdown workspace running directly in your browser.
          </p>
        </div>

        {/* Quick Actions List */}
        <div className="w-full grid grid-cols-1 gap-2 text-xs">
          <button
            onClick={onCreateNewFile}
            className="flex items-center justify-between p-3 rounded-lg border hover:border-blue-500 hover:bg-blue-600/10 transition-all text-left group"
            style={{
              borderColor: theme.ui.border,
              backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
            }}
          >
            <div className="flex items-center gap-2.5">
              <FilePlus size={16} className="text-blue-500 group-hover:scale-110 transition-transform" />
              <div>
                <div className="font-semibold" style={{ color: theme.ui.textHeader }}>New Note / Code File</div>
                <div className="text-[11px]" style={{ color: theme.ui.textMuted }}>Create a new markdown, python, or code note</div>
              </div>
            </div>
            <kbd
              className="text-[10px] px-1.5 py-0.5 rounded font-mono"
              style={{
                backgroundColor: theme.isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.06)',
                color: theme.ui.textMuted,
              }}
            >
              Ctrl+N
            </kbd>
          </button>

          <button
            onClick={onOpenQuickOpen}
            className="flex items-center justify-between p-3 rounded-lg border hover:border-blue-500 hover:bg-blue-600/10 transition-all text-left group"
            style={{
              borderColor: theme.ui.border,
              backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
            }}
          >
            <div className="flex items-center gap-2.5">
              <Search size={16} className="text-purple-500 group-hover:scale-110 transition-transform" />
              <div>
                <div className="font-semibold" style={{ color: theme.ui.textHeader }}>Quick Open File</div>
                <div className="text-[11px]" style={{ color: theme.ui.textMuted }}>Search all files by name</div>
              </div>
            </div>
            <kbd
              className="text-[10px] px-1.5 py-0.5 rounded font-mono"
              style={{
                backgroundColor: theme.isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.06)',
                color: theme.ui.textMuted,
              }}
            >
              Ctrl+P
            </kbd>
          </button>

          <button
            onClick={onOpenThemeSettings}
            className="flex items-center justify-between p-3 rounded-lg border hover:border-blue-500 hover:bg-blue-600/10 transition-all text-left group"
            style={{
              borderColor: theme.ui.border,
              backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
            }}
          >
            <div className="flex items-center gap-2.5">
              <Palette size={16} className="text-amber-500 group-hover:scale-110 transition-transform" />
              <div>
                <div className="font-semibold" style={{ color: theme.ui.textHeader }}>Change Theme</div>
                <div className="text-[11px]" style={{ color: theme.ui.textMuted }}>Dark+, Light+, Solarized Dark/Light, Monokai</div>
              </div>
            </div>
          </button>
        </div>

        {/* Keyboard Shortcuts Cheatsheet */}
        <div
          className="w-full p-3.5 rounded-lg border text-xs flex flex-col gap-2 text-left"
          style={{
            borderColor: theme.ui.border,
            backgroundColor: theme.isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)',
          }}
        >
          <div
            className="flex items-center gap-1.5 font-semibold pb-1 border-b"
            style={{ borderColor: theme.ui.border, color: theme.ui.textHeader }}
          >
            <Keyboard size={13} style={{ color: theme.ui.textMuted }} />
            <span>Essential Keyboard Shortcuts</span>
          </div>

          <div className="grid grid-cols-2 gap-y-1.5 text-[11px] font-mono" style={{ color: theme.ui.textMuted }}>
            <div className="flex items-center justify-between pr-2">
              <span>Find in file</span>
              <kbd style={{ color: theme.ui.textMain }}>Ctrl+F</kbd>
            </div>
            <div className="flex items-center justify-between pl-2 border-l" style={{ borderColor: theme.ui.border }}>
              <span>Toggle Word Wrap</span>
              <kbd style={{ color: theme.ui.textMain }}>Alt+Z</kbd>
            </div>
            <div className="flex items-center justify-between pr-2">
              <span>Quick File Open</span>
              <kbd style={{ color: theme.ui.textMain }}>Ctrl+P</kbd>
            </div>
            <div className="flex items-center justify-between pl-2 border-l" style={{ borderColor: theme.ui.border }}>
              <span>Command Palette</span>
              <kbd style={{ color: theme.ui.textMain }}>Ctrl+Shift+P</kbd>
            </div>
            <div className="flex items-center justify-between pr-2">
              <span>Toggle Sidebar</span>
              <kbd style={{ color: theme.ui.textMain }}>Ctrl+B</kbd>
            </div>
            <div className="flex items-center justify-between pl-2 border-l" style={{ borderColor: theme.ui.border }}>
              <span>Max Note Limit</span>
              <span className="text-emerald-500 font-semibold">1.0 MB</span>
            </div>
          </div>
        </div>

        {/* Offline Badge */}
        <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
          <ShieldCheck size={14} />
          <span>All notes are auto-saved in browser IndexedDB</span>
        </div>
      </div>
    </div>
  );
};
