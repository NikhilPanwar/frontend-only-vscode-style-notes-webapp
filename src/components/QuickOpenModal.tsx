import React, { useState, useEffect, useRef } from 'react';
import { Search, FileText } from 'lucide-react';
import { FileNode, ThemeType } from '../types';
import { THEMES } from '../utils/themes';
import { FileIconComponent } from '../utils/fileIcons';
import { getFilePath } from '../utils/storage';

interface QuickOpenModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: Record<string, FileNode>;
  currentTheme: ThemeType;
  onSelectFile: (fileId: string) => void;
}

export const QuickOpenModal: React.FC<QuickOpenModalProps> = ({
  isOpen,
  onClose,
  files,
  currentTheme,
  onSelectFile,
}) => {
  const theme = THEMES[currentTheme];
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const fileList = Object.values(files)
    .filter((f) => f.type === 'file')
    .map((f) => ({
      ...f,
      path: getFilePath(f.id, files),
    }))
    .filter((f) => {
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q);
    });

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, fileList.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + fileList.length) % Math.max(1, fileList.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (fileList[selectedIndex]) {
        onSelectFile(fileList[selectedIndex].id);
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="quick-open-modal"
      className="fixed inset-0 z-50 flex items-start justify-center pt-6 sm:pt-16 px-2 sm:px-4 bg-black/60 backdrop-blur-xs select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-lg shadow-2xl border overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100"
        style={{
          backgroundColor: theme.ui.modalBg,
          borderColor: theme.ui.border,
          color: theme.ui.textMain,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header */}
        <div
          className="p-3 border-b flex items-center gap-2.5"
          style={{ borderColor: theme.ui.border, backgroundColor: theme.ui.inputBg }}
        >
          <Search size={16} className="text-blue-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search files by name (use ↑ ↓ arrows, Enter to open)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent border-none outline-none text-sm font-sans"
            style={{ color: theme.ui.textMain }}
          />
          <kbd
            className="text-[10px] px-1.5 py-0.5 rounded font-mono"
            style={{
              backgroundColor: theme.isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.06)',
              color: theme.ui.textMuted,
            }}
          >
            Esc to close
          </kbd>
        </div>

        {/* File Results */}
        <div className="max-h-80 overflow-y-auto p-1 scrollbar-thin flex flex-col">
          {fileList.length === 0 ? (
            <div className="p-4 text-center text-xs" style={{ color: theme.ui.textMuted }}>
              No matching files found
            </div>
          ) : (
            fileList.map((file, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={file.id}
                  onClick={() => {
                    onSelectFile(file.id);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2 rounded text-xs cursor-pointer transition-colors ${
                    isSelected ? 'bg-blue-600 text-white font-medium' : 'hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                  style={{
                    color: isSelected ? '#ffffff' : theme.ui.textMain,
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileIconComponent filename={file.name} size={15} />
                    <span className="truncate">{file.name}</span>
                  </div>
                  <span
                    className="text-[11px] font-mono truncate max-w-xs"
                    style={{
                      color: isSelected ? 'rgba(255,255,255,0.8)' : theme.ui.textMuted,
                    }}
                  >
                    {file.path}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
