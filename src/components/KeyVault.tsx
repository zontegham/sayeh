import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Language, StoredKey } from '../types/index';
import { generateRandom256BitKey } from '../utils/crypto';
import { 
  Key, 
  Plus, 
  Trash2, 
  Copy, 
  Check, 
  QrCode, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  Sparkles,
  Info
} from 'lucide-react';

interface Props {
  lang: Language;
  onSelectKey: (key: string) => void;
  activeKeyHex?: string;
}

export const KeyVault: React.FC<Props> = ({
  lang,
  onSelectKey,
  activeKeyHex,
}) => {
  const [keys, setKeys] = useState<StoredKey[]>(() => {
    try {
      const saved = localStorage.getItem('airdiode_keys');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'default-master',
        name: lang === 'fa' ? 'کلید پیش‌فرض پدافند سایه' : 'Sayeh Default Security Key',
        keyHex: 'Sayeh#SecureKey2026!',
        createdAt: Date.now(),
        notes: 'AES-256 Pre-Shared Key',
      },
    ];
  });

  const [newKeyName, setNewKeyName] = useState<string>('');
  const [newKeyValue, setNewKeyValue] = useState<string>('');
  const [showKeyModal, setShowKeyModal] = useState<boolean>(false);
  const [qrKeyModal, setQrKeyModal] = useState<StoredKey | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());

  const [keyQrSvg, setKeyQrSvg] = useState<string>('');

  // Save to local storage
  useEffect(() => {
    localStorage.setItem('airdiode_keys', JSON.stringify(keys));
  }, [keys]);

  // Render Key QR when modal open
  useEffect(() => {
    if (qrKeyModal) {
      QRCode.toString(
        `AIRD:KEY:${qrKeyModal.keyHex}`,
        {
          type: 'svg',
          margin: 2,
          color: { dark: '#000000', light: '#ffffff' },
        },
        (err, svg) => {
          if (!err && svg) setKeyQrSvg(svg);
        }
      );
    }
  }, [qrKeyModal]);

  const handleCreateRandomKey = () => {
    const randomHex = generateRandom256BitKey();
    const newKey: StoredKey = {
      id: 'key-' + Date.now(),
      name: newKeyName || (lang === 'fa' ? `کلید امنیتی ${keys.length + 1}` : `Key #${keys.length + 1}`),
      keyHex: randomHex,
      createdAt: Date.now(),
      notes: '256-bit CSPRNG AES-GCM Key',
    };
    setKeys([newKey, ...keys]);
    setNewKeyName('');
    setNewKeyValue('');
    setShowKeyModal(false);
  };

  const handleAddCustomKey = () => {
    if (!newKeyValue) return;
    const newKey: StoredKey = {
      id: 'key-' + Date.now(),
      name: newKeyName || (lang === 'fa' ? `کلید سفارشی ${keys.length + 1}` : `Custom Key #${keys.length + 1}`),
      keyHex: newKeyValue,
      createdAt: Date.now(),
      notes: 'Custom Pre-Shared Key',
    };
    setKeys([newKey, ...keys]);
    setNewKeyName('');
    setNewKeyValue('');
    setShowKeyModal(false);
  };

  const handleDeleteKey = (id: string) => {
    setKeys(keys.filter((k) => k.id !== id));
  };

  const handleCopyKey = (id: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleReveal = (id: string) => {
    const next = new Set(revealedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setRevealedIds(next);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900/90 via-slate-900/50 to-amber-950/20 p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Key className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                {lang === 'fa' ? 'گاوصندوق کلیدهای رمزنگاری (Key Vault)' : 'AES-256 Key Vault'}
                <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  AES-256-GCM
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                {lang === 'fa'
                  ? 'مدیریت کلیدهای امنیتی برای رمزنگاری داده‌ها. می‌توانید کلید را در قالب کیوآرکد نمایش دهید تا در سیستم دوم با دوربین اسکن و ثبت شود.'
                  : 'Manage AES-256 encryption keys. You can display keys as QR codes to securely optical-sync them to the destination system in person.'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowKeyModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-lg shadow-amber-950/50 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === 'fa' ? 'ایجاد یا افزودن کلید جدید' : 'New Security Key'}</span>
          </button>
        </div>
      </div>

      {/* Keys List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {keys.map((k) => {
          const isRevealed = revealedIds.has(k.id);
          const isSelected = activeKeyHex === k.keyHex;

          return (
            <div
              key={k.id}
              className={`rounded-2xl border p-4 backdrop-blur-xs transition flex flex-col justify-between ${
                isSelected
                  ? 'bg-amber-950/20 border-amber-500/50 shadow-lg shadow-amber-950/30'
                  : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                    {k.name}
                  </span>
                  {isSelected && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      ACTIVE
                    </span>
                  )}
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 font-mono text-xs text-slate-300 break-all select-all flex items-center justify-between gap-2" dir="ltr">
                  <span>
                    {isRevealed
                      ? k.keyHex
                      : '••••••••••••••••••••••••••••••••'}
                  </span>
                  <button
                    onClick={() => toggleReveal(k.id)}
                    className="text-slate-500 hover:text-slate-300 p-1 shrink-0"
                  >
                    {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setQrKeyModal(k)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                    title={lang === 'fa' ? 'نمایش QR کلید برای انتقال چشمی' : 'Show Key QR'}
                  >
                    <QrCode className="w-3.5 h-3.5 text-cyan-400" />
                  </button>

                  <button
                    onClick={() => handleCopyKey(k.id, k.keyHex)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                    title={lang === 'fa' ? 'کپی کلید' : 'Copy Key'}
                  >
                    {copiedId === k.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>

                  {keys.length > 1 && (
                    <button
                      onClick={() => handleDeleteKey(k.id)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 transition"
                      title={lang === 'fa' ? 'حذف کلید' : 'Delete Key'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <button
                  onClick={() => onSelectKey(k.keyHex)}
                  className="px-2.5 py-1 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 text-xs font-medium transition cursor-pointer"
                >
                  {lang === 'fa' ? 'انتخاب جهت رمزنگاری' : 'Select'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* New Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-6 shadow-2xl text-slate-800 dark:text-slate-200 space-y-4 transition-colors">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-500" />
                {lang === 'fa' ? 'ایجاد یا ثبت کلید رمزنگاری جدید' : 'Create or Import New Key'}
              </h3>
              <button
                onClick={() => setShowKeyModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-300 block mb-1">
                  {lang === 'fa' ? 'عنوان یا برچسب کلید:' : 'Key Label / Name:'}
                </label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder={lang === 'fa' ? 'مثال: کلید سرور اتوماسیون' : 'e.g. Finance Server Key'}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">
                  {lang === 'fa' ? 'کلید سفارشی دستی (اختیاری):' : 'Custom Key Value (Optional):'}
                </label>
                <input
                  type="text"
                  value={newKeyValue}
                  onChange={(e) => setNewKeyValue(e.target.value)}
                  placeholder={lang === 'fa' ? 'گذرواژه قوی یا کد هگز ۲۵۶ بیتی...' : 'Enter custom passphrase or hex...'}
                  dir="ltr"
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={handleCreateRandomKey}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-teal-600 hover:from-amber-500 text-white text-xs font-medium cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{lang === 'fa' ? 'تولید تصادفی ۲۵۶ بیت نظامی' : 'Generate 256-bit CSPRNG'}</span>
              </button>

              {newKeyValue && (
                <button
                  onClick={handleAddCustomKey}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium cursor-pointer"
                >
                  {lang === 'fa' ? 'ذخیره کلید دستی' : 'Save Custom'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Optical Key QR Display Modal */}
      {qrKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-6 shadow-2xl text-center space-y-4 text-slate-800 dark:text-slate-200 transition-colors">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-center gap-2">
              <QrCode className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              {lang === 'fa' ? 'انتقال چشمی کلید مشترک' : 'Optical Key QR Transfer'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {lang === 'fa'
                ? 'دوربین سیستم دوم را به این کیوآرکد نزدیک کنید تا کلید رمزنگاری بدون واسطه شبکه همگام شود.'
                : 'Point the receiver system camera at this QR code to sync the encryption key optically.'}
            </p>

            <div className="p-4 bg-white rounded-2xl inline-block shadow-lg mx-auto w-56 h-56 border border-slate-200 dark:border-slate-700">
              <div
                className="w-full h-full flex items-center justify-center select-none"
                dangerouslySetInnerHTML={{ __html: keyQrSvg }}
              />
            </div>

            <p className="text-xs font-mono text-amber-600 dark:text-amber-300 font-bold truncate">
              {qrKeyModal.name}
            </p>

            <button
              onClick={() => setQrKeyModal(null)}
              className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white text-xs font-medium transition cursor-pointer"
            >
              {lang === 'fa' ? 'بستن' : 'Close'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
