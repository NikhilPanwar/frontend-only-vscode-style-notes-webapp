import React from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import { FileNode, ThemeType } from '../types';
import { THEMES } from '../utils/themes';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  targetNode: FileNode | null;
  currentTheme: ThemeType;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  targetNode,
  currentTheme,
}) => {
  const theme = THEMES[currentTheme];

  if (!isOpen || !targetNode) return null;

  const isFolder = targetNode.type === 'folder';

  return (
    <div
      id="delete-confirm-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl shadow-2xl border overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100"
        style={{
          backgroundColor: theme.ui.modalBg,
          borderColor: theme.ui.border,
          color: theme.ui.textMain,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 flex flex-col gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-600/20 text-red-500 flex items-center justify-center shrink-0">
              <Trash2 size={20} />
            </div>
            <div>
              <h3 className="text-sm font-semibold" style={{ color: theme.ui.textHeader }}>
                Delete {isFolder ? 'Folder' : 'File'}?
              </h3>
              <p className="text-[11px] mt-0.5" style={{ color: theme.ui.textMuted }}>
                Are you sure you want to delete <span className="font-semibold" style={{ color: theme.ui.textMain }}>"{targetNode.name}"</span>?
                {isFolder && ' All nested files will also be removed.'}
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-2 pt-3 border-t" style={{ borderColor: theme.ui.border }}>
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              style={{ color: theme.ui.textMuted }}
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="px-3.5 py-1.5 rounded bg-red-600 hover:bg-red-500 text-white font-medium transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
