import React from 'react';
import {
  Files,
  Search,
  Settings,
  Info,
  Sliders,
  Palette,
  FilePlus,
  FolderPlus,
  ImagePlus,
  HelpCircle,
} from 'lucide-react';
import { ActiveSidebarTab, ThemeType } from '../types';
import { THEMES } from '../utils/themes';

interface ActivityBarProps {
  activeTab: ActiveSidebarTab;
  onTabChange: (tab: ActiveSidebarTab) => void;
  currentTheme: ThemeType;
  onOpenImageUpload: () => void;
  onOpenCommandPalette: () => void;
  onCreateNewFile: () => void;
}

export const ActivityBar: React.FC<ActivityBarProps> = ({
  activeTab,
  onTabChange,
  currentTheme,
  onOpenImageUpload,
  onOpenCommandPalette,
  onCreateNewFile,
}) => {
  const theme = THEMES[currentTheme];

  const topItems: { id: ActiveSidebarTab; label: string; icon: React.ReactNode }[] = [
    { id: 'explorer', label: 'Explorer (Ctrl+Shift+E)', icon: <Files size={20} /> },
    { id: 'search', label: 'Search All Files (Ctrl+Shift+F)', icon: <Search size={20} /> },
    { id: 'settings', label: 'Themes & Settings', icon: <Sliders size={20} /> },
    { id: 'info', label: 'Offline Storage & About', icon: <Info size={20} /> },
  ];

  return (
    <aside
      id="vscode-activity-bar"
      className="w-12 flex flex-col justify-between items-center py-2 select-none shrink-0 border-r z-20 transition-colors"
      style={{
        backgroundColor: theme.ui.bgActivityBar,
        borderColor: theme.ui.border,
      }}
    >
      {/* Top Icons */}
      <div className="flex flex-col items-center gap-1 w-full">
        {topItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`activity-btn-${item.id}`}
              onClick={() => onTabChange(item.id)}
              className="w-full h-11 flex items-center justify-center relative transition-colors group"
              style={{
                color: isActive
                  ? (theme.isDark ? '#ffffff' : (theme.ui.bgActivityBar === '#073642' ? '#ffffff' : '#ffffff'))
                  : (theme.isDark ? '#858585' : '#cccccc'),
              }}
              title={item.label}
            >
              {/* Active Indicator Bar on Left */}
              {isActive && (
                <div
                  className="absolute left-0 top-1 bottom-1 w-0.5 rounded-r"
                  style={{ backgroundColor: theme.ui.bgActivityBarActive }}
                />
              )}
              <div className="transform group-hover:scale-105 transition-transform">
                {item.icon}
              </div>
            </button>
          );
        })}
      </div>

      {/* Bottom Icons */}
      <div className="flex flex-col items-center gap-1 w-full">
        {/* Insert / Upload Image */}
        <button
          id="activity-btn-insert-image"
          onClick={onOpenImageUpload}
          className="w-full h-10 flex items-center justify-center transition-colors hover:scale-105"
          style={{ color: theme.isDark ? '#858585' : '#cccccc' }}
          title="Insert / Upload Image"
        >
          <ImagePlus size={18} />
        </button>

        {/* Command Palette / Settings Quick Open */}
        <button
          id="activity-btn-command-palette"
          onClick={onOpenCommandPalette}
          className="w-full h-10 flex items-center justify-center transition-colors hover:scale-105"
          style={{ color: theme.isDark ? '#858585' : '#cccccc' }}
          title="Command Palette (Ctrl+Shift+P / F1)"
        >
          <Settings size={18} />
        </button>
      </div>
    </aside>
  );
};
