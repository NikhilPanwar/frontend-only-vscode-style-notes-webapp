import { FileNode, Workspace, ThemeType, EditorSettings } from '../types';

export type SyncEventType =
  | 'FILE_CONTENT_UPDATED'
  | 'FILE_CREATED'
  | 'FOLDER_CREATED'
  | 'NODE_RENAMED'
  | 'NODE_DELETED'
  | 'NODE_MOVED'
  | 'NODES_DUPLICATED'
  | 'FILES_BATCH_ADDED'
  | 'SETTINGS_UPDATED'
  | 'THEME_CHANGED'
  | 'WORKSPACE_RESET'
  | 'TAB_PING';

export interface SyncMessagePayloads {
  FILE_CONTENT_UPDATED: {
    fileId: string;
    content: string;
    size: number;
    updatedAt: number;
  };
  FILE_CREATED: {
    file: FileNode;
    openInTab?: boolean;
  };
  FOLDER_CREATED: {
    folder: FileNode;
  };
  NODE_RENAMED: {
    id: string;
    newName: string;
    updatedAt: number;
  };
  NODE_DELETED: {
    deletedIds: string[];
    targetId: string;
  };
  NODE_MOVED: {
    sourceId: string;
    targetParentId: string | null;
    newName: string;
    updatedAt: number;
  };
  NODES_DUPLICATED: {
    newNodes: FileNode[];
    rootNewId: string;
  };
  FILES_BATCH_ADDED: {
    nodes: FileNode[];
    activeId?: string;
  };
  SETTINGS_UPDATED: {
    settings: Partial<EditorSettings>;
  };
  THEME_CHANGED: {
    theme: ThemeType;
  };
  WORKSPACE_RESET: {
    workspace: Workspace;
  };
  TAB_PING: {
    timestamp: number;
  };
}

export type SyncMessage = {
  [K in SyncEventType]: {
    type: K;
    originTabId: string;
    timestamp: number;
    payload: SyncMessagePayloads[K];
  };
}[SyncEventType];

const CHANNEL_NAME = 'vscode_notes_sync_bus';
const FALLBACK_STORAGE_KEY = 'vscode_notes_cross_tab_sync_fallback';

// Unique session identifier for the current browser tab/window
export const currentTabId = 'tab_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);

class CrossTabSyncBus {
  private channel: BroadcastChannel | null = null;
  private listeners: Set<(message: SyncMessage) => void> = new Set();
  private hasBroadcastChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window;

  constructor() {
    if (typeof window === 'undefined') return;

    if (this.hasBroadcastChannel) {
      try {
        this.channel = new BroadcastChannel(CHANNEL_NAME);
        this.channel.onmessage = (event: MessageEvent<SyncMessage>) => {
          this.handleIncoming(event.data);
        };
      } catch (err) {
        console.warn('[SyncBus] Failed to initialize BroadcastChannel, falling back to storage events:', err);
        this.channel = null;
      }
    }

    // Storage event fallback for cross-tab communication
    window.addEventListener('storage', (event) => {
      if (event.key === FALLBACK_STORAGE_KEY && event.newValue) {
        try {
          const msg = JSON.parse(event.newValue) as SyncMessage;
          this.handleIncoming(msg);
        } catch {
          // ignore corrupted payload
        }
      }
    });
  }

  private handleIncoming(message: SyncMessage) {
    if (!message || message.originTabId === currentTabId) {
      return; // Ignore messages originating from this tab
    }

    this.listeners.forEach((listener) => {
      try {
        listener(message);
      } catch (err) {
        console.error('[SyncBus] Error in message listener:', err);
      }
    });
  }

  public subscribe(listener: (message: SyncMessage) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public publish<T extends SyncEventType>(type: T, payload: SyncMessagePayloads[T]) {
    if (typeof window === 'undefined') return;

    const message = {
      type,
      originTabId: currentTabId,
      timestamp: Date.now(),
      payload,
    } as SyncMessage;

    // 1. BroadcastChannel (fast, memory-efficient)
    if (this.channel) {
      try {
        this.channel.postMessage(message);
      } catch (err) {
        console.warn('[SyncBus] BroadcastChannel postMessage error:', err);
      }
    }

    // 2. LocalStorage heartbeat fallback (ensures cross-tab sync even if BroadcastChannel has quirks)
    try {
      localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(message));
    } catch {
      // ignore storage quota errors for large payloads
    }
  }

  public destroy() {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    this.listeners.clear();
  }
}

// Singleton sync bus instance
export const syncBus = new CrossTabSyncBus();
