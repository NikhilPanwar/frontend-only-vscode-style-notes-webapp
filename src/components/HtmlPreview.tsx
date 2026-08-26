import React, { useState, useEffect } from 'react';
import { RotateCcw, Monitor, Tablet, Smartphone, ExternalLink } from 'lucide-react';
import { ThemeType } from '../types';
import { THEMES } from '../utils/themes';

interface HtmlPreviewProps {
  htmlContent: string;
  currentTheme: ThemeType;
}

export const HtmlPreview: React.FC<HtmlPreviewProps> = ({
  htmlContent,
  currentTheme,
}) => {
  const theme = THEMES[currentTheme];
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [key, setKey] = useState(0);

  const deviceWidths = {
    desktop: '100%',
    tablet: '768px',
    mobile: '375px',
  };

  return (
    <div
      className="h-full flex flex-col overflow-hidden"
      style={{ backgroundColor: theme.ui.bgEditor }}
    >
      {/* Top Toolbar */}
      <div
        className="h-8 px-3 border-b flex items-center justify-between text-xs select-none shrink-0"
        style={{
          borderColor: theme.ui.border,
          backgroundColor: theme.ui.bgTitleBar,
          color: theme.ui.textMuted,
        }}
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold text-neutral-300">HTML Live Render</span>
          <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
            Interactive
          </span>
        </div>

        {/* Device Switcher */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setDevice('desktop')}
            className={`p-1 rounded transition-colors ${
              device === 'desktop' ? 'bg-blue-600 text-white' : 'hover:bg-white/10'
            }`}
            title="Desktop View (100%)"
          >
            <Monitor size={13} />
          </button>
          <button
            onClick={() => setDevice('tablet')}
            className={`p-1 rounded transition-colors ${
              device === 'tablet' ? 'bg-blue-600 text-white' : 'hover:bg-white/10'
            }`}
            title="Tablet View (768px)"
          >
            <Tablet size={13} />
          </button>
          <button
            onClick={() => setDevice('mobile')}
            className={`p-1 rounded transition-colors ${
              device === 'mobile' ? 'bg-blue-600 text-white' : 'hover:bg-white/10'
            }`}
            title="Mobile View (375px)"
          >
            <Smartphone size={13} />
          </button>

          <div className="h-3 w-px bg-neutral-700 mx-1" />

          <button
            onClick={() => setKey((k) => k + 1)}
            className="p-1 rounded hover:bg-white/10 transition-colors"
            title="Reload Preview"
          >
            <RotateCcw size={13} />
          </button>
        </div>
      </div>

      {/* Preview Container */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-2 bg-neutral-900/40">
        <div
          className="h-full bg-white transition-all shadow-xl rounded overflow-hidden"
          style={{
            width: deviceWidths[device],
            maxWidth: '100%',
          }}
        >
          <iframe
            key={key}
            srcDoc={htmlContent}
            title="HTML Live Preview"
            sandbox="allow-scripts allow-modals allow-forms"
            className="w-full h-full border-0 bg-white"
          />
        </div>
      </div>
    </div>
  );
};
