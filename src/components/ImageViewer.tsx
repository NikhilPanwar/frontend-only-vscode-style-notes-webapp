import React, { useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Copy, Download, Image as ImageIcon } from 'lucide-react';
import { FileNode, ThemeType } from '../types';
import { THEMES } from '../utils/themes';
import { formatBytes } from '../utils/storage';

interface ImageViewerProps {
  file: FileNode;
  currentTheme: ThemeType;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({
  file,
  currentTheme,
}) => {
  const theme = THEMES[currentTheme];
  const [zoom, setZoom] = useState(1);
  const [copied, setCopied] = useState(false);

  const handleCopyMarkdown = () => {
    const md = `![${file.name}](${file.name})`;
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!file.content) return;
    const a = document.createElement('a');
    a.href = file.content;
    a.download = file.name;
    a.click();
  };

  return (
    <div
      className="h-full flex flex-col overflow-hidden select-none"
      style={{ backgroundColor: theme.ui.bgEditor }}
    >
      {/* Top bar */}
      <div
        className="h-8 px-4 border-b flex items-center justify-between text-xs"
        style={{
          borderColor: theme.ui.border,
          backgroundColor: theme.ui.bgTitleBar,
          color: theme.ui.textMuted,
        }}
      >
        <div className="flex items-center gap-3">
          <span className="font-semibold" style={{ color: theme.ui.textHeader }}>{file.name}</span>
          <span>{formatBytes(file.size)}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom((z) => Math.max(0.2, z - 0.2))}
            className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            style={{ color: theme.ui.textMain }}
            title="Zoom Out"
          >
            <ZoomOut size={13} />
          </button>
          <span className="text-[11px] font-mono w-10 text-center" style={{ color: theme.ui.textMain }}>
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
            className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            style={{ color: theme.ui.textMain }}
            title="Zoom In"
          >
            <ZoomIn size={13} />
          </button>
          <button
            onClick={() => setZoom(1)}
            className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            style={{ color: theme.ui.textMain }}
            title="Reset Zoom"
          >
            <RotateCcw size={13} />
          </button>

          <div className="h-3 w-px mx-1" style={{ backgroundColor: theme.ui.border }} />

          <button
            onClick={handleCopyMarkdown}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-500 text-white transition-colors text-[11px]"
            title="Copy Markdown embed tag"
          >
            <Copy size={11} />
            <span>{copied ? 'Copied MD Tag!' : 'Copy MD Tag'}</span>
          </button>

          <button
            onClick={handleDownload}
            className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            style={{ color: theme.ui.textMain }}
            title="Download Image"
          >
            <Download size={13} />
          </button>
        </div>
      </div>

      {/* Image Canvas */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-8 bg-[radial-gradient(#333_1px,transparent_1px)] [background-size:16px_16px]">
        {file.content ? (
          <img
            src={file.content}
            alt={file.name}
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'center center',
              transition: 'transform 0.1s ease-out',
            }}
            className="max-w-full max-h-full object-contain rounded shadow-2xl border border-neutral-700/50"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-neutral-400">
            <ImageIcon size={32} />
            <span>No image data found</span>
          </div>
        )}
      </div>
    </div>
  );
};
