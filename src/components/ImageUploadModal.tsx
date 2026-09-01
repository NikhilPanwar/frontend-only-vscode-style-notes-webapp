import React, { useState, useRef } from 'react';
import { ImagePlus, Upload, Link, X, Check, FileImage } from 'lucide-react';
import { ThemeType, MAX_NOTE_SIZE_BYTES } from '../types';
import { THEMES } from '../utils/themes';
import { formatBytes } from '../utils/storage';

interface ImageUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: ThemeType;
  onInsertImageMarkdown: (alt: string, src: string, saveAsFileNode: boolean, filename: string, dataUrl?: string) => void;
}

export const ImageUploadModal: React.FC<ImageUploadModalProps> = ({
  isOpen,
  onClose,
  currentTheme,
  onInsertImageMarkdown,
}) => {
  const theme = THEMES[currentTheme];
  const [tab, setTab] = useState<'upload' | 'url'>('upload');
  const [altText, setAltText] = useState('image');
  const [imageUrl, setImageUrl] = useState('');
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [fileSize, setFileSize] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_NOTE_SIZE_BYTES) {
      setErrorMsg(`Image size (${formatBytes(file.size)}) exceeds 1MB max note size.`);
      return;
    }

    setUploadedFileName(file.name);
    setFileSize(file.size);
    setAltText(file.name.replace(/\.[^/.]+$/, ''));

    const reader = new FileReader();
    reader.onload = () => {
      setPreviewDataUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    if (file.size > MAX_NOTE_SIZE_BYTES) {
      setErrorMsg(`Image size (${formatBytes(file.size)}) exceeds 1MB max note size.`);
      return;
    }

    setUploadedFileName(file.name);
    setFileSize(file.size);
    setAltText(file.name.replace(/\.[^/.]+$/, ''));

    const reader = new FileReader();
    reader.onload = () => {
      setPreviewDataUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          const generatedName = `screenshot_${Date.now()}.png`;
          setUploadedFileName(generatedName);
          setFileSize(file.size);
          setAltText('screenshot');
          const reader = new FileReader();
          reader.onload = () => {
            setPreviewDataUrl(reader.result as string);
          };
          reader.readAsDataURL(file);
          break;
        }
      }
    }
  };

  const handleConfirm = () => {
    if (tab === 'upload') {
      if (!previewDataUrl) return;
      // Insert image: we pass filename as reference and dataUrl
      onInsertImageMarkdown(altText || 'image', uploadedFileName || 'image.png', true, uploadedFileName || 'image.png', previewDataUrl);
    } else {
      if (!imageUrl.trim()) return;
      onInsertImageMarkdown(altText || 'image', imageUrl.trim(), false, 'image.png');
    }
    handleClose();
  };

  const handleClose = () => {
    setPreviewDataUrl(null);
    setUploadedFileName('');
    setImageUrl('');
    setAltText('image');
    setErrorMsg(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      id="image-upload-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs select-none"
      onClick={handleClose}
      onPaste={handlePaste}
    >
      <div
        className="w-full max-w-md rounded-xl shadow-2xl border overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100"
        style={{
          backgroundColor: theme.ui.modalBg,
          borderColor: theme.ui.border,
          color: theme.ui.textMain,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-4 py-3 border-b flex items-center justify-between"
          style={{ borderColor: theme.ui.border, backgroundColor: theme.ui.bgTitleBar }}
        >
          <div className="flex items-center gap-2 font-semibold text-sm" style={{ color: theme.ui.textHeader }}>
            <ImagePlus size={16} className="text-blue-500" />
            <span>Insert Image into Note</span>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            style={{ color: theme.ui.textMuted }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b text-xs" style={{ borderColor: theme.ui.border }}>
          <button
            onClick={() => setTab('upload')}
            className={`flex-1 py-2 flex items-center justify-center gap-1.5 font-medium transition-colors ${
              tab === 'upload' ? 'border-b-2 border-blue-500 bg-blue-500/10' : 'hover:bg-black/5 dark:hover:bg-white/5'
            }`}
            style={{
              color: tab === 'upload' ? theme.ui.textHeader : theme.ui.textMuted,
            }}
          >
            <Upload size={13} />
            <span>Upload or Paste</span>
          </button>
          <button
            onClick={() => setTab('url')}
            className={`flex-1 py-2 flex items-center justify-center gap-1.5 font-medium transition-colors ${
              tab === 'url' ? 'border-b-2 border-blue-500 bg-blue-500/10' : 'hover:bg-black/5 dark:hover:bg-white/5'
            }`}
            style={{
              color: tab === 'url' ? theme.ui.textHeader : theme.ui.textMuted,
            }}
          >
            <Link size={13} />
            <span>Image URL</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 flex flex-col gap-3 text-xs">
          {errorMsg && (
            <div className="p-2 bg-red-500/15 border border-red-500/30 rounded text-red-500 text-[11px]">
              {errorMsg}
            </div>
          )}

          {/* Alt text field */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium" style={{ color: theme.ui.textMuted }}>Alt Description</label>
            <input
              type="text"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              placeholder="e.g. Architecture Diagram"
              className="p-2 rounded border outline-none focus:border-blue-500"
              style={{
                backgroundColor: theme.ui.inputBg,
                borderColor: theme.ui.border,
                color: theme.ui.textMain,
              }}
            />
          </div>

          {tab === 'upload' ? (
            <div className="flex flex-col gap-2">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed rounded-lg p-5 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-blue-500 transition-colors text-center"
                style={{
                  borderColor: previewDataUrl ? '#3b82f6' : theme.ui.border,
                  backgroundColor: previewDataUrl ? 'rgba(59, 130, 246, 0.05)' : undefined,
                }}
              >
                {previewDataUrl ? (
                  <div className="flex flex-col items-center gap-2">
                    <img
                      src={previewDataUrl}
                      alt="Preview"
                      className="max-h-32 object-contain rounded border shadow"
                      style={{ borderColor: theme.ui.border }}
                    />
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-500 font-medium">
                      <Check size={13} />
                      <span>{uploadedFileName} ({formatBytes(fileSize)})</span>
                    </div>
                    <span className="text-[10px]" style={{ color: theme.ui.textMuted }}>Click to change image</span>
                  </div>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-full bg-blue-600/20 text-blue-500 flex items-center justify-center">
                      <FileImage size={20} />
                    </div>
                    <div>
                      <span className="font-semibold" style={{ color: theme.ui.textHeader }}>Click to browse</span> or drag & drop image
                    </div>
                    <p className="text-[10px]" style={{ color: theme.ui.textMuted }}>
                      PNG, JPG, GIF, WebP, SVG (Max 1MB). You can also paste directly with Ctrl+V!
                    </p>
                  </>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium" style={{ color: theme.ui.textMuted }}>Image URL</label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/photo.png"
                className="p-2 rounded border outline-none focus:border-blue-500"
                style={{
                  backgroundColor: theme.ui.inputBg,
                  borderColor: theme.ui.border,
                  color: theme.ui.textMain,
                }}
              />
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-end gap-2 pt-2 border-t" style={{ borderColor: theme.ui.border }}>
            <button
              onClick={handleClose}
              className="px-3 py-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              style={{ color: theme.ui.textMuted }}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={tab === 'upload' ? !previewDataUrl : !imageUrl.trim()}
              className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-colors"
            >
              Insert Image
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
