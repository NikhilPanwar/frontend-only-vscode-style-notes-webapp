import React, { useState, useEffect, useRef } from 'react';
import {
  Terminal,
  FilePlus,
  FolderPlus,
  WrapText,
  Palette,
  Download,
  Search,
  PanelLeft,
  ImagePlus,
  Columns2,
  X,
  Code,
} from 'lucide-react';
import { ThemeType } from '../types';
import { THEMES } from '../utils/themes';

export interface CommandItem {
  id: string;
  label: string;
  category: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
}

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: ThemeType;
  commands: CommandItem[];
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  currentTheme,
  commands,
}) => {
  const theme = THEMES[currentTheme];
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredCommands = commands.filter((cmd) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase().replace(/^>/, '').trim();
    return (
      cmd.label.toLowerCase().includes(q) ||
      cmd.category.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    if (isOpen) {
      setQuery('>');
      setSelectedIndex(0);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.setSelectionRange(1, 1);
        }
      }, 50);
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
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="command-palette-modal"
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
          <Terminal size={16} className="text-blue-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or action..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent border-none outline-none text-sm font-mono"
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

        {/* Command Results */}
        <div className="max-h-80 overflow-y-auto p-1 scrollbar-thin flex flex-col">
          {filteredCommands.length === 0 ? (
            <div className="p-4 text-center text-xs" style={{ color: theme.ui.textMuted }}>
              No matching commands found
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  onClick={() => {
                    cmd.action();
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
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span style={{ color: isSelected ? '#ffffff' : theme.ui.textMuted }}>
                      {cmd.icon}
                    </span>
                    <div>
                      <span className="truncate">{cmd.label}</span>
                      <span
                        className="ml-2 text-[10px] uppercase tracking-wider"
                        style={{
                          color: isSelected ? 'rgba(255,255,255,0.8)' : theme.ui.textMuted,
                        }}
                      >
                        {cmd.category}
                      </span>
                    </div>
                  </div>

                  {cmd.shortcut && (
                    <kbd
                      className="text-[10px] px-1.5 py-0.5 rounded font-mono"
                      style={{
                        backgroundColor: isSelected
                          ? 'rgba(0,0,0,0.3)'
                          : theme.isDark
                          ? 'rgba(0,0,0,0.3)'
                          : 'rgba(0,0,0,0.06)',
                        color: isSelected ? '#ffffff' : theme.ui.textMuted,
                      }}
                    >
                      {cmd.shortcut}
                    </kbd>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
