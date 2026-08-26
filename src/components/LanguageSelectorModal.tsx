import React, { useState, useEffect, useRef } from 'react';
import { Search, FileCode, Check } from 'lucide-react';
import { SUPPORTED_LANGUAGES, LanguageInfo } from '../utils/languageDetector';
import { ThemeType } from '../types';
import { THEMES } from '../utils/themes';

interface LanguageSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLanguageId: string;
  currentTheme: ThemeType;
  onSelectLanguage: (lang: LanguageInfo) => void;
}

export const LanguageSelectorModal: React.FC<LanguageSelectorModalProps> = ({
  isOpen,
  onClose,
  currentLanguageId,
  currentTheme,
  onSelectLanguage,
}) => {
  const theme = THEMES[currentTheme];
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = SUPPORTED_LANGUAGES.filter((lang) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      lang.name.toLowerCase().includes(q) ||
      lang.id.toLowerCase().includes(q) ||
      lang.extensions.some((ext) => ext.toLowerCase().includes(q))
    );
  });

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        onSelectLanguage(filtered[selectedIndex]);
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="language-selector-modal"
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 bg-black/60 backdrop-blur-xs select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-lg shadow-2xl border overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100"
        style={{
          backgroundColor: theme.ui.modalBg,
          borderColor: theme.ui.border,
          color: theme.ui.textMain,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="p-3 border-b flex items-center gap-2.5"
          style={{ borderColor: theme.ui.border, backgroundColor: theme.ui.inputBg }}
        >
          <FileCode size={16} className="text-blue-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Select Language Mode..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent border-none outline-none text-sm font-sans"
            style={{ color: theme.ui.textMain }}
          />
        </div>

        <div className="max-h-80 overflow-y-auto p-1 scrollbar-thin flex flex-col">
          {filtered.map((lang, idx) => {
            const isSelected = idx === selectedIndex;
            const isCurrent = lang.id === currentLanguageId;
            return (
              <div
                key={lang.id}
                onClick={() => {
                  onSelectLanguage(lang);
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
                <div className="flex items-center gap-2">
                  <span>{lang.name}</span>
                  <span
                    className="text-[11px] font-mono"
                    style={{
                      color: isSelected ? 'rgba(255,255,255,0.8)' : theme.ui.textMuted,
                    }}
                  >
                    ({lang.extensions.map((e) => `.${e}`).join(', ')})
                  </span>
                </div>
                {isCurrent && <Check size={14} className={isSelected ? 'text-white' : 'text-blue-500'} />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
