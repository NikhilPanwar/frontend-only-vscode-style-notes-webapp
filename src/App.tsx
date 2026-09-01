import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  FileNode,
  Workspace,
  ThemeType,
  EditorSettings,
  ActiveSidebarTab,
  CursorPosition,
  MAX_NOTE_SIZE_BYTES,
} from './types';
import {
  loadWorkspace,
  saveWorkspace,
  createDefaultWorkspace,
  generateId,
  calculateStringSizeBytes,
  getWorkspaceStats,
  exportWorkspaceToZip,
  readFileAsNode,
  formatBytes,
  generateRandomImageFilename,
  duplicateNodeRecursively,
  getUniqueNameInFolder,
  isNameTakenInFolder,
  ensureFileExtension,
} from './utils/storage';
import { TreeClipboardState } from './components/FileTree';
import { THEMES } from './utils/themes';
import { detectLanguageByFilename, isMarkdownFile, isHtmlFile, isImageFile, isExcalidrawFile, isKanbanFile } from './utils/languageDetector';
import { EMPTY_EXCALIDRAW_DATA } from './utils/excalidrawTemplates';
import { createEmptyKanbanBoard, serializeKanbanData } from './utils/kanbanUtils';
import { TitleBar } from './components/TitleBar';
import { ActivityBar } from './components/ActivityBar';
import { Sidebar } from './components/Sidebar';
import { TabsBar } from './components/TabsBar';
import { EditorArea } from './components/EditorArea';
import { StatusBar } from './components/StatusBar';
import { QuickOpenModal } from './components/QuickOpenModal';
import { CommandPaletteModal, CommandItem } from './components/CommandPaletteModal';
import { LanguageSelectorModal } from './components/LanguageSelectorModal';
import { ImageUploadModal } from './components/ImageUploadModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { ResetConfirmModal } from './components/ResetConfirmModal';
import {
  FilePlus,
  FolderPlus,
  PenTool,
  Kanban,
  WrapText,
  Palette,
  Download,
  Search,
  PanelLeft,
  ImagePlus,
  Columns2,
  X,
  Code,
  RotateCcw,
} from 'lucide-react';

const SETTINGS_STORAGE_KEY = 'vscode_notes_settings_v1';

export default function App() {
  // 1. Workspace State
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<any>(null);

  // 2. Theme & Settings State
  const [currentTheme, setCurrentTheme] = useState<ThemeType>(() => {
    try {
      const saved = localStorage.getItem('vscode_notes_theme');
      if (saved && THEMES[saved as ThemeType]) return saved as ThemeType;
    } catch {}
    return 'vs-dark';
  });

  const [settings, setSettings] = useState<EditorSettings>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          theme: 'vs-dark',
          wordWrap: true,
          fontSize: 14,
          tabSize: 2,
          minimap: false,
          lineNumbers: 'on',
          previewMode: 'editor',
          autoSaveDelay: 300,
          maxOpenTabs: 10,
          ...parsed,
        };
      }
    } catch {}
    return {
      theme: 'vs-dark',
      wordWrap: true,
      fontSize: 14,
      tabSize: 2,
      minimap: false,
      lineNumbers: 'on',
      previewMode: 'editor',
      autoSaveDelay: 300,
      maxOpenTabs: 10,
    };
  });

  // 3. Layout & Navigation State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeSidebarTab, setActiveSidebarTab] = useState<ActiveSidebarTab>('explorer');
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [isResizing, setIsResizing] = useState(false);

  // 4. Editor Interaction State
  const [cursorPos, setCursorPos] = useState<CursorPosition>({ lineNumber: 1, column: 1 });
  const [targetLineNumber, setTargetLineNumber] = useState<number | undefined>(undefined);

  // 5. Modals State
  const [isQuickOpenOpen, setIsQuickOpenOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isLanguageSelectorOpen, setIsLanguageSelectorOpen] = useState(false);
  const [isImageUploadOpen, setIsImageUploadOpen] = useState(false);
  const [deleteConfirmNode, setDeleteConfirmNode] = useState<FileNode | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Load Workspace from IndexedDB on initial mount
  useEffect(() => {
    async function init() {
      const ws = await loadWorkspace();
      setWorkspace(ws);
      if (ws.activeTabId && ws.files[ws.activeTabId]) {
        const isExcal = isExcalidrawFile(ws.files[ws.activeTabId].name);
        setSettings((s) => ({ ...s, previewMode: isExcal ? 'preview' : 'editor' }));
      }
    }
    init();
  }, []);

  // Save Theme and Settings changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('vscode_notes_theme', currentTheme);
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {}
  }, [currentTheme, settings]);

  // Keep ref for immediate flush on beforeunload / visibilitychange
  const workspaceRef = useRef<Workspace | null>(workspace);
  workspaceRef.current = workspace;

  // Debounced Auto-Save to IndexedDB whenever workspace updates
  useEffect(() => {
    if (!workspace) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    setIsSaving(true);
    saveTimeoutRef.current = setTimeout(async () => {
      await saveWorkspace(workspace);
      setIsSaving(false);
    }, 250);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [workspace]);

  // Guaranteed flush on window unload or tab backgrounding
  useEffect(() => {
    const handleFlush = () => {
      if (workspaceRef.current) {
        saveWorkspace(workspaceRef.current);
      }
    };

    window.addEventListener('beforeunload', handleFlush);
    window.addEventListener('pagehide', handleFlush);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        handleFlush();
      }
    });

    return () => {
      window.removeEventListener('beforeunload', handleFlush);
      window.removeEventListener('pagehide', handleFlush);
    };
  }, []);

  // Derived variables
  const files = workspace?.files || {};
  const openTabIds = workspace?.openTabIds || [];
  const activeTabId = workspace?.activeTabId || null;
  const activeFile = activeTabId ? files[activeTabId] || null : null;

  const { totalNotes, totalFolders, formattedTotalSize } = useMemo(() => {
    const stats = getWorkspaceStats(files);
    return {
      totalNotes: stats.fileCount,
      totalFolders: stats.folderCount,
      formattedTotalSize: stats.formattedTotalSize,
    };
  }, [files]);

  // Helper to enforce maximum open tabs limit (auto-closes oldest non-active tab)
  const enforceTabLimit = useCallback((tabIds: string[], activeId: string | null, limit: number): string[] => {
    const max = Math.max(1, limit || 10);
    let result = [...tabIds];
    while (result.length > max) {
      const dropIndex = result.findIndex((id) => id !== activeId);
      if (dropIndex !== -1) {
        result.splice(dropIndex, 1);
      } else {
        result.shift();
      }
    }
    return result;
  }, []);

  // Settings update helper
  const handleUpdateSettings = (newSettings: Partial<EditorSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...newSettings };
      if (newSettings.maxOpenTabs !== undefined && workspace) {
        const limit = newSettings.maxOpenTabs;
        setWorkspace((ws) => {
          if (!ws || ws.openTabIds.length <= limit) return ws;
          const trimmed = enforceTabLimit(ws.openTabIds, ws.activeTabId, limit);
          return {
            ...ws,
            openTabIds: trimmed,
            lastUpdated: Date.now(),
          };
        });
      }
      return next;
    });
  };

  const handleThemeChange = (newTheme: ThemeType) => {
    setCurrentTheme(newTheme);
    handleUpdateSettings({ theme: newTheme });
  };

  // --- FILE & TAB ACTIONS ---

  const handleOpenFile = useCallback((fileId: string, lineNumber?: number) => {
    if (!workspace) return;
    const maxTabs = settings.maxOpenTabs || 10;

    const targetNode = workspace.files[fileId];
    if (targetNode) {
      const isExcal = isExcalidrawFile(targetNode.name);
      const isKanban = isKanbanFile(targetNode.name);
      setSettings((s) => ({ ...s, previewMode: (isExcal || isKanban) ? 'preview' : 'editor' }));
    }

    setWorkspace((prev) => {
      if (!prev) return prev;
      const fileToOpen = prev.files[fileId];
      if (fileToOpen) {
        const isExcal = isExcalidrawFile(fileToOpen.name);
        const isKanban = isKanbanFile(fileToOpen.name);
        setSettings((s) => ({ ...s, previewMode: (isExcal || isKanban) ? 'preview' : 'editor' }));
      }
      const alreadyOpen = prev.openTabIds.includes(fileId);
      let newTabs = alreadyOpen ? prev.openTabIds : [...prev.openTabIds, fileId];
      if (newTabs.length > maxTabs) {
        newTabs = enforceTabLimit(newTabs, fileId, maxTabs);
      }
      return {
        ...prev,
        openTabIds: newTabs,
        activeTabId: fileId,
        lastUpdated: Date.now(),
      };
    });

    if (lineNumber !== undefined) {
      setTargetLineNumber(lineNumber);
      // Reset target after a short frame
      setTimeout(() => setTargetLineNumber(undefined), 100);
    }
  }, [workspace, settings.maxOpenTabs, enforceTabLimit]);

  const handleCloseTab = useCallback((fileId: string) => {
    setWorkspace((prev) => {
      if (!prev) return prev;
      const newTabs = prev.openTabIds.filter((id) => id !== fileId);
      let newActiveId = prev.activeTabId;

      if (prev.activeTabId === fileId) {
        // Activate adjacent tab
        const closedIndex = prev.openTabIds.indexOf(fileId);
        if (newTabs.length > 0) {
          const nextIndex = Math.min(closedIndex, newTabs.length - 1);
          newActiveId = newTabs[nextIndex];
        } else {
          newActiveId = null;
        }
      }

      if (newActiveId && prev.files[newActiveId]) {
        const isExcal = isExcalidrawFile(prev.files[newActiveId].name);
        const isKanban = isKanbanFile(prev.files[newActiveId].name);
        setSettings((s) => ({ ...s, previewMode: (isExcal || isKanban) ? 'preview' : 'editor' }));
      }

      return {
        ...prev,
        openTabIds: newTabs,
        activeTabId: newActiveId,
        lastUpdated: Date.now(),
      };
    });
  }, []);

  const handleCloseOtherTabs = useCallback((targetTabId: string) => {
    setWorkspace((prev) => {
      if (!prev) return prev;
      const target = prev.files[targetTabId];
      if (target) {
        const isExcal = isExcalidrawFile(target.name);
        const isKanban = isKanbanFile(target.name);
        setSettings((s) => ({ ...s, previewMode: (isExcal || isKanban) ? 'preview' : 'editor' }));
      }
      return {
        ...prev,
        openTabIds: [targetTabId],
        activeTabId: targetTabId,
        lastUpdated: Date.now(),
      };
    });
  }, []);

  const handleCloseTabsToRight = useCallback((targetTabId: string) => {
    setWorkspace((prev) => {
      if (!prev) return prev;
      const targetIndex = prev.openTabIds.indexOf(targetTabId);
      if (targetIndex === -1) return prev;
      const newTabs = prev.openTabIds.slice(0, targetIndex + 1);
      let newActive = prev.activeTabId;
      if (newActive && !newTabs.includes(newActive)) {
        newActive = targetTabId;
      }
      if (newActive && prev.files[newActive]) {
        const isExcal = isExcalidrawFile(prev.files[newActive].name);
        const isKanban = isKanbanFile(prev.files[newActive].name);
        setSettings((s) => ({ ...s, previewMode: (isExcal || isKanban) ? 'preview' : 'editor' }));
      }
      return {
        ...prev,
        openTabIds: newTabs,
        activeTabId: newActive,
        lastUpdated: Date.now(),
      };
    });
  }, []);

  const handleCloseAllTabs = useCallback(() => {
    setWorkspace((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        openTabIds: [],
        activeTabId: null,
        lastUpdated: Date.now(),
      };
    });
  }, []);

  const handleCreateFile = useCallback((name: string, parentId: string | null = null, content = '') => {
    const rawName = name.trim();
    if (!rawName) return;
    const cleanName = ensureFileExtension(rawName);

    const maxTabs = settings.maxOpenTabs || 10;
    const now = Date.now();

    const isExcalInitial = isExcalidrawFile(cleanName);
    const isKanbanInitial = isKanbanFile(cleanName);
    setSettings((s) => ({ ...s, previewMode: (isExcalInitial || isKanbanInitial) ? 'preview' : 'editor' }));

    setWorkspace((prev) => {
      if (!prev) return prev;
      const uniqueName = getUniqueNameInFolder(cleanName, parentId, prev.files);
      const id = generateId();

      const isExcal = isExcalidrawFile(uniqueName);
      const isKanban = isKanbanFile(uniqueName);
      setSettings((s) => ({ ...s, previewMode: (isExcal || isKanban) ? 'preview' : 'editor' }));

      let finalContent = content;
      if (!content && isExcal) {
        finalContent = JSON.stringify(EMPTY_EXCALIDRAW_DATA, null, 2);
      } else if (!content && isKanban) {
        const boardTitle = uniqueName.replace(/\.kanban(\.json)?$/i, '').replace(/[-_]/g, ' ');
        finalContent = serializeKanbanData(createEmptyKanbanBoard(boardTitle.charAt(0).toUpperCase() + boardTitle.slice(1)));
      }
      const size = calculateStringSizeBytes(finalContent);

      const newFile: FileNode = {
        id,
        name: uniqueName,
        type: 'file',
        parentId,
        content: finalContent,
        size,
        createdAt: now,
        updatedAt: now,
        isBinary: isImageFile(uniqueName),
      };

      let newTabs = [...prev.openTabIds, id];
      if (newTabs.length > maxTabs) {
        newTabs = enforceTabLimit(newTabs, id, maxTabs);
      }

      return {
        ...prev,
        files: {
          ...prev.files,
          [id]: newFile,
        },
        openTabIds: newTabs,
        activeTabId: id,
        lastUpdated: now,
      };
    });
  }, [settings.maxOpenTabs, enforceTabLimit]);

  const handleCreateFolder = useCallback((name: string, parentId: string | null = null) => {
    const cleanName = name.trim();
    if (!cleanName) return;

    const now = Date.now();

    setWorkspace((prev) => {
      if (!prev) return prev;
      const uniqueName = getUniqueNameInFolder(cleanName, parentId, prev.files);
      const id = generateId();

      const newFolder: FileNode = {
        id,
        name: uniqueName,
        type: 'folder',
        parentId,
        size: 0,
        createdAt: now,
        updatedAt: now,
        isExpanded: true,
      };

      return {
        ...prev,
        files: {
          ...prev.files,
          [id]: newFolder,
        },
        lastUpdated: now,
      };
    });
  }, []);

  const handleRenameNode = useCallback((id: string, newName: string) => {
    const cleanName = newName.trim();
    if (!cleanName) return;

    setWorkspace((prev) => {
      if (!prev || !prev.files[id]) return prev;
      const node = prev.files[id];
      if (isNameTakenInFolder(cleanName, node.parentId, prev.files, id)) {
        return prev;
      }
      return {
        ...prev,
        files: {
          ...prev.files,
          [id]: {
            ...node,
            name: cleanName,
            updatedAt: Date.now(),
            isBinary: isImageFile(cleanName),
          },
        },
        lastUpdated: Date.now(),
      };
    });
  }, []);

  const handleDeleteNode = useCallback((id: string) => {
    if (!files[id]) return;
    setDeleteConfirmNode(files[id]);
  }, [files]);

  const confirmDeleteNode = useCallback(() => {
    if (!deleteConfirmNode) return;
    const targetId = deleteConfirmNode.id;

    setWorkspace((prev) => {
      if (!prev) return prev;
      const newFiles = { ...prev.files };

      // Helper to collect all descendants
      const idsToDelete = new Set<string>([targetId]);
      const collectChildren = (parentId: string) => {
        Object.values(newFiles).forEach((node) => {
          if (node.parentId === parentId) {
            idsToDelete.add(node.id);
            if (node.type === 'folder') collectChildren(node.id);
          }
        });
      };

      if (newFiles[targetId]?.type === 'folder') {
        collectChildren(targetId);
      }

      idsToDelete.forEach((nodeId) => {
        delete newFiles[nodeId];
      });

      const newOpenTabs = prev.openTabIds.filter((tabId) => !idsToDelete.has(tabId));
      let newActiveTabId = prev.activeTabId;
      if (newActiveTabId && idsToDelete.has(newActiveTabId)) {
        newActiveTabId = newOpenTabs.length > 0 ? newOpenTabs[0] : null;
      }

      if (newActiveTabId && newFiles[newActiveTabId]) {
        const isExcal = isExcalidrawFile(newFiles[newActiveTabId].name);
        setSettings((s) => ({ ...s, previewMode: isExcal ? 'preview' : 'editor' }));
      }

      return {
        ...prev,
        files: newFiles,
        openTabIds: newOpenTabs,
        activeTabId: newActiveTabId,
        lastUpdated: Date.now(),
      };
    });

    setDeleteConfirmNode(null);
  }, [deleteConfirmNode]);

  const handleToggleFolder = useCallback((folderId: string) => {
    setWorkspace((prev) => {
      if (!prev || !prev.files[folderId]) return prev;
      const folder = prev.files[folderId];
      return {
        ...prev,
        files: {
          ...prev.files,
          [folderId]: {
            ...folder,
            isExpanded: !folder.isExpanded,
          },
        },
      };
    });
  }, []);

  const handleCollapseAllFolders = useCallback(() => {
    setWorkspace((prev) => {
      if (!prev) return prev;
      const updatedFiles = { ...prev.files };
      Object.keys(updatedFiles).forEach((key) => {
        if (updatedFiles[key].type === 'folder') {
          updatedFiles[key] = { ...updatedFiles[key], isExpanded: false };
        }
      });
      return { ...prev, files: updatedFiles };
    });
  }, []);

  const handleDuplicateFile = useCallback((fileId: string) => {
    const file = files[fileId];
    if (!file || file.type !== 'file') return;

    const parts = file.name.split('.');
    const ext = parts.length > 1 ? '.' + parts.pop() : '';
    const base = parts.join('.');
    const copyName = `${base}-copy${ext}`;

    handleCreateFile(copyName, file.parentId, file.content || '');
  }, [files, handleCreateFile]);

  const handleContentChange = useCallback((fileId: string, newContent: string) => {
    setWorkspace((prev) => {
      if (!prev || !prev.files[fileId]) return prev;
      const target = prev.files[fileId];
      const newSize = calculateStringSizeBytes(newContent);

      return {
        ...prev,
        files: {
          ...prev.files,
          [fileId]: {
            ...target,
            content: newContent,
            size: newSize,
            updatedAt: Date.now(),
          },
        },
        lastUpdated: Date.now(),
      };
    });
  }, []);

  const handleFileUpload = useCallback(async (fileList: FileList, targetParentId: string | null) => {
    const maxTabs = settings.maxOpenTabs || 10;
    const newNodes: FileNode[] = [];

    for (let i = 0; i < fileList.length; i++) {
      try {
        const node = await readFileAsNode(fileList[i], targetParentId);
        newNodes.push(node);
      } catch (err: any) {
        alert(err.message || 'Failed to upload file');
      }
    }

    if (newNodes.length > 0) {
      setWorkspace((prev) => {
        if (!prev) return prev;
        const newFiles = { ...prev.files };
        let newOpenTabs = [...prev.openTabIds];

        newNodes.forEach((n) => {
          const uniqueName = getUniqueNameInFolder(n.name, targetParentId, newFiles);
          const uniqueNode: FileNode = { ...n, name: uniqueName };
          newFiles[uniqueNode.id] = uniqueNode;
          if (!newOpenTabs.includes(uniqueNode.id)) {
            newOpenTabs.push(uniqueNode.id);
          }
        });

        const activeId = newNodes[newNodes.length - 1].id;
        const activeNode = newFiles[activeId];
        if (activeNode) {
          const isExcal = isExcalidrawFile(activeNode.name);
          setSettings((s) => ({ ...s, previewMode: isExcal ? 'preview' : 'editor' }));
        }

        if (newOpenTabs.length > maxTabs) {
          newOpenTabs = enforceTabLimit(newOpenTabs, activeId, maxTabs);
        }

        return {
          ...prev,
          files: newFiles,
          openTabIds: newOpenTabs,
          activeTabId: activeId,
          lastUpdated: Date.now(),
        };
      });
    }
  }, [settings.maxOpenTabs, enforceTabLimit]);

  const handleMoveNode = useCallback((sourceId: string, targetParentId: string | null) => {
    setWorkspace((prev) => {
      if (!prev || !prev.files[sourceId]) return prev;
      const source = prev.files[sourceId];
      if (source.parentId === targetParentId) return prev;
      if (sourceId === targetParentId) return prev;

      // Disallow moving a folder into its own descendants
      if (source.type === 'folder' && targetParentId) {
        let curr: string | null = targetParentId;
        while (curr) {
          if (curr === sourceId) return prev;
          curr = prev.files[curr]?.parentId || null;
        }
      }

      const uniqueName = getUniqueNameInFolder(source.name, targetParentId, prev.files, sourceId);

      return {
        ...prev,
        files: {
          ...prev.files,
          [sourceId]: {
            ...source,
            name: uniqueName,
            parentId: targetParentId,
            updatedAt: Date.now(),
          },
        },
        lastUpdated: Date.now(),
      };
    });
  }, []);

  const handlePasteClipboardNodes = useCallback(
    (clipboard: TreeClipboardState, targetParentId: string | null) => {
      if (!workspace || !workspace.files[clipboard.nodeId]) return;

      if (clipboard.action === 'cut') {
        handleMoveNode(clipboard.nodeId, targetParentId);
      } else if (clipboard.action === 'copy') {
        const { newNodes, rootNewId } = duplicateNodeRecursively(
          clipboard.nodeId,
          targetParentId,
          workspace.files
        );
        if (newNodes.length > 0) {
          const maxTabs = settings.maxOpenTabs || 10;
          setWorkspace((prev) => {
            if (!prev) return prev;
            const newFiles = { ...prev.files };
            newNodes.forEach((n) => {
              newFiles[n.id] = n;
            });
            const shouldOpen = newFiles[rootNewId]?.type === 'file';
            let newOpenTabs = prev.openTabIds;
            if (shouldOpen && !prev.openTabIds.includes(rootNewId)) {
              newOpenTabs = [...prev.openTabIds, rootNewId];
              if (newOpenTabs.length > maxTabs) {
                newOpenTabs = enforceTabLimit(newOpenTabs, rootNewId, maxTabs);
              }
            }
            return {
              ...prev,
              files: newFiles,
              openTabIds: newOpenTabs,
              activeTabId: shouldOpen ? rootNewId : prev.activeTabId,
              lastUpdated: Date.now(),
            };
          });
        }
      }
    },
    [workspace, handleMoveNode, settings.maxOpenTabs, enforceTabLimit]
  );

  const handlePasteImageFile = useCallback(
    (dataUrl: string, targetParentId: string | null = null, customFilename?: string) => {
      const maxTabs = settings.maxOpenTabs || 10;
      const rawFilename = customFilename || generateRandomImageFilename('png');
      const filename = workspace ? getUniqueNameInFolder(rawFilename, targetParentId, workspace.files) : rawFilename;
      const imageId = generateId();
      const now = Date.now();
      const size = calculateStringSizeBytes(dataUrl);

      const newImgNode: FileNode = {
        id: imageId,
        name: filename,
        type: 'file',
        parentId: targetParentId,
        content: dataUrl,
        size,
        createdAt: now,
        updatedAt: now,
        isBinary: true,
        mimeType: 'image/png',
      };

      setWorkspace((prev) => {
        if (!prev) return prev;
        let newTabs = prev.openTabIds.includes(imageId) ? prev.openTabIds : [...prev.openTabIds, imageId];
        if (newTabs.length > maxTabs) {
          newTabs = enforceTabLimit(newTabs, imageId, maxTabs);
        }
        return {
          ...prev,
          files: {
            ...prev.files,
            [imageId]: newImgNode,
          },
          openTabIds: newTabs,
          activeTabId: imageId,
          lastUpdated: now,
        };
      });

      return { filename, id: imageId };
    },
    [workspace, settings.maxOpenTabs, enforceTabLimit]
  );

  const handlePasteImageIntoEditor = useCallback(
    (dataUrl: string, customAlt = 'image') => {
      // If a media folder exists, save into media folder, else in active file parent or root
      const mediaFolder = Object.values(files).find((f) => f.type === 'folder' && f.name === 'media');
      const parentId = mediaFolder ? mediaFolder.id : (activeFile ? activeFile.parentId : null);

      const rawFilename = generateRandomImageFilename('png');
      const filename = getUniqueNameInFolder(rawFilename, parentId, files);

      const imageId = generateId();
      const now = Date.now();
      const size = calculateStringSizeBytes(dataUrl);

      const newImgNode: FileNode = {
        id: imageId,
        name: filename,
        type: 'file',
        parentId,
        content: dataUrl,
        size,
        createdAt: now,
        updatedAt: now,
        isBinary: true,
        mimeType: 'image/png',
      };

      setWorkspace((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          files: {
            ...prev.files,
            [imageId]: newImgNode,
          },
          lastUpdated: now,
        };
      });

      const imgTag = `![${customAlt}](${filename})`;
      return { imgTag, filename };
    },
    [activeFile, files]
  );

  const handleExportZip = useCallback(async () => {
    if (!workspace) return;
    try {
      const blob = await exportWorkspaceToZip(workspace.files);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vscode-notes-workspace-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export ZIP:', err);
    }
  }, [workspace]);

  const handleResetWorkspace = useCallback(() => {
    setIsResetConfirmOpen(true);
  }, []);

  const confirmResetWorkspace = useCallback(async () => {
    const defaultWs = createDefaultWorkspace();
    setWorkspace(defaultWs);
    await saveWorkspace(defaultWs);
    setIsResetConfirmOpen(false);
  }, []);

  const handleInsertImageMarkdown = useCallback(
    (alt: string, src: string, saveAsFileNode: boolean, filename: string, dataUrl?: string) => {
      if (!activeFile) return;

      // If saving as node in workspace, check/create media folder
      if (saveAsFileNode && dataUrl) {
        const mediaFolder = Object.values(files).find((f) => f.type === 'folder' && f.name === 'media');
        const mediaParentId = mediaFolder ? mediaFolder.id : null;

        const imageNodeId = generateId();
        const now = Date.now();
        const newImgNode: FileNode = {
          id: imageNodeId,
          name: filename,
          type: 'file',
          parentId: mediaParentId,
          content: dataUrl,
          size: calculateStringSizeBytes(dataUrl),
          createdAt: now,
          updatedAt: now,
          isBinary: true,
          mimeType: 'image/png',
        };

        setWorkspace((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            files: {
              ...prev.files,
              [imageNodeId]: newImgNode,
            },
          };
        });
      }

      const imgTag = `\n\n![${alt}](${src})\n\n`;
      const updated = (activeFile.content || '') + imgTag;
      handleContentChange(activeFile.id, updated);
    },
    [activeFile, files, handleContentChange]
  );

  const handleCopyActiveContent = useCallback(() => {
    if (activeFile && activeFile.content) {
      navigator.clipboard.writeText(activeFile.content);
    }
  }, [activeFile]);

  const handleDownloadActiveFile = useCallback(() => {
    if (!activeFile) return;
    const blob = new Blob([activeFile.content || ''], { type: activeFile.mimeType || 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeFile.name;
    a.click();
    URL.revokeObjectURL(url);
  }, [activeFile]);

  // Sidebar drag-to-resize logic
  const handleStartResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      // 48px is the activity bar width
      const newWidth = Math.max(180, Math.min(600, e.clientX - 48));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // --- KEYBOARD SHORTCUTS ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;

      // Ctrl + P -> Quick Open
      if (isCmdOrCtrl && e.key.toLowerCase() === 'p' && !e.shiftKey) {
        e.preventDefault();
        setIsQuickOpenOpen(true);
      }

      // Ctrl + Shift + P or F1 -> Command Palette
      if ((isCmdOrCtrl && e.key.toLowerCase() === 'p' && e.shiftKey) || e.key === 'F1') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }

      // Ctrl + B -> Toggle Sidebar
      if (isCmdOrCtrl && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setIsSidebarOpen((prev) => !prev);
      }

      // Alt + Z -> Toggle Word Wrap
      if (e.altKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUpdateSettings({ wordWrap: !settings.wordWrap });
      }

      // Ctrl + N -> New Note
      if (isCmdOrCtrl && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleCreateFile(`note_${Date.now().toString().slice(-4)}.txt`, null);
      }

      // Ctrl + Shift + F -> Global Search
      if (isCmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsSidebarOpen(true);
        setActiveSidebarTab('search');
      }

      // Ctrl + W -> Close Tab
      if (isCmdOrCtrl && e.key.toLowerCase() === 'w') {
        if (activeTabId) {
          e.preventDefault();
          handleCloseTab(activeTabId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTabId, handleCloseTab, handleCreateFile, settings.wordWrap]);

  // Command palette command list
  const commands: CommandItem[] = useMemo(() => {
    return [
      {
        id: 'cmd-new-file',
        label: 'File: New Note / Code File',
        category: 'File',
        icon: <FilePlus size={14} />,
        shortcut: 'Ctrl+N',
        action: () => handleCreateFile('untitled.txt', null),
      },
      {
        id: 'cmd-new-kanban',
        label: 'File: New Kanban Board (.kanban)',
        category: 'File',
        icon: <Kanban size={14} className="text-cyan-400" />,
        action: () => handleCreateFile('tasks.kanban', null),
      },
      {
        id: 'cmd-new-diagram',
        label: 'File: New Excalidraw Diagram',
        category: 'File',
        icon: <PenTool size={14} className="text-violet-400" />,
        action: () => handleCreateFile('diagram.excalidraw', null),
      },
      {
        id: 'cmd-new-folder',
        label: 'File: New Folder',
        category: 'File',
        icon: <FolderPlus size={14} />,
        action: () => handleCreateFolder('new_folder', null),
      },
      {
        id: 'cmd-toggle-sidebar',
        label: 'View: Toggle Primary Side Bar',
        category: 'View',
        icon: <PanelLeft size={14} />,
        shortcut: 'Ctrl+B',
        action: () => setIsSidebarOpen((prev) => !prev),
      },
      {
        id: 'cmd-toggle-wrap',
        label: 'View: Toggle Word Wrap',
        category: 'View',
        icon: <WrapText size={14} />,
        shortcut: 'Alt+Z',
        action: () => handleUpdateSettings({ wordWrap: !settings.wordWrap }),
      },
      {
        id: 'cmd-search-all',
        label: 'Search: Find in Workspace Notes',
        category: 'Search',
        icon: <Search size={14} />,
        shortcut: 'Ctrl+Shift+F',
        action: () => {
          setIsSidebarOpen(true);
          setActiveSidebarTab('search');
        },
      },
      {
        id: 'cmd-close-active-tab',
        label: 'View: Close Active Tab',
        category: 'View',
        icon: <X size={14} />,
        shortcut: 'Ctrl+W',
        action: () => {
          if (activeTabId) handleCloseTab(activeTabId);
        },
      },
      {
        id: 'cmd-close-other-tabs',
        label: 'View: Close Other Tabs',
        category: 'View',
        icon: <X size={14} />,
        action: () => {
          if (activeTabId) handleCloseOtherTabs(activeTabId);
        },
      },
      {
        id: 'cmd-close-tabs-right',
        label: 'View: Close Tabs to the Right',
        category: 'View',
        icon: <X size={14} />,
        action: () => {
          if (activeTabId) handleCloseTabsToRight(activeTabId);
        },
      },
      {
        id: 'cmd-close-all-tabs',
        label: 'View: Close All Tabs',
        category: 'View',
        icon: <X size={14} />,
        action: handleCloseAllTabs,
      },
      {
        id: 'cmd-preview-mode',
        label: 'Markdown / HTML: Toggle Live Preview',
        category: 'Preview',
        icon: <Columns2 size={14} />,
        action: () => {
          const modes: ('editor' | 'split' | 'preview')[] = ['editor', 'split', 'preview'];
          const nextMode = modes[(modes.indexOf(settings.previewMode) + 1) % modes.length];
          handleUpdateSettings({ previewMode: nextMode });
        },
      },
      {
        id: 'cmd-insert-img',
        label: 'Markdown: Insert Image / Upload',
        category: 'Insert',
        icon: <ImagePlus size={14} />,
        action: () => setIsImageUploadOpen(true),
      },
      {
        id: 'cmd-change-lang',
        label: 'Editor: Change Language Syntax Mode',
        category: 'Editor',
        icon: <Code size={14} />,
        action: () => setIsLanguageSelectorOpen(true),
      },
      {
        id: 'cmd-export-zip',
        label: 'Workspace: Export All Notes to ZIP',
        category: 'Workspace',
        icon: <Download size={14} />,
        action: handleExportZip,
      },
      {
        id: 'cmd-theme-dark',
        label: 'Preferences: Color Theme - VS Code Dark+',
        category: 'Preferences',
        icon: <Palette size={14} />,
        action: () => handleThemeChange('vs-dark'),
      },
      {
        id: 'cmd-theme-light',
        label: 'Preferences: Color Theme - VS Code Light+',
        category: 'Preferences',
        icon: <Palette size={14} />,
        action: () => handleThemeChange('vs-light'),
      },
      {
        id: 'cmd-theme-solar-dark',
        label: 'Preferences: Color Theme - Solarized Dark',
        category: 'Preferences',
        icon: <Palette size={14} />,
        action: () => handleThemeChange('solarized-dark'),
      },
      {
        id: 'cmd-theme-solar-light',
        label: 'Preferences: Color Theme - Solarized Light',
        category: 'Preferences',
        icon: <Palette size={14} />,
        action: () => handleThemeChange('solarized-light'),
      },
      {
        id: 'cmd-theme-monokai',
        label: 'Preferences: Color Theme - Monokai',
        category: 'Preferences',
        icon: <Palette size={14} />,
        action: () => handleThemeChange('monokai'),
      },
      {
        id: 'cmd-close-all',
        label: 'View: Close All Editor Tabs',
        category: 'View',
        icon: <X size={14} />,
        action: handleCloseAllTabs,
      },
      {
        id: 'cmd-reset-workspace',
        label: 'Workspace: Reset to Default Sample Notes',
        category: 'Workspace',
        icon: <RotateCcw size={14} />,
        action: handleResetWorkspace,
      },
    ];
  }, [
    handleCreateFile,
    handleCreateFolder,
    settings.wordWrap,
    settings.previewMode,
    handleExportZip,
    handleCloseAllTabs,
    handleResetWorkspace,
  ]);

  const currentThemeConfig = THEMES[currentTheme];
  const isMdOrHtml = activeFile ? isMarkdownFile(activeFile.name) || isHtmlFile(activeFile.name) : false;

  return (
    <div
      id="vscode-app-container"
      className="flex flex-col h-screen w-screen overflow-hidden select-none font-sans antialiased text-neutral-200"
      style={{
        backgroundColor: currentThemeConfig.ui.bgApp,
      }}
    >
      {/* 1. Title Bar */}
      <TitleBar
        files={files}
        activeFile={activeFile}
        currentTheme={currentTheme}
        onThemeChange={handleThemeChange}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onOpenQuickOpen={() => setIsQuickOpenOpen(true)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onCreateNewFile={() => handleCreateFile('untitled.md', null)}
        onExportZip={handleExportZip}
        previewMode={settings.previewMode}
        onTogglePreview={() => {
          const modes: ('editor' | 'split' | 'preview')[] = ['editor', 'split', 'preview'];
          const next = modes[(modes.indexOf(settings.previewMode) + 1) % modes.length];
          handleUpdateSettings({ previewMode: next });
        }}
        isMarkdownOrHtml={isMdOrHtml}
        totalSizeFormatted={formattedTotalSize}
      />

      {/* 2. Main Middle Container (Activity Bar + Sidebar + Editor) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Activity Bar */}
        <ActivityBar
          activeTab={activeSidebarTab}
          onTabChange={(tab) => {
            if (activeSidebarTab === tab && isSidebarOpen) {
              setIsSidebarOpen(false);
            } else {
              setActiveSidebarTab(tab);
              setIsSidebarOpen(true);
            }
          }}
          currentTheme={currentTheme}
          onOpenImageUpload={() => setIsImageUploadOpen(true)}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onCreateNewFile={() => handleCreateFile('untitled.md', null)}
        />

        {/* Sidebar */}
        <Sidebar
          activeTab={activeSidebarTab}
          isOpen={isSidebarOpen}
          width={sidebarWidth}
          files={files}
          activeFileId={activeTabId}
          currentTheme={currentTheme}
          settings={settings}
          totalNotes={totalNotes}
          totalFolders={totalFolders}
          totalSizeFormatted={formattedTotalSize}
          onOpenFile={(id) => handleOpenFile(id)}
          onCreateFile={handleCreateFile}
          onCreateFolder={handleCreateFolder}
          onRenameNode={handleRenameNode}
          onDeleteNode={handleDeleteNode}
          onToggleFolder={handleToggleFolder}
          onCollapseAll={handleCollapseAllFolders}
          onFileUpload={handleFileUpload}
          onDuplicateFile={handleDuplicateFile}
          onMoveNode={handleMoveNode}
          onPasteClipboard={handlePasteClipboardNodes}
          onPasteImageFile={handlePasteImageFile}
          onOpenMatch={(fileId, lineNum) => handleOpenFile(fileId, lineNum)}
          onThemeChange={handleThemeChange}
          onUpdateSettings={handleUpdateSettings}
          onExportZip={handleExportZip}
          onResetWorkspace={handleResetWorkspace}
          onStartResize={handleStartResize}
        />

        {/* Editor Main Section */}
        <main className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
          {/* Tabs Bar */}
          {openTabIds.length > 0 && (
            <TabsBar
              files={files}
              openTabIds={openTabIds}
              activeTabId={activeTabId}
              currentTheme={currentTheme}
              previewMode={settings.previewMode}
              wordWrap={settings.wordWrap}
              maxOpenTabs={settings.maxOpenTabs || 10}
              onSelectTab={(id) => handleOpenFile(id)}
              onCloseTab={handleCloseTab}
              onCloseOtherTabs={handleCloseOtherTabs}
              onCloseTabsToRight={handleCloseTabsToRight}
              onCloseAllTabs={handleCloseAllTabs}
              onTogglePreviewMode={() => {
                const modes: ('editor' | 'split' | 'preview')[] = ['editor', 'split', 'preview'];
                const next = modes[(modes.indexOf(settings.previewMode) + 1) % modes.length];
                handleUpdateSettings({ previewMode: next });
              }}
              onToggleWordWrap={() => handleUpdateSettings({ wordWrap: !settings.wordWrap })}
              onOpenImageUpload={() => setIsImageUploadOpen(true)}
              onCopyContent={handleCopyActiveContent}
              onDownloadFile={handleDownloadActiveFile}
            />
          )}

          {/* Editor Body */}
          <EditorArea
            activeFile={activeFile}
            files={files}
            currentTheme={currentTheme}
            settings={settings}
            targetLineNumber={targetLineNumber}
            onContentChange={handleContentChange}
            onCursorChange={setCursorPos}
            onCreateNewFile={() => handleCreateFile('untitled.md', null)}
            onOpenQuickOpen={() => setIsQuickOpenOpen(true)}
            onOpenThemeSettings={() => {
              setIsSidebarOpen(true);
              setActiveSidebarTab('settings');
            }}
            onPasteImageIntoEditor={handlePasteImageIntoEditor}
          />
        </main>
      </div>

      {/* 3. Bottom Status Bar */}
      <StatusBar
        activeFile={activeFile}
        cursorPos={cursorPos}
        currentTheme={currentTheme}
        settings={settings}
        isSaving={isSaving}
        onOpenLanguageSelector={() => setIsLanguageSelectorOpen(true)}
        onOpenThemeSelector={() => {
          setIsSidebarOpen(true);
          setActiveSidebarTab('settings');
        }}
        onToggleWordWrap={() => handleUpdateSettings({ wordWrap: !settings.wordWrap })}
      />

      {/* Modals & Dialogs */}
      <QuickOpenModal
        isOpen={isQuickOpenOpen}
        onClose={() => setIsQuickOpenOpen(false)}
        files={files}
        currentTheme={currentTheme}
        onSelectFile={(id) => handleOpenFile(id)}
      />

      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        currentTheme={currentTheme}
        commands={commands}
      />

      <LanguageSelectorModal
        isOpen={isLanguageSelectorOpen}
        onClose={() => setIsLanguageSelectorOpen(false)}
        currentLanguageId={activeFile ? detectLanguageByFilename(activeFile.name).id : 'markdown'}
        currentTheme={currentTheme}
        onSelectLanguage={(lang) => {
          if (activeFile) {
            // Update extension to match chosen language if appropriate
            const currentParts = activeFile.name.split('.');
            const base = currentParts.length > 1 ? currentParts.slice(0, -1).join('.') : activeFile.name;
            const newName = `${base}.${lang.extensions[0] || 'txt'}`;
            handleRenameNode(activeFile.id, newName);
          }
        }}
      />

      <ImageUploadModal
        isOpen={isImageUploadOpen}
        onClose={() => setIsImageUploadOpen(false)}
        currentTheme={currentTheme}
        onInsertImageMarkdown={handleInsertImageMarkdown}
      />

      <DeleteConfirmModal
        isOpen={!!deleteConfirmNode}
        onClose={() => setDeleteConfirmNode(null)}
        onConfirm={confirmDeleteNode}
        targetNode={deleteConfirmNode}
        currentTheme={currentTheme}
      />

      <ResetConfirmModal
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={confirmResetWorkspace}
        currentTheme={currentTheme}
        totalNotes={totalNotes}
      />
    </div>
  );
}
