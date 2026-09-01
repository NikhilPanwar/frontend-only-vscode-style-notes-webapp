import React, { useState, useEffect } from 'react';
import { RotateCcw, AlertTriangle, X, Download, CheckCircle2, FileArchive, Loader2 } from 'lucide-react';
import { FileNode, ThemeType } from '../types';
import { THEMES } from '../utils/themes';
import { exportWorkspaceToZip } from '../utils/storage';

interface ResetConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  currentTheme: ThemeType;
  totalNotes: number;
  files: Record<string, FileNode>;
}

export function generateSnapshotFilename(date = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const ss = pad(date.getSeconds());
  const mm = pad(date.getMinutes());
  const hh = pad(date.getHours());
  const dd = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const yyyy = date.getFullYear().toString();

  // Format: SS:MM:HHTDD:MM:YYYY_workspace_snapshot.zip
  return `${ss}:${mm}:${hh}T${dd}:${month}:${yyyy}_workspace_snapshot.zip`;
}

export const ResetConfirmModal: React.FC<ResetConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  currentTheme,
  totalNotes,
  files,
}) => {
  const theme = THEMES[currentTheme];
  const [hasDownloadedBackup, setHasDownloadedBackup] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [downloadedFilename, setDownloadedFilename] = useState<string | null>(null);

  // Reset local state whenever modal is opened/closed
  useEffect(() => {
    if (isOpen) {
      setHasDownloadedBackup(false);
      setIsExporting(false);
      setDownloadedFilename(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDownloadSnapshot = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const filename = generateSnapshotFilename();
      const blob = await exportWorkspaceToZip(files);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setHasDownloadedBackup(true);
      setDownloadedFilename(filename);
    } catch (err) {
      console.error('Failed to export workspace archive:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      id="reset-workspace-confirm-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs select-none animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl shadow-2xl border overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
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
        <div className="p-5 flex flex-col gap-4 text-xs">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-full bg-red-600/15 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 mt-0.5 border border-red-500/20">
              <RotateCcw size={20} />
            </div>
            <div className="flex flex-col gap-1.5">
              <h3 className="text-sm font-semibold leading-tight" style={{ color: theme.ui.textHeader }}>
                Reset Workspace & Restore Default Samples
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: theme.ui.textMain }}>
                This action will <strong className="text-red-500 dark:text-red-400 font-semibold">permanently delete all your {totalNotes > 0 ? `${totalNotes} ` : ''}notes, folders, drawings, and images</strong> stored in offline storage.
              </p>
              <p className="text-[11px] leading-relaxed opacity-80" style={{ color: theme.ui.textMuted }}>
                To prevent accidental data loss, downloading a full archive snapshot of your current workspace is <strong className="font-semibold text-amber-500">mandatory</strong> before you can proceed with the reset.
              </p>
            </div>
          </div>

          {/* Mandatory Step Box */}
          <div
            className={`p-3.5 rounded-lg border transition-all flex flex-col gap-2.5 ${
              hasDownloadedBackup
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-semibold text-xs">
                {hasDownloadedBackup ? (
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                ) : (
                  <FileArchive size={16} className="text-amber-500 shrink-0" />
                )}
                <span>
                  {hasDownloadedBackup
                    ? 'Step 1 Complete: Snapshot Archive Downloaded'
                    : 'Step 1 Required: Download Workspace Snapshot'}
                </span>
              </div>
              <button
                id="download-snapshot-btn"
                type="button"
                onClick={handleDownloadSnapshot}
                disabled={isExporting}
                className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
                  hasDownloadedBackup
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-amber-600 hover:bg-amber-700 text-white animate-pulse'
                }`}
              >
                {isExporting ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Archiving...</span>
                  </>
                ) : (
                  <>
                    <Download size={13} />
                    <span>{hasDownloadedBackup ? 'Download Again' : 'Download Archive'}</span>
                  </>
                )}
              </button>
            </div>

            <div className="text-[11px] font-mono opacity-90 break-all">
              {downloadedFilename ? (
                <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
                  <span>Saved as:</span>
                  <span className="font-semibold underline">{downloadedFilename}</span>
                </div>
              ) : (
                <span className="text-amber-800/80 dark:text-amber-300/80">
                  Target snapshot filename: <code className="bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded font-mono">SS:MM:HHTDD:MM:YYYY_workspace_snapshot.zip</code>
                </span>
              )}
            </div>
          </div>

          <div
            className="p-2.5 rounded-lg border flex items-center gap-2 text-[11px] bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-300 font-medium"
          >
            <AlertTriangle size={15} className="shrink-0 text-red-500" />
            <span>Resetting will immediately replace the active workspace with clean default samples.</span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-2.5 mt-1 pt-3 border-t" style={{ borderColor: theme.ui.border }}>
            <div className="text-[11px] text-muted-foreground" style={{ color: theme.ui.textMuted }}>
              {!hasDownloadedBackup && (
                <span className="text-amber-500 dark:text-amber-400 font-medium">
                  Download archive to unlock reset
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
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
                disabled={!hasDownloadedBackup}
                onClick={() => {
                  if (!hasDownloadedBackup) return;
                  onConfirm();
                  onClose();
                }}
                className={`px-4 py-1.5 rounded font-semibold text-xs transition-all shadow-sm flex items-center gap-1.5 ${
                  hasDownloadedBackup
                    ? 'bg-red-600 hover:bg-red-500 text-white cursor-pointer'
                    : 'bg-red-600/40 text-white/50 cursor-not-allowed opacity-60'
                }`}
                title={!hasDownloadedBackup ? 'You must download the workspace snapshot archive first' : 'Reset workspace'}
              >
                <RotateCcw size={13} />
                <span>Reset to Default & Delete All</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
