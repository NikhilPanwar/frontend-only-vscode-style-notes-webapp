export type FileType = 'file' | 'folder';

export interface FileNode {
  id: string;
  name: string;
  type: FileType;
  parentId: string | null;
  content?: string; // Text content or base64 data URL for images
  size: number; // Size in bytes
  createdAt: number;
  updatedAt: number;
  isBinary?: boolean; // For image / media files
  mimeType?: string;
  isExpanded?: boolean; // For folders
}

export interface Workspace {
  version: number;
  files: Record<string, FileNode>;
  openTabIds: string[];
  activeTabId: string | null;
  lastUpdated: number;
}

export type ThemeType = 
  | 'vs-dark' 
  | 'vs-light' 
  | 'solarized-dark' 
  | 'solarized-light' 
  | 'monokai' 
  | 'high-contrast-dark';

export interface EditorSettings {
  theme: ThemeType;
  wordWrap: boolean;
  fontSize: number;
  tabSize: number;
  minimap: boolean;
  lineNumbers: 'on' | 'off' | 'relative';
  previewMode: 'editor' | 'split' | 'preview'; // For md & html
  autoSaveDelay: number;
  maxOpenTabs: number; // Maximum concurrent open tabs (default: 10)
}

export interface SearchMatch {
  fileId: string;
  fileName: string;
  filePath: string;
  lineNumber: number;
  lineContent: string;
  matchIndex: number;
  matchLength: number;
}

export type ActiveSidebarTab = 'explorer' | 'search' | 'settings' | 'info';

export interface CursorPosition {
  lineNumber: number;
  column: number;
}

export const MAX_NOTE_SIZE_BYTES = 1024 * 1024; // 1 MB limit per note

// --- Kanban Board Types (.kanban files) ---
export type KanbanPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface KanbanSubtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface KanbanTag {
  id: string;
  name: string;
  color: string;
}

export interface KanbanTask {
  id: string;
  title: string;
  description?: string;
  priority: KanbanPriority;
  tags: string[];
  dueDate?: string; // YYYY-MM-DD
  subtasks: KanbanSubtask[];
  columnId: string;
  createdAt: number;
  updatedAt: number;
  assignee?: string;
}

export interface KanbanColumn {
  id: string;
  title: string;
  color: string;
  taskIds: string[];
}

export interface KanbanBoardData {
  type: 'kanban';
  version: 1;
  title: string;
  description?: string;
  columns: KanbanColumn[];
  tasks: Record<string, KanbanTask>;
  customTags?: KanbanTag[];
}
