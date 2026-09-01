import React from 'react';
import {
  Code2,
  Search,
  PanelLeft,
  Columns2,
  Download,
  Plus,
  Moon,
  Sun,
  HardDrive,
  FolderOpen,
  Check,
} from 'lucide-react';
import { FileNode, ThemeType } from '../types';
import { THEMES } from '../utils/themes';
import { FileIconComponent } from '../utils/fileIcons';
import { getFilePath } from '../utils/storage';

interface TitleBarProps {
  files: Record<string, FileNode>;
  activeFile: FileNode | null;
  currentTheme: ThemeType;
  onThemeChange: (theme: ThemeType) => void;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  onOpenQuickOpen: () => void;
  onOpenCommandPalette: () => void;
  onCreateNewFile: () => void;
  onExportZip: () => void;
  previewMode: 'editor' | 'split' | 'preview';
  onTogglePreview: () => void;
  isMarkdownOrHtml: boolean;
  totalSizeFormatted: string;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  files,
  activeFile,
  currentTheme,
  onThemeChange,
  isSidebarOpen,
  onToggleSidebar,
  onOpenQuickOpen,
  onOpenCommandPalette,
  onCreateNewFile,
  onExportZip,
  previewMode,
  onTogglePreview,
  isMarkdownOrHtml,
  totalSizeFormatted,
}) => {
  const theme = THEMES[currentTheme];

  const filePath = activeFile ? getFilePath(activeFile.id, files) : '';
  const pathParts = filePath ? filePath.split('/').filter(Boolean) : [];

  return (
    <header
      id="vscode-title-bar"
      className="h-10 flex items-center justify-between px-3 border-b select-none shrink-0 z-30 transition-colors"
      style={{
        backgroundColor: theme.ui.bgTitleBar,
        borderColor: theme.ui.border,
        color: theme.ui.textMain,
      }}
    >
      {/* Left: App Logo & Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-1.5 font-semibold text-xs tracking-wide shrink-0">
          <div className="w-5 h-5 rounded bg-blue-600 flex items-center justify-center text-white shadow-sm">
            <Code2 size={13} className="stroke-[2.5]" />
          </div>
          <span className="font-mono hidden sm:inline" style={{ color: theme.ui.textHeader }}>
            VS Code Notes
          </span>
        </div>

        {/* Breadcrumb Path */}
        {activeFile && (
          <div
            className="hidden md:flex items-center gap-1.5 text-xs min-w-0 overflow-hidden text-ellipsis whitespace-nowrap"
            style={{ color: theme.ui.textMuted }}
          >
            <span style={{ color: theme.ui.textMuted }}>/</span>
            {pathParts.map((part, index) => {
              const isLast = index === pathParts.length - 1;
              return (
                <React.Fragment key={index}>
                  <span
                    className={`flex items-center gap-1 ${
                      isLast ? 'font-medium' : 'hover:underline cursor-pointer'
                    }`}
                    style={{ color: isLast ? theme.ui.textHeader : theme.ui.textMuted }}
                  >
                    {isLast && <FileIconComponent filename={activeFile.name} size={14} />}
                    {part}
                  </span>
                  {!isLast && <span style={{ color: theme.ui.textMuted }}>&gt;</span>}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>

      {/* Center: Search / Quick Open Pill */}
      <div className="flex-1 min-w-[100px] max-w-md mx-1 sm:mx-2">
        <button
          id="btn-quick-open-trigger"
          onClick={onOpenQuickOpen}
          className="w-full h-7 px-2 sm:px-3 rounded text-xs flex items-center justify-between border transition-all hover:brightness-105 shadow-xs"
          style={{
            backgroundColor: theme.ui.inputBg,
            borderColor: theme.ui.border,
            color: theme.ui.textMuted,
          }}
          title="Search files by name (Ctrl+P / Cmd+P)"
        >
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
            <Search size={12} className="shrink-0" style={{ color: theme.ui.textMuted }} />
            <span className="truncate text-[11px] sm:text-xs">
              {activeFile ? activeFile.name : 'Search notes...'}
            </span>
          </div>
          <kbd
            className="hidden sm:inline-block text-[10px] px-1.5 py-0.5 rounded font-mono"
            style={{
              backgroundColor: theme.isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.06)',
              color: theme.ui.textMuted,
            }}
          >
            Ctrl+P
          </kbd>
        </button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-0.5 sm:gap-1 shrink-0" style={{ color: theme.ui.textMuted }}>
        {/* Offline & Size Badge */}
        <div
          className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono border"
          style={{
            backgroundColor: theme.isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.04)',
            borderColor: theme.ui.border,
            color: theme.ui.textMuted,
          }}
          title={`100% Offline IndexedDB Storage. Total workspace storage: ${totalSizeFormatted}`}
        >
          <HardDrive size={12} className="text-emerald-500" />
          <span>Offline ({totalSizeFormatted})</span>
        </div>

        {/* Quick New Note */}
        <button
          id="btn-title-new-file"
          onClick={onCreateNewFile}
          className="p-1.5 sm:p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 hover:text-blue-500 transition-colors flex items-center justify-center"
          style={{ color: theme.ui.textMuted }}
          title="New Note (Ctrl+N)"
        >
          <Plus size={15} />
        </button>

        {/* Split / Preview Toggle for MD / HTML */}
        {isMarkdownOrHtml && (
          <button
            id="btn-title-preview-mode"
            onClick={onTogglePreview}
            className={`p-1.5 sm:p-1.5 rounded transition-colors flex items-center justify-center ${
              previewMode !== 'editor'
                ? 'text-blue-500 bg-blue-500/15'
                : 'hover:bg-black/5 dark:hover:bg-white/10 hover:text-blue-500'
            }`}
            style={{ color: previewMode !== 'editor' ? undefined : theme.ui.textMuted }}
            title={`Toggle Preview Mode (Current: ${previewMode})`}
          >
            <Columns2 size={15} />
          </button>
        )}

        {/* Toggle Sidebar */}
        <button
          id="btn-toggle-sidebar"
          onClick={onToggleSidebar}
          className={`p-1.5 sm:p-1.5 rounded transition-colors flex items-center justify-center ${
            isSidebarOpen
              ? 'text-blue-500 bg-blue-500/15'
              : 'hover:bg-black/5 dark:hover:bg-white/10 hover:text-blue-500'
          }`}
          style={{ color: isSidebarOpen ? undefined : theme.ui.textMuted }}
          title="Toggle Primary Side Bar (Ctrl+B)"
        >
          <PanelLeft size={15} />
        </button>

        {/* Export ZIP */}
        <button
          id="btn-export-zip"
          onClick={onExportZip}
          className="p-1.5 sm:p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 hover:text-blue-500 transition-colors flex items-center justify-center"
          style={{ color: theme.ui.textMuted }}
          title="Export Workspace as ZIP"
        >
          <Download size={15} />
        </button>

        {/* Fast Theme Switcher */}
        <button
          id="btn-toggle-theme"
          onClick={() => {
            const themes: ThemeType[] = [
              'vs-dark',
              'vs-light',
              'solarized-dark',
              'solarized-light',
              'monokai',
              'high-contrast-dark',
            ];
            const nextIdx = (themes.indexOf(currentTheme) + 1) % themes.length;
            onThemeChange(themes[nextIdx]);
          }}
          className="p-1.5 sm:p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 hover:text-blue-500 transition-colors flex items-center justify-center"
          style={{ color: theme.ui.textMuted }}
          title={`Current Theme: ${theme.name}. Click to cycle themes.`}
        >
          {theme.isDark ? <Moon size={15} /> : <Sun size={15} />}
        </button>
      </div>
    </header>
  );
};
