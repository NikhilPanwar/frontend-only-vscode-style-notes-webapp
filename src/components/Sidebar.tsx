import React from 'react';
import { ActiveSidebarTab, EditorSettings, FileNode, ThemeType } from '../types';
import { FileTree, TreeClipboardState } from './FileTree';
import { GlobalSearch } from './GlobalSearch';
import { SettingsPanel } from './SettingsPanel';
import { THEMES } from '../utils/themes';
import { ShieldCheck, HardDrive, Cpu, Terminal, Key, FileCode, X } from 'lucide-react';

interface SidebarProps {
  activeTab: ActiveSidebarTab;
  isOpen: boolean;
  width: number;
  files: Record<string, FileNode>;
  activeFileId: string | null;
  currentTheme: ThemeType;
  settings: EditorSettings;
  totalNotes: number;
  totalFolders: number;
  totalSizeFormatted: string;
  isMobile?: boolean;
  onCloseMobile?: () => void;
  onOpenFile: (fileId: string) => void;
  onCreateFile: (name: string, parentId: string | null, content?: string) => void;
  onCreateFolder: (name: string, parentId: string | null) => void;
  onRenameNode: (id: string, newName: string) => void;
  onDeleteNode: (id: string) => void;
  onToggleFolder: (folderId: string) => void;
  onCollapseAll: () => void;
  onFileUpload: (files: FileList, targetParentId: string | null) => void;
  onDuplicateFile: (fileId: string) => void;
  onMoveNode: (sourceId: string, targetParentId: string | null) => void;
  onPasteClipboard: (clipboard: TreeClipboardState, targetParentId: string | null) => void;
  onPasteImageFile: (dataUrl: string, targetParentId: string | null, customFilename?: string) => void;
  onOpenMatch: (fileId: string, lineNumber: number) => void;
  onThemeChange: (theme: ThemeType) => void;
  onUpdateSettings: (newSettings: Partial<EditorSettings>) => void;
  onExportZip: () => void;
  onResetWorkspace: () => void;
  onStartResize: (e: React.MouseEvent) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  isOpen,
  width,
  files,
  activeFileId,
  currentTheme,
  settings,
  totalNotes,
  totalFolders,
  totalSizeFormatted,
  isMobile = false,
  onCloseMobile,
  onOpenFile,
  onCreateFile,
  onCreateFolder,
  onRenameNode,
  onDeleteNode,
  onToggleFolder,
  onCollapseAll,
  onFileUpload,
  onDuplicateFile,
  onMoveNode,
  onPasteClipboard,
  onPasteImageFile,
  onOpenMatch,
  onThemeChange,
  onUpdateSettings,
  onExportZip,
  onResetWorkspace,
  onStartResize,
}) => {
  const theme = THEMES[currentTheme];

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && isMobile && (
        <div
          id="sidebar-mobile-backdrop"
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 md:hidden animate-in fade-in duration-150"
          onClick={onCloseMobile}
        />
      )}

      <aside
        id="vscode-sidebar"
        className={`select-none shrink-0 border-r z-40 md:z-10 transition-all duration-75 flex flex-col ${
          isMobile
            ? 'fixed left-12 top-10 bottom-6 w-[calc(100vw-54px)] max-w-[320px] shadow-2xl animate-in slide-in-from-left duration-200'
            : 'relative h-full'
        }`}
        style={{
          width: isMobile ? undefined : `${width}px`,
          backgroundColor: theme.ui.bgSidebar,
          borderColor: theme.ui.border,
        }}
      >
        {/* Mobile Header Bar with Close Button */}
        {isMobile && (
          <div
            className="flex items-center justify-between px-3 py-2 border-b md:hidden shrink-0"
            style={{ borderColor: theme.ui.border, backgroundColor: theme.ui.bgSidebarHeader }}
          >
            <span className="font-semibold text-xs capitalize" style={{ color: theme.ui.textHeader }}>
              {activeTab}
            </span>
            <button
              onClick={onCloseMobile}
              className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              style={{ color: theme.ui.textMuted }}
              title="Close Sidebar"
            >
              <X size={15} />
            </button>
          </div>
        )}

        <div className="w-full h-full overflow-hidden flex flex-col">
          {activeTab === 'explorer' && (
            <FileTree
              files={files}
              activeFileId={activeFileId}
              currentTheme={currentTheme}
              onOpenFile={onOpenFile}
              onCreateFile={onCreateFile}
              onCreateFolder={onCreateFolder}
              onRenameNode={onRenameNode}
              onDeleteNode={onDeleteNode}
              onToggleFolder={onToggleFolder}
              onCollapseAll={onCollapseAll}
              onFileUpload={onFileUpload}
              onDuplicateFile={onDuplicateFile}
              onMoveNode={onMoveNode}
              onPasteClipboard={onPasteClipboard}
              onPasteImageFile={onPasteImageFile}
            />
          )}

          {activeTab === 'search' && (
            <GlobalSearch
              files={files}
              currentTheme={currentTheme}
              onOpenMatch={onOpenMatch}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsPanel
              currentTheme={currentTheme}
              onThemeChange={onThemeChange}
              settings={settings}
              onUpdateSettings={onUpdateSettings}
              totalNotes={totalNotes}
              totalFolders={totalFolders}
              totalSizeFormatted={totalSizeFormatted}
              onExportZip={onExportZip}
              onResetWorkspace={onResetWorkspace}
            />
          )}

          {activeTab === 'info' && (
            <div className="flex flex-col h-full text-xs select-none overflow-y-auto scrollbar-thin">
              <div
                className="px-3 py-2 border-b uppercase tracking-wider font-semibold text-[11px] shrink-0"
                style={{ borderColor: theme.ui.border, color: theme.ui.textHeader }}
              >
                <span>About & Offline Engine</span>
              </div>

              <div className="p-4 flex flex-col gap-4" style={{ color: theme.ui.textMain }}>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-500 flex items-center justify-center">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm" style={{ color: theme.ui.textHeader }}>100% Offline Notes</h4>
                    <p className="text-[11px]" style={{ color: theme.ui.textMuted }}>IndexedDB Local Storage</p>
                  </div>
                </div>

                <p className="text-xs leading-relaxed" style={{ color: theme.ui.textMuted }}>
                  VS Code Notes runs 100% in your browser. All your folders, code snippets, notes, and uploaded images are saved continuously into local IndexedDB storage.
                </p>

                <div
                  className="p-3 rounded border flex flex-col gap-2 text-xs"
                  style={{
                    borderColor: theme.ui.border,
                    backgroundColor: theme.isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.03)',
                  }}
                >
                  <div className="flex items-center gap-2 text-emerald-500 font-medium">
                    <HardDrive size={14} />
                    <span>Zero-Cloud Privacy</span>
                  </div>
                  <p className="text-[11px]" style={{ color: theme.ui.textMuted }}>
                    No accounts or servers required. Your notes remain on your device even after closing or refreshing the tab.
                  </p>
                </div>

                <div className="border-t pt-3 flex flex-col gap-2" style={{ borderColor: theme.ui.border }}>
                  <h5 className="font-medium text-xs" style={{ color: theme.ui.textHeader }}>Key Capabilities</h5>
                  <ul className="list-disc list-inside text-[11px] flex flex-col gap-1" style={{ color: theme.ui.textMuted }}>
                    <li>80+ programming language syntax highlighting</li>
                    <li>Auto-save on every keystroke</li>
                    <li>Max 1MB note limit guards</li>
                    <li>Markdown with live GitHub formatting & images</li>
                    <li>Live sandboxed HTML page preview</li>
                    <li>Workspace full-text search</li>
                    <li>ZIP export & import</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Drag Resize Handle (Desktop only) */}
        {!isMobile && (
          <div
            id="sidebar-drag-handle"
            onMouseDown={onStartResize}
            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 active:bg-blue-600 transition-colors z-30 hidden md:block"
            title="Drag to resize sidebar (double-click to reset)"
          />
        )}
      </aside>
    </>
  );
};
