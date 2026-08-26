import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Columns2,
  WrapText,
  ImagePlus,
  Copy,
  Download,
  Eye,
  Code,
  Layers,
  ArrowRightToLine,
  MinusCircle,
  FileCheck,
} from 'lucide-react';
import { FileNode, ThemeType } from '../types';
import { THEMES } from '../utils/themes';
import { FileIconComponent } from '../utils/fileIcons';
import { isMarkdownFile, isHtmlFile, isExcalidrawFile } from '../utils/languageDetector';
import { getFilePath } from '../utils/storage';

interface TabsBarProps {
  files: Record<string, FileNode>;
  openTabIds: string[];
  activeTabId: string | null;
  currentTheme: ThemeType;
  previewMode: 'editor' | 'split' | 'preview';
  wordWrap: boolean;
  maxOpenTabs?: number;
  onSelectTab: (fileId: string) => void;
  onCloseTab: (fileId: string) => void;
  onCloseOtherTabs: (fileId: string) => void;
  onCloseTabsToRight: (fileId: string) => void;
  onCloseAllTabs: () => void;
  onTogglePreviewMode: () => void;
  onToggleWordWrap: () => void;
  onOpenImageUpload: () => void;
  onCopyContent: () => void;
  onDownloadFile: () => void;
}

export const TabsBar: React.FC<TabsBarProps> = ({
  files,
  openTabIds,
  activeTabId,
  currentTheme,
  previewMode,
  wordWrap,
  maxOpenTabs = 10,
  onSelectTab,
  onCloseTab,
  onCloseOtherTabs,
  onCloseTabsToRight,
  onCloseAllTabs,
  onTogglePreviewMode,
  onToggleWordWrap,
  onOpenImageUpload,
  onCopyContent,
  onDownloadFile,
}) => {
  const theme = THEMES[currentTheme];
  const tabsScrollRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; tabId: string } | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const activeFile = activeTabId ? files[activeTabId] : null;
  const isMd = activeFile ? isMarkdownFile(activeFile.name) : false;
  const isHtml = activeFile ? isHtmlFile(activeFile.name) : false;
  const isExcalidraw = activeFile ? isExcalidrawFile(activeFile.name) : false;
  const supportsPreview = isMd || isHtml || isExcalidraw;

  // Handle outside clicks and keyboard escape to dismiss context menu
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu(null);
    };

    if (contextMenu) {
      window.addEventListener('click', handleClickOutside);
      window.addEventListener('contextmenu', handleClickOutside);
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('click', handleClickOutside);
      window.removeEventListener('contextmenu', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [contextMenu]);

  const handleTabContextMenu = (e: React.MouseEvent, tabId: string) => {
    e.preventDefault();
    e.stopPropagation();

    // Bound coordinates inside window
    const menuWidth = 190;
    const menuHeight = 220;
    const x = Math.min(e.clientX, window.innerWidth - menuWidth - 10);
    const y = Math.min(e.clientY, window.innerHeight - menuHeight - 10);

    setContextMenu({ x, y, tabId });
  };

  const handleCopyTabPath = (tabId: string) => {
    const path = getFilePath(tabId, files);
    if (path) {
      navigator.clipboard.writeText(path);
      setCopyFeedback(`Copied ${path}`);
      setTimeout(() => setCopyFeedback(null), 2000);
    }
    setContextMenu(null);
  };

  const handleDownloadTabFile = (tabId: string) => {
    const node = files[tabId];
    if (!node || node.type !== 'file') return;
    const blob = new Blob([node.content || ''], { type: node.mimeType || 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = node.name;
    a.click();
    URL.revokeObjectURL(url);
    setContextMenu(null);
  };

  return (
    <div
      id="vscode-tabs-bar"
      className="h-9 flex items-center justify-between border-b select-none shrink-0 z-10 transition-colors relative"
      style={{
        backgroundColor: theme.ui.bgTabs,
        borderColor: theme.ui.border,
      }}
    >
      {/* Left: Scrollable Tabs list */}
      <div
        ref={tabsScrollRef}
        className="flex-1 flex items-center h-full overflow-x-auto scrollbar-none"
      >
        {openTabIds.map((tabId, index) => {
          const file = files[tabId];
          if (!file) return null;

          const isActive = activeTabId === tabId;

          return (
            <div
              key={tabId}
              id={`editor-tab-${tabId}`}
              onClick={() => onSelectTab(tabId)}
              onContextMenu={(e) => handleTabContextMenu(e, tabId)}
              onAuxClick={(e) => {
                // Middle click closes tab
                if (e.button === 1) {
                  e.preventDefault();
                  onCloseTab(tabId);
                }
              }}
              className={`group flex items-center gap-2 h-full px-3 text-xs border-r cursor-pointer transition-colors relative min-w-[120px] max-w-[200px] ${
                isActive ? 'font-medium' : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-85 hover:opacity-100'
              }`}
              style={{
                backgroundColor: isActive ? theme.ui.bgTabActive : theme.ui.bgTabInactive,
                borderColor: theme.ui.border,
                color: isActive ? theme.ui.textHeader : theme.ui.textMuted,
              }}
              title={`${file.name} (Right-click for options)`}
            >
              {/* Top Accent Line for Active Tab */}
              {isActive && (
                <div
                  className="absolute top-0 left-0 right-0 h-0.5"
                  style={{ backgroundColor: theme.ui.accent }}
                />
              )}

              <FileIconComponent filename={file.name} size={14} />
              <span className="truncate flex-1 text-xs">{file.name}</span>

              {/* Close Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(tabId);
                }}
                className={`p-0.5 rounded transition-colors ${
                  isActive
                    ? 'opacity-80 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/20'
                    : 'opacity-0 group-hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/20'
                }`}
                title="Close Tab (Ctrl+W)"
              >
                <X size={12} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Right: Actions Bar */}
      <div
        className="flex items-center gap-0.5 px-2 shrink-0 border-l"
        style={{
          borderColor: theme.ui.border,
          backgroundColor: theme.ui.bgTabs,
          color: theme.ui.textMuted,
        }}
      >
        {/* Tab Count Indicator / Max tabs hint */}
        <div
          className="px-1.5 py-0.5 text-[10px] font-mono rounded opacity-70 hidden sm:flex items-center gap-1"
          style={{ color: theme.ui.textMuted }}
          title={`Open tabs: ${openTabIds.length} / Max allowed: ${maxOpenTabs} (Configurable in Settings)`}
        >
          <span>{openTabIds.length}/{maxOpenTabs} tabs</span>
        </div>

        {/* Insert Image (For Markdown notes) */}
        {isMd && (
          <button
            id="tab-btn-insert-image"
            onClick={onOpenImageUpload}
            className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 hover:text-blue-500 transition-colors"
            style={{ color: theme.ui.textMuted }}
            title="Insert Image into Markdown"
          >
            <ImagePlus size={14} />
          </button>
        )}

        {/* Preview Mode Switcher */}
        {supportsPreview && (
          <div
            className="flex items-center rounded border p-0.5 mx-1"
            style={{
              borderColor: theme.ui.border,
              backgroundColor: theme.ui.inputBg,
            }}
          >
            <button
              onClick={onTogglePreviewMode}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
                previewMode === 'editor'
                  ? 'bg-blue-600 text-white'
                  : previewMode === 'split'
                  ? 'bg-purple-600 text-white'
                  : 'bg-emerald-600 text-white'
              }`}
              title={`Preview: ${
                previewMode === 'editor'
                  ? 'Editor Only'
                  : previewMode === 'split'
                  ? 'Split (Side-by-Side)'
                  : 'Live Preview'
              } (Click to switch)`}
            >
              {previewMode === 'editor' && <Code size={12} />}
              {previewMode === 'split' && <Columns2 size={12} />}
              {previewMode === 'preview' && <Eye size={12} />}
              <span className="capitalize">{previewMode}</span>
            </button>
          </div>
        )}

        {/* Word Wrap Toggle */}
        <button
          id="tab-btn-word-wrap"
          onClick={onToggleWordWrap}
          className={`p-1 rounded transition-colors ${
            wordWrap ? 'text-blue-500 bg-blue-500/15' : 'hover:bg-black/5 dark:hover:bg-white/10 hover:text-blue-500'
          }`}
          style={{ color: wordWrap ? undefined : theme.ui.textMuted }}
          title={`Word Wrap: ${wordWrap ? 'On' : 'Off'} (Alt+Z)`}
        >
          <WrapText size={14} />
        </button>

        {/* Copy Note Content */}
        {activeFile && (
          <button
            id="tab-btn-copy"
            onClick={onCopyContent}
            className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 hover:text-blue-500 transition-colors"
            style={{ color: theme.ui.textMuted }}
            title="Copy Note Content"
          >
            <Copy size={14} />
          </button>
        )}

        {/* Download File */}
        {activeFile && (
          <button
            id="tab-btn-download"
            onClick={onDownloadFile}
            className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 hover:text-blue-500 transition-colors"
            style={{ color: theme.ui.textMuted }}
            title="Download File"
          >
            <Download size={14} />
          </button>
        )}

        {/* Close All */}
        {openTabIds.length > 1 && (
          <button
            id="tab-btn-close-all"
            onClick={onCloseAllTabs}
            className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 hover:text-red-500 transition-colors"
            style={{ color: theme.ui.textMuted }}
            title="Close All Tabs"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Copy feedback badge */}
      {copyFeedback && (
        <div
          className="absolute top-10 right-4 px-2.5 py-1 text-xs rounded shadow-lg z-50 flex items-center gap-1.5"
          style={{
            backgroundColor: theme.ui.modalBg,
            borderColor: theme.ui.border,
            borderWidth: 1,
            color: theme.ui.textMain,
          }}
        >
          <FileCheck size={13} className="text-emerald-500" />
          <span>{copyFeedback}</span>
        </div>
      )}

      {/* Tab Right-Click Context Menu */}
      {contextMenu && (
        <div
          id="tab-context-menu"
          className="fixed z-50 w-52 rounded shadow-2xl py-1 text-xs border animate-in fade-in zoom-in-95 duration-100"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
            backgroundColor: theme.ui.modalBg,
            borderColor: theme.ui.border,
            color: theme.ui.textMain,
            boxShadow: theme.isDark
              ? '0 10px 30px rgba(0, 0, 0, 0.6), 0 0 1px rgba(255, 255, 255, 0.1)'
              : '0 10px 30px rgba(0, 0, 0, 0.15)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with filename */}
          <div
            className="px-3 py-1 font-semibold border-b truncate text-[11px] opacity-80"
            style={{ borderColor: theme.ui.border, color: theme.ui.textHeader }}
          >
            {files[contextMenu.tabId]?.name || 'Tab'}
          </div>

          {/* Close this tab */}
          <button
            onClick={() => {
              onCloseTab(contextMenu.tabId);
              setContextMenu(null);
            }}
            className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-blue-600 hover:text-white text-left transition-colors"
          >
            <div className="flex items-center gap-2">
              <X size={13} />
              <span>Close</span>
            </div>
            <span className="text-[10px] opacity-60">Ctrl+W</span>
          </button>

          {/* Close Others */}
          <button
            id="tab-context-close-others"
            onClick={() => {
              onCloseOtherTabs(contextMenu.tabId);
              setContextMenu(null);
            }}
            disabled={openTabIds.length <= 1}
            className={`w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors ${
              openTabIds.length <= 1
                ? 'opacity-40 cursor-not-allowed'
                : 'hover:bg-blue-600 hover:text-white'
            }`}
          >
            <MinusCircle size={13} />
            <span className="font-medium">Close Other Tabs</span>
          </button>

          {/* Close Tabs to the Right */}
          <button
            id="tab-context-close-right"
            onClick={() => {
              onCloseTabsToRight(contextMenu.tabId);
              setContextMenu(null);
            }}
            disabled={openTabIds.indexOf(contextMenu.tabId) >= openTabIds.length - 1}
            className={`w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors ${
              openTabIds.indexOf(contextMenu.tabId) >= openTabIds.length - 1
                ? 'opacity-40 cursor-not-allowed'
                : 'hover:bg-blue-600 hover:text-white'
            }`}
          >
            <ArrowRightToLine size={13} />
            <span>Close to the Right</span>
          </button>

          {/* Close All */}
          <button
            onClick={() => {
              onCloseAllTabs();
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-red-600 hover:text-white text-left transition-colors"
          >
            <X size={13} />
            <span>Close All Tabs</span>
          </button>

          <div className="h-px my-1 mx-2" style={{ backgroundColor: theme.ui.border }} />

          {/* Copy File Path */}
          <button
            onClick={() => handleCopyTabPath(contextMenu.tabId)}
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-blue-600 hover:text-white text-left transition-colors"
          >
            <Copy size={13} />
            <span>Copy File Path</span>
          </button>

          {/* Download File */}
          <button
            onClick={() => handleDownloadTabFile(contextMenu.tabId)}
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-blue-600 hover:text-white text-left transition-colors"
          >
            <Download size={13} />
            <span>Download File</span>
          </button>
        </div>
      )}
    </div>
  );
};
