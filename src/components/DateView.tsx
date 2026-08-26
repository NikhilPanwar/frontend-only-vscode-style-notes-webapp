import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  Clock,
  Search,
  X,
  FilePlus,
  PenTool,
  Copy,
  Scissors,
  Edit2,
  Trash2,
  Download,
  CornerDownRight,
  FolderMinus,
  FolderPlus,
  Folder,
  Layers,
  ArrowDownUp,
  Check,
} from 'lucide-react';
import { FileNode, ThemeType } from '../types';
import { THEMES } from '../utils/themes';
import { FileIconComponent } from '../utils/fileIcons';
import { getDateGroupInfo, formatTime, formatFullDate } from '../utils/dateUtils';
import {
  formatBytes,
  getFilePath,
  isNameTakenInFolder,
} from '../utils/storage';
import { TreeClipboardState } from './FileTree';

interface DateViewProps {
  files: Record<string, FileNode>;
  activeFileId: string | null;
  currentTheme: ThemeType;
  clipboard: TreeClipboardState | null;
  onOpenFile: (fileId: string) => void;
  onRenameNode: (id: string, newName: string) => void;
  onDeleteNode: (id: string) => void;
  onDuplicateFile: (fileId: string) => void;
  onCut: (nodeId: string) => void;
  onCopy: (nodeId: string) => void;
  onStartCreateFile: (parentId: string | null) => void;
  onStartCreateDiagram: (parentId: string | null) => void;
}

export const DateView: React.FC<DateViewProps> = ({
  files,
  activeFileId,
  currentTheme,
  clipboard,
  onOpenFile,
  onRenameNode,
  onDeleteNode,
  onDuplicateFile,
  onCut,
  onCopy,
  onStartCreateFile,
  onStartCreateDiagram,
}) => {
  const theme = THEMES[currentTheme];

  // Group by: 'updated' (Modified Date) or 'created' (Creation Date)
  const [dateField, setDateField] = useState<'updated' | 'created'>('updated');
  // Sort direction: 'desc' (Newest first) or 'asc' (Oldest first)
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  // Search query filter
  const [searchFilter, setSearchFilter] = useState('');
  // Collapsed date groups
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Selected file item
  const [selectedFileId, setSelectedFileId] = useState<string | null>(activeFileId);

  // Renaming state
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renamingName, setRenamingName] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    fileId: string;
  } | null>(null);

  // Toast message
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<any>(null);

  const showToast = (msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => setToastMessage(null), 2000);
  };

  // Sync selected file with active file
  useEffect(() => {
    if (activeFileId) {
      setSelectedFileId(activeFileId);
    }
  }, [activeFileId]);

  // Focus rename input
  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  // Dismiss context menu on window click
  useEffect(() => {
    const handleGlobalClick = () => setContextMenu(null);
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  // Filter and group files by date
  const groupedDates = useMemo(() => {
    const allFiles = Object.values(files).filter((node) => node.type === 'file');

    // Filter by search query if any
    const filtered = searchFilter.trim()
      ? allFiles.filter((f) => f.name.toLowerCase().includes(searchFilter.toLowerCase().trim()))
      : allFiles;

    // Grouping map
    const groups: Record<
      string,
      {
        key: string;
        label: string;
        relativeLabel?: string;
        timestamp: number;
        items: FileNode[];
      }
    > = {};

    filtered.forEach((file) => {
      const ts = dateField === 'created' ? file.createdAt || file.updatedAt : file.updatedAt || file.createdAt;
      const groupInfo = getDateGroupInfo(ts);

      if (!groups[groupInfo.key]) {
        groups[groupInfo.key] = {
          key: groupInfo.key,
          label: groupInfo.label,
          relativeLabel: groupInfo.relativeLabel,
          timestamp: ts,
          items: [],
        };
      }
      groups[groupInfo.key].items.push(file);
    });

    // Sort files within each group by timestamp descending
    Object.values(groups).forEach((g) => {
      g.items.sort((a, b) => {
        const aTime = dateField === 'created' ? a.createdAt || a.updatedAt : a.updatedAt || a.createdAt;
        const bTime = dateField === 'created' ? b.createdAt || b.updatedAt : b.updatedAt || b.createdAt;
        return bTime - aTime;
      });
    });

    // Convert to sorted array
    const sortedGroups = Object.values(groups).sort((a, b) => {
      const cmp = a.key.localeCompare(b.key);
      return sortOrder === 'desc' ? -cmp : cmp;
    });

    return sortedGroups;
  }, [files, dateField, sortOrder, searchFilter]);

  const totalFilesCount = useMemo(() => {
    return Object.values(files).filter((n) => n.type === 'file').length;
  }, [files]);

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleCollapseAll = () => {
    const newCollapsed: Record<string, boolean> = {};
    groupedDates.forEach((g) => {
      newCollapsed[g.key] = true;
    });
    setCollapsedGroups(newCollapsed);
  };

  const handleExpandAll = () => {
    setCollapsedGroups({});
  };

  const handleStartRename = (file: FileNode) => {
    setRenamingId(file.id);
    setRenamingName(file.name);
    setContextMenu(null);
  };

  const handleFinishRename = () => {
    if (renamingId && renamingName.trim()) {
      const cleanName = renamingName.trim();
      const node = files[renamingId];
      if (node) {
        if (isNameTakenInFolder(cleanName, node.parentId, files, renamingId)) {
          showToast(`"${cleanName}" already exists in this folder!`);
          setRenamingId(null);
          setRenamingName('');
          return;
        }
        onRenameNode(renamingId, cleanName);
      }
    }
    setRenamingId(null);
    setRenamingName('');
  };

  const handleDownloadFile = (node: FileNode) => {
    if (node.type !== 'file') return;
    const blob = new Blob([node.content || ''], { type: node.mimeType || 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = node.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getParentFolderName = (parentId: string | null): string | null => {
    if (!parentId) return null;
    return files[parentId]?.name || null;
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (renamingId) return;
    const isCmdOrCtrl = e.metaKey || e.ctrlKey;

    if (isCmdOrCtrl && e.key.toLowerCase() === 'c') {
      if (selectedFileId && files[selectedFileId]) {
        e.preventDefault();
        onCopy(selectedFileId);
      }
    } else if (isCmdOrCtrl && e.key.toLowerCase() === 'x') {
      if (selectedFileId && files[selectedFileId]) {
        e.preventDefault();
        onCut(selectedFileId);
      }
    } else if (e.key === 'F2' && selectedFileId && files[selectedFileId]) {
      e.preventDefault();
      handleStartRename(files[selectedFileId]);
    } else if (e.key === 'Delete' && selectedFileId && files[selectedFileId]) {
      e.preventDefault();
      onDeleteNode(selectedFileId);
    } else if (e.key === 'Enter' && selectedFileId && files[selectedFileId]) {
      e.preventDefault();
      onOpenFile(selectedFileId);
    }
  };

  return (
    <div
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="flex flex-col h-full select-none text-xs outline-none focus:ring-0 relative"
    >
      {/* Toast Alert */}
      {toastMessage && (
        <div className="absolute top-10 left-2 right-2 z-40 bg-neutral-900/90 text-white text-[11px] px-2.5 py-1.5 rounded shadow-lg border border-neutral-700 flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
          <Check size={12} className="text-emerald-400 shrink-0" />
          <span className="truncate">{toastMessage}</span>
        </div>
      )}

      {/* Control & Filter Sub-Bar */}
      <div
        className="px-2.5 py-2 border-b flex flex-col gap-2 shrink-0"
        style={{
          borderColor: theme.ui.border,
          backgroundColor: theme.isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)',
        }}
      >
        {/* Search input in date view */}
        <div
          className="flex items-center gap-1.5 px-2 py-1 rounded border text-xs transition-colors"
          style={{
            backgroundColor: theme.ui.inputBg,
            borderColor: theme.ui.border,
            color: theme.ui.textMain,
          }}
        >
          <Search size={12} className="opacity-70 shrink-0" style={{ color: theme.ui.textMain }} />
          <input
            id="date-view-search-input"
            type="text"
            placeholder="Filter files by name..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-xs min-w-0"
            style={{ color: theme.ui.textMain }}
          />
          {searchFilter && (
            <button
              onClick={() => setSearchFilter('')}
              className="opacity-70 hover:opacity-100 transition-opacity"
              title="Clear search"
              style={{ color: theme.ui.textMain }}
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Date Field & Sort Controls */}
        <div className="flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className="text-[10px] uppercase font-bold tracking-wider shrink-0"
              style={{ color: theme.isDark ? '#a1a1aa' : '#4b5563' }}
            >
              Group:
            </span>
            <div
              className="inline-flex rounded p-0.5 border"
              style={{
                backgroundColor: theme.isDark ? 'rgba(0,0,0,0.4)' : '#e5e7eb',
                borderColor: theme.ui.border,
              }}
            >
              <button
                id="date-view-group-updated"
                onClick={() => setDateField('updated')}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                  dateField === 'updated'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'hover:opacity-100 opacity-80'
                }`}
                style={{
                  color:
                    dateField === 'updated'
                      ? '#ffffff'
                      : theme.isDark
                      ? '#d4d4d8'
                      : '#1f2937',
                }}
                title="Group by Last Modified Date"
              >
                Modified
              </button>
              <button
                id="date-view-group-created"
                onClick={() => setDateField('created')}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                  dateField === 'created'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'hover:opacity-100 opacity-80'
                }`}
                style={{
                  color:
                    dateField === 'created'
                      ? '#ffffff'
                      : theme.isDark
                      ? '#d4d4d8'
                      : '#1f2937',
                }}
                title="Group by Creation Date"
              >
                Created
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Sort direction */}
            <button
              id="date-view-sort-direction-btn"
              onClick={() => setSortOrder((o) => (o === 'desc' ? 'asc' : 'desc'))}
              className="p-1 rounded border transition-colors flex items-center justify-center shadow-2xs hover:border-blue-500 hover:text-blue-500"
              style={{
                backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
                borderColor: theme.ui.border,
                color: theme.isDark ? '#e4e4e7' : '#1f2937',
              }}
              title={sortOrder === 'desc' ? 'Newest dates first (click for oldest)' : 'Oldest dates first (click for newest)'}
            >
              <ArrowDownUp size={12} />
            </button>

            {/* Expand / Collapse All */}
            <button
              id="date-view-collapse-expand-btn"
              onClick={Object.keys(collapsedGroups).length > 0 ? handleExpandAll : handleCollapseAll}
              className="p-1 rounded border transition-colors flex items-center justify-center shadow-2xs hover:border-blue-500 hover:text-blue-500"
              style={{
                backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
                borderColor: theme.ui.border,
                color: theme.isDark ? '#e4e4e7' : '#1f2937',
              }}
              title={Object.keys(collapsedGroups).length > 0 ? 'Expand All Dates' : 'Collapse All Dates'}
            >
              {Object.keys(collapsedGroups).length > 0 ? <FolderPlus size={12} /> : <FolderMinus size={12} />}
            </button>
          </div>
        </div>
      </div>

      {/* Date Groups List */}
      <div className="flex-1 overflow-y-auto py-1 scrollbar-thin flex flex-col">
        {groupedDates.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-6 text-center text-xs opacity-75 flex-1">
            <Calendar size={28} className="mb-2 opacity-60 text-blue-500" />
            <p className="font-semibold" style={{ color: theme.ui.textHeader }}>No files match criteria</p>
            <p className="text-[11px] mt-1" style={{ color: theme.ui.textMuted }}>
              {searchFilter ? 'Try clearing the search filter' : 'Create notes to see date timeline'}
            </p>
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={() => onStartCreateFile(null)}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-blue-600 text-white text-[11px] font-medium shadow-xs"
              >
                <FilePlus size={12} />
                <span>New Note</span>
              </button>
              <button
                onClick={() => onStartCreateDiagram(null)}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-violet-600 text-white text-[11px] font-medium shadow-xs"
              >
                <PenTool size={12} />
                <span>New Diagram</span>
              </button>
            </div>
          </div>
        ) : (
          groupedDates.map((group) => {
            const isCollapsed = !!collapsedGroups[group.key];

            return (
              <div key={group.key} className="flex flex-col mb-1.5">
                {/* Date Header: e.g. "22 Aug" */}
                <div
                  id={`date-group-header-${group.key}`}
                  onClick={() => toggleGroup(group.key)}
                  className="flex items-center justify-between px-3 py-1.5 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors sticky top-0 z-10 select-none backdrop-blur-sm shadow-2xs"
                  style={{
                    backgroundColor: theme.isDark ? '#252526' : '#f0f0f2',
                    borderBottom: `1px solid ${theme.ui.border}`,
                    borderTop: `1px solid ${theme.ui.border}`,
                  }}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="shrink-0" style={{ color: theme.isDark ? '#a1a1aa' : '#4b5563' }}>
                      {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                    </span>
                    <Calendar size={13} className="text-blue-600 dark:text-blue-400 shrink-0" />
                    {/* Primary Date Label (e.g., "22 Aug") */}
                    <span
                      className="font-bold text-xs tracking-tight truncate"
                      style={{ color: theme.isDark ? '#f4f4f5' : '#111827' }}
                    >
                      {group.label}
                    </span>

                    {/* Relative Badge (Today / Yesterday) */}
                    {group.relativeLabel && (
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider shrink-0 border"
                        style={{
                          backgroundColor:
                            group.relativeLabel === 'Today'
                              ? theme.isDark ? 'rgba(16, 185, 129, 0.2)' : '#d1fae5'
                              : theme.isDark ? 'rgba(59, 130, 246, 0.2)' : '#dbeafe',
                          borderColor:
                            group.relativeLabel === 'Today'
                              ? theme.isDark ? 'rgba(16, 185, 129, 0.4)' : '#6ee7b7'
                              : theme.isDark ? 'rgba(59, 130, 246, 0.4)' : '#93c5fd',
                          color:
                            group.relativeLabel === 'Today'
                              ? theme.isDark ? '#34d399' : '#065f46'
                              : theme.isDark ? '#60a5fa' : '#1e40af',
                        }}
                      >
                        {group.relativeLabel}
                      </span>
                    )}
                  </div>

                  {/* File Count Badge - High Contrast in all light/dark themes */}
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 border transition-colors shadow-2xs"
                    style={{
                      backgroundColor: theme.isDark ? '#333333' : '#ffffff',
                      borderColor: theme.isDark ? '#444444' : '#d1d5db',
                      color: theme.isDark ? '#e4e4e7' : '#1f2937',
                    }}
                  >
                    {group.items.length} {group.items.length === 1 ? 'file' : 'files'}
                  </span>
                </div>

                {/* File Items for this Date Group */}
                {!isCollapsed && (
                  <div className="flex flex-col py-0.5">
                    {group.items.map((file) => {
                      const isActive = activeFileId === file.id;
                      const isSelected = selectedFileId === file.id;
                      const isRenaming = renamingId === file.id;
                      const isCut = clipboard?.action === 'cut' && clipboard.nodeId === file.id;
                      const parentFolderName = getParentFolderName(file.parentId);
                      const fileTs =
                        dateField === 'created' ? file.createdAt || file.updatedAt : file.updatedAt || file.createdAt;

                      return (
                        <div
                          key={file.id}
                          id={`date-file-item-${file.id}`}
                          onClick={() => {
                            setSelectedFileId(file.id);
                            onOpenFile(file.id);
                          }}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedFileId(file.id);
                            setContextMenu({
                              x: e.clientX,
                              y: e.clientY,
                              fileId: file.id,
                            });
                          }}
                          className={`group flex items-center justify-between py-1.5 px-3.5 text-xs rounded-sm cursor-pointer transition-all ${
                            isCut ? 'opacity-40 border border-dashed border-neutral-500' : ''
                          } ${
                            isSelected || isActive ? 'font-medium' : ''
                          }`}
                          style={{
                            backgroundColor:
                              isSelected || isActive ? theme.ui.selection : undefined,
                            color:
                              isActive || isSelected
                                ? theme.isDark
                                  ? '#ffffff'
                                  : theme.ui.textHeader
                                : theme.ui.textMain,
                          }}
                          title={`Last modified: ${formatFullDate(file.updatedAt || file.createdAt)}\nPath: ${getFilePath(file.id, files)}`}
                        >
                          {/* File Left details */}
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <FileIconComponent filename={file.name} isFolder={false} size={14} />

                            {isRenaming ? (
                              <input
                                ref={renameInputRef}
                                type="text"
                                value={renamingName}
                                onChange={(e) => setRenamingName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleFinishRename();
                                  if (e.key === 'Escape') setRenamingId(null);
                                }}
                                onBlur={handleFinishRename}
                                onClick={(e) => e.stopPropagation()}
                                className="flex-1 border border-blue-500 rounded px-1 outline-none text-xs"
                                style={{
                                  backgroundColor: theme.ui.inputBg,
                                  color: theme.ui.textMain,
                                }}
                                autoFocus
                              />
                            ) : (
                              <div className="flex flex-col min-w-0 flex-1">
                                <span className="truncate text-xs leading-snug font-normal">{file.name}</span>
                                <div
                                  className="flex items-center gap-1.5 text-[10px] leading-none mt-0.5"
                                  style={{ color: theme.isDark ? '#a1a1aa' : '#6b7280' }}
                                >
                                  <span className="flex items-center gap-0.5">
                                    <Clock size={9} />
                                    {formatTime(fileTs)}
                                  </span>
                                  {parentFolderName && (
                                    <>
                                      <span>•</span>
                                      <span className="truncate flex items-center gap-0.5">
                                        <Folder size={9} />
                                        {parentFolderName}/
                                      </span>
                                    </>
                                  )}
                                  <span>•</span>
                                  <span>{formatBytes(file.size || 0)}</span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Quick action buttons on hover */}
                          {!isRenaming && (
                            <div
                              className="hidden group-hover:flex items-center gap-0.5 shrink-0 ml-1.5"
                              style={{ color: theme.isDark ? '#e4e4e7' : '#374151' }}
                            >
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onCut(file.id);
                                }}
                                className="p-1 hover:text-blue-500 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                                title="Cut (Ctrl+X)"
                              >
                                <Scissors size={11} />
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onCopy(file.id);
                                }}
                                className="p-1 hover:text-blue-500 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                                title="Copy (Ctrl+C)"
                              >
                                <Copy size={11} />
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartRename(file);
                                }}
                                className="p-1 hover:text-blue-500 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                                title="Rename (F2)"
                              >
                                <Edit2 size={11} />
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteNode(file.id);
                                }}
                                className="p-1 hover:text-red-500 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Date View Footer Summary */}
      <div
        className="px-3 py-1.5 border-t text-[10px] text-neutral-500 flex items-center justify-between shrink-0"
        style={{ borderColor: theme.ui.border }}
      >
        <span className="truncate">
          {groupedDates.length} date {groupedDates.length === 1 ? 'group' : 'groups'} • {totalFilesCount} total {totalFilesCount === 1 ? 'file' : 'files'}
        </span>
        <span className="font-mono text-[9px] text-neutral-400">Date View</span>
      </div>

      {/* Context Menu for Date View Items */}
      {contextMenu && (
        <div
          id="date-view-context-menu"
          className="fixed z-50 py-1 rounded shadow-xl border text-xs flex flex-col min-w-[180px] animate-in fade-in zoom-in-95 duration-100"
          style={{
            top: contextMenu.y,
            left: contextMenu.x,
            backgroundColor: theme.ui.modalBg,
            borderColor: theme.ui.border,
            color: theme.ui.textMain,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {files[contextMenu.fileId] && (
            <>
              <button
                onClick={() => {
                  onOpenFile(contextMenu.fileId);
                  setContextMenu(null);
                }}
                className="flex items-center gap-2 px-3 py-1.5 text-left hover:bg-blue-600 hover:text-white transition-colors"
              >
                <Layers size={13} />
                <span>Open File</span>
              </button>

              <button
                onClick={() => {
                  onDuplicateFile(contextMenu.fileId);
                  setContextMenu(null);
                }}
                className="flex items-center gap-2 px-3 py-1.5 text-left hover:bg-blue-600 hover:text-white transition-colors"
              >
                <Copy size={13} />
                <span>Duplicate</span>
              </button>

              <button
                onClick={() => {
                  handleDownloadFile(files[contextMenu.fileId]);
                  setContextMenu(null);
                }}
                className="flex items-center gap-2 px-3 py-1.5 text-left hover:bg-blue-600 hover:text-white transition-colors"
              >
                <Download size={13} />
                <span>Download File</span>
              </button>

              <button
                onClick={() => {
                  const path = getFilePath(contextMenu.fileId, files);
                  navigator.clipboard.writeText(path);
                  showToast('Path copied to clipboard');
                  setContextMenu(null);
                }}
                className="flex items-center gap-2 px-3 py-1.5 text-left hover:bg-blue-600 hover:text-white transition-colors"
              >
                <CornerDownRight size={13} />
                <span>Copy Path</span>
              </button>

              <div className="my-1 border-t" style={{ borderColor: theme.ui.border }} />

              <button
                onClick={() => {
                  onCut(contextMenu.fileId);
                  setContextMenu(null);
                }}
                className="flex items-center justify-between px-3 py-1.5 text-left hover:bg-blue-600 hover:text-white transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Scissors size={13} />
                  <span>Cut</span>
                </div>
                <span className="text-[10px] opacity-60">Ctrl+X</span>
              </button>

              <button
                onClick={() => {
                  onCopy(contextMenu.fileId);
                  setContextMenu(null);
                }}
                className="flex items-center justify-between px-3 py-1.5 text-left hover:bg-blue-600 hover:text-white transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Copy size={13} />
                  <span>Copy</span>
                </div>
                <span className="text-[10px] opacity-60">Ctrl+C</span>
              </button>

              <button
                onClick={() => {
                  handleStartRename(files[contextMenu.fileId]);
                }}
                className="flex items-center justify-between px-3 py-1.5 text-left hover:bg-blue-600 hover:text-white transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Edit2 size={13} />
                  <span>Rename</span>
                </div>
                <span className="text-[10px] opacity-60">F2</span>
              </button>

              <button
                onClick={() => {
                  onDeleteNode(contextMenu.fileId);
                  setContextMenu(null);
                }}
                className="flex items-center justify-between px-3 py-1.5 text-left text-red-400 hover:bg-red-600 hover:text-white transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Trash2 size={13} />
                  <span>Delete</span>
                </div>
                <span className="text-[10px] opacity-60">Del</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
