import React, { useState, useEffect, useRef, useCallback } from 'react';
import QRCode from 'qrcode';
import { 
  EncryptedEnvelope, 
  Language, 
  AuditLog 
} from '../types/index';
import { 
  encryptPayload, 
  evaluatePasswordStrength, 
  generateRandom256BitKey,
  calculateSha256
} from '../utils/crypto';
import { packetizeEnvelope } from '../utils/packetizer';
import { 
  Lock, 
  Key, 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Maximize2, 
  Minimize2, 
  FileUp, 
  FileText, 
  RefreshCw, 
  ShieldCheck, 
  Sliders, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertTriangle,
  Zap,
  Download,
  Copy,
  Check,
  Sparkles,
  Layers,
  Camera,
  Grid,
  Table,
  HelpCircle,
  Hash
} from 'lucide-react';
import { WizardConfig } from './WorkflowWizardModal';

interface Props {
  lang: Language;
  onLogAudit: (log: AuditLog) => void;
  injectedPayload?: string | null;
  onClearInjectedPayload?: () => void;
  onSimulateInReceiver?: (envelope: EncryptedEnvelope) => void;
  wizardConfig?: WizardConfig | null;
  onOpenWizard?: () => void;
}

export const Transmitter: React.FC<Props> = ({
  lang,
  onLogAudit,
  injectedPayload,
  onClearInjectedPayload,
  onSimulateInReceiver,
  wizardConfig,
  onOpenWizard,
}) => {
  // Input Data States
  const [inputMode, setInputMode] = useState<'text' | 'file'>('text');
  const [textContent, setTextContent] = useState<string>(
    JSON.stringify(
      {
        source: 'Online-FinTech-Core',
        status: 'AUTHORIZED',
        transaction_id: 'TX-9824-IR',
        amount_irr: 450000000,
        currency: 'IRR',
        beneficiary: 'IR880190000000123456789001',
        security_token: 'SEC-DIODE-VALID-2026',
        timestamp: new Date().toISOString(),
      },
      null,
      2
    )
  );
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    type: string;
    size: number;
    base64Data: string;
  } | null>(null);

  // Security / Encryption States
  const [encryptEnabled, setEncryptEnabled] = useState<boolean>(true);
  const [passphrase, setPassphrase] = useState<string>('AirDiode#SecureKey2026!');
  const [showPassphrase, setShowPassphrase] = useState<boolean>(false);

  // Optical Generation & Shutter Tuning
  const [chunkSize, setChunkSize] = useState<number>(240);
  const [fps, setFps] = useState<number>(3); // Camera Shutter Speed (Frames Per Second)
  const [displayCount, setDisplayCount] = useState<1 | 2 | 4>(1); // Number of QRs to display simultaneously
  const [errorCorrection, setErrorCorrection] = useState<'L' | 'M' | 'Q' | 'H'>('L');
  const [qrSize, setQrSize] = useState<'standard' | 'large' | 'huge'>('standard');

  // Animation States
  const [chunks, setChunks] = useState<string[]>([]);
  const [chunkSvgs, setChunkSvgs] = useState<string[]>([]);
  const [currentChunkIndex, setCurrentChunkIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [envelope, setEnvelope] = useState<EncryptedEnvelope | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [copiedRaw, setCopiedRaw] = useState<boolean>(false);

  // Frame dwell animation progress (0-100%)
  const [dwellProgress, setDwellProgress] = useState<number>(0);

  // Timer Ref
  const timerRef = useRef<number | null>(null);
  const dwellTimerRef = useRef<number | null>(null);
  const lastLoggedTransferId = useRef<string>('');

  // Apply Wizard Config whenever completed
  useEffect(() => {
    if (wizardConfig) {
      if (wizardConfig.flow === 'manual_file') {
        setInputMode(wizardConfig.inputMode);
        if (wizardConfig.inputMode === 'text') {
          setTextContent(wizardConfig.textContent);
        } else if (wizardConfig.selectedFile) {
          setSelectedFile(wizardConfig.selectedFile);
        }
      } else if (wizardConfig.flow === 'system_integration') {
        setInputMode('text');
        if (wizardConfig.verifiedPayload) {
          setTextContent(wizardConfig.verifiedPayload);
        }
      }

      setEncryptEnabled(wizardConfig.encryptEnabled);
      if (wizardConfig.passphrase) setPassphrase(wizardConfig.passphrase);
      setFps(wizardConfig.shutterFps);
      setDisplayCount(wizardConfig.displayCount);
      setErrorCorrection(wizardConfig.errorCorrection);
    }
  }, [wizardConfig]);

  // Handle injected payload from Integration Hub
  useEffect(() => {
    if (injectedPayload) {
      setInputMode('text');
      setTextContent(injectedPayload);
      if (onClearInjectedPayload) onClearInjectedPayload();
    }
  }, [injectedPayload, onClearInjectedPayload]);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setSelectedFile({
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        base64Data: base64,
      });
      setInputMode('file');
    };
    reader.readAsDataURL(file);
  };

  // Compile and packetize data
  const generateTransfer = useCallback(async () => {
    setIsProcessing(true);
    try {
      let rawData = '';
      let meta: { fileName?: string; fileType?: string; isBinary?: boolean } = {};

      if (inputMode === 'file' && selectedFile) {
        rawData = selectedFile.base64Data;
        meta = {
          fileName: selectedFile.name,
          fileType: selectedFile.type,
          isBinary: true,
        };
      } else {
        rawData = textContent;
        meta = {
          fileName: 'data.json',
          fileType: 'application/json',
          isBinary: false,
        };
      }

      let env: EncryptedEnvelope;

      if (encryptEnabled) {
        const pass = passphrase || 'AirDiode-Default-2026';
        env = await encryptPayload(rawData, pass, meta);
      } else {
        const hash = await calculateSha256(rawData);
        env = {
          version: 2,
          transferId: 'AIR-PLAIN-' + Math.random().toString(36).substring(2, 7).toUpperCase(),
          iv: '',
          salt: '',
          ciphertext: btoa(unescape(encodeURIComponent(rawData))),
          hash,
          totalBytes: new TextEncoder().encode(rawData).byteLength,
          fileName: meta.fileName,
          fileType: meta.fileType,
          timestamp: Date.now(),
        };
      }

      setEnvelope(env);

      // Packetize
      const { chunks: chunkList } = packetizeEnvelope(env, chunkSize);
      setChunks(chunkList);
      setCurrentChunkIndex(0);

      // Generate pristine vector SVGs for all chunks
      const svgs = await Promise.all(
        chunkList.map((chunk) =>
          QRCode.toString(chunk, {
            type: 'svg',
            margin: 2,
            errorCorrectionLevel: errorCorrection,
            color: {
              dark: '#000000',
              light: '#ffffff',
            },
          })
        )
      );
      setChunkSvgs(svgs);

      // Log once per unique transferId
      if (env.transferId !== lastLoggedTransferId.current) {
        lastLoggedTransferId.current = env.transferId;
        onLogAudit({
          id: 'tx-' + Date.now(),
          type: 'sent',
          fileName: meta.fileName,
          fileType: meta.fileType || 'text/plain',
          totalBytes: env.totalBytes,
          transferId: env.transferId,
          sha256: env.hash,
          timestamp: Date.now(),
          status: 'success',
        });
      }
    } catch (err) {
      console.error('Failed to generate optical transfer', err);
    } finally {
      setIsProcessing(false);
    }
  }, [inputMode, textContent, selectedFile, encryptEnabled, passphrase, chunkSize, errorCorrection, onLogAudit]);

  useEffect(() => {
    generateTransfer();
  }, [generateTransfer]);

  // Carousel timer loop with camera shutter speed sync
  useEffect(() => {
    if (!isPlaying || chunks.length <= 1) {
      if (timerRef.current) clearInterval(timerRef.current);
      if (dwellTimerRef.current) clearInterval(dwellTimerRef.current);
      setDwellProgress(100);
      return;
    }

    const frameDurationMs = Math.max(100, Math.floor(1000 / fps));
    const dwellStep = 25;
    let elapsed = 0;

    dwellTimerRef.current = window.setInterval(() => {
      elapsed += dwellStep;
      const pct = Math.min(100, (elapsed / frameDurationMs) * 100);
      setDwellProgress(pct);
    }, dwellStep);

    timerRef.current = window.setInterval(() => {
      elapsed = 0;
      // If displaying 1 QR, advance by 1; if 2 QRs, advance by 2; etc.
      setCurrentChunkIndex((prev) => (prev + displayCount) % chunks.length);
    }, frameDurationMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (dwellTimerRef.current) clearInterval(dwellTimerRef.current);
    };
  }, [isPlaying, fps, chunks.length, displayCount]);

  // Download current QR code as PNG image
  const handleDownloadQrPng = async () => {
    if (!chunks[currentChunkIndex]) return;
    try {
      const dataUrl = await QRCode.toDataURL(chunks[currentChunkIndex], {
        width: 800,
        margin: 2,
        errorCorrectionLevel: errorCorrection,
      });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `airdiode-frame-${currentChunkIndex + 1}-of-${chunks.length}.png`;
      a.click();
    } catch (e) {
      console.error('Download QR PNG failed', e);
    }
  };

  const handleCopyRaw = () => {
    if (!chunks[currentChunkIndex]) return;
    navigator.clipboard.writeText(chunks[currentChunkIndex]);
    setCopiedRaw(true);
    setTimeout(() => setCopiedRaw(false), 2000);
  };

  const strength = evaluatePasswordStrength(passphrase);

  // Compute indices to display based on displayCount
  const visibleIndices: number[] = [];
  if (chunks.length > 0) {
    for (let i = 0; i < displayCount; i++) {
      visibleIndices.push((currentChunkIndex + i) % chunks.length);
    }
  }

  // Size styling
  const sizeClasses = {
    standard: 'max-w-[340px]',
    large: 'max-w-[420px]',
    huge: 'max-w-[500px]',
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Explanation */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900/90 via-slate-900/50 to-emerald-950/20 p-5 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Zap className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                {lang === 'fa' ? 'فرستنده نوری و نمایشگر QR Code های متحرک' : 'Optical Transmitter & Shutter-Synchronized QR Carousel'}
                <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  DIODE TX
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                {lang === 'fa'
                  ? 'نمایش فریم‌های کیوآرکد به همراه جدول ماتریس قطعات در حال ارسال، تنظیم همزمانی شاتر دوربین و تعداد نمایش.'
                  : 'Displays high-definition QR frames with real-time chunk matrix, multi-QR display layout, and camera shutter rate tuning.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenWizard && (
              <button
                onClick={onOpenWizard}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-950/40 cursor-pointer transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{lang === 'fa' ? 'راهنمای گام‌به‌گام (Wizard)' : 'Setup Wizard'}</span>
              </button>
            )}

            {onSimulateInReceiver && envelope && (
              <button
                onClick={() => onSimulateInReceiver(envelope)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md transition cursor-pointer"
                title={lang === 'fa' ? 'تست درجا در تب گیرنده' : 'Test in Receiver tab'}
              >
                <span>{lang === 'fa' ? 'شبیه‌سازی در گیرنده' : 'Test in Receiver'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Data Input & Shutter Controls (Cols 5) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Data Source Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 backdrop-blur-xs p-5 shadow-lg">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-3">
              <span className="text-sm font-semibold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                {lang === 'fa' ? 'ورودی داده‌ها یا فایل' : 'Data Payload or File'}
              </span>
              <div className="flex items-center p-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs">
                <button
                  onClick={() => setInputMode('text')}
                  className={`px-3 py-1 rounded-md transition cursor-pointer ${
                    inputMode === 'text'
                      ? 'bg-emerald-600 text-white font-medium'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {lang === 'fa' ? 'متن / JSON' : 'Text / JSON'}
                </button>
                <button
                  onClick={() => setInputMode('file')}
                  className={`px-3 py-1 rounded-md transition cursor-pointer ${
                    inputMode === 'file'
                      ? 'bg-emerald-600 text-white font-medium'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {lang === 'fa' ? 'فایل / سند' : 'File / Binary'}
                </button>
              </div>
            </div>

            {inputMode === 'text' ? (
              <div className="space-y-2">
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder={lang === 'fa' ? 'متن، رکورد دیتابیس، تراکنش یا آبجکت JSON را وارد کنید...' : 'Enter text, JSON payload, or system telemetry...'}
                  rows={6}
                  dir="ltr"
                  className="w-full rounded-xl bg-slate-950/80 border border-slate-800 p-3 text-xs font-mono text-emerald-300 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/40 resize-none transition"
                />
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>{textContent.length} {lang === 'fa' ? 'کاراکتر' : 'chars'}</span>
                  <span>~{new TextEncoder().encode(textContent).byteLength} {lang === 'fa' ? 'بایت' : 'bytes'}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-700 hover:border-emerald-500/60 rounded-xl cursor-pointer bg-slate-950/50 hover:bg-slate-900/60 transition group">
                  <div className="flex flex-col items-center justify-center pt-4 pb-4 text-center px-4">
                    <FileUp className="w-7 h-7 text-slate-400 group-hover:text-emerald-400 transition mb-1" />
                    <p className="text-xs font-medium text-slate-300">
                      {lang === 'fa' ? 'کلیک کنید یا فایل را اینجا بکشید' : 'Click to browse or drag file here'}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      PDF, ZIP, JSON, CSV, PNG, TXT, DOCX, BIN
                    </p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>

                {selectedFile && (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-xs">
                    <div className="overflow-hidden">
                      <p className="font-semibold text-emerald-300 truncate">{selectedFile.name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type || 'binary'}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-400">
                      READY
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Cryptography & AES-256 Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 backdrop-blur-xs p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <span className="text-sm font-semibold text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-cyan-400" />
                {lang === 'fa' ? 'امنیت و رمزنگاری داده‌ها' : 'Data Encryption (AES-GCM-256)'}
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={encryptEnabled}
                  onChange={(e) => setEncryptEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            {encryptEnabled && (
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <label className="text-slate-300 font-medium">
                      {lang === 'fa' ? 'گذرواژه رمزنگاری (کلید مشترک PSK):' : 'Pre-Shared Encryption Key (PSK):'}
                    </label>
                    <span className="text-[11px] font-mono text-cyan-400">
                      PBKDF2 (100k rounds)
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassphrase ? 'text' : 'password'}
                      value={passphrase}
                      onChange={(e) => setPassphrase(e.target.value)}
                      placeholder={lang === 'fa' ? 'کلید امنیتی را وارد کنید...' : 'Enter security passphrase...'}
                      className="w-full rounded-xl bg-slate-950/80 border border-slate-800 px-3.5 py-2 text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassphrase(!showPassphrase)}
                      className="absolute end-3 top-2 text-slate-400 hover:text-white"
                    >
                      {showPassphrase ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Password Strength Indicator */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">
                      {lang === 'fa' ? 'سطح امنیت گذرواژه:' : 'Security level:'}
                    </span>
                    <span className="font-semibold text-slate-200">
                      {lang === 'fa' ? strength.labelFa : strength.labelEn}
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${strength.color}`}
                      style={{ width: `${(strength.score / 4) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* QR Display Count & Camera Shutter Tuning (تنظیم تعداد نمایش و شاتر) */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 backdrop-blur-xs p-5 shadow-lg space-y-4">
            <span className="text-sm font-semibold text-white flex items-center gap-2 border-b border-slate-800/80 pb-3">
              <Camera className="w-4 h-4 text-cyan-400" />
              {lang === 'fa' ? 'تنظیمات شاتر دوربین و تعداد نمایش کیوآرکد' : 'Camera Shutter & Multi-QR Display'}
            </span>

            {/* Shutter FPS */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-300 font-semibold">
                  {lang === 'fa' ? 'نرخ شاتر دوربین / فریم در ثانیه (FPS):' : 'Camera Shutter / FPS:'}
                </span>
                <span className="font-mono text-emerald-400 font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                  {fps} FPS ({Math.round(1000 / fps)}ms)
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                step={1}
                value={fps}
                onChange={(e) => setFps(parseInt(e.target.value, 10))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 block mt-0.5">
                {lang === 'fa' ? 'بر اساس توانایی و سرعت شاتر وب‌کم خود تنظیم فرمایید (۳ FPS بهترین حالت است).' : 'Tune to match your camera shutter capture speed (3 FPS is recommended).'}
              </span>
            </div>

            {/* Display Count (تعداد نمایش همزمان) */}
            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1.5">
                {lang === 'fa' ? 'تعداد نمایش همزمان کیوآرکد در صفحه:' : 'Simultaneous QR Count on Screen:'}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { count: 1, labelFa: 'تک کیوآر', labelEn: '1 Single' },
                  { count: 2, labelFa: '۲ کیوآر (دوقلو)', labelEn: '2 Dual' },
                  { count: 4, labelFa: '۴ کیوآر (شبکه ۴تایی)', labelEn: '4 Quad' },
                ].map((item) => (
                  <button
                    key={item.count}
                    type="button"
                    onClick={() => setDisplayCount(item.count as 1 | 2 | 4)}
                    className={`py-2 px-1 text-center rounded-xl border transition cursor-pointer text-xs font-bold ${
                      displayCount === item.count
                        ? 'bg-cyan-500/20 border-cyan-500/70 text-cyan-300 shadow-md shadow-cyan-950/30'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {lang === 'fa' ? item.labelFa : item.labelEn}
                  </button>
                ))}
              </div>
            </div>

            {/* Density & Error Correction */}
            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-800/80">
              <div>
                <span className="text-xs text-slate-400 block mb-1">
                  {lang === 'fa' ? 'حجم هر قطعه (بایت):' : 'Chunk Size:'}
                </span>
                <select
                  value={chunkSize}
                  onChange={(e) => setChunkSize(parseInt(e.target.value, 10))}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-2 py-1.5 text-xs text-cyan-300 font-mono"
                >
                  <option value={180}>180 B ({lang === 'fa' ? 'درشت و خوانا' : 'Light'})</option>
                  <option value={240}>240 B ({lang === 'fa' ? 'استاندارد بهینه' : 'Standard'})</option>
                  <option value={350}>350 B ({lang === 'fa' ? 'متوسط' : 'Medium'})</option>
                  <option value={500}>500 B ({lang === 'fa' ? 'فشرده' : 'Dense'})</option>
                </select>
              </div>

              <div>
                <span className="text-xs text-slate-400 block mb-1">
                  {lang === 'fa' ? 'تصحیح خطا:' : 'Error Corr:'}
                </span>
                <div className="flex items-center gap-1">
                  {(['L', 'M', 'Q', 'H'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setErrorCorrection(lvl)}
                      className={`flex-1 py-1 rounded text-xs font-mono transition cursor-pointer ${
                        errorCorrection === lvl
                          ? 'bg-purple-600 text-white font-bold'
                          : 'bg-slate-950 border border-slate-800 text-slate-400'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Optical QR Display & Chunks Matrix Table (Cols 7) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 backdrop-blur-xs p-5 sm:p-6 shadow-xl flex flex-col items-center">
            {/* Header info & Size Buttons */}
            <div className="w-full flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isPlaying ? 'bg-emerald-400 opacity-75' : 'bg-slate-500'}`}></span>
                  <span className={`relative inline-flex rounded-full h-3 w-3 ${isPlaying ? 'bg-emerald-500' : 'bg-slate-500'}`}></span>
                </span>
                <span className="text-xs font-mono font-bold text-white">
                  {lang === 'fa' ? 'خروجی نوری کیوآرکد (Vector Optical Display)' : 'Vector Optical Display'}
                </span>
                {displayCount > 1 && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono">
                    {displayCount}x GRID
                  </span>
                )}
              </div>

              {/* QR Size buttons & Fullscreen */}
              <div className="flex items-center gap-1.5">
                <div className="hidden sm:flex items-center p-0.5 rounded-lg bg-slate-800 text-xs">
                  <button
                    onClick={() => setQrSize('standard')}
                    className={`px-2 py-0.5 rounded transition cursor-pointer ${
                      qrSize === 'standard' ? 'bg-slate-700 text-white font-medium' : 'text-slate-400'
                    }`}
                  >
                    {lang === 'fa' ? 'معمولی' : 'Normal'}
                  </button>
                  <button
                    onClick={() => setQrSize('large')}
                    className={`px-2 py-0.5 rounded transition cursor-pointer ${
                      qrSize === 'large' ? 'bg-slate-700 text-white font-medium' : 'text-slate-400'
                    }`}
                  >
                    {lang === 'fa' ? 'بزرگ' : 'Large'}
                  </button>
                </div>

                <button
                  onClick={() => setIsFullscreen(true)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-300 transition cursor-pointer"
                  title={lang === 'fa' ? 'نمایش تمام‌صفحه' : 'Fullscreen'}
                >
                  <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{lang === 'fa' ? 'تمام‌صفحه' : 'Fullscreen'}</span>
                </button>
              </div>
            </div>

            {/* QR Card Container: Supports 1, 2, or 4 QRs Grid */}
            <div className={`w-full ${sizeClasses[qrSize]} transition-all duration-300`}>
              {displayCount === 1 ? (
                /* Single QR View */
                <div className="relative p-5 sm:p-6 rounded-2xl bg-white shadow-2xl flex items-center justify-center w-full aspect-square border-4 border-slate-700">
                  {chunkSvgs[currentChunkIndex] ? (
                    <div
                      className="w-full h-full flex items-center justify-center select-none"
                      dangerouslySetInnerHTML={{ __html: chunkSvgs[currentChunkIndex] }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400 text-xs font-mono">
                      <RefreshCw className="w-8 h-8 animate-spin mb-2 text-emerald-500" />
                      <span>Generating QR...</span>
                    </div>
                  )}

                  <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-emerald-500 pointer-events-none" />
                  <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-emerald-500 pointer-events-none" />
                  <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-emerald-500 pointer-events-none" />
                  <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-emerald-500 pointer-events-none" />
                </div>
              ) : displayCount === 2 ? (
                /* Dual QR Grid (2 QRs side by side) */
                <div className="grid grid-cols-2 gap-3 w-full">
                  {visibleIndices.map((idx, pos) => (
                    <div key={pos} className="relative p-3 rounded-2xl bg-white shadow-2xl flex flex-col items-center justify-center aspect-square border-2 border-slate-700">
                      <span className="absolute top-1 right-2 text-[10px] font-mono font-bold text-slate-700 bg-slate-200 px-1.5 py-0.2 rounded">
                        #{idx + 1}
                      </span>
                      {chunkSvgs[idx] && (
                        <div
                          className="w-full h-full flex items-center justify-center select-none"
                          dangerouslySetInnerHTML={{ __html: chunkSvgs[idx] }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                /* Quad QR Grid (4 QRs 2x2) */
                <div className="grid grid-cols-2 gap-2.5 w-full">
                  {visibleIndices.map((idx, pos) => (
                    <div key={pos} className="relative p-2 rounded-xl bg-white shadow-xl flex flex-col items-center justify-center aspect-square border border-slate-600">
                      <span className="absolute top-0.5 right-1 text-[9px] font-mono font-bold text-slate-700 bg-slate-200 px-1 rounded">
                        #{idx + 1}
                      </span>
                      {chunkSvgs[idx] && (
                        <div
                          className="w-full h-full flex items-center justify-center select-none"
                          dangerouslySetInnerHTML={{ __html: chunkSvgs[idx] }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Progress Bar & Frame Index Controls */}
            <div className={`w-full ${sizeClasses[qrSize]} mt-4 space-y-2`}>
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{lang === 'fa' ? 'فریم در حال نمایش:' : 'Current Frame:'}</span>
                </span>
                <span className="text-emerald-400 font-bold text-sm">
                  {chunks.length > 0 ? (displayCount === 1 ? `#${currentChunkIndex + 1}` : `[#${visibleIndices.map(v => v + 1).join(', #')}]`) : 0} / {chunks.length}
                </span>
              </div>

              {/* Dwell Progress bar */}
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700/50">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 transition-all duration-75"
                  style={{
                    width: `${dwellProgress}%`,
                  }}
                />
              </div>

              {/* Playback Controls */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setCurrentChunkIndex((prev) => (prev > 0 ? prev - 1 : chunks.length - 1));
                    }}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                    title={lang === 'fa' ? 'فریم قبلی' : 'Previous Frame'}
                  >
                    <SkipBack className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className={`px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-bold transition cursor-pointer shadow-md ${
                      isPlaying
                        ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-950/40'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/40'
                    }`}
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="w-4 h-4" />
                        <span>{lang === 'fa' ? 'توقف' : 'Pause'}</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        <span>{lang === 'fa' ? 'پخش' : 'Play'}</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setCurrentChunkIndex((prev) => (prev + 1) % chunks.length);
                    }}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                    title={lang === 'fa' ? 'فریم بعدی' : 'Next Frame'}
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleCopyRaw}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition cursor-pointer"
                    title={lang === 'fa' ? 'کپی رشته متنی کیوآرکد فعلی' : 'Copy current QR wire text'}
                  >
                    {copiedRaw ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={handleDownloadQrPng}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs transition cursor-pointer"
                    title={lang === 'fa' ? 'ذخیره فریم به عنوان فایل تصویر PNG' : 'Save frame as PNG image'}
                  >
                    <Download className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="hidden sm:inline">{lang === 'fa' ? 'دانلود PNG' : 'PNG'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* جدول ماتریس قطعات در حال ارسال (Full Chunk Matrix Table) */}
            <div className="w-full mt-6 pt-4 border-t border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <Table className="w-4 h-4 text-cyan-400" />
                  {lang === 'fa' ? 'جدول ماتریس قطعات در حال ارسال (Packet Chunks Ledger):' : 'Active Packet Chunks Matrix:'}
                </span>
                <span className="text-[11px] font-mono text-emerald-400 font-bold">
                  {chunks.length} {lang === 'fa' ? 'قطعه کل' : 'Total Chunks'}
                </span>
              </div>

              {/* Matrix Table */}
              <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/80">
                <table className="w-full text-start text-[11px] font-mono">
                  <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 sticky top-0">
                    <tr>
                      <th className="p-2 text-start">#</th>
                      <th className="p-2 text-start">{lang === 'fa' ? 'وضعیت نمایش' : 'Display Status'}</th>
                      <th className="p-2 text-start">{lang === 'fa' ? 'حجم قطعه' : 'Chunk Size'}</th>
                      <th className="p-2 text-start">CRC32</th>
                      <th className="p-2 text-start">{lang === 'fa' ? 'اقدام' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {chunks.map((rawChunk, idx) => {
                      const isCurrent = visibleIndices.includes(idx);
                      // Extract CRC32 from chunk header (AIRD:v2:id:idx:total:chunkCrc:...)
                      const parts = rawChunk.split(':');
                      const chunkCrc = parts[5] || 'N/A';
                      const chunkLen = rawChunk.length;

                      return (
                        <tr
                          key={idx}
                          className={`transition ${
                            isCurrent
                              ? 'bg-emerald-500/15 text-emerald-300 font-bold'
                              : 'hover:bg-slate-800/30'
                          }`}
                        >
                          <td className="p-2 text-start">{idx + 1}</td>
                          <td className="p-2 text-start">
                            {isCurrent ? (
                              <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                                {lang === 'fa' ? 'در حال پخش روی شاتر' : 'ON SHUTTER'}
                              </span>
                            ) : (
                              <span className="text-slate-500">{lang === 'fa' ? 'در نوبت چرخش' : 'Queued'}</span>
                            )}
                          </td>
                          <td className="p-2 text-start text-slate-400">{chunkLen} B</td>
                          <td className="p-2 text-start text-cyan-400">{chunkCrc}</td>
                          <td className="p-2 text-start">
                            <button
                              onClick={() => {
                                setCurrentChunkIndex(idx);
                                setIsPlaying(false);
                              }}
                              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-200 transition cursor-pointer"
                            >
                              {lang === 'fa' ? 'نمایش' : 'Jump'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Transmission Statistics */}
            {envelope && (
              <div className="w-full mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-slate-800">
                <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center">
                  <span className="text-[10px] text-slate-400 block">
                    {lang === 'fa' ? 'شناسه انتقال' : 'Transfer ID'}
                  </span>
                  <span className="text-xs font-mono font-bold text-cyan-300 truncate block">
                    {envelope.transferId.substring(0, 10)}...
                  </span>
                </div>

                <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center">
                  <span className="text-[10px] text-slate-400 block">
                    {lang === 'fa' ? 'تعداد قطعات' : 'Total Chunks'}
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-300">
                    {chunks.length} {lang === 'fa' ? 'کیوآر' : 'QRs'}
                  </span>
                </div>

                <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center">
                  <span className="text-[10px] text-slate-400 block">
                    {lang === 'fa' ? 'حجم کل' : 'Total Size'}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-200">
                    {(envelope.totalBytes / 1024).toFixed(2)} KB
                  </span>
                </div>

                <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center">
                  <span className="text-[10px] text-slate-400 block">
                    {lang === 'fa' ? 'زمان دور شاتر' : 'Cycle Time'}
                  </span>
                  <span className="text-xs font-mono font-bold text-purple-300">
                    {((chunks.length / (fps * displayCount)) || 0).toFixed(1)}s
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fullscreen Presentation Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 p-4 backdrop-blur-md">
          <div className="absolute top-6 right-6 flex items-center gap-3">
            <span className="text-sm font-mono text-emerald-400 font-bold bg-slate-900/80 px-3 py-1 rounded-full border border-slate-800">
              Frame {currentChunkIndex + 1} / {chunks.length} ({fps} FPS)
            </span>
            <button
              onClick={() => setIsFullscreen(false)}
              className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-white cursor-pointer"
            >
              <Minimize2 className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-col items-center justify-center max-w-xl w-full">
            <div className="p-6 sm:p-8 rounded-3xl bg-white shadow-[0_0_80px_rgba(16,185,129,0.3)] max-w-md w-full aspect-square flex items-center justify-center">
              <div
                className="w-full h-full flex items-center justify-center"
                dangerouslySetInnerHTML={{ __html: chunkSvgs[currentChunkIndex] || '' }}
              />
            </div>

            <div className="mt-6 flex items-center gap-4">
              <button
                onClick={() => setCurrentChunkIndex((prev) => (prev > 0 ? prev - 1 : chunks.length - 1))}
                className="p-3 rounded-xl bg-slate-800 text-white hover:bg-slate-700 cursor-pointer"
              >
                <SkipBack className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`px-6 py-3 rounded-2xl font-bold text-sm cursor-pointer shadow-lg ${isPlaying ? 'bg-amber-600 text-white' : 'bg-emerald-600 text-white'}`}
              >
                {isPlaying ? (lang === 'fa' ? 'توقف' : 'Pause') : (lang === 'fa' ? 'پخش' : 'Play')}
              </button>
              <button
                onClick={() => setCurrentChunkIndex((prev) => (prev + 1) % chunks.length)}
                className="p-3 rounded-xl bg-slate-800 text-white hover:bg-slate-700 cursor-pointer"
              >
                <SkipForward className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
