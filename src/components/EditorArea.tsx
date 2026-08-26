import React, { useRef, useEffect, useState, useCallback } from 'react';
import Editor, { Monaco, OnMount } from '@monaco-editor/react';
import { FileNode, EditorSettings, ThemeType, CursorPosition, MAX_NOTE_SIZE_BYTES } from '../types';
import { THEMES, registerMonacoThemes } from '../utils/themes';
import { detectLanguageByFilename, isImageFile, isMarkdownFile, isHtmlFile } from '../utils/languageDetector';
import { MarkdownPreview } from './MarkdownPreview';
import { HtmlPreview } from './HtmlPreview';
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
  const [localContent, setLocalContent] = useState<string>('');
  const [sizeWarning, setSizeWarning] = useState<string | null>(null);
  const [isDragOverEditor, setIsDragOverEditor] = useState(false);

  useEffect(() => {
    if (activeFile) {
      setLocalContent(activeFile.content || '');
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
  const previewMode = settings.previewMode;

  // Determine what to render based on preview mode
  const showEditor = previewMode === 'editor' || previewMode === 'split' || (!isMd && !isHtml);
  const showPreview = (isMd || isHtml) && (previewMode === 'preview' || previewMode === 'split');

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
      <div className="flex-1 flex overflow-hidden">
        {/* Editor Pane */}
        {showEditor && (
          <div
            className={`h-full flex-1 relative ${
              showPreview ? 'border-r' : ''
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
                minimap: { enabled: settings.minimap },
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

        {/* Live Preview Pane (Markdown or HTML) */}
        {showPreview && (
          <div className="h-full flex-1 overflow-hidden">
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
          </div>
        )}
      </div>
    </div>
  );
};
