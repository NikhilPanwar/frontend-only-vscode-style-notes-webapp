import React from 'react';
import {
  FileText,
  FileCode,
  FileJson,
  FileImage,
  Folder,
  FolderOpen,
  FileSpreadsheet,
  FileTerminal,
  File,
  Code2,
  FileQuestion,
  Database,
  Globe,
  FileType as FileTypeIcon,
  PenTool,
  Kanban,
} from 'lucide-react';
import { getFileExtension, isImageFile, isExcalidrawFile, isKanbanFile } from './languageDetector';

export interface FileIconProps {
  filename?: string;
  isFolder?: boolean;
  isOpen?: boolean;
  className?: string;
  size?: number;
}

export const FileIconComponent: React.FC<FileIconProps> = ({
  filename = '',
  isFolder = false,
  isOpen = false,
  className = '',
  size = 16,
}) => {
  if (isFolder) {
    return isOpen ? (
      <FolderOpen size={size} className={`text-amber-400 shrink-0 ${className}`} />
    ) : (
      <Folder size={size} className={`text-amber-400 shrink-0 ${className}`} />
    );
  }

  if (isImageFile(filename)) {
    return <FileImage size={size} className={`text-purple-400 shrink-0 ${className}`} />;
  }

  if (isExcalidrawFile(filename)) {
    return <PenTool size={size} className={`text-violet-400 shrink-0 ${className}`} />;
  }

  if (isKanbanFile(filename)) {
    return <Kanban size={size} className={`text-indigo-400 shrink-0 ${className}`} />;
  }


  const ext = getFileExtension(filename);

  switch (ext) {
    case 'md':
    case 'markdown':
      return <FileText size={size} className={`text-sky-400 shrink-0 ${className}`} />;
    case 'html':
    case 'htm':
      return <Globe size={size} className={`text-orange-500 shrink-0 ${className}`} />;
    case 'css':
    case 'scss':
    case 'sass':
    case 'less':
      return <Code2 size={size} className={`text-blue-400 shrink-0 ${className}`} />;
    case 'js':
    case 'mjs':
    case 'cjs':
      return <FileCode size={size} className={`text-yellow-400 shrink-0 ${className}`} />;
    case 'ts':
      return <FileCode size={size} className={`text-blue-500 shrink-0 ${className}`} />;
    case 'tsx':
    case 'jsx':
      return <FileCode size={size} className={`text-cyan-400 shrink-0 ${className}`} />;
    case 'py':
    case 'pyw':
      return <FileCode size={size} className={`text-emerald-400 shrink-0 ${className}`} />;
    case 'json':
    case 'jsonc':
      return <FileJson size={size} className={`text-amber-300 shrink-0 ${className}`} />;
    case 'sql':
      return <Database size={size} className={`text-pink-400 shrink-0 ${className}`} />;
    case 'sh':
    case 'bash':
    case 'zsh':
      return <FileTerminal size={size} className={`text-green-400 shrink-0 ${className}`} />;
    case 'rs':
      return <FileCode size={size} className={`text-orange-400 shrink-0 ${className}`} />;
    case 'go':
      return <FileCode size={size} className={`text-cyan-300 shrink-0 ${className}`} />;
    case 'cpp':
    case 'c':
    case 'h':
    case 'hpp':
      return <FileCode size={size} className={`text-indigo-400 shrink-0 ${className}`} />;
    case 'java':
      return <FileCode size={size} className={`text-red-400 shrink-0 ${className}`} />;
    case 'yaml':
    case 'yml':
    case 'xml':
      return <FileTypeIcon size={size} className={`text-rose-400 shrink-0 ${className}`} />;
    case 'csv':
      return <FileSpreadsheet size={size} className={`text-emerald-500 shrink-0 ${className}`} />;
    case 'txt':
    case 'log':
      return <FileText size={size} className={`text-neutral-400 shrink-0 ${className}`} />;
    default:
      return <File size={size} className={`text-neutral-400 shrink-0 ${className}`} />;
  }
};
