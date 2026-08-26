import React, { useState, useMemo } from 'react';
import {
  Search,
  CaseSensitive,
  WholeWord,
  Regex,
  ChevronRight,
  ChevronDown,
  FileCode,
} from 'lucide-react';
import { FileNode, SearchMatch, ThemeType } from '../types';
import { THEMES } from '../utils/themes';
import { FileIconComponent } from '../utils/fileIcons';
import { getFilePath } from '../utils/storage';

interface GlobalSearchProps {
  files: Record<string, FileNode>;
  currentTheme: ThemeType;
  onOpenMatch: (fileId: string, lineNumber: number) => void;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({
  files,
  currentTheme,
  onOpenMatch,
}) => {
  const theme = THEMES[currentTheme];

  const [query, setQuery] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [matchWholeWord, setMatchWholeWord] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [collapsedFiles, setCollapsedFiles] = useState<Record<string, boolean>>({});

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];

    const matches: SearchMatch[] = [];
    const textFiles = Object.values(files).filter(
      (f) => f.type === 'file' && !f.isBinary && f.content !== undefined
    );

    let regex: RegExp;
    try {
      let pattern = query;
      if (!useRegex) {
        // Escape special regex chars
        pattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      }
      if (matchWholeWord) {
        pattern = `\\b${pattern}\\b`;
      }
      regex = new RegExp(pattern, matchCase ? 'g' : 'gi');
    } catch (e) {
      return [];
    }

    for (const file of textFiles) {
      const lines = (file.content || '').split('\n');
      lines.forEach((line, index) => {
        regex.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = regex.exec(line)) !== null) {
          matches.push({
            fileId: file.id,
            fileName: file.name,
            filePath: getFilePath(file.id, files),
            lineNumber: index + 1,
            lineContent: line.trim(),
            matchIndex: match.index,
            matchLength: match[0].length,
          });
          // Prevent infinite loop on empty match
          if (match.index === regex.lastIndex) {
            regex.lastIndex++;
          }
        }
      });
    }

    return matches;
  }, [query, matchCase, matchWholeWord, useRegex, files]);

  // Group matches by file
  const groupedResults = useMemo(() => {
    const map = new Map<string, { file: FileNode; matches: SearchMatch[] }>();
    searchResults.forEach((match) => {
      if (!map.has(match.fileId)) {
        const fileNode = files[match.fileId];
        if (fileNode) {
          map.set(match.fileId, { file: fileNode, matches: [] });
        }
      }
      map.get(match.fileId)?.matches.push(match);
    });
    return Array.from(map.values());
  }, [searchResults, files]);

  const toggleFileCollapse = (fileId: string) => {
    setCollapsedFiles((prev) => ({ ...prev, [fileId]: !prev[fileId] }));
  };

  return (
    <div className="flex flex-col h-full select-none text-xs" style={{ color: theme.ui.textMain }}>
      {/* Search Header */}
      <div
        className="px-3 py-2 border-b uppercase tracking-wider font-semibold text-[11px] shrink-0"
        style={{
          borderColor: theme.ui.border,
          color: theme.ui.textHeader,
        }}
      >
        <span>Search Workspace</span>
      </div>

      {/* Search Input and Toggles */}
      <div className="p-3 border-b flex flex-col gap-2" style={{ borderColor: theme.ui.border }}>
        <div
          className="flex items-center rounded border px-2 py-1 gap-1 focus-within:ring-1 focus-within:ring-blue-500"
          style={{
            backgroundColor: theme.ui.inputBg,
            borderColor: theme.ui.border,
          }}
        >
          <Search size={14} className="shrink-0" style={{ color: theme.ui.textMuted }} />
          <input
            id="global-search-input"
            type="text"
            placeholder="Search all notes content..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-xs"
            style={{ color: theme.ui.textMain }}
            autoFocus
          />

          {/* Search Modifiers */}
          <div className="flex items-center gap-0.5 shrink-0" style={{ color: theme.ui.textMuted }}>
            <button
              onClick={() => setMatchCase(!matchCase)}
              className={`p-1 rounded transition-colors ${
                matchCase ? 'bg-blue-600 text-white' : 'hover:bg-black/5 dark:hover:bg-white/10'
              }`}
              title="Match Case (Alt+C)"
            >
              <CaseSensitive size={14} />
            </button>
            <button
              onClick={() => setMatchWholeWord(!matchWholeWord)}
              className={`p-1 rounded transition-colors ${
                matchWholeWord ? 'bg-blue-600 text-white' : 'hover:bg-black/5 dark:hover:bg-white/10'
              }`}
              title="Match Whole Word (Alt+W)"
            >
              <WholeWord size={14} />
            </button>
            <button
              onClick={() => setUseRegex(!useRegex)}
              className={`p-1 rounded transition-colors ${
                useRegex ? 'bg-blue-600 text-white' : 'hover:bg-black/5 dark:hover:bg-white/10'
              }`}
              title="Use Regular Expression (Alt+R)"
            >
              <Regex size={14} />
            </button>
          </div>
        </div>

        {/* Results Counter */}
        {query.trim() && (
          <div className="text-[11px] flex items-center justify-between" style={{ color: theme.ui.textMuted }}>
            <span>
              {searchResults.length === 0
                ? 'No results found'
                : `${searchResults.length} result${searchResults.length === 1 ? '' : 's'} in ${
                    groupedResults.length
                  } file${groupedResults.length === 1 ? '' : 's'}`}
            </span>
          </div>
        )}
      </div>

      {/* Results Tree List */}
      <div className="flex-1 overflow-y-auto py-1 scrollbar-thin">
        {groupedResults.map(({ file, matches }) => {
          const isCollapsed = !!collapsedFiles[file.id];
          return (
            <div key={file.id} className="flex flex-col mb-1">
              {/* File Row */}
              <div
                onClick={() => toggleFileCollapse(file.id)}
                className="flex items-center gap-1.5 px-2 py-1 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer font-medium text-xs"
                style={{ color: theme.ui.textHeader }}
              >
                <span style={{ color: theme.ui.textMuted }}>
                  {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                </span>
                <FileIconComponent filename={file.name} size={14} />
                <span className="truncate flex-1">{file.name}</span>
                <span
                  className="px-1.5 py-0.2 rounded-full text-[10px] font-mono"
                  style={{
                    backgroundColor: theme.ui.badgeBg,
                    color: theme.ui.badgeText,
                  }}
                >
                  {matches.length}
                </span>
              </div>

              {/* Matches List */}
              {!isCollapsed && (
                <div
                  className="flex flex-col ml-4 border-l"
                  style={{ borderColor: theme.ui.border }}
                >
                  {matches.map((match, idx) => (
                    <div
                      key={idx}
                      onClick={() => onOpenMatch(match.fileId, match.lineNumber)}
                      className="group flex items-center gap-2 px-2 py-1 hover:bg-blue-600/15 cursor-pointer text-[11px] transition-colors"
                      style={{ color: theme.ui.textMain }}
                    >
                      <span
                        className="font-mono text-[10px] shrink-0 w-6 text-right"
                        style={{ color: theme.ui.textMuted }}
                      >
                        {match.lineNumber}:
                      </span>
                      <span className="truncate font-mono">{match.lineContent}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
