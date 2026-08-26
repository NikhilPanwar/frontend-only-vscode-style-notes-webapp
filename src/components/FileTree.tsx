import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ChevronRight,
  ChevronDown,
  FilePlus,
  FolderPlus,
  Trash2,
  Edit2,
  Copy,
  Scissors,
  ClipboardPaste,
  Download,
  FolderMinus,
  CornerDownRight,
  ImagePlus,
  ArrowUpRight,
  Check,
} from 'lucide-react';
import { FileNode, ThemeType } from '../types';
import { FileIconComponent } from '../utils/fileIcons';
import { THEMES } from '../utils/themes';
import {
  getFilePath,
  generateRandomImageFilename,
  formatBytes,
  calculateStringSizeBytes,
  isNameTakenInFolder,
  ensureFileExtension,
} from '../utils/storage';

export interface TreeClipboardState {
  action: 'copy' | 'cut';
  nodeId: string;
}

interface FileTreeProps {
  files: Record<string, FileNode>;
  activeFileId: string | null;
  currentTheme: ThemeType;
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
}

export const FileTree: React.FC<FileTreeProps> = ({
  files,
  activeFileId,
  currentTheme,
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
}) => {
  const theme = THEMES[currentTheme];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Selected item in filepane
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(activeFileId);

  // Internal cut/copy clipboard state
  const [clipboard, setClipboard] = useState<TreeClipboardState | null>(null);

  // Drag and Drop state
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragOverTargetId, setDragOverTargetId] = useState<string | null | 'root'>(null);

  // Toast notification for shortcuts / actions
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<any>(null);

  const showToast = (msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => setToastMessage(null), 2200);
  };

  // Creation State
  const [creatingType, setCreatingType] = useState<'file' | 'folder' | null>(null);
  const [creatingParentId, setCreatingParentId] = useState<string | null>(null);
  const [creatingName, setCreatingName] = useState('');

  // Renaming State
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renamingName, setRenamingName] = useState('');

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    nodeId: string | null; // null means clicked on blank area
  } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Keep selection synced with active tab if none selected
  useEffect(() => {
    if (activeFileId && !selectedNodeId) {
      setSelectedNodeId(activeFileId);
    }
  }, [activeFileId]);

  useEffect(() => {
    if ((creatingType || renamingId) && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [creatingType, renamingId]);

  // Dismiss context menu on global click
  useEffect(() => {
    const handleGlobalClick = () => setContextMenu(null);
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  // Determine target folder based on current selection
  const getTargetFolderId = useCallback((): string | null => {
    if (!selectedNodeId) return null;
    const node = files[selectedNodeId];
    if (!node) return null;
    if (node.type === 'folder') return node.id;
    return node.parentId;
  }, [selectedNodeId, files]);

  // Handle Cut
  const handleCut = useCallback((nodeId: string) => {
    const node = files[nodeId];
    if (!node) return;
    setClipboard({ action: 'cut', nodeId });
    showToast(`Cut: "${node.name}" (Ctrl+V to paste)`);
    setContextMenu(null);
  }, [files]);

  // Handle Copy
  const handleCopy = useCallback((nodeId: string) => {
    const node = files[nodeId];
    if (!node) return;
    setClipboard({ action: 'copy', nodeId });
    showToast(`Copied: "${node.name}" (Ctrl+V to paste)`);
    setContextMenu(null);
  }, [files]);

  // Handle Paste
  const handlePaste = useCallback((targetParentId?: string | null) => {
    const destParentId = targetParentId !== undefined ? targetParentId : getTargetFolderId();

    if (clipboard) {
      const srcNode = files[clipboard.nodeId];
      if (srcNode) {
        onPasteClipboard(clipboard, destParentId);
        showToast(`Pasted "${srcNode.name}"`);
        if (clipboard.action === 'cut') {
          setClipboard(null);
        }
      }
    }
    setContextMenu(null);
  }, [clipboard, files, getTargetFolderId, onPasteClipboard]);

  // Handle Pasting Image from OS Clipboard
  const handlePasteImageFromClipboard = useCallback(async (targetParentId?: string | null) => {
    const destParentId = targetParentId !== undefined ? targetParentId : getTargetFolderId();

    try {
      if (navigator.clipboard && navigator.clipboard.read) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          const imageType = item.types.find((t) => t.startsWith('image/'));
          if (imageType) {
            const blob = await item.getType(imageType);
            const filename = generateRandomImageFilename(imageType.split('/')[1] || 'png');
            const reader = new FileReader();
            reader.onload = () => {
              const dataUrl = reader.result as string;
              onPasteImageFile(dataUrl, destParentId, filename);
              showToast(`Pasted image: "${filename}"`);
            };
            reader.readAsDataURL(blob);
            setContextMenu(null);
            return;
          }
        }
      }
    } catch {
      // Fallback handled via onPaste DOM event
    }
  }, [getTargetFolderId, onPasteImageFile]);

  // Intercept DOM paste events inside File Tree
  const handleTreePasteEvent = useCallback((e: React.ClipboardEvent) => {
    const destParentId = getTargetFolderId();
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          e.preventDefault();
          e.stopPropagation();
          const file = items[i].getAsFile();
          if (file) {
            const filename = generateRandomImageFilename('png');
            const reader = new FileReader();
            reader.onload = () => {
              const dataUrl = reader.result as string;
              onPasteImageFile(dataUrl, destParentId, filename);
              showToast(`Pasted image: "${filename}"`);
            };
            reader.readAsDataURL(file);
            return;
          }
        }
      }
    }

    // Otherwise handle internal clipboard paste if available
    if (clipboard) {
      e.preventDefault();
      handlePaste(destParentId);
    }
  }, [clipboard, getTargetFolderId, handlePaste, onPasteImageFile]);

  // Keyboard Shortcuts in filepane
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // If user is currently typing in rename or create input, let it handle
    if (creatingType || renamingId) return;

    const isCmdOrCtrl = e.metaKey || e.ctrlKey;

    // Ctrl+C -> Copy
    if (isCmdOrCtrl && e.key.toLowerCase() === 'c' && !e.shiftKey) {
      if (selectedNodeId && files[selectedNodeId]) {
        e.preventDefault();
        e.stopPropagation();
        handleCopy(selectedNodeId);
      }
    }

    // Ctrl+X -> Cut
    if (isCmdOrCtrl && e.key.toLowerCase() === 'x' && !e.shiftKey) {
      if (selectedNodeId && files[selectedNodeId]) {
        e.preventDefault();
        e.stopPropagation();
        handleCut(selectedNodeId);
      }
    }

    // Ctrl+V -> Paste
    if (isCmdOrCtrl && e.key.toLowerCase() === 'v' && !e.shiftKey) {
      // handled via onPaste DOM event or directly here
      if (clipboard) {
        e.preventDefault();
        e.stopPropagation();
        handlePaste();
      }
    }

    // Delete or Backspace
    if (e.key === 'Delete' && selectedNodeId && files[selectedNodeId]) {
      e.preventDefault();
      onDeleteNode(selectedNodeId);
    }

    // F2 or Enter to rename
    if (e.key === 'F2' && selectedNodeId && files[selectedNodeId]) {
      e.preventDefault();
      handleStartRename(files[selectedNodeId]);
    }

    // Escape to clear selection or clipboard
    if (e.key === 'Escape') {
      if (clipboard?.action === 'cut') {
        setClipboard(null);
        showToast('Cut cancelled');
      }
    }
  };

  const handleStartCreate = (type: 'file' | 'folder', parentId: string | null = null) => {
    setCreatingType(type);
    setCreatingParentId(parentId);
    setCreatingName(type === 'file' ? 'untitled.txt' : 'new_folder');
    // expand parent if it was folder
    if (parentId && files[parentId] && !files[parentId].isExpanded) {
      onToggleFolder(parentId);
    }
  };

  const handleFinishCreate = () => {
    if (!creatingType) return;
    const rawName = creatingName.trim();
    if (rawName) {
      const cleanName = creatingType === 'file' ? ensureFileExtension(rawName) : rawName;
      if (isNameTakenInFolder(cleanName, creatingParentId, files)) {
        showToast(`"${cleanName}" already exists in this folder!`);
        setCreatingType(null);
        setCreatingParentId(null);
        setCreatingName('');
        return;
      }
      if (creatingType === 'file') {
        onCreateFile(cleanName, creatingParentId);
      } else {
        onCreateFolder(cleanName, creatingParentId);
      }
    }
    setCreatingType(null);
    setCreatingParentId(null);
    setCreatingName('');
  };

  const handleStartRename = (node: FileNode) => {
    setRenamingId(node.id);
    setRenamingName(node.name);
    setContextMenu(null);
  };

  const handleFinishRename = () => {
    if (renamingId && renamingName.trim()) {
      const cleanName = renamingName.trim();
      const node = files[renamingId];
      if (node) {
        if (isNameTakenInFolder(cleanName, node.parentId, files, renamingId)) {
          showToast(`A file or folder named "${cleanName}" already exists!`);
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

  const handleDownloadSingleFile = (node: FileNode) => {
    if (node.type !== 'file') return;
    const blob = new Blob([node.content || ''], { type: node.mimeType || 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = node.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Check if target is child/descendant of source (to prevent cyclic drag)
  const isDescendant = (candidateChildId: string, ancestorId: string): boolean => {
    let curr: string | null = candidateChildId;
    while (curr) {
      if (curr === ancestorId) return true;
      curr = files[curr]?.parentId || null;
    }
    return false;
  };

  // Drag and drop event handlers
  const handleDragStart = (e: React.DragEvent, node: FileNode) => {
    e.dataTransfer.setData('application/vscode-node-id', node.id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedNodeId(node.id);
  };

  const handleDragEnd = () => {
    setDraggedNodeId(null);
    setDragOverTargetId(null);
  };

  const handleDragOverNode = (e: React.DragEvent, targetNode: FileNode) => {
    e.preventDefault();
    e.stopPropagation();

    // Check if dragging OS files
    if (e.dataTransfer.types.includes('Files')) {
      e.dataTransfer.dropEffect = 'copy';
      setDragOverTargetId(targetNode.id);
      return;
    }

    if (!draggedNodeId) return;
    if (draggedNodeId === targetNode.id) return;

    // Disallow dragging folder into its own descendants
    if (files[draggedNodeId]?.type === 'folder' && isDescendant(targetNode.id, draggedNodeId)) {
      return;
    }

    e.dataTransfer.dropEffect = 'move';
    setDragOverTargetId(targetNode.id);
  };

  const handleDropOnNode = (e: React.DragEvent, targetNode: FileNode) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTargetId(null);

    // 1. Check if external OS file(s) dropped
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const destParent = targetNode.type === 'folder' ? targetNode.id : targetNode.parentId;
      onFileUpload(e.dataTransfer.files, destParent);
      return;
    }

    // 2. Internal node drag
    const sourceId = e.dataTransfer.getData('application/vscode-node-id') || draggedNodeId;
    if (!sourceId || sourceId === targetNode.id) return;

    // If dropped onto a folder, move inside it
    if (targetNode.type === 'folder') {
      if (!isDescendant(targetNode.id, sourceId)) {
        onMoveNode(sourceId, targetNode.id);
        showToast(`Moved into "${targetNode.name}"`);
        if (!targetNode.isExpanded) {
          onToggleFolder(targetNode.id);
        }
      }
    } else {
      // If dropped onto a file, move next to it (into file's parent folder)
      onMoveNode(sourceId, targetNode.parentId);
      showToast(`Moved to ${targetNode.parentId && files[targetNode.parentId] ? `"${files[targetNode.parentId].name}"` : 'root'}`);
    }
  };

  const handleDragOverRoot = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.dataTransfer.types.includes('Files')) {
      e.dataTransfer.dropEffect = 'copy';
      setDragOverTargetId('root');
      return;
    }

    if (draggedNodeId) {
      e.dataTransfer.dropEffect = 'move';
      setDragOverTargetId('root');
    }
  };

  const handleDropOnRoot = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTargetId(null);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileUpload(e.dataTransfer.files, null);
      return;
    }

    const sourceId = e.dataTransfer.getData('application/vscode-node-id') || draggedNodeId;
    if (sourceId && files[sourceId]) {
      onMoveNode(sourceId, null);
      showToast(`Moved "${files[sourceId].name}" to root`);
    }
  };

  const renderTree = (parentId: string | null = null, depth = 0) => {
    const children = Object.values(files)
      .filter((node) => node.parentId === parentId)
      .sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'folder' ? -1 : 1;
        }
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      });

    return (
      <div className="flex flex-col">
        {/* Creation Input at this level if triggered */}
        {creatingType && creatingParentId === parentId && (
          <div
            className="flex items-center gap-1.5 py-1 px-2 text-xs border border-blue-500 rounded mx-1 my-0.5"
            style={{
              paddingLeft: `${(depth + 1) * 14}px`,
              backgroundColor: theme.ui.inputBg,
              color: theme.ui.textMain,
            }}
          >
            <FileIconComponent
              isFolder={creatingType === 'folder'}
              filename={creatingName}
              size={14}
            />
            <input
              ref={inputRef}
              type="text"
              value={creatingName}
              onChange={(e) => setCreatingName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleFinishCreate();
                if (e.key === 'Escape') setCreatingType(null);
              }}
              onBlur={handleFinishCreate}
              className="flex-1 bg-transparent border-none outline-none text-xs font-sans"
              style={{ color: theme.ui.textMain }}
              autoFocus
            />
          </div>
        )}

        {children.map((node) => {
          const isFolder = node.type === 'folder';
          const isExpanded = isFolder ? !!node.isExpanded : false;
          const isActive = activeFileId === node.id;
          const isSelected = selectedNodeId === node.id;
          const isRenaming = renamingId === node.id;
          const isCut = clipboard?.action === 'cut' && clipboard.nodeId === node.id;
          const isDragTarget = dragOverTargetId === node.id;

          return (
            <div key={node.id} className="flex flex-col select-none">
              {/* Node Row */}
              <div
                id={`tree-node-${node.id}`}
                draggable={!isRenaming}
                onDragStart={(e) => handleDragStart(e, node)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOverNode(e, node)}
                onDragLeave={() => {
                  if (dragOverTargetId === node.id) setDragOverTargetId(null);
                }}
                onDrop={(e) => handleDropOnNode(e, node)}
                className={`group flex items-center justify-between py-1 px-2 text-xs rounded-sm cursor-pointer transition-all ${
                  isCut ? 'opacity-40 border border-dashed border-neutral-500' : ''
                } ${
                  isDragTarget
                    ? 'ring-2 ring-blue-500 bg-blue-500/20 shadow-sm'
                    : isSelected
                    ? 'font-medium'
                    : isActive
                    ? 'font-medium'
                    : ''
                }`}
                style={{
                  paddingLeft: `${depth * 14 + 8}px`,
                  backgroundColor: isDragTarget
                    ? 'rgba(59, 130, 246, 0.25)'
                    : isSelected || isActive
                    ? theme.ui.selection
                    : undefined,
                  color: isActive || isSelected
                    ? (theme.isDark ? '#ffffff' : theme.ui.textHeader)
                    : theme.ui.textMain,
                }}
                onClick={() => {
                  setSelectedNodeId(node.id);
                  if (isFolder) {
                    onToggleFolder(node.id);
                  } else {
                    onOpenFile(node.id);
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSelectedNodeId(node.id);
                  setContextMenu({
                    x: e.clientX,
                    y: e.clientY,
                    nodeId: node.id,
                  });
                }}
              >
                {/* Left: Icon & Name */}
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  {isFolder ? (
                    <span className="shrink-0" style={{ color: theme.ui.textMuted }}>
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </span>
                  ) : (
                    <span className="w-3.5" />
                  )}

                  <FileIconComponent
                    filename={node.name}
                    isFolder={isFolder}
                    isOpen={isExpanded}
                    size={14}
                  />

                  {isRenaming ? (
                    <input
                      ref={inputRef}
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
                    <span className="truncate text-xs">{node.name}</span>
                  )}
                </div>

                {/* Right: Quick action buttons on hover */}
                {!isRenaming && (
                  <div
                    className="hidden group-hover:flex items-center gap-0.5 shrink-0 ml-1"
                    style={{ color: theme.ui.textMuted }}
                  >
                    {isFolder && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartCreate('file', node.id);
                          }}
                          className="p-0.5 hover:text-blue-500 rounded hover:bg-black/5 dark:hover:bg-white/10"
                          title="New Note inside folder"
                        >
                          <FilePlus size={13} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartCreate('folder', node.id);
                          }}
                          className="p-0.5 hover:text-blue-500 rounded hover:bg-black/5 dark:hover:bg-white/10"
                          title="New Folder inside folder"
                        >
                          <FolderPlus size={13} />
                        </button>
                      </>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCut(node.id);
                      }}
                      className="p-0.5 hover:text-blue-500 rounded hover:bg-black/5 dark:hover:bg-white/10"
                      title="Cut (Ctrl+X)"
                    >
                      <Scissors size={12} />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(node.id);
                      }}
                      className="p-0.5 hover:text-blue-500 rounded hover:bg-black/5 dark:hover:bg-white/10"
                      title="Copy (Ctrl+C)"
                    >
                      <Copy size={12} />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartRename(node);
                      }}
                      className="p-0.5 hover:text-blue-500 rounded hover:bg-black/5 dark:hover:bg-white/10"
                      title="Rename (F2)"
                    >
                      <Edit2 size={12} />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteNode(node.id);
                      }}
                      className="p-0.5 hover:text-red-500 rounded hover:bg-black/5 dark:hover:bg-white/10"
                      title="Delete"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </div>

              {/* Sub-tree recursion */}
              {isFolder && isExpanded && renderTree(node.id, depth + 1)}
            </div>
          );
        })}
      </div>
    );
  };

  const selectedNode = selectedNodeId ? files[selectedNodeId] : null;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onPaste={handleTreePasteEvent}
      className="flex flex-col h-full select-none text-xs outline-none focus:ring-0 relative"
      onContextMenu={(e) => {
        // If right clicked on empty background
        if ((e.target as HTMLElement).closest('[id^="tree-node-"]')) return;
        e.preventDefault();
        setContextMenu({
          x: e.clientX,
          y: e.clientY,
          nodeId: null,
        });
      }}
    >
      {/* Toast Notification Banner for shortcuts */}
      {toastMessage && (
        <div className="absolute top-9 left-2 right-2 z-40 bg-neutral-900/90 text-white text-[11px] px-2.5 py-1.5 rounded shadow-lg border border-neutral-700 flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
          <Check size={12} className="text-emerald-400 shrink-0" />
          <span className="truncate">{toastMessage}</span>
        </div>
      )}

      {/* Header Bar with Quick Action Icons */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b uppercase tracking-wider font-semibold text-[11px] shrink-0"
        style={{
          borderColor: theme.ui.border,
          color: theme.ui.textHeader,
        }}
      >
        <span className="truncate">Explorer : Notes</span>
        <div className="flex items-center gap-1" style={{ color: theme.ui.textMuted }}>
          <button
            id="explorer-btn-new-file"
            onClick={() => handleStartCreate('file', null)}
            className="p-1 hover:text-blue-500 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            title="New File in Root (Ctrl+N)"
          >
            <FilePlus size={14} />
          </button>
          <button
            id="explorer-btn-new-folder"
            onClick={() => handleStartCreate('folder', null)}
            className="p-1 hover:text-blue-500 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            title="New Folder in Root"
          >
            <FolderPlus size={14} />
          </button>
          <button
            id="explorer-btn-upload"
            onClick={() => fileInputRef.current?.click()}
            className="p-1 hover:text-blue-500 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            title="Upload Files or Images"
          >
            <ImagePlus size={14} />
          </button>
          <button
            id="explorer-btn-collapse-all"
            onClick={onCollapseAll}
            className="p-1 hover:text-blue-500 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            title="Collapse All Folders"
          >
            <FolderMinus size={14} />
          </button>
        </div>
      </div>

      {/* Hidden File Input for uploading files */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onFileUpload(e.target.files, getTargetFolderId());
            e.target.value = '';
          }
        }}
      />

      {/* Main Tree List */}
      <div
        className="flex-1 overflow-y-auto py-1 scrollbar-thin flex flex-col"
        onDragOver={handleDragOverRoot}
        onDrop={handleDropOnRoot}
      >
        {renderTree(null, 0)}

        {/* Empty Root Drop Area */}
        <div
          onDragOver={handleDragOverRoot}
          onDrop={handleDropOnRoot}
          onClick={() => setSelectedNodeId(null)}
          className={`flex-1 min-h-[60px] m-1 rounded transition-colors flex items-center justify-center text-[11px] ${
            dragOverTargetId === 'root'
              ? 'border-2 border-dashed border-blue-500 bg-blue-500/10 text-blue-300 font-medium'
              : 'border border-transparent'
          }`}
        >
          {dragOverTargetId === 'root' && <span>Drop to move to Root Workspace</span>}
        </div>
      </div>

      {/* Footer shortcut tips */}
      <div
        className="px-3 py-1.5 border-t text-[10px] text-neutral-500 flex items-center justify-between shrink-0"
        style={{ borderColor: theme.ui.border }}
      >
        <span className="truncate">Drag & drop to move files</span>
        <span className="font-mono text-[9px] text-neutral-400">Ctrl+C / Ctrl+V</span>
      </div>

      {/* Context Menu Popup */}
      {contextMenu && (
        <div
          id="tree-context-menu"
          className="fixed z-50 py-1 rounded shadow-xl border text-xs flex flex-col min-w-[190px] animate-in fade-in zoom-in-95 duration-100"
          style={{
            top: contextMenu.y,
            left: contextMenu.x,
            backgroundColor: theme.ui.modalBg,
            borderColor: theme.ui.border,
            color: theme.ui.textMain,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Target is a Folder */}
          {contextMenu.nodeId && files[contextMenu.nodeId]?.type === 'folder' && (
            <>
              <button
                onClick={() => {
                  handleStartCreate('file', contextMenu.nodeId);
                  setContextMenu(null);
                }}
                className="flex items-center gap-2 px-3 py-1.5 text-left hover:bg-blue-600 hover:text-white transition-colors"
              >
                <FilePlus size={13} />
                <span>New File inside</span>
              </button>
              <button
                onClick={() => {
                  handleStartCreate('folder', contextMenu.nodeId);
                  setContextMenu(null);
                }}
                className="flex items-center gap-2 px-3 py-1.5 text-left hover:bg-blue-600 hover:text-white transition-colors"
              >
                <FolderPlus size={13} />
                <span>New Folder inside</span>
              </button>
              <div className="my-1 border-t" style={{ borderColor: theme.ui.border }} />
            </>
          )}

          {/* Cut & Copy */}
          {contextMenu.nodeId && files[contextMenu.nodeId] && (
            <>
              <button
                onClick={() => handleCut(contextMenu.nodeId!)}
                className="flex items-center justify-between px-3 py-1.5 text-left hover:bg-blue-600 hover:text-white transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Scissors size={13} />
                  <span>Cut</span>
                </div>
                <span className="text-[10px] opacity-60">Ctrl+X</span>
              </button>

              <button
                onClick={() => handleCopy(contextMenu.nodeId!)}
                className="flex items-center justify-between px-3 py-1.5 text-left hover:bg-blue-600 hover:text-white transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Copy size={13} />
                  <span>Copy</span>
                </div>
                <span className="text-[10px] opacity-60">Ctrl+C</span>
              </button>
            </>
          )}

          {/* Paste */}
          <button
            disabled={!clipboard}
            onClick={() => handlePaste(contextMenu.nodeId ? (files[contextMenu.nodeId]?.type === 'folder' ? contextMenu.nodeId : files[contextMenu.nodeId]?.parentId) : null)}
            className={`flex items-center justify-between px-3 py-1.5 text-left transition-colors ${
              clipboard ? 'hover:bg-blue-600 hover:text-white' : 'opacity-40 cursor-not-allowed'
            }`}
          >
            <div className="flex items-center gap-2">
              <ClipboardPaste size={13} />
              <span>Paste {clipboard ? `(${clipboard.action})` : ''}</span>
            </div>
            <span className="text-[10px] opacity-60">Ctrl+V</span>
          </button>

          {/* Paste Image from Clipboard */}
          <button
            onClick={() => handlePasteImageFromClipboard(contextMenu.nodeId ? (files[contextMenu.nodeId]?.type === 'folder' ? contextMenu.nodeId : files[contextMenu.nodeId]?.parentId) : null)}
            className="flex items-center gap-2 px-3 py-1.5 text-left hover:bg-blue-600 hover:text-white transition-colors"
          >
            <ImagePlus size={13} />
            <span>Paste Image from Clipboard</span>
          </button>

          <div className="my-1 border-t" style={{ borderColor: theme.ui.border }} />

          {/* Target is a File */}
          {contextMenu.nodeId && files[contextMenu.nodeId]?.type === 'file' && (
            <>
              <button
                onClick={() => {
                  onDuplicateFile(contextMenu.nodeId!);
                  setContextMenu(null);
                }}
                className="flex items-center gap-2 px-3 py-1.5 text-left hover:bg-blue-600 hover:text-white transition-colors"
              >
                <Copy size={13} />
                <span>Duplicate</span>
              </button>
              <button
                onClick={() => {
                  handleDownloadSingleFile(files[contextMenu.nodeId!]);
                  setContextMenu(null);
                }}
                className="flex items-center gap-2 px-3 py-1.5 text-left hover:bg-blue-600 hover:text-white transition-colors"
              >
                <Download size={13} />
                <span>Download File</span>
              </button>
              <div className="my-1 border-t" style={{ borderColor: theme.ui.border }} />
            </>
          )}

          {/* Move to Root option if item is currently in a folder */}
          {contextMenu.nodeId && files[contextMenu.nodeId]?.parentId && (
            <button
              onClick={() => {
                onMoveNode(contextMenu.nodeId!, null);
                showToast(`Moved "${files[contextMenu.nodeId!].name}" to root`);
                setContextMenu(null);
              }}
              className="flex items-center gap-2 px-3 py-1.5 text-left hover:bg-blue-600 hover:text-white transition-colors"
            >
              <ArrowUpRight size={13} />
              <span>Move Out to Root</span>
            </button>
          )}

          {contextMenu.nodeId && files[contextMenu.nodeId] && (
            <>
              <button
                onClick={() => {
                  const path = getFilePath(contextMenu.nodeId!, files);
                  navigator.clipboard.writeText(path);
                  showToast('Path copied to clipboard');
                  setContextMenu(null);
                }}
                className="flex items-center gap-2 px-3 py-1.5 text-left hover:bg-blue-600 hover:text-white transition-colors"
              >
                <CornerDownRight size={13} />
                <span>Copy Path</span>
              </button>

              <button
                onClick={() => {
                  handleStartRename(files[contextMenu.nodeId!]);
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
                  onDeleteNode(contextMenu.nodeId!);
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

          {!contextMenu.nodeId && (
            <>
              <button
                onClick={() => {
                  handleStartCreate('file', null);
                  setContextMenu(null);
                }}
                className="flex items-center gap-2 px-3 py-1.5 text-left hover:bg-blue-600 hover:text-white transition-colors"
              >
                <FilePlus size={13} />
                <span>New File in Root</span>
              </button>
              <button
                onClick={() => {
                  handleStartCreate('folder', null);
                  setContextMenu(null);
                }}
                className="flex items-center gap-2 px-3 py-1.5 text-left hover:bg-blue-600 hover:text-white transition-colors"
              >
                <FolderPlus size={13} />
                <span>New Folder in Root</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
