import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Excalidraw, exportToBlob, exportToSvg } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import { ThemeType } from '../types';
import { THEMES } from '../utils/themes';
import { parseExcalidrawContent, EMPTY_EXCALIDRAW_DATA } from '../utils/excalidrawTemplates';
import { Download, Image as ImageIcon, Sparkles, RefreshCw, Check } from 'lucide-react';

interface ExcalidrawEditorProps {
  fileId: string;
  content: string;
  filename: string;
  currentTheme: ThemeType;
  onUpdateContent: (fileId: string, newContent: string) => void;
}

export const ExcalidrawEditor: React.FC<ExcalidrawEditorProps> = ({
  fileId,
  content,
  filename,
  currentTheme,
  onUpdateContent,
}) => {
  const theme = THEMES[currentTheme];
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
  const [exporting, setExporting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Stable refs to prevent stale closure bugs across tab switching & unmounts
  const fileIdRef = useRef<string>(fileId);
  fileIdRef.current = fileId;
  const onUpdateContentRef = useRef(onUpdateContent);
  onUpdateContentRef.current = onUpdateContent;

  // Track the last JSON string saved or received
  const lastSavedJsonRef = useRef<string>(content || '');
  const latestSceneDataRef = useRef<string>(content || '');
  const isInternalUpdateRef = useRef<boolean>(false);
  const debounceTimerRef = useRef<any>(null);

  // Parse initial data once for this component instance (keyed by fileId in parent)
  const initialData = useMemo(() => {
    const parsed = parseExcalidrawContent(content);
    const initialJson = JSON.stringify(parsed, null, 2);
    lastSavedJsonRef.current = initialJson;
    latestSceneDataRef.current = initialJson;
    return parsed;
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Sync external text edits (e.g. from Monaco in split view) into Excalidraw canvas
  useEffect(() => {
    if (!excalidrawAPI) return;
    if (isInternalUpdateRef.current) {
      isInternalUpdateRef.current = false;
      return;
    }

    if (content && content !== lastSavedJsonRef.current && content !== latestSceneDataRef.current) {
      try {
        const parsed = parseExcalidrawContent(content);
        lastSavedJsonRef.current = content;
        latestSceneDataRef.current = content;
        excalidrawAPI.updateScene({
          elements: parsed.elements || [],
          appState: {
            viewBackgroundColor: parsed.appState?.viewBackgroundColor || (theme.isDark ? '#121212' : '#ffffff'),
            ...(parsed.appState || {}),
          },
          files: parsed.files || {},
          commitToHistory: true,
        });
      } catch {
        // Ignore parsing errors during intermediate typing in Monaco
      }
    }
  }, [content, excalidrawAPI, theme.isDark]);

  // Handle internal updates from Excalidraw canvas to workspace state & IndexedDB
  const handleExcalidrawChange = useCallback(
    (elements: readonly any[], appState: any, files: any) => {
      const nonDeletedElements = elements.filter((el) => !el.isDeleted);

      const dataToSave = {
        type: 'excalidraw',
        version: 2,
        source: 'https://excalidraw.com',
        elements: nonDeletedElements,
        appState: {
          viewBackgroundColor: appState?.viewBackgroundColor || (theme.isDark ? '#121212' : '#ffffff'),
          gridSize: appState?.gridSize || null,
        },
        files: files || {},
      };

      const newJson = JSON.stringify(dataToSave, null, 2);
      latestSceneDataRef.current = newJson;

      // Only save if JSON actually changed
      if (newJson !== lastSavedJsonRef.current) {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }

        // Debounce slightly (100ms) for high-frequency pointer moves
        debounceTimerRef.current = setTimeout(() => {
          lastSavedJsonRef.current = newJson;
          isInternalUpdateRef.current = true;
          onUpdateContentRef.current(fileIdRef.current, newJson);
        }, 100);
      }
    },
    [theme.isDark]
  );

  // Clean unmount check to guarantee latest scene is persisted immediately if user switches tabs
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (latestSceneDataRef.current && latestSceneDataRef.current !== lastSavedJsonRef.current) {
        onUpdateContentRef.current(fileIdRef.current, latestSceneDataRef.current);
        lastSavedJsonRef.current = latestSceneDataRef.current;
      }
    };
  }, []);

  // Export scene to PNG
  const handleExportPNG = async () => {
    if (!excalidrawAPI) return;
    try {
      setExporting(true);
      const elements = excalidrawAPI.getSceneElements();
      const appState = excalidrawAPI.getAppState();
      const files = excalidrawAPI.getFiles();

      const blob = await exportToBlob({
        elements,
        appState: {
          ...appState,
          exportWithDarkMode: theme.isDark,
          exportBackground: true,
        },
        files,
        mimeType: 'image/png',
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename.replace(/\.[^/.]+$/, '') || 'diagram'}.png`;
      link.click();
      URL.revokeObjectURL(url);
      showToast('Exported PNG successfully');
    } catch (err) {
      console.error('Failed to export PNG:', err);
      showToast('Failed to export PNG');
    } finally {
      setExporting(false);
    }
  };

  // Export scene to SVG
  const handleExportSVG = async () => {
    if (!excalidrawAPI) return;
    try {
      setExporting(true);
      const elements = excalidrawAPI.getSceneElements();
      const appState = excalidrawAPI.getAppState();
      const files = excalidrawAPI.getFiles();

      const svg = await exportToSvg({
        elements,
        appState: {
          ...appState,
          exportWithDarkMode: theme.isDark,
          exportBackground: true,
        },
        files,
      });

      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svg);
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename.replace(/\.[^/.]+$/, '') || 'diagram'}.svg`;
      link.click();
      URL.revokeObjectURL(url);
      showToast('Exported SVG successfully');
    } catch (err) {
      console.error('Failed to export SVG:', err);
      showToast('Failed to export SVG');
    } finally {
      setExporting(false);
    }
  };

  // Clear Canvas to empty
  const handleClearCanvas = () => {
    if (!excalidrawAPI) return;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    excalidrawAPI.resetScene();
    const emptyJson = JSON.stringify(EMPTY_EXCALIDRAW_DATA, null, 2);
    lastSavedJsonRef.current = emptyJson;
    latestSceneDataRef.current = emptyJson;
    isInternalUpdateRef.current = true;
    onUpdateContentRef.current(fileIdRef.current, emptyJson);
    showToast('Canvas cleared');
  };

  return (
    <div
      id="excalidraw-editor-container"
      className="w-full h-full flex flex-col relative overflow-hidden select-none"
      style={{ backgroundColor: theme.ui.bgEditor }}
    >
      {/* Excalidraw Action Bar */}
      <div
        className="h-9 px-3 border-b flex items-center justify-between shrink-0 text-xs z-10"
        style={{
          backgroundColor: theme.ui.bgTabs,
          borderColor: theme.ui.border,
          color: theme.ui.textMain,
        }}
      >
        <div className="flex items-center gap-2">
          <span
            className="font-semibold flex items-center gap-1.5"
            style={{ color: theme.isDark ? '#a78bfa' : '#7c3aed' }}
          >
            <Sparkles size={14} className="text-violet-500" />
            Excalidraw Canvas
          </span>
          <span className="opacity-40 text-[11px]">|</span>
          <span className="opacity-80 text-[11px] truncate max-w-[200px] font-mono">{filename}</span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Clear Canvas */}
          <button
            id="excalidraw-btn-clear"
            onClick={handleClearCanvas}
            className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium transition-all shadow-2xs border hover:text-red-500 hover:border-red-400"
            style={{
              backgroundColor: theme.isDark ? '#2a2d32' : '#ffffff',
              borderColor: theme.isDark ? '#3e4451' : '#cbd5e1',
              color: theme.isDark ? '#f1f5f9' : '#1e293b',
            }}
            title="Reset and clear canvas to blank"
          >
            <RefreshCw size={11} className="text-red-500" />
            <span>Clear</span>
          </button>

          {/* Export PNG */}
          <button
            id="excalidraw-btn-export-png"
            onClick={handleExportPNG}
            disabled={exporting}
            className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-2xs disabled:opacity-50"
            title="Export diagram as PNG image"
          >
            <ImageIcon size={12} />
            <span>PNG</span>
          </button>

          {/* Export SVG */}
          <button
            id="excalidraw-btn-export-svg"
            onClick={handleExportSVG}
            disabled={exporting}
            className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-2xs disabled:opacity-50"
            title="Export diagram as vector SVG"
          >
            <Download size={12} />
            <span>SVG</span>
          </button>
        </div>
      </div>

      {/* Excalidraw Main Canvas Viewport */}
      <div className="flex-1 w-full h-[calc(100%-36px)] relative">
        <Excalidraw
          excalidrawAPI={(api) => setExcalidrawAPI(api)}
          initialData={initialData}
          onChange={handleExcalidrawChange}
          theme={theme.isDark ? 'dark' : 'light'}
          UIOptions={{
            canvasActions: {
              changeViewBackgroundColor: true,
              clearCanvas: true,
              export: {
                saveFileToDisk: true,
              },
              loadScene: true,
              saveToActiveFile: true,
              toggleTheme: true,
            },
          }}
        />
      </div>

      {/* Live feedback toast */}
      {toastMessage && (
        <div
          className="absolute bottom-4 right-4 px-3 py-1.5 rounded-lg shadow-xl text-xs flex items-center gap-2 z-50 animate-in fade-in zoom-in-95 duration-100"
          style={{
            backgroundColor: theme.ui.modalBg,
            borderColor: theme.ui.border,
            borderWidth: 1,
            color: theme.ui.textMain,
          }}
        >
          <Check size={13} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
