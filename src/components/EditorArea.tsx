import React, { useRef, useEffect, useState, useCallback } from 'react';
import Editor, { Monaco, OnMount } from '@monaco-editor/react';
import { FileNode, EditorSettings, ThemeType, CursorPosition, MAX_NOTE_SIZE_BYTES } from '../types';
import { THEMES, registerMonacoThemes } from '../utils/themes';
import { detectLanguageByFilename, isImageFile, isMarkdownFile, isHtmlFile, isExcalidrawFile, isKanbanFile } from '../utils/languageDetector';
import { MarkdownPreview } from './MarkdownPreview';
import { HtmlPreview } from './HtmlPreview';
import { ExcalidrawEditor } from './ExcalidrawEditor';
import { KanbanEditor } from './KanbanEditor';
import { ImageViewer } from './ImageViewer';
import { EmptyEditorState } from './EmptyEditorState';
import { formatBytes, calculateStringSizeBytes } from '../utils/storage';
import { AlertTriangle, HardDrive, CheckCircle } from 'lucide-react';

interface EditorAreaProps {
  activeFile: FileNode | null;
  files: Record<string, FileNode>;
  currentTheme: ThemeType;
  settings: EditorSettings;
  targetLineNumber?: number;
  isMobile?: boolean;
  onContentChange: (fileId: string, newContent: string) => void;
  onCursorChange: (pos: CursorPosition) => void;
  onCreateNewFile: () => void;
  onOpenQuickOpen: () => void;
  onOpenThemeSettings: () => void;
  onPasteImageIntoEditor: (dataUrl: string, customAlt?: string) => { imgTag: string; filename: string } | undefined;
}

export const EditorArea: React.FC<EditorAreaProps> = ({
  activeFile,
  files,
  currentTheme,
  settings,
  targetLineNumber,
  isMobile = false,
  onContentChange,
  onCursorChange,
  onCreateNewFile,
  onOpenQuickOpen,
  onOpenThemeSettings,
  onPasteImageIntoEditor,
}) => {
  const theme = THEMES[currentTheme];
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<Monaco | null>(null);

  // Local state for debounced text to keep typing super responsive
  const [prevFileId, setPrevFileId] = useState<string | null>(activeFile?.id || null);
  const [localContent, setLocalContent] = useState<string>(activeFile?.content || '');
  const [sizeWarning, setSizeWarning] = useState<string | null>(null);
  const [isDragOverEditor, setIsDragOverEditor] = useState(false);
  const lastUserTypedTime = useRef<number>(0);

  // Synchronize immediately during render when activeFile changes to avoid stale render lag
  if (activeFile && activeFile.id !== prevFileId) {
    setPrevFileId(activeFile.id);
    setLocalContent(activeFile.content || '');
  }

  // Synchronize when activeFile content changes remotely from another tab
  useEffect(() => {
    if (!activeFile) return;
    const now = Date.now();
    // If not recently typed locally (within 350ms) and prop content differs, update local content
    if (activeFile.content !== undefined && activeFile.content !== localContent) {
      if (now - lastUserTypedTime.current > 350) {
        setLocalContent(activeFile.content);
        if (editorRef.current && editorRef.current.getValue() !== activeFile.content) {
          const pos = editorRef.current.getPosition();
          editorRef.current.setValue(activeFile.content);
          if (pos) editorRef.current.setPosition(pos);
        }
      }
    }
  }, [activeFile?.content, activeFile?.updatedAt]);

  useEffect(() => {
    if (activeFile) {
      const bytes = calculateStringSizeBytes(activeFile.content || '');
      if (bytes > MAX_NOTE_SIZE_BYTES) {
        setSizeWarning(`Note exceeds 1MB limit (${formatBytes(bytes)} / 1.00 MB)`);
      } else if (bytes > MAX_NOTE_SIZE_BYTES * 0.9) {
        setSizeWarning(`Note is near 1MB limit (${formatBytes(bytes)} / 1.00 MB)`);
      } else {
        setSizeWarning(null);
      }
    }
  }, [activeFile?.id]);

  // Insert image markdown tag into editor or content
  const insertImageTag = useCallback((imgTag: string) => {
    if (editorRef.current && monacoRef.current) {
      const selection = editorRef.current.getSelection() || new monacoRef.current.Range(1, 1, 1, 1);
      const op = {
        range: selection,
        text: imgTag,
        forceMoveMarkers: true,
      };
      editorRef.current.executeEdits('paste-image', [op]);
      editorRef.current.focus();
    } else if (activeFile) {
      const updated = (localContent ? localContent + '\n\n' : '') + imgTag;
      setLocalContent(updated);
      onContentChange(activeFile.id, updated);
    }
  }, [activeFile, localContent, onContentChange]);

  // Handle Pasting Image directly into Editor
  const handleEditorPaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items || !activeFile) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        e.preventDefault();
        e.stopPropagation();
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result as string;
            const res = onPasteImageIntoEditor(dataUrl, 'image');
            if (res?.imgTag) {
              insertImageTag(res.imgTag);
            }
          };
          reader.readAsDataURL(file);
          return;
        }
      }
    }
  }, [activeFile, insertImageTag, onPasteImageIntoEditor]);

  // Handle Drag & Drop of image files into editor
  const handleEditorDrop = useCallback((e: React.DragEvent) => {
    if (!activeFile) return;
    setIsDragOverEditor(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        e.preventDefault();
        e.stopPropagation();
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          const res = onPasteImageIntoEditor(dataUrl, file.name.replace(/\.[^/.]+$/, '') || 'image');
          if (res?.imgTag) {
            insertImageTag(res.imgTag);
          }
        };
        reader.readAsDataURL(file);
      }
    }
  }, [activeFile, insertImageTag, onPasteImageIntoEditor]);

  // Jump to target line if requested by search or palette
  useEffect(() => {
    if (targetLineNumber && editorRef.current) {
      editorRef.current.revealLineInCenter(targetLineNumber);
      editorRef.current.setPosition({ lineNumber: targetLineNumber, column: 1 });
      editorRef.current.focus();
    }
  }, [targetLineNumber]);

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    registerMonacoThemes(monaco);
    monaco.editor.setTheme(theme.monacoTheme);

    editor.onDidChangeCursorPosition((e) => {
      onCursorChange({
        lineNumber: e.position.lineNumber,
        column: e.position.column,
      });
    });

    if (targetLineNumber) {
      editor.revealLineInCenter(targetLineNumber);
      editor.setPosition({ lineNumber: targetLineNumber, column: 1 });
    }
  };

  useEffect(() => {
    if (monacoRef.current) {
      monacoRef.current.editor.setTheme(theme.monacoTheme);
    }
  }, [currentTheme, theme.monacoTheme]);

  const handleEditorChange = (value: string | undefined) => {
    if (!activeFile) return;
    lastUserTypedTime.current = Date.now();
    const text = value || '';
    const bytes = calculateStringSizeBytes(text);

    if (bytes > MAX_NOTE_SIZE_BYTES) {
      setSizeWarning(`Warning: Note size ${formatBytes(bytes)} exceeds 1.00 MB limit!`);
    } else if (bytes > MAX_NOTE_SIZE_BYTES * 0.9) {
      setSizeWarning(`Warning: Approaching 1MB limit (${formatBytes(bytes)} / 1.00 MB)`);
    } else {
      setSizeWarning(null);
    }

    setLocalContent(text);
    onContentChange(activeFile.id, text);
  };

  if (!activeFile) {
    return (
      <EmptyEditorState
        currentTheme={currentTheme}
        onCreateNewFile={onCreateNewFile}
        onOpenQuickOpen={onOpenQuickOpen}
        onOpenThemeSettings={onOpenThemeSettings}
      />
    );
  }

  // Handle Binary / Image files
  if (isImageFile(activeFile.name) || activeFile.isBinary) {
    return <ImageViewer file={activeFile} currentTheme={currentTheme} />;
  }

  const langInfo = detectLanguageByFilename(activeFile.name);
  const isMd = isMarkdownFile(activeFile.name);
  const isHtml = isHtmlFile(activeFile.name);
  const isExcalidraw = isExcalidrawFile(activeFile.name);
  const isKanban = isKanbanFile(activeFile.name);
  const supportsPreview = isMd || isHtml || isExcalidraw || isKanban;
  const previewMode = settings.previewMode;

  // For kanban or excalidraw files, when in preview mode or default split/preview, show the visual workspace
  const showEditor = previewMode === 'editor' || (previewMode === 'split' && !isKanban && !isExcalidraw) || (!supportsPreview);
  const showPreview = supportsPreview && (previewMode === 'preview' || previewMode === 'split' || isKanban || isExcalidraw);

  // If in split mode specifically for kanban/excalidraw, allow split if user selected 'split'
  const effectiveShowEditor = previewMode === 'editor' || (previewMode === 'split');
  const effectiveShowPreview = (previewMode === 'preview' || previewMode === 'split' || isKanban || isExcalidraw) && supportsPreview;

  // Final visibility flags
  const renderEditor = previewMode === 'editor' || (previewMode === 'split') || (!supportsPreview);
  const renderPreview = supportsPreview && (previewMode === 'preview' || previewMode === 'split' || ((isKanban || isExcalidraw) && previewMode !== 'editor'));

  return (
    <div
      className="relative flex-1 flex flex-col h-full overflow-hidden"
      onPaste={handleEditorPaste}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('Files')) {
          e.preventDefault();
          setIsDragOverEditor(true);
        }
      }}
      onDragLeave={() => setIsDragOverEditor(false)}
      onDrop={handleEditorDrop}
    >
      {/* Dragging Image Drop Overlay */}
      {isDragOverEditor && (
        <div className="absolute inset-0 z-50 bg-blue-600/20 backdrop-blur-[2px] border-2 border-dashed border-blue-400 flex flex-col items-center justify-center text-white pointer-events-none">
          <p className="font-semibold text-sm">Drop image here to insert into note</p>
          <span className="text-xs text-neutral-300">Saved with timestamped name</span>
        </div>
      )}

      {/* Note Size Warning Banner if approaching or exceeding 1MB */}
      {sizeWarning && (
        <div className="bg-amber-500/20 text-amber-300 border-b border-amber-500/30 px-3 py-1 text-xs flex items-center justify-between shrink-0 z-10 font-mono">
          <div className="flex items-center gap-1.5">
            <AlertTriangle size={14} className="text-amber-400" />
            <span>{sizeWarning}</span>
          </div>
          <span className="text-[10px] text-amber-200/80">Max 1,048,576 bytes per note</span>
        </div>
      )}

      {/* Main Workspace Area */}
      <div className={`flex-1 flex overflow-hidden ${renderEditor && renderPreview ? 'flex-col md:flex-row' : 'flex-row'}`}>
        {/* Editor Pane */}
        {renderEditor && (
          <div
            className={`flex-1 relative ${
              renderPreview ? 'h-1/2 md:h-full border-b md:border-b-0 md:border-r' : 'h-full'
            }`}
            style={{
              borderColor: theme.ui.border,
              backgroundColor: theme.ui.bgEditor,
            }}
          >
            <Editor
              height="100%"
              language={langInfo.monacoLanguage}
              value={localContent}
              theme={theme.monacoTheme}
              onChange={handleEditorChange}
              onMount={handleEditorMount}
              options={{
                fontSize: settings.fontSize,
                tabSize: settings.tabSize,
                wordWrap: settings.wordWrap ? 'on' : 'off',
                minimap: { enabled: isMobile ? false : settings.minimap },
                lineNumbers: settings.lineNumbers,
                automaticLayout: true,
                scrollBeyondLastLine: false,
                smoothScrolling: false,
                cursorBlinking: 'blink',
                cursorSmoothCaretAnimation: 'off',
                cursorStyle: 'line',
                cursorWidth: 2,
                formatOnPaste: false,
                formatOnType: false,
                renderWhitespace: 'selection',
                bracketPairColorization: { enabled: true },
                padding: { top: 12, bottom: 12 },
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
                fontLigatures: true,
                find: {
                  addExtraSpaceOnTop: false,
                  autoFindInSelection: 'always',
                  seedSearchStringFromSelection: 'always',
                },
              }}
            />
          </div>
        )}

        {/* Live Preview Pane (Markdown, HTML, Excalidraw, or Kanban) */}
        {renderPreview && (
          <div className={`flex-1 overflow-hidden ${renderEditor ? 'h-1/2 md:h-full' : 'h-full'}`}>
            {isMd && (
              <MarkdownPreview
                content={localContent}
                files={files}
                currentTheme={currentTheme}
                onUpdateContent={(newContent) => handleEditorChange(newContent)}
              />
            )}
            {isHtml && (
              <HtmlPreview
                htmlContent={localContent}
                currentTheme={currentTheme}
              />
            )}
            {isExcalidraw && (
              <ExcalidrawEditor
                key={activeFile.id}
                fileId={activeFile.id}
                content={activeFile.content || ''}
                filename={activeFile.name}
                currentTheme={currentTheme}
                onUpdateContent={(fId, newContent) => {
                  setLocalContent(newContent);
                  onContentChange(fId, newContent);
                }}
              />
            )}
            {isKanban && (
              <KanbanEditor
                key={activeFile.id}
                fileId={activeFile.id}
                content={localContent || ''}
                filename={activeFile.name}
                currentTheme={currentTheme}
                onUpdateContent={(fId, newContent) => {
                  setLocalContent(newContent);
                  onContentChange(fId, newContent);
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};
