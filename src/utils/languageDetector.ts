export interface LanguageInfo {
  id: string;
  name: string;
  extensions: string[];
  monacoLanguage: string;
}

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  { id: 'markdown', name: 'Markdown', extensions: ['md', 'markdown', 'mdown', 'mkdn'], monacoLanguage: 'markdown' },
  { id: 'html', name: 'HTML', extensions: ['html', 'htm', 'xhtml'], monacoLanguage: 'html' },
  { id: 'python', name: 'Python', extensions: ['py', 'pyw', 'ipy'], monacoLanguage: 'python' },
  { id: 'javascript', name: 'JavaScript', extensions: ['js', 'mjs', 'cjs'], monacoLanguage: 'javascript' },
  { id: 'typescript', name: 'TypeScript', extensions: ['ts'], monacoLanguage: 'typescript' },
  { id: 'typescriptreact', name: 'TypeScript React', extensions: ['tsx'], monacoLanguage: 'typescript' },
  { id: 'javascriptreact', name: 'JavaScript React', extensions: ['jsx'], monacoLanguage: 'javascript' },
  { id: 'css', name: 'CSS', extensions: ['css'], monacoLanguage: 'css' },
  { id: 'scss', name: 'SCSS', extensions: ['scss', 'sass'], monacoLanguage: 'scss' },
  { id: 'json', name: 'JSON', extensions: ['json', 'jsonc'], monacoLanguage: 'json' },
  { id: 'sql', name: 'SQL', extensions: ['sql'], monacoLanguage: 'sql' },
  { id: 'shell', name: 'Shell Script', extensions: ['sh', 'bash', 'zsh'], monacoLanguage: 'shell' },
  { id: 'yaml', name: 'YAML', extensions: ['yaml', 'yml'], monacoLanguage: 'yaml' },
  { id: 'xml', name: 'XML', extensions: ['xml', 'svg'], monacoLanguage: 'xml' },
  { id: 'rust', name: 'Rust', extensions: ['rs'], monacoLanguage: 'rust' },
  { id: 'go', name: 'Go', extensions: ['go'], monacoLanguage: 'go' },
  { id: 'cpp', name: 'C++', extensions: ['cpp', 'cxx', 'cc', 'h', 'hpp'], monacoLanguage: 'cpp' },
  { id: 'c', name: 'C', extensions: ['c'], monacoLanguage: 'c' },
  { id: 'java', name: 'Java', extensions: ['java'], monacoLanguage: 'java' },
  { id: 'csharp', name: 'C#', extensions: ['cs'], monacoLanguage: 'csharp' },
  { id: 'php', name: 'PHP', extensions: ['php', 'phtml'], monacoLanguage: 'php' },
  { id: 'ruby', name: 'Ruby', extensions: ['rb'], monacoLanguage: 'ruby' },
  { id: 'lua', name: 'Lua', extensions: ['lua'], monacoLanguage: 'lua' },
  { id: 'dockerfile', name: 'Dockerfile', extensions: ['dockerfile'], monacoLanguage: 'dockerfile' },
  { id: 'ini', name: 'INI / Config', extensions: ['ini', 'conf', 'env'], monacoLanguage: 'ini' },
  { id: 'plaintext', name: 'Plain Text', extensions: ['txt', 'log', 'text'], monacoLanguage: 'plaintext' },
];

export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  if (parts.length > 1) {
    return parts[parts.length - 1].toLowerCase();
  }
  return '';
}

export function detectLanguageByFilename(filename: string): LanguageInfo {
  const ext = getFileExtension(filename);
  if (!ext) {
    if (filename.toLowerCase() === 'dockerfile') {
      return SUPPORTED_LANGUAGES.find(l => l.id === 'dockerfile')!;
    }
    return SUPPORTED_LANGUAGES.find(l => l.id === 'plaintext')!;
  }

  const found = SUPPORTED_LANGUAGES.find(lang => lang.extensions.includes(ext));
  if (found) return found;

  return {
    id: ext,
    name: ext.toUpperCase(),
    extensions: [ext],
    monacoLanguage: 'plaintext',
  };
}

export function isImageFile(filename: string): boolean {
  const ext = getFileExtension(filename);
  return ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'bmp'].includes(ext);
}

export function isMarkdownFile(filename: string): boolean {
  const ext = getFileExtension(filename);
  return ['md', 'markdown', 'mdown', 'mkdn'].includes(ext);
}

export function isHtmlFile(filename: string): boolean {
  const ext = getFileExtension(filename);
  return ['html', 'htm'].includes(ext);
}
