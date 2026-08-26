import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Excalidraw, exportToBlob, exportToSvg } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import { ThemeType } from '../types';
import { THEMES } from '../utils/themes';
import { parseExcalidrawContent, DEFAULT_EXCALIDRAW_DATA, FLOWCHART_EXCALIDRAW_DATA, EMPTY_EXCALIDRAW_DATA } from '../utils/excalidrawTemplates';
import { Download, Image as ImageIcon, Sparkles, RefreshCw, ZoomIn, FileCode, Check, ChevronDown } from 'lucide-react';

interface ExcalidrawEditorProps {
  content: string;
  filename: string;
  currentTheme: ThemeType;
  onUpdateContent: (newContent: string) => void;
}

export const ExcalidrawEditor: React.FC<ExcalidrawEditorProps> = ({
  content,
  filename,
  currentTheme,
  onUpdateContent,
}) => {
  const theme = THEMES[currentTheme];
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
  const [exporting, setExporting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Tracking refs to avoid circular updates between Monaco code editor and Excalidraw
  const lastSerializedJsonRef = useRef<string>(content);
  const isInternalUpdateRef = useRef<boolean>(false);
  const initialDataRef = useRef<any>(null);

  if (!initialDataRef.current) {
    initialDataRef.current = parseExcalidrawContent(content);
  }

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Sync external text edits (e.g. from Monaco JSON editor) into Excalidraw canvas
  useEffect(() => {
    if (!excalidrawAPI) return;
    if (isInternalUpdateRef.current) {
      isInternalUpdateRef.current = false;
      return;
    }

    if (content !== lastSerializedJsonRef.current) {
      try {
        const parsed = parseExcalidrawContent(content);
        lastSerializedJsonRef.current = content;
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
        // Ignore parsing errors while user is actively typing invalid intermediate JSON in the editor
      }
    }
  }, [content, excalidrawAPI, theme.isDark]);

  // Handle internal updates from Excalidraw canvas to parent
  const handleExcalidrawChange = useCallback(
    (elements: readonly any[], appState: any, files: any) => {
      if (!excalidrawAPI) return;

      const nonDeletedElements = elements.filter((el) => !el.isDeleted);
      const dataToSave = {
        type: 'excalidraw',
        version: 2,
        source: 'https://excalidraw.com',
        elements: nonDeletedElements,
        appState: {
          viewBackgroundColor: appState.viewBackgroundColor || (theme.isDark ? '#121212' : '#ffffff'),
          gridSize: appState.gridSize || null,
        },
        files: files || {},
      };

      const newJson = JSON.stringify(dataToSave, null, 2);

      // Only propagate if serialized JSON changed significantly
      if (newJson !== lastSerializedJsonRef.current) {
        lastSerializedJsonRef.current = newJson;
        isInternalUpdateRef.current = true;
        onUpdateContent(newJson);
      }
    },
    [excalidrawAPI, onUpdateContent, theme.isDark]
  );

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

  const [showTemplateMenu, setShowTemplateMenu] = useState(false);

  // Clear Canvas to empty template
  const handleClearCanvas = () => {
    if (!excalidrawAPI) return;
    excalidrawAPI.resetScene();
    const emptyJson = JSON.stringify(EMPTY_EXCALIDRAW_DATA, null, 2);
    lastSerializedJsonRef.current = emptyJson;
    onUpdateContent(emptyJson);
    showToast('Canvas cleared');
  };

  // Load starter template
  const handleLoadTemplate = (templateData: any, name: string) => {
    if (!excalidrawAPI) return;
    setShowTemplateMenu(false);
    excalidrawAPI.updateScene({
      elements: templateData.elements,
      appState: {
        viewBackgroundColor: theme.isDark ? '#1e1e1e' : '#ffffff',
      },
      commitToHistory: true,
    });
    const templateJson = JSON.stringify(templateData, null, 2);
    lastSerializedJsonRef.current = templateJson;
    onUpdateContent(templateJson);
    showToast(`Loaded ${name}`);
  };

  return (
    <div
      id="excalidraw-editor-container"
      className="w-full h-full flex flex-col relative overflow-hidden select-none"
      style={{ backgroundColor: theme.ui.bgEditor }}
    >
      {/* Excalidraw Custom Quick Action Bar */}
      <div
        className="h-9 px-3 border-b flex items-center justify-between shrink-0 text-xs z-10"
        style={{
          backgroundColor: theme.ui.bgTabs,
          borderColor: theme.ui.border,
          color: theme.ui.textMain,
        }}
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold flex items-center gap-1.5" style={{ color: theme.isDark ? '#a78bfa' : '#7c3aed' }}>
            <Sparkles size={14} className="text-violet-500" />
            Excalidraw Canvas
          </span>
          <span className="opacity-40 text-[11px]">|</span>
          <span className="opacity-80 text-[11px] truncate max-w-[160px] font-mono">{filename}</span>
        </div>

        <div className="flex items-center gap-1.5 relative">
          {/* Load Sample Template Dropdown */}
          <div className="relative">
            <button
              id="excalidraw-btn-sample"
              onClick={() => setShowTemplateMenu(!showTemplateMenu)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition-all shadow-xs border"
              style={{
                backgroundColor: theme.isDark ? '#2a2d32' : '#ffffff',
                borderColor: theme.isDark ? '#3e4451' : '#cbd5e1',
                color: theme.isDark ? '#f1f5f9' : '#1e293b',
              }}
              title="Load diagram sample templates"
            >
              <Sparkles size={12} className="text-amber-500" />
              <span>Sample</span>
              <ChevronDown size={11} className="opacity-70" />
            </button>

            {showTemplateMenu && (
              <div
                className="absolute right-0 top-full mt-1 w-48 rounded-md shadow-lg border py-1 z-50 text-xs animate-in fade-in zoom-in-95 duration-100"
                style={{
                  backgroundColor: theme.ui.modalBg,
                  borderColor: theme.ui.border,
                  color: theme.ui.textMain,
                }}
              >
                <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider opacity-60">
                  Choose Template
                </div>
                <button
                  onClick={() => handleLoadTemplate(DEFAULT_EXCALIDRAW_DATA, 'System Architecture')}
                  className="w-full px-2.5 py-1.5 text-left flex items-center gap-2 hover:bg-violet-600 hover:text-white transition-colors"
                >
                  <span>🏗️</span>
                  <span>System Architecture</span>
                </button>
                <button
                  onClick={() => handleLoadTemplate(FLOWCHART_EXCALIDRAW_DATA, 'Process Flowchart')}
                  className="w-full px-2.5 py-1.5 text-left flex items-center gap-2 hover:bg-violet-600 hover:text-white transition-colors"
                >
                  <span>🔀</span>
                  <span>Process Flowchart</span>
                </button>
              </div>
            )}
          </div>

          {/* Clear Canvas */}
          <button
            id="excalidraw-btn-clear"
            onClick={handleClearCanvas}
            className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-all shadow-xs border hover:text-red-500"
            style={{
              backgroundColor: theme.isDark ? '#2a2d32' : '#ffffff',
              borderColor: theme.isDark ? '#3e4451' : '#cbd5e1',
              color: theme.isDark ? '#f1f5f9' : '#1e293b',
            }}
            title="Reset and clear canvas"
          >
            <RefreshCw size={11} className="text-red-500" />
            <span>Clear</span>
          </button>

          {/* Export PNG */}
          <button
            id="excalidraw-btn-export-png"
            onClick={handleExportPNG}
            disabled={exporting}
            className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-xs disabled:opacity-50"
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
            className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-xs disabled:opacity-50"
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
          initialData={initialDataRef.current}
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
