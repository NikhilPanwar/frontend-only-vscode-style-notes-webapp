import React from 'react';
import { RotateCcw, AlertTriangle, X } from 'lucide-react';
import { ThemeType } from '../types';
import { THEMES } from '../utils/themes';

interface ResetConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  currentTheme: ThemeType;
  totalNotes: number;
}

export const ResetConfirmModal: React.FC<ResetConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  currentTheme,
  totalNotes,
}) => {
  const theme = THEMES[currentTheme];

  if (!isOpen) return null;

  return (
    <div
      id="reset-workspace-confirm-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs select-none animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl shadow-2xl border overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        style={{
          backgroundColor: theme.ui.modalBg,
          borderColor: theme.ui.border,
          color: theme.ui.textMain,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: theme.ui.border }}
        >
          <div className="flex items-center gap-2 font-semibold text-sm text-red-500">
            <AlertTriangle size={17} />
            <span>Reset Workspace Confirmation</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            style={{ color: theme.ui.textMuted }}
            title="Close"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-3.5 text-xs">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-full bg-red-600/15 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 mt-0.5 border border-red-500/20">
              <RotateCcw size={20} />
            </div>
            <div className="flex flex-col gap-1.5">
              <h3 className="text-sm font-semibold leading-tight" style={{ color: theme.ui.textHeader }}>
                Reset to Default & Delete All Files?
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: theme.ui.textMain }}>
                This action will <strong className="text-red-500 dark:text-red-400 font-semibold">permanently delete all your {totalNotes > 0 ? `${totalNotes} ` : ''}custom notes, folders, drawings, and uploaded images</strong> stored in offline storage.
              </p>
              <p className="text-[11px] leading-relaxed opacity-80" style={{ color: theme.ui.textMuted }}>
                The workspace will be completely refreshed and restored to the initial default sample files and folders.
              </p>
            </div>
          </div>

          <div
            className="p-3 rounded-lg border flex items-center gap-2 text-[11px] bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-300 font-medium"
          >
            <AlertTriangle size={15} className="shrink-0 text-red-500" />
            <span>Warning: This operation cannot be undone.</span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 mt-2 pt-3 border-t" style={{ borderColor: theme.ui.border }}>
            <button
              id="reset-modal-cancel-btn"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded border hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-xs font-medium"
              style={{
                borderColor: theme.ui.border,
                color: theme.ui.textMain,
              }}
            >
              Cancel
            </button>
            <button
              id="reset-modal-confirm-btn"
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="px-4 py-1.5 rounded bg-red-600 hover:bg-red-500 text-white font-semibold text-xs transition-colors shadow-sm flex items-center gap-1.5"
            >
              <RotateCcw size={13} />
              <span>Reset to Default & Delete All</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
