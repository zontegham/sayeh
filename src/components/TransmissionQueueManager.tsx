import React, { useState } from 'react';
import { QueueItem, Language } from '../types/index';
import { 
  ListOrdered, 
  Trash2, 
  Plus, 
  Play, 
  ArrowUp, 
  ArrowDown, 
  CheckCircle2, 
  Clock, 
  FileText, 
  FileUp, 
  File, 
  RotateCcw,
  Sparkles,
  Layers,
  Check
} from 'lucide-react';

interface TransmissionQueueManagerProps {
  queue: QueueItem[];
  activeItemId: string | null;
  lang: Language;
  autoAdvance: boolean;
  onToggleAutoAdvance: (val: boolean) => void;
  onSelectActiveItem: (item: QueueItem) => void;
  onDeleteItem: (id: string) => void;
  onClearQueue: () => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onAddFiles: (files: FileList | File[]) => void;
  onAddCurrentTextToQueue: () => void;
}

export const TransmissionQueueManager: React.FC<TransmissionQueueManagerProps> = ({
  queue,
  activeItemId,
  lang,
  autoAdvance,
  onToggleAutoAdvance,
  onSelectActiveItem,
  onDeleteItem,
  onClearQueue,
  onMoveUp,
  onMoveDown,
  onAddFiles,
  onAddCurrentTextToQueue,
}) => {
  const [isAddingFiles, setIsAddingFiles] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddFiles(e.target.files);
      e.target.value = '';
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-sm p-4 sm:p-5 transition-colors space-y-4">
      {/* Queue Header & Admin Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400">
            <ListOrdered className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>{lang === 'fa' ? 'صف ارسال اسناد و بسته‌ها (Transmission Queue)' : 'Transmission Queue Manager'}</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-cyan-100 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
                {queue.length} {lang === 'fa' ? 'قلم' : 'items'}
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {lang === 'fa'
                ? 'مدیریت و کنترل صف ارسال بسته‌های Air-Gap با امکان حذف کامل صف، جابجایی اولویت یا تغییر دستی بسته فعال.'
                : 'Manage Air-Gap transmission spool with ability to clear queue, reorder priorities, or swap active payload.'}
            </p>
          </div>
        </div>

        {/* Global Admin Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Add Multiple Files Button */}
          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-semibold cursor-pointer transition shadow-xs">
            <Plus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{lang === 'fa' ? 'افزودن فایل‌ها به صف' : 'Add Files to Queue'}</span>
            <input
              type="file"
              multiple
              className="hidden"
              onChange={handleFileInputChange}
            />
          </label>

          {/* Add Current Payload */}
          <button
            onClick={onAddCurrentTextToQueue}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-semibold cursor-pointer transition shadow-xs"
            title={lang === 'fa' ? 'افزودن محتوای فعلی به انتهای صف' : 'Add current payload to queue'}
          >
            <FileText className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>{lang === 'fa' ? 'افزودن پیام فعلی به صف' : 'Queue Current Payload'}</span>
          </button>

          {/* Auto-Advance Toggle */}
          <button
            onClick={() => onToggleAutoAdvance(!autoAdvance)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer shadow-xs ${
              autoAdvance
                ? 'bg-emerald-100 hover:bg-emerald-200 border-emerald-300 text-emerald-950 font-bold dark:bg-emerald-950/80 dark:border-emerald-500/40 dark:text-emerald-300'
                : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
            }`}
            title={lang === 'fa' ? 'جابجایی خودکار به فایل بعدی پس از چرخش کامل قطعات' : 'Auto-advance to next queued item after full transmission'}
          >
            <RotateCcw className={`w-3.5 h-3.5 ${autoAdvance ? 'text-emerald-600 dark:text-emerald-400 animate-spin' : ''}`} />
            <span>{lang === 'fa' ? (autoAdvance ? 'ارسال خودکار بعدی: فعال' : 'ارسال خودکار بعدی: خاموش') : (autoAdvance ? 'Auto Next: ON' : 'Auto Next: OFF')}</span>
          </button>

          {/* Clear Queue (Admin Delete Entire Queue) */}
          {queue.length > 0 && (
            confirmClear ? (
              <div className="flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/80 p-1 rounded-xl border border-rose-300 dark:border-rose-800 animate-in fade-in">
                <span className="text-[11px] font-bold text-rose-700 dark:text-rose-300 px-1">
                  {lang === 'fa' ? 'مطمئنید صف حذف شود؟' : 'Clear all?'}
                </span>
                <button
                  onClick={() => {
                    onClearQueue();
                    setConfirmClear(false);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition cursor-pointer"
                >
                  {lang === 'fa' ? 'بله، حذف کل صف' : 'Yes, Delete All'}
                </button>
                <button
                  onClick={() => setConfirmClear(false)}
                  className="px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs transition cursor-pointer"
                >
                  {lang === 'fa' ? 'انصراف' : 'Cancel'}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmClear(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:hover:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold transition cursor-pointer shadow-xs"
                title={lang === 'fa' ? 'حذف کامل تمام اقلام موجود در صف' : 'Clear entire transmission queue'}
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span>{lang === 'fa' ? 'حذف کامل صف' : 'Clear Entire Queue'}</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* Queue Items List */}
      {queue.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 px-4 text-center rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <Layers className="w-9 h-9 text-slate-400 dark:text-slate-600 mb-2" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
            {lang === 'fa' ? 'صف ارسال در حال حاضر خالی است' : 'Transmission queue is empty'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md">
            {lang === 'fa'
              ? 'می‌توانید چند فایل را هم‌زمان اضافه کنید تا یکی پس از دیگری توسط فرستنده نوری مخابره شوند.'
              : 'Add multiple files or payloads to batch queue for continuous optical transmission.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {queue.map((item, index) => {
            const isActive = item.id === activeItemId;
            return (
              <div
                key={item.id}
                className={`flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border transition-all ${
                  isActive
                    ? 'bg-emerald-50/80 border-emerald-400 dark:bg-emerald-950/40 dark:border-emerald-500/60 shadow-sm'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {/* Order & Metadata */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-mono font-bold shrink-0 ${
                    isActive
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                  }`}>
                    #{index + 1}
                  </span>

                  <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
                    {item.isBinary ? <File className="w-4 h-4 text-cyan-600 dark:text-cyan-400" /> : <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate" title={item.name}>
                        {item.name}
                      </span>
                      {isActive && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-600 animate-pulse">
                          {lang === 'fa' ? 'در حال ارسال نوری' : 'Transmitting'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                      <span>{formatSize(item.size)}</span>
                      <span>•</span>
                      <span>{item.type || 'text/plain'}</span>
                    </div>
                  </div>
                </div>

                {/* Controls per item */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Select as active / Transmit now */}
                  {!isActive ? (
                    <button
                      onClick={() => onSelectActiveItem(item)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 dark:text-emerald-300 dark:border-emerald-700 text-xs font-semibold transition cursor-pointer shadow-xs"
                      title={lang === 'fa' ? 'ارسال این فایل هم‌اکنون' : 'Transmit this item now'}
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{lang === 'fa' ? 'ارسال فوری' : 'Transmit'}</span>
                    </button>
                  ) : (
                    <span className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold shadow-xs">
                      <Check className="w-3.5 h-3.5" />
                      <span>{lang === 'fa' ? 'فعال' : 'Active'}</span>
                    </span>
                  )}

                  {/* Move Up */}
                  <button
                    disabled={index === 0}
                    onClick={() => onMoveUp(index)}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                    title={lang === 'fa' ? 'انتقال به اولویت بالاتر' : 'Move up'}
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>

                  {/* Move Down */}
                  <button
                    disabled={index === queue.length - 1}
                    onClick={() => onMoveDown(index)}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                    title={lang === 'fa' ? 'انتقال به اولویت پایین‌تر' : 'Move down'}
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>

                  {/* Delete Item from Queue */}
                  <button
                    onClick={() => onDeleteItem(item.id)}
                    className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                    title={lang === 'fa' ? 'حذف این فایل از صف' : 'Delete from queue'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
