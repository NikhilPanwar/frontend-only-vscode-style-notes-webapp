import { get, set } from 'idb-keyval';
import JSZip from 'jszip';
import { FileNode, Workspace, MAX_NOTE_SIZE_BYTES } from '../types';
import { DEFAULT_EXCALIDRAW_DATA } from './excalidrawTemplates';
import { createDefaultKanbanBoard, serializeKanbanData } from './kanbanUtils';

const STORAGE_KEY = 'vscode_notes_workspace_v1';
const SETTINGS_KEY = 'vscode_notes_settings_v1';

export function calculateStringSizeBytes(str: string): number {
  return new Blob([str]).size;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function generateId(): string {
  return 'item_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
}

export function generateRandomImageFilename(extension = 'png'): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const timeStr = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const rand = Math.random().toString(36).substring(2, 6);
  return `image_${dateStr}_${timeStr}_${rand}.${extension}`;
}

export function ensureFileExtension(name: string, defaultExt = 'txt'): string {
  const clean = name.trim();
  if (!clean) return `untitled.${defaultExt}`;

  // If it's a dotfile like .gitignore or .env (starts with dot and has chars after it)
  if (clean.startsWith('.') && clean.length > 1 && !clean.slice(1).includes('.')) {
    return clean;
  }

  // Check if there is a dot
  const lastDotIndex = clean.lastIndexOf('.');
  if (lastDotIndex === -1) {
    return `${clean}.${defaultExt}`;
  }

  // If ends with a dot (e.g. "notes.")
  if (lastDotIndex === clean.length - 1) {
    return `${clean}${defaultExt}`;
  }

  return clean;
}

export function isNameTakenInFolder(
  name: string,
  parentId: string | null,
  files: Record<string, FileNode>,
  excludeNodeId?: string
): boolean {
  const normalized = name.trim().toLowerCase();
  return Object.values(files).some(
    (node) =>
      node.id !== excludeNodeId &&
      node.parentId === parentId &&
      node.name.trim().toLowerCase() === normalized
  );
}

export function getUniqueNameInFolder(
  desiredName: string,
  parentId: string | null,
  files: Record<string, FileNode>,
  excludeNodeId?: string
): string {
  const cleanDesired = desiredName.trim();
  if (!isNameTakenInFolder(cleanDesired, parentId, files, excludeNodeId)) {
    return cleanDesired;
  }

  const parts = cleanDesired.split('.');
  let baseName = cleanDesired;
  let ext = '';

  if (parts.length > 1) {
    ext = '.' + parts.pop();
    baseName = parts.join('.');
  }

  let counter = 1;
  while (true) {
    const candidate = `${baseName} (${counter})${ext}`;
    if (!isNameTakenInFolder(candidate, parentId, files, excludeNodeId)) {
      return candidate;
    }
    counter++;
  }
}

export function duplicateNodeRecursively(
  nodeId: string,
  targetParentId: string | null,
  files: Record<string, FileNode>
): { newNodes: FileNode[]; rootNewId: string } {
  const source = files[nodeId];
  if (!source) return { newNodes: [], rootNewId: '' };

  const newNodes: FileNode[] = [];
  const now = Date.now();

  // If pasting into same parent or if name already exists in target parent, get unique copy name
  let initialName = source.name;
  if (source.parentId === targetParentId) {
    const parts = source.name.split('.');
    if (source.type === 'file' && parts.length > 1) {
      const ext = parts.pop();
      initialName = `${parts.join('.')}-copy.${ext}`;
    } else {
      initialName = `${source.name}-copy`;
    }
  }

  const newName = getUniqueNameInFolder(initialName, targetParentId, files);

  const rootNewId = generateId();
  const clonedRoot: FileNode = {
    ...source,
    id: rootNewId,
    name: newName,
    parentId: targetParentId,
    createdAt: now,
    updatedAt: now,
  };
  newNodes.push(clonedRoot);

  if (source.type === 'folder') {
    const cloneChildren = (oldParentId: string, newParentId: string) => {
      const children = Object.values(files).filter((f) => f.parentId === oldParentId);
      for (const child of children) {
        const childNewId = generateId();
        const childClone: FileNode = {
          ...child,
          id: childNewId,
          parentId: newParentId,
          createdAt: now,
          updatedAt: now,
        };
        newNodes.push(childClone);
        if (child.type === 'folder') {
          cloneChildren(child.id, childNewId);
        }
      }
    };

    cloneChildren(source.id, rootNewId);
  }

  return { newNodes, rootNewId };
}

// Sample initial notes to give users an immediate rich experience
export function createDefaultWorkspace(): Workspace {
  const rootNotesId = 'folder_notes';
  const rootSnippetsId = 'folder_snippets';
  const rootDataId = 'folder_data';
  const rootMediaId = 'folder_media';

  const welcomeContent = `# Welcome to VS Code Notes 📝

An offline-first, browser-persisted code & notes workspace inspired by Visual Studio Code.

---

### ✨ Key Features
- **100% Offline Capable**: Works entirely without internet connection. Everything is saved in your browser's IndexedDB storage.
- **VS Code Interface**: Drag-resizable sidebar, Activity Bar, File Explorer, Tab management, Breadcrumbs, Status Bar.
- **Any File Extension**: Markdown (\`.md\`), Python (\`.py\`), HTML (\`.html\`), TypeScript (\`.ts\`), JSON (\`.json\`), SQL (\`.sql\`), CSS (\`.css\`), and more.
- **Full Syntax Highlighting & Monaco Editor**: Word wrap, multi-cursor, minimap, line numbers, automatic bracket pairing.
- **Live Previews**:
  - **Excalidraw Diagrams (\`.excalidraw\`)**: Interactive vector whiteboard, architecture diagrams, and flowcharts with PNG/SVG export!
  - **Markdown**: GitHub-flavored markdown, math, tables, code blocks, task lists.
  - **HTML**: Live sandboxed iframe preview with hot reload as you type!
- **Image Support**: Insert local images or paste screenshots directly into your Markdown notes.
- **Global & In-Editor Search**:
  - \`Ctrl+F\` / \`Cmd+F\`: Search & replace in current file.
  - **Left Panel Search**: Instant full-text search across all notes in workspace.
- **Auto-Save**: Everything you type is saved automatically in real-time.
- **1MB Limit Guard**: Real-time note size tracking (up to 1MB per note).
- **Multiple Color Themes**:
  - Dark+ (Default)
  - Light+
  - Solarized Dark & Solarized Light
  - Monokai
  - High Contrast Dark

---

### ⌨️ Keyboard Shortcuts
| Shortcut | Action |
| --- | --- |
| \`Ctrl + P\` / \`Cmd + P\` | Quick Open (Search file by name) |
| \`Ctrl + Shift + P\` / \`F1\` | Command Palette |
| \`Ctrl + F\` / \`Cmd + F\` | Find in Current File |
| \`Alt + Z\` | Toggle Word Wrap |
| \`Ctrl + B\` / \`Cmd + B\` | Toggle Left Sidebar |
| \`Ctrl + N\` | New Note / File |

---

### 🖼️ Example Image & Tasks
- [x] Create first workspace
- [x] Configure offline persistence
- [ ] Add your first project notes

> *"Clean code always looks like it was written by someone who cares."* — Robert C. Martin
`;

  const meetingNotesContent = `# Weekly Sync & Sprint Goals

**Date:** ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
**Participants:** Alex, Morgan, Taylor, Jordan

## 🎯 Priorities This Week
1. [x] Optimize IndexedDB database read/write latency
2. [x] Implement solarized and high-contrast color palettes
3. [ ] Finalize Markdown live split preview
4. [ ] Test 1MB note limit guards with massive JSON datasets

## 💡 Architecture Decisions
- **Storage**: IndexedDB for zero-latency, offline-resilient local persistence.
- **Editor**: Monaco Editor with dynamic language worker detection.
- **Image handling**: Base64 data URLs & file asset nodes.

## 📌 Action Items
- [x] Test responsive resizing on narrow screens
- [ ] Add ZIP workspace export & import functionality
`;

  const pythonSnippet = `"""
Algorithm Snippet: Quick Sort & Binary Search
Offline-first Python note example
"""

def quick_sort(arr: list[int]) -> list[int]:
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quick_sort(left) + middle + quick_sort(right)

def binary_search(arr: list[int], target: int) -> int:
    low, high = 0, len(arr) - 1
    while low <= high:
        mid = (low + high) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1

if __name__ == "__main__":
    test_data = [42, 12, 88, 1, 99, 23, 7, 56]
    sorted_data = quick_sort(test_data)
    print(f"Sorted: {sorted_data}")
    index = binary_search(sorted_data, 23)
    print(f"Found 23 at index: {index}")
`;

  const htmlSnippet = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Live Preview Demo</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      margin: 0;
      padding: 2rem;
      background: linear-gradient(135deg, #1e293b, #0f172a);
      color: #f8fafc;
      min-height: 100vh;
      box-sizing: border-box;
    }
    .card {
      background: rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 12px;
      padding: 1.5rem;
      max-width: 480px;
      margin: 0 auto;
      box-shadow: 0 10px 25px rgba(0,0,0,0.3);
    }
    h1 {
      font-size: 1.5rem;
      color: #38bdf8;
      margin-top: 0;
    }
    button {
      background: #0284c7;
      color: white;
      border: none;
      padding: 0.6rem 1.2rem;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      transition: background 0.2s;
    }
    button:hover {
      background: #0369a1;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>⚡ Interactive HTML Preview</h1>
    <p>Edit this HTML file and switch to <strong>Preview</strong> mode to see live changes instantly!</p>
    <button onclick="alert('Offline HTML Note working perfectly!')">Click Me</button>
  </div>
</body>
</html>
`;

  const cssSnippet = `/* VS Code Notes CSS Theme Variables */
:root {
  --font-mono: 'Fira Code', monospace;
  --color-primary: #007acc;
  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-danger: #ef4444;
}

.note-card {
  border-radius: 8px;
  padding: 16px;
  transition: transform 0.15s ease-in-out;
}

.note-card:hover {
  transform: translateY(-2px);
}
`;

  const sqlSnippet = `-- Sample analytical query for note usage
SELECT 
    f.name AS note_name,
    f.type,
    ROUND(f.size / 1024.0, 2) AS size_kb,
    datetime(f.updated_at / 1000, 'unixepoch') AS last_modified
FROM workspace_files f
WHERE f.size < 1048576
ORDER BY f.updated_at DESC
LIMIT 10;
`;

  const jsonSnippet = `{
  "workspaceName": "My Offline Notes",
  "version": "1.0.0",
  "features": {
    "offlineStorage": true,
    "syntaxHighlighting": true,
    "markdownPreview": true,
    "htmlPreview": true,
    "maxFileSize": "1MB",
    "themeSupport": ["vs-dark", "vs-light", "solarized-dark", "solarized-light", "monokai"]
  },
  "stats": {
    "notesCreated": 7,
    "storageUsed": "28 KB"
  }
}
`;

  const now = Date.now();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  const files: Record<string, FileNode> = {
    'welcome_file': {
      id: 'welcome_file',
      name: 'Welcome.md',
      type: 'file',
      parentId: null,
      content: welcomeContent,
      size: calculateStringSizeBytes(welcomeContent),
      createdAt: now - 2 * 3600000, // Today, 2 hrs ago
      updatedAt: now - 15 * 60000,   // Today, 15 mins ago
    },
    [rootNotesId]: {
      id: rootNotesId,
      name: 'notes',
      type: 'folder',
      parentId: null,
      size: 0,
      createdAt: now - 14 * ONE_DAY_MS,
      updatedAt: now - 1 * ONE_DAY_MS,
      isExpanded: true,
    },
    'file_meeting_notes': {
      id: 'file_meeting_notes',
      name: 'meeting-notes.md',
      type: 'file',
      parentId: rootNotesId,
      content: meetingNotesContent,
      size: calculateStringSizeBytes(meetingNotesContent),
      createdAt: now - 2 * ONE_DAY_MS - 2 * 3600000, // Created 2 days ago
      updatedAt: now - 1 * ONE_DAY_MS - 3 * 3600000, // Updated Yesterday
    },
    [rootSnippetsId]: {
      id: rootSnippetsId,
      name: 'snippets',
      type: 'folder',
      parentId: null,
      size: 0,
      createdAt: now - 14 * ONE_DAY_MS,
      updatedAt: now - 3 * ONE_DAY_MS,
      isExpanded: true,
    },
    'file_python_algo': {
      id: 'file_python_algo',
      name: 'algorithms.py',
      type: 'file',
      parentId: rootSnippetsId,
      content: pythonSnippet,
      size: calculateStringSizeBytes(pythonSnippet),
      createdAt: now - 5 * ONE_DAY_MS - 3600000,     // Created 5 days ago
      updatedAt: now - 3 * ONE_DAY_MS - 6 * 3600000, // Updated 3 days ago
    },
    'file_html_preview': {
      id: 'file_html_preview',
      name: 'preview-demo.html',
      type: 'file',
      parentId: rootSnippetsId,
      content: htmlSnippet,
      size: calculateStringSizeBytes(htmlSnippet),
      createdAt: now - 4 * ONE_DAY_MS - 5 * 3600000, // Created 4 days ago
      updatedAt: now - 2 * ONE_DAY_MS - 4 * 3600000, // Updated 2 days ago
    },
    'file_styles': {
      id: 'file_styles',
      name: 'styles.css',
      type: 'file',
      parentId: rootSnippetsId,
      content: cssSnippet,
      size: calculateStringSizeBytes(cssSnippet),
      createdAt: now - 7 * ONE_DAY_MS - 3 * 3600000, // Created 7 days ago
      updatedAt: now - 5 * ONE_DAY_MS - 2 * 3600000, // Updated 5 days ago
    },
    [rootDataId]: {
      id: rootDataId,
      name: 'data',
      type: 'folder',
      parentId: null,
      size: 0,
      createdAt: now - 14 * ONE_DAY_MS,
      updatedAt: now - 8 * ONE_DAY_MS,
      isExpanded: false,
    },
    'file_config_json': {
      id: 'file_config_json',
      name: 'config.json',
      type: 'file',
      parentId: rootDataId,
      content: jsonSnippet,
      size: calculateStringSizeBytes(jsonSnippet),
      createdAt: now - 10 * ONE_DAY_MS - 4 * 3600000, // Created 10 days ago
      updatedAt: now - 8 * ONE_DAY_MS - 3600000,      // Updated 8 days ago
    },
    'file_query_sql': {
      id: 'file_query_sql',
      name: 'queries.sql',
      type: 'file',
      parentId: rootDataId,
      content: sqlSnippet,
      size: calculateStringSizeBytes(sqlSnippet),
      createdAt: now - 14 * ONE_DAY_MS - 5 * 3600000, // Created 14 days ago
      updatedAt: now - 12 * ONE_DAY_MS - 3 * 3600000, // Updated 12 days ago
    },
    'file_architecture_diagram': {
      id: 'file_architecture_diagram',
      name: 'architecture.excalidraw',
      type: 'file',
      parentId: rootNotesId,
      content: JSON.stringify(DEFAULT_EXCALIDRAW_DATA, null, 2),
      size: calculateStringSizeBytes(JSON.stringify(DEFAULT_EXCALIDRAW_DATA, null, 2)),
      createdAt: now - 6 * 3600000, // Today, 6 hrs ago
      updatedAt: now - 45 * 60000,  // Today, 45 mins ago
    },
    'file_sprint_kanban': {
      id: 'file_sprint_kanban',
      name: 'sprint-board.kanban',
      type: 'file',
      parentId: rootNotesId,
      content: serializeKanbanData(createDefaultKanbanBoard('Sprint 14 Kanban & Roadmap')),
      size: calculateStringSizeBytes(serializeKanbanData(createDefaultKanbanBoard('Sprint 14 Kanban & Roadmap'))),
      createdAt: now - 2 * 3600000,
      updatedAt: now - 15 * 60000,
    },
  };

  return {
    version: 1,
    files,
    openTabIds: ['welcome_file', 'file_sprint_kanban', 'file_architecture_diagram', 'file_meeting_notes', 'file_python_algo'],
    activeTabId: 'welcome_file',
    lastUpdated: now,
  };
}

export async function loadWorkspace(): Promise<Workspace> {
  try {
    const saved = await get<Workspace>(STORAGE_KEY);
    if (saved && saved.files && Object.keys(saved.files).length > 0) {
      // Ensure existing users get the demo architecture diagram if no excalidraw file exists
      const hasExcalidraw = Object.values(saved.files).some((f) => f.name.toLowerCase().endsWith('.excalidraw'));
      if (!hasExcalidraw) {
        const demoId = 'file_architecture_diagram';
        const now = Date.now();
        const demoContent = JSON.stringify(DEFAULT_EXCALIDRAW_DATA, null, 2);
        const rootNotes = Object.values(saved.files).find((f) => f.type === 'folder' && f.name === 'notes');
        const parentId = rootNotes ? rootNotes.id : null;
        saved.files[demoId] = {
          id: demoId,
          name: 'architecture.excalidraw',
          type: 'file',
          parentId,
          content: demoContent,
          size: calculateStringSizeBytes(demoContent),
          createdAt: now - 1200000,
          updatedAt: now - 50000,
        };
        if (!saved.openTabIds.includes(demoId)) {
          saved.openTabIds.splice(1, 0, demoId);
        }
      }

      // Ensure existing users get the demo sprint kanban board if no kanban file exists
      const hasKanban = Object.values(saved.files).some((f) => f.name.toLowerCase().endsWith('.kanban') || f.name.toLowerCase().endsWith('.kanban.json'));
      if (!hasKanban) {
        const kanbanId = 'file_sprint_kanban';
        const now = Date.now();
        const kanbanContent = serializeKanbanData(createDefaultKanbanBoard('Sprint 14 Kanban & Roadmap'));
        const rootNotes = Object.values(saved.files).find((f) => f.type === 'folder' && f.name === 'notes');
        const parentId = rootNotes ? rootNotes.id : null;
        saved.files[kanbanId] = {
          id: kanbanId,
          name: 'sprint-board.kanban',
          type: 'file',
          parentId,
          content: kanbanContent,
          size: calculateStringSizeBytes(kanbanContent),
          createdAt: now - 1800000,
          updatedAt: now - 120000,
        };
        if (!saved.openTabIds.includes(kanbanId)) {
          saved.openTabIds.splice(1, 0, kanbanId);
        }
      }

      return saved;
    }
  } catch (err) {
    console.warn('Failed to read from IndexedDB, trying localStorage fallback:', err);
    try {
      const local = localStorage.getItem(STORAGE_KEY);
      if (local) {
        const parsed = JSON.parse(local);
        if (parsed && parsed.files && Object.keys(parsed.files).length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
  }

  const defaultWs = createDefaultWorkspace();
  await saveWorkspace(defaultWs);
  return defaultWs;
}

export async function saveWorkspace(workspace: Workspace): Promise<void> {
  try {
    await set(STORAGE_KEY, workspace);
  } catch (err) {
    console.error('Error saving workspace to IndexedDB:', err);
    try {
      // Fallback only if payload is not too huge
      localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
    } catch (localErr) {
      console.error('Failed to save to localStorage:', localErr);
    }
  }
}

// Calculate total workspace size and count
export function getWorkspaceStats(files: Record<string, FileNode>) {
  let totalBytes = 0;
  let fileCount = 0;
  let folderCount = 0;

  Object.values(files).forEach((node) => {
    if (node.type === 'file') {
      fileCount++;
      totalBytes += node.size || 0;
    } else {
      folderCount++;
    }
  });

  return {
    totalBytes,
    formattedTotalSize: formatBytes(totalBytes),
    fileCount,
    folderCount,
  };
}

// Build file path like /notes/meeting-notes.md
export function getFilePath(fileId: string, files: Record<string, FileNode>): string {
  const node = files[fileId];
  if (!node) return '';

  const pathParts: string[] = [node.name];
  let currentParentId = node.parentId;

  while (currentParentId && files[currentParentId]) {
    const parent = files[currentParentId];
    pathParts.unshift(parent.name);
    currentParentId = parent.parentId;
  }

  return '/' + pathParts.join('/');
}

// Export entire workspace to a downloadable ZIP file
export async function exportWorkspaceToZip(files: Record<string, FileNode>): Promise<Blob> {
  const zip = new JSZip();

  function addFolderToZip(folderId: string | null, currentZipFolder: JSZip) {
    const children = Object.values(files).filter(f => f.parentId === folderId);
    
    for (const child of children) {
      if (child.type === 'folder') {
        const subFolder = currentZipFolder.folder(child.name);
        if (subFolder) {
          addFolderToZip(child.id, subFolder);
        }
      } else {
        if (child.isBinary && child.content && child.content.startsWith('data:')) {
          // Convert data url base64 to binary
          const base64Data = child.content.split(',')[1];
          currentZipFolder.file(child.name, base64Data, { base64: true });
        } else {
          currentZipFolder.file(child.name, child.content || '');
        }
      }
    }
  }

  addFolderToZip(null, zip);
  return await zip.generateAsync({ type: 'blob' });
}

// Read uploaded single file or image as text or DataURL
export async function readFileAsNode(file: File, parentId: string | null): Promise<FileNode> {
  if (file.size > MAX_NOTE_SIZE_BYTES) {
    throw new Error(`File "${file.name}" exceeds the 1MB maximum note size limit (${formatBytes(file.size)}).`);
  }

  const isImage = file.type.startsWith('image/');
  let content = '';

  if (isImage) {
    content = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  } else {
    content = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  const now = Date.now();
  return {
    id: generateId(),
    name: file.name,
    type: 'file',
    parentId,
    content,
    size: file.size,
    createdAt: now,
    updatedAt: now,
    isBinary: isImage,
    mimeType: file.type || 'text/plain',
  };
}
