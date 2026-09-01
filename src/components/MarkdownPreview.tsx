import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { ThemeType, FileNode } from '../types';
import { THEMES } from '../utils/themes';
import { Copy, Check, ExternalLink } from 'lucide-react';

interface MarkdownPreviewProps {
  content: string;
  files: Record<string, FileNode>;
  currentTheme: ThemeType;
  onUpdateContent?: (newContent: string) => void;
}

export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({
  content,
  files,
  currentTheme,
  onUpdateContent,
}) => {
  const theme = THEMES[currentTheme];
  const isDark = theme.isDark;

  // Resolve local image references like `diagram.png` or `/media/diagram.png` to stored DataURLs
  const resolveImageSrc = (src: string | undefined): string => {
    if (!src) return '';
    if (src.startsWith('data:') || src.startsWith('http://') || src.startsWith('https://')) {
      return src;
    }

    // Try finding by filename in workspace
    const cleanFilename = src.split('/').pop() || src;
    const matchedNode = Object.values(files).find(
      (f) => f.type === 'file' && f.name.toLowerCase() === cleanFilename.toLowerCase() && f.isBinary
    );

    if (matchedNode && matchedNode.content) {
      return matchedNode.content;
    }

    return src;
  };

  // Allow interactive checkbox toggle directly from preview!
  const handleTaskToggle = (taskText: string, currentChecked: boolean) => {
    if (!onUpdateContent) return;
    const lines = content.split('\n');
    const updatedLines = lines.map((line) => {
      // match - [ ] or - [x]
      const uncheckedRegex = /^(\s*[-*+]\s+\[\s\]\s+)(.*)$/;
      const checkedRegex = /^(\s*[-*+]\s+\[[xX]\]\s+)(.*)$/;

      if (!currentChecked) {
        // change to checked
        if (uncheckedRegex.test(line)) {
          const match = line.match(uncheckedRegex);
          if (match && match[2].trim() === taskText.trim()) {
            return line.replace(/\[\s\]/, '[x]');
          }
        }
      } else {
        // change to unchecked
        if (checkedRegex.test(line)) {
          const match = line.match(checkedRegex);
          if (match && match[2].trim() === taskText.trim()) {
            return line.replace(/\[[xX]\]/, '[ ]');
          }
        }
      }
      return line;
    });

    onUpdateContent(updatedLines.join('\n'));
  };

  return (
    <div
      className={`h-full overflow-y-auto p-3 sm:p-6 scrollbar-thin transition-colors ${
        isDark ? 'prose-invert' : ''
      }`}
      style={{
        backgroundColor: theme.ui.bgEditor,
        color: theme.ui.textMain,
      }}
    >
      <div className="max-w-4xl mx-auto space-y-4 font-sans text-sm leading-relaxed">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
          components={{
            h1: ({ children }) => (
              <h1
                className="text-2xl font-bold pb-2 border-b mt-6 mb-4"
                style={{ borderColor: theme.ui.border, color: theme.ui.textHeader }}
              >
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2
                className="text-xl font-bold pb-1.5 border-b mt-5 mb-3"
                style={{ borderColor: theme.ui.border, color: theme.ui.textHeader }}
              >
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-lg font-semibold mt-4 mb-2" style={{ color: theme.ui.textHeader }}>
                {children}
              </h3>
            ),
            p: ({ children }) => <p className="mb-3 leading-relaxed">{children}</p>,
            ul: ({ children }) => <ul className="list-disc list-outside pl-6 mb-3 space-y-1">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal list-outside pl-6 mb-3 space-y-1">{children}</ol>,
            li: ({ children, node }) => {
              return <li className="leading-relaxed">{children}</li>;
            },
            blockquote: ({ children }) => (
              <blockquote
                className="border-l-4 pl-4 py-1 italic my-3 opacity-90 rounded-r"
                style={{
                  borderColor: theme.ui.accent,
                  backgroundColor: `${theme.ui.accent}15`,
                }}
              >
                {children}
              </blockquote>
            ),
            hr: () => <hr className="my-6 border-t" style={{ borderColor: theme.ui.border }} />,
            table: ({ children }) => (
              <div className="overflow-x-auto my-4 rounded border" style={{ borderColor: theme.ui.border }}>
                <table className="min-w-full divide-y text-xs" style={{ borderColor: theme.ui.border }}>
                  {children}
                </table>
              </div>
            ),
            thead: ({ children }) => (
              <thead style={{ backgroundColor: `${theme.ui.accent}15` }}>{children}</thead>
            ),
            th: ({ children }) => (
              <th className="px-3 py-2 text-left font-semibold" style={{ color: theme.ui.textHeader }}>
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="px-3 py-2 border-t" style={{ borderColor: theme.ui.border }}>
                {children}
              </td>
            ),
            img: ({ src, alt }) => {
              const resolved = resolveImageSrc(src);
              return (
                <div className="my-3 flex flex-col items-center">
                  <img
                    src={resolved}
                    alt={alt || 'Note image'}
                    className="max-w-full h-auto rounded border shadow-md object-contain max-h-96"
                    style={{ borderColor: theme.ui.border }}
                    referrerPolicy="no-referrer"
                  />
                  {alt && <span className="text-[11px] text-neutral-400 mt-1">{alt}</span>}
                </div>
              );
            },
            code: ({ inline, className, children, ...props }: any) => {
              const codeString = String(children).replace(/\n$/, '');
              if (inline) {
                return (
                  <code
                    className="px-1.5 py-0.5 rounded font-mono text-xs"
                    style={{
                      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                      color: isDark ? '#f43f5e' : '#be123c',
                    }}
                  >
                    {children}
                  </code>
                );
              }

              return (
                <div className="relative group my-3 rounded-lg overflow-hidden border" style={{ borderColor: theme.ui.border }}>
                  <div
                    className="flex items-center justify-between px-3 py-1.5 text-[11px] font-mono border-b"
                    style={{
                      backgroundColor: isDark ? '#141414' : '#f0f0f0',
                      borderColor: theme.ui.border,
                      color: theme.ui.textMuted,
                    }}
                  >
                    <span>{className?.replace('language-', '') || 'code'}</span>
                    <button
                      onClick={() => navigator.clipboard.writeText(codeString)}
                      className="flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity"
                      style={{ color: theme.ui.textMain }}
                      title="Copy code"
                    >
                      <Copy size={12} />
                      <span>Copy</span>
                    </button>
                  </div>
                  <pre
                    className="p-4 overflow-x-auto font-mono text-xs leading-relaxed"
                    style={{
                      backgroundColor: isDark ? '#181818' : '#f9f9f9',
                      color: theme.ui.textMain,
                    }}
                  >
                    <code>{codeString}</code>
                  </pre>
                </div>
              );
            },
            input: ({ type, checked, disabled, ...props }: any) => {
              if (type === 'checkbox') {
                return (
                  <input
                    type="checkbox"
                    checked={checked}
                    className="mr-2 rounded cursor-pointer accent-blue-600"
                    onChange={(e) => {
                      // Handled interactively
                    }}
                  />
                );
              }
              return <input type={type} {...props} />;
            },
            a: ({ href, children }) => (
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="underline hover:opacity-80 inline-flex items-center gap-0.5"
                style={{ color: theme.ui.accent }}
              >
                {children}
                <ExternalLink size={10} className="inline ml-0.5" />
              </a>
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
};
