import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import QRCode from 'qrcode';
import { 
  EncryptedEnvelope, 
  Language, 
  AuditLog,
  QueueItem
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
  Maximize,
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
  Hash,
  QrCode,
  ZoomIn,
  ZoomOut,
  Columns,
  Plus,
  Minus,
  ListOrdered,
  Focus,
  ScanLine,
  Target,
  Sun,
  Inbox,
  X
} from 'lucide-react';
import { WizardConfig } from './WorkflowWizardModal';
import { TransmissionQueueManager } from './TransmissionQueueManager';

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
  const [textContent, setTextContent] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    type: string;
    size: number;
    base64Data: string;
  } | null>(null);

  // Security / Encryption States
  const [encryptEnabled, setEncryptEnabled] = useState<boolean>(true);
  const [passphrase, setPassphrase] = useState<string>('Sayeh#SecureKey2026!');
  const [showPassphrase, setShowPassphrase] = useState<boolean>(false);

  // Optical Generation & Shutter Tuning
  const [chunkSize, setChunkSize] = useState<number>(240);
  const [fps, setFps] = useState<number>(3); // Camera Shutter Speed (Frames Per Second)
  const [displayCount, setDisplayCount] = useState<1 | 2 | 4 | 8 | 16>(1); // Number of QRs to display simultaneously (1 to 16)
  const [errorCorrection, setErrorCorrection] = useState<'L' | 'M' | 'Q' | 'H'>('L');
  const [qrSize, setQrSize] = useState<'standard' | 'large' | 'huge'>('standard');

  // Adaptive Optical Readability Engine (حل قطعی مشکل خوانایی در ابعاد کوچک)
  const [autoAdaptiveDensity, setAutoAdaptiveDensity] = useState<boolean>(true);
  const [readabilityPreset, setReadabilityPreset] = useState<'ultra' | 'balanced' | 'dense'>('ultra');
  const [focusedChunkIndex, setFocusedChunkIndex] = useState<number | null>(null);

  // Calculate effective chunk size based on adaptive optical rules
  const effectiveChunkSize = useCallback(() => {
    if (!autoAdaptiveDensity) {
      return chunkSize;
    }
    if (readabilityPreset === 'ultra') {
      // Ultra readable: low density chunks -> Version 1-3 QR -> gigantic dots
      switch (displayCount) {
        case 16: return 75;
        case 8: return 95;
        case 4: return 125;
        case 2: return 160;
        default: return 200;
      }
    } else if (readabilityPreset === 'balanced') {
      switch (displayCount) {
        case 16: return 95;
        case 8: return 130;
        case 4: return 170;
        case 2: return 210;
        default: return 260;
      }
    } else {
      // Dense / High throughput
      switch (displayCount) {
        case 16: return 130;
        case 8: return 180;
        case 4: return 230;
        case 2: return 280;
        default: return 360;
      }
    }
  }, [autoAdaptiveDensity, readabilityPreset, displayCount, chunkSize])();

  // Zoom Scale & Interactive Display Layout Controls (60% to 220%)
  const [qrScale, setQrScale] = useState<number>(100);
  const [gridColumns, setGridColumns] = useState<'auto' | 2 | 3 | 4 | 6 | 8>('auto');
  const [matrixWidth, setMatrixWidth] = useState<'compact' | 'balanced' | 'wide' | 'full'>('wide');

  // Transmission Queue Manager State (Persisted in localStorage)
  const [queue, setQueue] = useState<QueueItem[]>(() => {
    try {
      const saved = localStorage.getItem('sayeh_tx_queue');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });
  const [activeQueueItemId, setActiveQueueItemId] = useState<string | null>(() => {
    return queue.length > 0 ? queue[0].id : null;
  });
  const [autoAdvanceQueue, setAutoAdvanceQueue] = useState<boolean>(false);

  // Sync queue with localStorage
  useEffect(() => {
    try {
      localStorage.setItem('sayeh_tx_queue', JSON.stringify(queue));
    } catch (e) {
      console.error('Failed to save queue', e);
    }
  }, [queue]);

  // Queue item activation
  const handleSelectActiveItem = useCallback((item: QueueItem) => {
    setActiveQueueItemId(item.id);
    if (item.isBinary) {
      setInputMode('file');
      setSelectedFile({
        name: item.name,
        type: item.type,
        size: item.size,
        base64Data: item.data,
      });
    } else {
      setInputMode('text');
      setTextContent(item.data);
      setSelectedFile(null);
    }
    setQueue((prev) =>
      prev.map((q) => ({
        ...q,
        status: q.id === item.id ? 'broadcasting' : 'pending',
      }))
    );
  }, []);

  // Add files to queue (multiple files supported)
  const handleAddFilesToQueue = useCallback((files: FileList | File[]) => {
    Array.from(files).forEach((file, idx) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        const newItem: QueueItem = {
          id: `queue-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
          name: file.name,
          type: file.type || 'application/octet-stream',
          size: file.size,
          data: base64,
          isBinary: true,
          status: 'pending',
          createdAt: Date.now(),
        };
        setQueue((prev) => {
          const updated = [...prev, newItem];
          if (prev.length === 0) {
            handleSelectActiveItem(newItem);
          }
          return updated;
        });
      };
      reader.readAsDataURL(file);
    });
  }, [handleSelectActiveItem]);

  // Add current text payload to queue
  const handleAddCurrentTextToQueue = useCallback(() => {
    const newItem: QueueItem = {
      id: `queue-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: `پیام امن (${new Date().toLocaleTimeString('fa-IR')})`,
      type: 'text/plain',
      size: new TextEncoder().encode(textContent).byteLength,
      data: textContent,
      isBinary: false,
      status: 'pending',
      createdAt: Date.now(),
    };
    setQueue((prev) => [...prev, newItem]);
  }, [textContent]);

  // Clear entire queue and reset to standby
  const handleClearQueue = useCallback(() => {
    setQueue([]);
    setActiveQueueItemId(null);
    setTextContent('');
    setSelectedFile(null);
    setEnvelope(null);
    setChunks([]);
    setChunkSvgs([]);
  }, []);

  // Load demo sample payload on demand
  const handleLoadDemoData = useCallback(() => {
    const demoPayload = JSON.stringify(
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
    );
    setInputMode('text');
    setTextContent(demoPayload);
    setSelectedFile(null);
    const demoItem: QueueItem = {
      id: `demo-${Date.now()}`,
      name: 'سند مالی و تراکنش نمونه (TX-9824)',
      type: 'application/json',
      size: 320,
      data: demoPayload,
      isBinary: false,
      status: 'broadcasting',
      createdAt: Date.now(),
    };
    setQueue([demoItem]);
    setActiveQueueItemId(demoItem.id);
  }, []);

  // Delete individual queue item
  const handleDeleteQueueItem = useCallback((id: string) => {
    setQueue((prev) => {
      const filtered = prev.filter((item) => item.id !== id);
      if (activeQueueItemId === id) {
        if (filtered.length > 0) {
          handleSelectActiveItem(filtered[0]);
        } else {
          setActiveQueueItemId(null);
        }
      }
      return filtered;
    });
  }, [activeQueueItemId, handleSelectActiveItem]);

  // Reorder queue: move up
  const handleMoveUpQueue = useCallback((index: number) => {
    if (index === 0) return;
    setQueue((prev) => {
      const copy = [...prev];
      const temp = copy[index - 1];
      copy[index - 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  }, []);

  // Reorder queue: move down
  const handleMoveDownQueue = useCallback((index: number) => {
    setQueue((prev) => {
      if (index >= prev.length - 1) return prev;
      const copy = [...prev];
      const temp = copy[index + 1];
      copy[index + 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  }, []);

  // Helper for responsive grid columns class
  const getGridColsClass = (cols: 'auto' | 2 | 3 | 4 | 6 | 8, displayCnt: number, isWide: boolean) => {
    if (cols !== 'auto') {
      switch (cols) {
        case 2: return 'grid-cols-2';
        case 3: return 'grid-cols-2 sm:grid-cols-3';
        case 4: return 'grid-cols-2 sm:grid-cols-4';
        case 6: return 'grid-cols-3 sm:grid-cols-6';
        case 8: return 'grid-cols-4 sm:grid-cols-8';
      }
    }
    if (displayCnt === 1) return 'grid-cols-1';
    if (displayCnt === 2) return 'grid-cols-2';
    if (displayCnt === 4) return 'grid-cols-2 sm:grid-cols-4';
    if (displayCnt === 8) return isWide ? 'grid-cols-4 lg:grid-cols-8' : 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-8';
    if (displayCnt === 16) return 'grid-cols-4 sm:grid-cols-8';
    return 'grid-cols-1';
  };

  // Animation States
  const [chunks, setChunks] = useState<string[]>([]);
  const [chunkSvgs, setChunkSvgs] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isWideMode, setIsWideMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1280;
    }
    return false;
  });

  // Fullscreen viewport & container dimension observer
  const fullscreenCenterRef = useRef<HTMLDivElement | null>(null);
  const [fullscreenDimensions, setFullscreenDimensions] = useState<{ width: number; height: number }>({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? Math.max(200, window.innerHeight - 150) : 800,
  });

  useEffect(() => {
    if (!isFullscreen) return;

    const measureDimensions = () => {
      if (fullscreenCenterRef.current) {
        const rect = fullscreenCenterRef.current.getBoundingClientRect();
        if (rect.width > 20 && rect.height > 20) {
          setFullscreenDimensions({ width: rect.width, height: rect.height });
          return;
        }
      }
      if (typeof window !== 'undefined') {
        setFullscreenDimensions({
          width: window.innerWidth * 0.96,
          height: Math.max(200, window.innerHeight - 150),
        });
      }
    };

    measureDimensions();

    const resizeObserver = new ResizeObserver(() => {
      measureDimensions();
    });

    if (fullscreenCenterRef.current) {
      resizeObserver.observe(fullscreenCenterRef.current);
    }

    window.addEventListener('resize', measureDimensions);
    window.addEventListener('orientationchange', measureDimensions);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', measureDimensions);
      window.removeEventListener('orientationchange', measureDimensions);
    };
  }, [isFullscreen]);

  // Dynamically calculate optimal CSS grid layout based on browser window / container aspect ratio
  // Ensures QR codes maintain a strictly square (1:1) aspect ratio while filling the maximum possible screen space
  const fullscreenGrid = useMemo(() => {
    const { width, height } = fullscreenDimensions;
    const gap = width < 640 ? 8 : 14;
    // Scale multiplier based on zoom slider (qrScale)
    const scaleFactor = Math.max(0.5, Math.min(2.2, qrScale / 100));

    // Usable screen real estate inside fullscreen center container
    const usableW = Math.max(60, width - (width < 640 ? 12 : 24));
    const usableH = Math.max(60, height - (height < 640 ? 12 : 24));

    const N = displayCount;

    let bestCols: number = 1;
    let bestRows: number = N;
    let maxItemSize = 0;

    if (gridColumns !== 'auto') {
      bestCols = Math.min(N, gridColumns);
      bestRows = Math.ceil(N / bestCols);
      const maxW = (usableW - (bestCols - 1) * gap) / bestCols;
      const maxH = (usableH - (bestRows - 1) * gap) / bestRows;
      maxItemSize = Math.max(20, Math.min(maxW, maxH));
    } else {
      // Test all candidate column counts from 1 to N
      // Find the column count that maximizes square item size (s) within aspect ratio bounds
      for (let c = 1; c <= N; c++) {
        const r = Math.ceil(N / c);
        const maxW = (usableW - (c - 1) * gap) / c;
        const maxH = (usableH - (r - 1) * gap) / r;
        const itemSize = Math.min(maxW, maxH);

        if (itemSize > maxItemSize) {
          maxItemSize = itemSize;
          bestCols = c;
          bestRows = r;
        }
      }
    }

    // Apply zoom scale factor
    const finalItemSize = Math.max(30, Math.floor(maxItemSize * scaleFactor));
    const totalGridW = Math.floor(bestCols * finalItemSize + (bestCols - 1) * gap);
    const totalGridH = Math.floor(bestRows * finalItemSize + (bestRows - 1) * gap);

    return {
      columns: bestCols,
      rows: bestRows,
      itemSize: finalItemSize,
      gridWidth: totalGridW,
      gridHeight: totalGridH,
      gap,
      gridTemplateColumns: `repeat(${bestCols}, minmax(0, 1fr))`,
      gridTemplateRows: `repeat(${bestRows}, minmax(0, 1fr))`,
    };
  }, [fullscreenDimensions, displayCount, gridColumns, qrScale]);

  // Fullscreen Optical Calibration Test State
  const [isCalibrationOpen, setIsCalibrationOpen] = useState<boolean>(false);
  const [calibrationDensity, setCalibrationDensity] = useState<'low' | 'medium' | 'high'>('low');
  const [calibrationBgTone, setCalibrationBgTone] = useState<'pure_white' | 'anti_glare' | 'dark_inset'>('pure_white');
  const [calibrationSvg, setCalibrationSvg] = useState<string>('');

  useEffect(() => {
    let payload = 'SAYEH-TEST-PASS:0x5341594548 | CONTRAST:100% | ALIGN:PASS';
    let ec: 'L' | 'M' | 'H' = 'M';

    if (calibrationDensity === 'medium') {
      payload = 'SAYEH-CALIBRATION-STANDARD-TEST-PATTERN | BRIGHTNESS:OK | CONTRAST:100% | RESOLUTION:MEDIUM | SYNC:0x5341594548414952474150';
    } else if (calibrationDensity === 'high') {
      payload = 'SAYEH-CALIBRATION-HIGH-DENSITY-TEST-MATRIX | AIR-GAP OPTICAL LINK VERIFICATION PASS | TIMESTAMP:2026-CALIB | CHECKSUM:0xFA7190BC21EA | DENSITY:HIGH-THROUGHPUT';
    }

    QRCode.toString(payload, {
      type: 'svg',
      margin: 3,
      errorCorrectionLevel: ec,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
      .then((svg) => setCalibrationSvg(svg))
      .catch((err) => console.error('Failed to generate calibration QR:', err));
  }, [calibrationDensity]);

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

  // Handle file selection (with auto-queueing)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (files.length > 1) {
      handleAddFilesToQueue(files);
      return;
    }

    const file = files[0];
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

      // Also ensure it is registered in the queue
      const existing = queue.find((q) => q.name === file.name && q.size === file.size);
      if (!existing) {
        const newItem: QueueItem = {
          id: `queue-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: file.name,
          type: file.type || 'application/octet-stream',
          size: file.size,
          data: base64,
          isBinary: true,
          status: 'broadcasting',
          createdAt: Date.now(),
        };
        setQueue((prev) => [...prev, newItem]);
        setActiveQueueItemId(newItem.id);
      }
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
      } else if (inputMode === 'text' && textContent && textContent.trim()) {
        rawData = textContent;
        meta = {
          fileName: 'data.json',
          fileType: 'application/json',
          isBinary: false,
        };
      }

      // If no file or text is present, return early and keep transmitter in standby state
      if (!rawData || !rawData.trim()) {
        setEnvelope(null);
        setChunks([]);
        setChunkSvgs([]);
        setIsProcessing(false);
        return;
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

      // Packetize with camera-optimized dynamic chunk size
      const { chunks: chunkList } = packetizeEnvelope(env, effectiveChunkSize);
      setChunks(chunkList);
      setCurrentPage(0);

      // Generate pristine vector SVGs for all chunks with dynamic quiet-zone margin
      const dynamicMargin = displayCount >= 4 || qrScale < 90 ? 3 : 2;
      const dynamicEc = autoAdaptiveDensity && readabilityPreset === 'ultra' ? 'M' : errorCorrection;

      const svgs = await Promise.all(
        chunkList.map((chunk) =>
          QRCode.toString(chunk, {
            type: 'svg',
            margin: dynamicMargin,
            errorCorrectionLevel: dynamicEc,
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
  }, [inputMode, textContent, selectedFile, encryptEnabled, passphrase, effectiveChunkSize, errorCorrection, autoAdaptiveDensity, readabilityPreset, displayCount, qrScale, onLogAudit]);

  useEffect(() => {
    generateTransfer();
  }, [generateTransfer]);

  // Exact pagination logic: total pages is Math.ceil(totalChunks / displayCount)
  const totalPages = Math.max(1, Math.ceil(chunks.length / displayCount));
  const activeChunkIndex = Math.min(Math.max(0, chunks.length - 1), currentPage * displayCount);

  // If displayCount or chunks change and currentPage exceeds totalPages, reset safely
  useEffect(() => {
    if (currentPage >= totalPages) {
      setCurrentPage(0);
    }
  }, [currentPage, totalPages]);

  // Carousel timer loop with camera shutter speed sync: advances PAGE BY PAGE.
  // If only 1 page exists (all chunks fit on the current screen), no rotation is needed!
  useEffect(() => {
    if (!isPlaying || totalPages <= 1 || chunks.length === 0) {
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
      setCurrentPage((prev) => {
        const next = (prev + 1) % totalPages;
        if (next === 0 && prev === totalPages - 1 && autoAdvanceQueue && queue.length > 1) {
          const curIdx = queue.findIndex((q) => q.id === activeQueueItemId);
          const nextIdx = (curIdx + 1) % queue.length;
          handleSelectActiveItem(queue[nextIdx]);
        }
        return next;
      });
    }, frameDurationMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (dwellTimerRef.current) clearInterval(dwellTimerRef.current);
    };
  }, [isPlaying, fps, chunks.length, totalPages]);

  // Download current active QR code as PNG image
  const handleDownloadQrPng = async () => {
    const targetIdx = activeChunkIndex;
    if (!chunks[targetIdx]) return;
    try {
      const dataUrl = await QRCode.toDataURL(chunks[targetIdx], {
        width: 1000,
        margin: 2,
        errorCorrectionLevel: errorCorrection,
      });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `sayeh-frame-${targetIdx + 1}-of-${chunks.length}.png`;
      a.click();
    } catch (e) {
      console.error('Download QR PNG failed', e);
    }
  };

  const handleDownloadQrSvg = () => {
    const targetIdx = activeChunkIndex;
    if (!chunkSvgs[targetIdx]) return;
    const blob = new Blob([chunkSvgs[targetIdx]], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sayeh-frame-${targetIdx + 1}-of-${chunks.length}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyRaw = () => {
    const targetIdx = activeChunkIndex;
    if (!chunks[targetIdx]) return;
    navigator.clipboard.writeText(chunks[targetIdx]);
    setCopiedRaw(true);
    setTimeout(() => setCopiedRaw(false), 2000);
  };

  const strength = evaluatePasswordStrength(passphrase);

  // Compute exact display slots:
  // For each of the displayCount slots on the current page:
  // If (currentPage * displayCount + i) < chunks.length, it displays the real QR chunk!
  // Otherwise, it is an empty slot placeholder box. NO CIRCULAR REPETITION!
  interface DisplaySlot {
    slotIndex: number;
    chunkIndex: number;
    hasChunk: boolean;
  }

  const slots: DisplaySlot[] = [];
  for (let i = 0; i < displayCount; i++) {
    const cIdx = currentPage * displayCount + i;
    slots.push({
      slotIndex: i,
      chunkIndex: cIdx,
      hasChunk: cIdx < chunks.length,
    });
  }

  const visibleIndices: number[] = slots.filter((s) => s.hasChunk).map((s) => s.chunkIndex);

  // Size styling
  const sizeClasses = {
    standard: 'max-w-[340px]',
    large: 'max-w-[420px]',
    huge: 'max-w-[500px]',
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Explanation */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-gradient-to-r dark:from-slate-900/90 dark:via-slate-900/50 dark:to-emerald-950/20 p-5 shadow-sm dark:shadow-xl transition-colors">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
              <Zap className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {lang === 'fa' ? 'فرستنده نوری و نمایشگر QR Code های متحرک' : 'Optical Transmitter & Shutter-Synchronized QR Carousel'}
                <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40">
                  DIODE TX
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
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
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-950/20 dark:shadow-emerald-950/40 cursor-pointer transition"
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
        {/* Left Column: Data Input & Shutter Controls (Cols 5 in normal, full-width or below QR in wide mode) */}
        <div className={`${isWideMode ? 'order-2 lg:col-span-12' : 'lg:col-span-5'} space-y-6`}>
          {/* Data Source Card */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 backdrop-blur-xs p-5 shadow-sm dark:shadow-lg transition-colors">
            <div className="flex items-center justify-between mb-4 border-b border-slate-200 dark:border-slate-800/80 pb-3">
              <span className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                {lang === 'fa' ? 'ورودی داده‌ها یا فایل' : 'Data Payload or File'}
              </span>
              <div className="flex items-center p-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-xs">
                <button
                  onClick={() => setInputMode('text')}
                  className={`px-3 py-1 rounded-md transition cursor-pointer ${
                    inputMode === 'text'
                      ? 'bg-emerald-600 text-white font-medium shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {lang === 'fa' ? 'متن / JSON' : 'Text / JSON'}
                </button>
                <button
                  onClick={() => setInputMode('file')}
                  className={`px-3 py-1 rounded-md transition cursor-pointer ${
                    inputMode === 'file'
                      ? 'bg-emerald-600 text-white font-medium shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
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
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-800 p-3 text-xs font-mono text-slate-900 dark:text-emerald-300 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/40 resize-none transition"
                />
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  <span>{textContent.length} {lang === 'fa' ? 'کاراکتر' : 'chars'}</span>
                  <span>~{new TextEncoder().encode(textContent).byteLength} {lang === 'fa' ? 'بایت' : 'bytes'}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500/60 rounded-xl cursor-pointer bg-slate-50/50 hover:bg-slate-100/60 dark:bg-slate-950/50 dark:hover:bg-slate-900/60 transition group">
                  <div className="flex flex-col items-center justify-center pt-4 pb-4 text-center px-4">
                    <FileUp className="w-7 h-7 text-slate-400 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition mb-1" />
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      {lang === 'fa' ? 'کلیک کنید یا فایل را اینجا بکشید' : 'Click to browse or drag file here'}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      PDF, ZIP, JSON, CSV, PNG, TXT, DOCX, BIN
                    </p>
                  </div>
                  <input
                    type="file"
                    multiple
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

          {/* Admin Transmission Queue Manager */}
          <TransmissionQueueManager
            queue={queue}
            activeItemId={activeQueueItemId}
            lang={lang}
            autoAdvance={autoAdvanceQueue}
            onToggleAutoAdvance={setAutoAdvanceQueue}
            onSelectActiveItem={handleSelectActiveItem}
            onDeleteItem={handleDeleteQueueItem}
            onClearQueue={handleClearQueue}
            onMoveUp={handleMoveUpQueue}
            onMoveDown={handleMoveDownQueue}
            onAddFiles={handleAddFilesToQueue}
            onAddCurrentTextToQueue={handleAddCurrentTextToQueue}
          />

          {/* Cryptography & AES-256 Card */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 backdrop-blur-xs p-5 shadow-sm dark:shadow-lg space-y-4 transition-colors">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-3">
              <span className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                {lang === 'fa' ? 'امنیت و رمزنگاری داده‌ها' : 'Data Encryption (AES-GCM-256)'}
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={encryptEnabled}
                  onChange={(e) => setEncryptEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            {encryptEnabled && (
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <label className="text-slate-700 dark:text-slate-300 font-medium">
                      {lang === 'fa' ? 'گذرواژه رمزنگاری (کلید مشترک PSK):' : 'Pre-Shared Encryption Key (PSK):'}
                    </label>
                    <span className="text-[11px] font-mono text-cyan-600 dark:text-cyan-400">
                      PBKDF2 (100k rounds)
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassphrase ? 'text' : 'password'}
                      value={passphrase}
                      onChange={(e) => setPassphrase(e.target.value)}
                      placeholder={lang === 'fa' ? 'کلید امنیتی را وارد کنید...' : 'Enter security passphrase...'}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-800 px-3.5 py-2 text-xs font-mono text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassphrase(!showPassphrase)}
                      className="absolute end-3 top-2 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                    >
                      {showPassphrase ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Password Strength Indicator */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 dark:text-slate-400">
                      {lang === 'fa' ? 'سطح امنیت گذرواژه:' : 'Security level:'}
                    </span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {lang === 'fa' ? strength.labelFa : strength.labelEn}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
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
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 backdrop-blur-xs p-5 shadow-sm dark:shadow-lg space-y-4 transition-colors">
            <span className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-200 dark:border-slate-800/80 pb-3">
              <Camera className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              {lang === 'fa' ? 'تنظیمات شاتر دوربین و تعداد نمایش کیوآرکد' : 'Camera Shutter & Multi-QR Display'}
            </span>

            {/* Shutter FPS */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-700 dark:text-slate-300 font-semibold">
                  {lang === 'fa' ? 'نرخ شاتر دوربین / فریم در ثانیه (FPS):' : 'Camera Shutter / FPS:'}
                </span>
                <span className="font-mono text-emerald-700 dark:text-emerald-400 font-bold bg-slate-100 dark:bg-slate-950 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800">
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

        {/* Right Column: Optical QR Display & Chunks Matrix Table (Cols 7 or Top Full-Width Cinema Stage in Wide Mode) */}
        <div className={`${isWideMode ? 'order-1 lg:col-span-12' : 'lg:col-span-7'} space-y-6`}>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 backdrop-blur-xs p-5 sm:p-6 shadow-sm dark:shadow-xl flex flex-col items-center transition-colors">
            {/* Header info & Size Buttons */}
            <div className="w-full flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isPlaying ? 'bg-emerald-400 opacity-75' : 'bg-slate-400 dark:bg-slate-500'}`}></span>
                  <span className={`relative inline-flex rounded-full h-3 w-3 ${isPlaying ? 'bg-emerald-500' : 'bg-slate-400 dark:bg-slate-500'}`}></span>
                </span>
                <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                  {lang === 'fa' ? 'خروجی نوری کیوآرکد (Vector Optical Display)' : 'Vector Optical Display'}
                </span>
                {displayCount > 1 && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 font-mono font-bold border border-cyan-200 dark:border-cyan-500/40">
                    {displayCount}x GRID
                  </span>
                )}
                {isWideMode && (
                  <span className="hidden sm:inline-flex text-[10px] px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-500/40">
                    {lang === 'fa' ? 'صفحه عریض' : 'Widescreen'}
                  </span>
                )}
              </div>

              {/* QR Size buttons, Full-Width & Fullscreen Controls */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs gap-1">
                  <button
                    onClick={() => { setQrSize('standard'); setQrScale(100); }}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer font-bold ${
                      qrScale === 100 ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {lang === 'fa' ? 'معمولی' : 'Normal'}
                  </button>
                  <button
                    onClick={() => { setQrSize('large'); setQrScale(140); }}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer font-bold ${
                      qrScale === 140 ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {lang === 'fa' ? 'بزرگ' : 'Large'}
                  </button>
                  <button
                    onClick={() => { setQrSize('huge'); setQrScale(180); }}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer font-bold ${
                      qrScale === 180 ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {lang === 'fa' ? 'خیلی بزرگ' : 'Huge'}
                  </button>
                </div>

                {/* دکمه تمام‌عرض (حالت عریض افقی متناسب با مانیتورهای عریض) */}
                <button
                  onClick={() => setIsWideMode(!isWideMode)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer shadow-xs ${
                    isWideMode
                      ? 'bg-cyan-100 hover:bg-cyan-200 border-cyan-300 text-cyan-950 font-extrabold dark:bg-cyan-950/80 dark:border-cyan-500/50 dark:text-cyan-300 shadow-cyan-950/20'
                      : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 dark:text-slate-200'
                  }`}
                  title={lang === 'fa' ? 'تغییر به حالت تمام‌عرض متناسب با نمایشگرهای عریض' : 'Toggle Full-Width Widescreen Mode'}
                >
                  <Maximize className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  <span>{lang === 'fa' ? (isWideMode ? 'چینش عریض' : 'تمام‌عرض') : (isWideMode ? 'Wide View' : 'Full Width')}</span>
                </button>

                {/* دکمه تمام‌صفحه (Fullscreen) */}
                <button
                  onClick={() => setIsFullscreen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 font-bold dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 dark:text-white text-xs transition cursor-pointer shadow-xs"
                  title={lang === 'fa' ? 'نمایش تمام‌صفحه (Fullscreen)' : 'Fullscreen Presentation'}
                >
                  <Maximize2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>{lang === 'fa' ? 'تمام‌صفحه' : 'Fullscreen'}</span>
                </button>
              </div>
            </div>

            {/* Direct Optical Tuning Controls Bar (تنظیم تعداد نمایش و نرخ شاتر دوربین مستقیماً در صفحه کیوآرکد) */}
            <div className="w-full mb-4 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-3 transition-colors">
              <div className="flex flex-wrap items-center justify-between gap-2">
                {/* 1. تعداد نمایش QR ها (1 Single, 2 Dual, 4 Quad) */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1.5">
                    <QrCode className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                    <span>{lang === 'fa' ? 'تعداد نمایش کیوآرکد:' : 'QR Display Count:'}</span>
                  </span>
                  <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono">
                    {[
                      { count: 1, labelFa: 'تک', labelEn: '1x' },
                      { count: 2, labelFa: '۲ تایی', labelEn: '2x' },
                      { count: 4, labelFa: '۴ تایی', labelEn: '4x' },
                      { count: 8, labelFa: '۸ تایی', labelEn: '8x' },
                      { count: 16, labelFa: '۱۶ تایی (۴×۴)', labelEn: '16x Max' },
                    ].map((item) => (
                      <button
                        key={item.count}
                        onClick={() => setDisplayCount(item.count as 1 | 2 | 4 | 8 | 16)}
                        className={`px-2 py-1 rounded-md transition cursor-pointer text-xs font-bold ${
                          displayCount === item.count
                            ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-950/20 dark:shadow-cyan-950/50'
                            : 'text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white'
                        }`}
                      >
                        {lang === 'fa' ? item.labelFa : item.labelEn}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Wizard Restart / Adjust Button */}
                {onOpenWizard && (
                  <button
                    onClick={onOpenWizard}
                    className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-500/40 px-3 py-1 rounded-xl transition cursor-pointer shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>{lang === 'fa' ? 'راه‌اندازی با ویزارد' : 'Re-open Wizard'}</span>
                  </button>
                )}
              </div>

              {/* 2. تنظیم شاتر دوربین در هر ثانیه (Camera Shutter Speed / FPS) */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>{lang === 'fa' ? 'شاتر دوربین در هر ثانیه:' : 'Camera Shutter / FPS:'}</span>
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-500/30 px-2 py-0.5 rounded">
                    {fps} {lang === 'fa' ? 'فریم/ثانیه' : 'FPS'} ({Math.round(1000 / fps)}ms)
                  </span>
                </div>

                <div className="flex items-center gap-1 overflow-x-auto">
                  {[1, 2, 3, 5, 8, 10].map((presetFps) => (
                    <button
                      key={presetFps}
                      onClick={() => setFps(presetFps)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono transition cursor-pointer ${
                        fps === presetFps
                          ? 'bg-emerald-500 text-slate-950 font-extrabold shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                      title={presetFps === 3 ? (lang === 'fa' ? 'بهترین حالت هماهنگ با شاتر وب‌کم' : 'Best for standard webcams') : ''}
                    >
                      {presetFps} {lang === 'fa' ? 'فریم' : 'fps'}{presetFps === 3 ? ' ★' : ''}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. کنترل ابعاد و زوم کیوآرکد و ستون‌های نمایش (Proportional Scale, Zoom Slider & Grid Columns) */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                {/* نوار زوم و اسلایدر ابعاد */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <span>{lang === 'fa' ? 'ابعاد و زوم کیوآرکد:' : 'QR Scale & Zoom:'}</span>
                  </span>
                  
                  <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                    <button
                      onClick={() => setQrScale((prev) => Math.max(60, prev - 10))}
                      className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                      title={lang === 'fa' ? 'کوچک‌تر' : 'Zoom Out'}
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <input
                      type="range"
                      min={60}
                      max={220}
                      step={5}
                      value={qrScale}
                      onChange={(e) => setQrScale(Number(e.target.value))}
                      className="w-20 sm:w-28 accent-emerald-500 cursor-pointer"
                    />
                    <button
                      onClick={() => setQrScale((prev) => Math.min(220, prev + 10))}
                      className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                      title={lang === 'fa' ? 'بزرگ‌تر' : 'Zoom In'}
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-300 min-w-[38px] text-center">
                      {qrScale}%
                    </span>
                  </div>
                </div>

                {/* انتخاب ستون‌های ماتریس بر اساس مانیتور */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1.5">
                    <Columns className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                    <span>{lang === 'fa' ? 'تعداد ستون‌ها:' : 'Columns:'}</span>
                  </span>
                  <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono">
                    {(['auto', 2, 3, 4, 6, 8] as const).map((col) => (
                      <button
                        key={col}
                        onClick={() => setGridColumns(col)}
                        className={`px-2 py-0.5 rounded-md transition cursor-pointer font-bold ${
                          gridColumns === col
                            ? 'bg-cyan-500 text-slate-950 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
                        }`}
                      >
                        {col === 'auto' ? (lang === 'fa' ? 'خودکار' : 'Auto') : `${col}x`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* عرض کادر ماتریس */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold">
                    {lang === 'fa' ? 'عرض کادر:' : 'Width:'}
                  </span>
                  <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
                    {(['compact', 'balanced', 'wide', 'full'] as const).map((w) => (
                      <button
                        key={w}
                        onClick={() => setMatrixWidth(w)}
                        className={`px-2 py-0.5 rounded-md transition cursor-pointer font-bold text-[11px] ${
                          matrixWidth === w
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
                        }`}
                      >
                        {w === 'compact' ? (lang === 'fa' ? 'فشرده' : 'Compact') : w === 'balanced' ? (lang === 'fa' ? 'متعادل' : 'Balanced') : w === 'wide' ? (lang === 'fa' ? 'عریض' : 'Wide') : (lang === 'fa' ? 'تمام‌عرض' : 'Full')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 4. بهینه‌ساز خوانایی اپتیکال برای دوربین (Optical Readability Booster) */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3 bg-emerald-500/5 -mx-3.5 -mb-3.5 p-3 rounded-b-2xl border-emerald-500/20">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <ScanLine className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>{lang === 'fa' ? 'تقویت خوانایی دوربین:' : 'Camera Readability Booster:'}</span>
                  </span>

                  {/* 3 Readability Presets */}
                  <div className="flex items-center p-0.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs shadow-2xs">
                    <button
                      onClick={() => setReadabilityPreset('ultra')}
                      className={`px-2.5 py-1 rounded-md transition cursor-pointer font-bold text-xs flex items-center gap-1 ${
                        readabilityPreset === 'ultra'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                      title={lang === 'fa' ? 'خانه‌های فوق‌العاده درشت و خلوت (ایده‌آل برای خواندن توسط انواع وب‌کم و گوشی)' : 'Ultra high readability with chunky dots'}
                    >
                      <span>{lang === 'fa' ? '🟢 حداکثر خوانایی (خانه‌های درشت)' : 'Ultra Readable'}</span>
                    </button>

                    <button
                      onClick={() => setReadabilityPreset('balanced')}
                      className={`px-2.5 py-1 rounded-md transition cursor-pointer font-bold text-xs ${
                        readabilityPreset === 'balanced'
                          ? 'bg-cyan-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <span>{lang === 'fa' ? '🔵 متعادل' : 'Balanced'}</span>
                    </button>

                    <button
                      onClick={() => setReadabilityPreset('dense')}
                      className={`px-2.5 py-1 rounded-md transition cursor-pointer font-bold text-xs ${
                        readabilityPreset === 'dense'
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <span>{lang === 'fa' ? '🟣 متراکم (پرسرعت)' : 'Dense (Turbo)'}</span>
                    </button>
                  </div>
                </div>

                {/* Auto Adaptive Toggle & Live Effective Indicator */}
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={autoAdaptiveDensity}
                      onChange={(e) => setAutoAdaptiveDensity(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span>{lang === 'fa' ? 'تطبیق خودکار با شبکه' : 'Auto-adapt density'}</span>
                  </label>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                    {effectiveChunkSize}B / فریم
                  </span>
                </div>
              </div>
            </div>

            {/* QR Card Container: Scaled dynamically based on qrScale and matrixWidth */}
            <div 
              style={{
                maxWidth: matrixWidth === 'full' 
                  ? '100%' 
                  : matrixWidth === 'wide' 
                  ? `${Math.round(1550 * (qrScale / 100))}px` 
                  : matrixWidth === 'balanced'
                  ? `${Math.round(1080 * (qrScale / 100))}px`
                  : `${Math.round(740 * (qrScale / 100))}px`,
              }}
              className="w-full mx-auto transition-all duration-200 flex flex-col items-center justify-center"
            >
              {chunks.length === 0 ? (
                /* Standby State: No files or data in transmission queue */
                <div className="w-full max-w-lg p-6 sm:p-8 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border-2 border-dashed border-slate-300 dark:border-slate-800 flex flex-col items-center justify-center text-center space-y-4 my-4 animate-in fade-in select-none">
                  <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shadow-inner">
                    <Inbox className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                      {lang === 'fa' ? 'صف ارسال در حال حاضر خالی است' : 'Transmission Queue is Empty'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
                      {lang === 'fa'
                        ? 'هیچ فایلی یا متنی برای پخش کیوآرکد انتخاب نشده است. برای شروع انتقال نوری، فایلی را در صف قرار دهید یا متنی بنویسید.'
                        : 'No files or payload selected for transmission. Upload files, type text, or load demo sample data to start.'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    <label className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer shadow-md transition">
                      <FileUp className="w-4 h-4" />
                      <span>{lang === 'fa' ? 'انتخاب و افزودن فایل به صف' : 'Add File to Queue'}</span>
                      <input type="file" multiple className="hidden" onChange={handleFileChange} />
                    </label>
                    <button
                      onClick={handleLoadDemoData}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs cursor-pointer border border-slate-300 dark:border-slate-700 transition"
                    >
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>{lang === 'fa' ? 'بارگذاری داده نمونه (Demo)' : 'Load Demo Data'}</span>
                    </button>
                  </div>
                </div>
              ) : displayCount === 1 ? (
                /* Single QR View: Scales proportionally with qrScale */
                <div 
                  style={{
                    width: `${Math.round(380 * (qrScale / 100))}px`,
                    maxWidth: '96vw',
                  }}
                  className="relative p-5 sm:p-6 rounded-2xl bg-white shadow-2xl flex items-center justify-center aspect-square border-4 border-slate-300 dark:border-slate-700 transition-all duration-200 overflow-hidden"
                >
                  {chunkSvgs[activeChunkIndex] ? (
                    <div
                      className="w-full h-full min-h-0 min-w-0 flex items-center justify-center select-none [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:w-auto [&>svg]:h-auto [&>svg]:aspect-square [&>svg]:object-contain [&>svg]:block [&>svg]:m-auto"
                      dangerouslySetInnerHTML={{ __html: chunkSvgs[activeChunkIndex] }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-500 text-xs font-mono">
                      <RefreshCw className="w-8 h-8 animate-spin mb-2 text-emerald-600 dark:text-emerald-400" />
                      <span>Generating QR...</span>
                    </div>
                  )}

                  <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-emerald-500 pointer-events-none" />
                  <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-emerald-500 pointer-events-none" />
                  <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-emerald-500 pointer-events-none" />
                  <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-emerald-500 pointer-events-none" />
                </div>
              ) : (
                /* Multi-QR Grid (2, 4, 8, or 16 QRs): Resizes with gridColumns and qrScale. Empty slots shown as dashed boxes! */
                <div 
                  className={`w-full grid ${getGridColsClass(gridColumns, displayCount, isWideMode)} gap-2 sm:gap-3 transition-all duration-200`}
                >
                  {slots.map((slot) => (
                    slot.hasChunk ? (
                      <div
                        key={slot.chunkIndex}
                        onClick={() => setFocusedChunkIndex(slot.chunkIndex)}
                        className="group relative p-1.5 sm:p-2 rounded-2xl bg-white shadow-md flex flex-col items-center justify-between aspect-square border-2 border-slate-300 dark:border-slate-700 transition-all hover:border-emerald-500 hover:shadow-xl hover:scale-[1.02] cursor-pointer overflow-hidden"
                        title={lang === 'fa' ? `کلیک برای فوکوس و بزرگ‌نمایی فریم #${slot.chunkIndex + 1}` : `Click to zoom & focus frame #${slot.chunkIndex + 1}`}
                      >
                        {/* Dedicated mini header bar above QR: zero overlap with QR quiet zone */}
                        <div className="w-full shrink-0 flex items-center justify-between pb-0.5 px-1 text-[9px] sm:text-[10px] font-mono text-slate-700 border-b border-slate-100 select-none">
                          <span className="font-bold bg-slate-100 border border-slate-200 px-1.5 py-0.2 rounded text-slate-900">
                            #{slot.chunkIndex + 1}
                          </span>
                          <span className="hidden sm:inline-flex items-center gap-0.5 text-[8px] text-emerald-700 group-hover:text-emerald-800 font-sans font-semibold">
                            <Focus className="w-2.5 h-2.5" />
                            <span>{lang === 'fa' ? 'فوکوس' : 'Focus'}</span>
                          </span>
                        </div>

                        {/* Unobstructed Pure White QR Matrix */}
                        <div className="w-full flex-1 min-h-0 min-w-0 flex items-center justify-center p-1 sm:p-1.5 overflow-hidden select-none">
                          {chunkSvgs[slot.chunkIndex] && (
                            <div
                              className="w-full h-full min-h-0 min-w-0 flex items-center justify-center select-none [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:w-auto [&>svg]:h-auto [&>svg]:aspect-square [&>svg]:object-contain [&>svg]:block [&>svg]:m-auto"
                              dangerouslySetInnerHTML={{ __html: chunkSvgs[slot.chunkIndex] }}
                            />
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Empty Box Placeholder for unfilled slot (e.g. 7 of 16 used, remaining 9 are empty) */
                      <div
                        key={`empty-${slot.slotIndex}`}
                        className="relative p-2 rounded-xl border-2 border-dashed border-slate-300/80 dark:border-slate-700/60 bg-slate-100/40 dark:bg-slate-900/30 flex flex-col items-center justify-center aspect-square text-slate-400 dark:text-slate-600 select-none"
                      >
                        <span className="text-[10px] sm:text-xs font-mono font-bold">
                          {lang === 'fa' ? 'خالی' : 'Empty'}
                        </span>
                        <span className="text-[9px] font-mono opacity-50">
                          ({slot.slotIndex + 1})
                        </span>
                      </div>
                    )
                  ))}
                </div>
              )}
            </div>

            {/* Progress Bar & Frame Index Controls */}
            <div className={`w-full ${
              isWideMode
                ? (displayCount === 16 ? 'max-w-6xl' : displayCount === 8 ? 'max-w-5xl' : displayCount === 4 ? 'max-w-4xl' : displayCount === 2 ? 'max-w-2xl' : sizeClasses[qrSize])
                : (displayCount === 16 ? 'max-w-2xl sm:max-w-3xl' : displayCount === 8 ? 'max-w-xl sm:max-w-2xl' : displayCount === 4 ? 'max-w-md sm:max-w-lg' : sizeClasses[qrSize])
            } mt-4 space-y-2`}>
              <div className="flex flex-wrap items-center justify-between text-xs font-mono gap-1">
                <span className="text-slate-700 dark:text-slate-300 font-bold flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  <span>{lang === 'fa' ? 'صفحه / فریم نوری:' : 'Optical Page / Frame:'}</span>
                </span>
                <span className="text-emerald-700 dark:text-emerald-400 font-black text-sm">
                  {chunks.length > 0
                    ? lang === 'fa'
                      ? `صفحه ${currentPage + 1} از ${totalPages} (قطعات ${currentPage * displayCount + 1} تا ${Math.min((currentPage + 1) * displayCount, chunks.length)} از ${chunks.length})`
                      : `Page ${currentPage + 1} of ${totalPages} (Chunks ${currentPage * displayCount + 1}–${Math.min((currentPage + 1) * displayCount, chunks.length)} of ${chunks.length})`
                    : '0 / 0'}
                </span>
              </div>

              {/* Dwell Progress bar */}
              <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-300 dark:border-slate-700/60">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 transition-all duration-75"
                  style={{
                    width: `${dwellProgress}%`,
                  }}
                />
              </div>

              {/* Playback Controls & Download Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setCurrentPage((prev) => (prev + 1) % totalPages);
                    }}
                    className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 dark:text-white transition cursor-pointer shadow-xs"
                    title={lang === 'fa' ? 'صفحه بعدی' : 'Next Page'}
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className={`px-5 py-2.5 rounded-xl flex items-center gap-2 text-xs font-bold transition cursor-pointer shadow-md ${
                      isPlaying
                        ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-950/20'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/20'
                    }`}
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="w-4 h-4 fill-current" />
                        <span className="text-white font-bold">{lang === 'fa' ? 'توقف' : 'Pause'}</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-current" />
                        <span className="text-white font-bold">{lang === 'fa' ? 'پخش' : 'Play'}</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setCurrentPage((prev) => (prev > 0 ? prev - 1 : totalPages - 1));
                    }}
                    className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 dark:text-white transition cursor-pointer shadow-xs"
                    title={lang === 'fa' ? 'صفحه قبلی' : 'Previous Page'}
                  >
                    <SkipBack className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleCopyRaw}
                    className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 dark:text-white text-xs transition cursor-pointer shadow-xs"
                    title={lang === 'fa' ? 'کپی رشته متنی کیوآرکد فعلی' : 'Copy current QR wire text'}
                  >
                    {copiedRaw ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={handleDownloadQrPng}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 font-bold dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 dark:text-white text-xs transition cursor-pointer shadow-xs"
                    title={lang === 'fa' ? 'ذخیره فریم به عنوان فایل تصویر PNG' : 'Save frame as PNG image'}
                  >
                    <Download className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                    <span>{lang === 'fa' ? 'دانلود PNG' : 'PNG'}</span>
                  </button>

                  <button
                    onClick={handleDownloadQrSvg}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 font-bold dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 dark:text-white text-xs transition cursor-pointer shadow-xs"
                    title={lang === 'fa' ? 'ذخیره فریم به عنوان فایل برداری SVG' : 'Save frame as vector SVG'}
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>{lang === 'fa' ? 'دانلود SVG' : 'SVG'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* جدول ماتریس قطعات در حال ارسال (Full Chunk Matrix Table) */}
            <div className="w-full mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Table className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  {lang === 'fa' ? 'جدول ماتریس قطعات در حال ارسال (Packet Chunks Ledger):' : 'Active Packet Chunks Matrix:'}
                </span>
                <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                  {chunks.length} {lang === 'fa' ? 'قطعه کل' : 'Total Chunks'}
                </span>
              </div>

              {/* Matrix Table */}
              <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/80">
                <table className="w-full text-start text-[11px] font-mono">
                  <thead className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 sticky top-0">
                    <tr>
                      <th className="p-2 text-start">#</th>
                      <th className="p-2 text-start">{lang === 'fa' ? 'وضعیت نمایش' : 'Display Status'}</th>
                      <th className="p-2 text-start">{lang === 'fa' ? 'حجم قطعه' : 'Chunk Size'}</th>
                      <th className="p-2 text-start">CRC32</th>
                      <th className="p-2 text-start">{lang === 'fa' ? 'اقدام' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
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
                              ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 font-bold'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                          }`}
                        >
                          <td className="p-2 text-start">{idx + 1}</td>
                          <td className="p-2 text-start">
                            {isCurrent ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-bold">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-ping" />
                                {lang === 'fa' ? 'در حال پخش روی شاتر' : 'ON SHUTTER'}
                              </span>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500">{lang === 'fa' ? 'در نوبت چرخش' : 'Queued'}</span>
                            )}
                          </td>
                          <td className="p-2 text-start text-slate-500 dark:text-slate-400">{chunkLen} B</td>
                          <td className="p-2 text-start text-cyan-700 dark:text-cyan-400">{chunkCrc}</td>
                          <td className="p-2 text-start">
                            <button
                              onClick={() => {
                                setCurrentPage(Math.floor(idx / displayCount));
                                setIsPlaying(false);
                              }}
                              className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-transparent text-[10px] transition cursor-pointer"
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
              <div className="w-full mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 text-center">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                    {lang === 'fa' ? 'شناسه انتقال' : 'Transfer ID'}
                  </span>
                  <span className="text-xs font-mono font-bold text-cyan-700 dark:text-cyan-300 truncate block">
                    {envelope.transferId.substring(0, 10)}...
                  </span>
                </div>

                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 text-center">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                    {lang === 'fa' ? 'تعداد قطعات' : 'Total Chunks'}
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300">
                    {chunks.length} {lang === 'fa' ? 'کیوآر' : 'QRs'}
                  </span>
                </div>

                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 text-center">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                    {lang === 'fa' ? 'حجم کل' : 'Total Size'}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-200">
                    {(envelope.totalBytes / 1024).toFixed(2)} KB
                  </span>
                </div>

                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 text-center">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                    {lang === 'fa' ? 'زمان دور شاتر' : 'Cycle Time'}
                  </span>
                  <span className="text-xs font-mono font-bold text-purple-700 dark:text-purple-300">
                    {((chunks.length / (fps * displayCount)) || 0).toFixed(1)}s
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fullscreen Presentation Modal - Responsive Scaling to Monitor Dimensions */}
      {isFullscreen && (
        <div className="fullscreen-presentation dark fixed inset-0 z-50 flex flex-col items-center justify-between bg-black/95 p-3 sm:p-5 backdrop-blur-md overflow-hidden select-none">
          {/* Top Bar: Spans wide across monitor with Zoom Slider & Column Controls */}
          <div className="w-full max-w-[98vw] flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 flex-shrink-0 px-2 sm:px-4">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <span className="fs-status-pill text-xs sm:text-sm font-mono font-bold px-3.5 py-1.5 rounded-full border shadow-sm">
                {chunks.length > 0
                  ? lang === 'fa'
                    ? `صفحه ${currentPage + 1} از ${totalPages} (قطعات ${currentPage * displayCount + 1} تا ${Math.min((currentPage + 1) * displayCount, chunks.length)} از ${chunks.length})`
                    : `Page ${currentPage + 1} of ${totalPages} (Chunks ${currentPage * displayCount + 1}–${Math.min((currentPage + 1) * displayCount, chunks.length)} of ${chunks.length})`
                  : '0 / 0'}
              </span>

              {/* Shutter FPS pills */}
              <div className="fs-pill-container flex items-center rounded-xl p-1 border gap-1">
                {[1, 2, 3, 5, 8, 10].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFps(f)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                      fps === f ? 'fs-pill-btn-active-emerald' : 'fs-pill-btn-inactive'
                    }`}
                  >
                    {f}fps
                  </button>
                ))}
              </div>

              {/* Display Count */}
              <div className="hidden sm:flex fs-pill-container items-center rounded-xl p-1 border text-xs font-mono gap-1">
                {[
                  { cnt: 1, label: '1x' },
                  { cnt: 2, label: '2x' },
                  { cnt: 4, label: '4x' },
                  { cnt: 8, label: '8x' },
                  { cnt: 16, label: '16x' },
                ].map((item) => (
                  <button
                    key={item.cnt}
                    onClick={() => setDisplayCount(item.cnt as 1 | 2 | 4 | 8 | 16)}
                    className={`px-3 py-1 rounded-lg transition cursor-pointer font-bold ${
                      displayCount === item.cnt
                        ? 'fs-pill-btn-active-cyan'
                        : 'fs-pill-btn-inactive'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Fullscreen Column Selector */}
              <div className="hidden lg:flex fs-pill-container items-center rounded-xl p-1 border text-xs font-mono gap-1">
                <span className="text-[10px] text-slate-400 px-1 font-bold">
                  {lang === 'fa' ? 'ستون:' : 'Cols:'}
                </span>
                {(['auto', 2, 4, 6, 8] as const).map((col) => (
                  <button
                    key={col}
                    onClick={() => setGridColumns(col)}
                    className={`px-2 py-0.5 rounded-lg transition cursor-pointer font-bold ${
                      gridColumns === col ? 'fs-pill-btn-active-cyan' : 'fs-pill-btn-inactive'
                    }`}
                  >
                    {col === 'auto' ? `Auto (${fullscreenGrid.columns}×${fullscreenGrid.rows})` : `${col}x`}
                  </button>
                ))}
              </div>

              {/* Fullscreen Interactive Zoom Slider */}
              <div className="flex fs-pill-container items-center rounded-xl p-1 border text-xs gap-1.5 shadow-sm">
                <button
                  onClick={() => setQrScale((prev) => Math.max(60, prev - 10))}
                  className="p-1 rounded-lg fs-pill-btn-inactive cursor-pointer"
                  title={lang === 'fa' ? 'کوچک‌تر' : 'Zoom Out'}
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="range"
                  min={60}
                  max={220}
                  step={5}
                  value={qrScale}
                  onChange={(e) => setQrScale(Number(e.target.value))}
                  className="w-20 sm:w-28 accent-emerald-400 cursor-pointer"
                  title={`${qrScale}%`}
                />
                <button
                  onClick={() => setQrScale((prev) => Math.min(220, prev + 10))}
                  className="p-1 rounded-lg fs-pill-btn-inactive cursor-pointer"
                  title={lang === 'fa' ? 'بزرگ‌تر' : 'Zoom In'}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono text-xs font-black text-emerald-400 px-1 min-w-[36px] text-center">
                  {qrScale}%
                </span>
              </div>

              {/* Fullscreen Calibration Test Button */}
              <button
                onClick={() => setIsCalibrationOpen(!isCalibrationOpen)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border shadow-sm ${
                  isCalibrationOpen
                    ? 'bg-amber-500 text-slate-950 border-amber-300 font-black shadow-amber-500/40 ring-2 ring-amber-400'
                    : 'fs-pill-btn-inactive hover:text-amber-300 border-amber-500/40 text-amber-400 bg-amber-500/10'
                }`}
                title={lang === 'fa' ? 'تست کالیبراسیون و تنظیم روشنایی و بزرگ‌نمایی صفحه برای دوربین' : 'Camera Optical Calibration & Brightness Test'}
              >
                <Target className="w-3.5 h-3.5" />
                <span>{lang === 'fa' ? 'تست کالیبراسیون' : 'Calibration Test'}</span>
              </button>
            </div>

            <button
              onClick={() => setIsFullscreen(false)}
              className="fs-btn-dark p-2.5 rounded-full hover:bg-rose-600 transition cursor-pointer border shadow-md flex items-center justify-center"
              title={lang === 'fa' ? 'خروج از تمام‌صفحه' : 'Exit Fullscreen'}
            >
              <Minimize2 className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Center Display: Calibration Test Mode OR Standard Aspect-Ratio CSS Grid */}
          <div 
            ref={fullscreenCenterRef}
            className="flex-1 w-full h-full flex items-center justify-center p-2 sm:p-4 overflow-hidden"
          >
            {isCalibrationOpen ? (
              /* Dedicated Optical Calibration Test Studio */
              <div className="w-full h-full max-w-5xl flex flex-col lg:flex-row items-center justify-center gap-4 sm:gap-8 p-3 sm:p-6 bg-slate-950/80 border border-slate-800 rounded-3xl backdrop-blur-md overflow-y-auto animate-in fade-in select-none">
                {/* Left: High-Contrast Test QR Canvas with Alignment Reticles & Grayscale Wedge */}
                <div className="flex flex-col items-center justify-center flex-1 w-full max-w-md">
                  {/* Optical Reticle Card */}
                  <div
                    style={{
                      width: `${Math.min(460, Math.max(240, Math.round(340 * (qrScale / 100))))}px`,
                      height: `${Math.min(460, Math.max(240, Math.round(340 * (qrScale / 100))))}px`,
                    }}
                    className={`relative p-5 sm:p-7 rounded-3xl shadow-[0_0_80px_rgba(245,158,11,0.25)] flex items-center justify-center transition-all duration-150 select-none ${
                      calibrationBgTone === 'pure_white'
                        ? 'bg-white border-4 border-amber-500'
                        : calibrationBgTone === 'anti_glare'
                        ? 'bg-[#f1f5f9] border-4 border-amber-500'
                        : 'bg-black border-4 border-slate-700 p-8'
                    }`}
                  >
                    {/* Corner Optical Alignment Brackets */}
                    <div className="absolute top-2 left-2 w-5 h-5 border-t-4 border-l-4 border-amber-500 rounded-tl pointer-events-none" />
                    <div className="absolute top-2 right-2 w-5 h-5 border-t-4 border-r-4 border-amber-500 rounded-tr pointer-events-none" />
                    <div className="absolute bottom-2 left-2 w-5 h-5 border-b-4 border-l-4 border-amber-500 rounded-bl pointer-events-none" />
                    <div className="absolute bottom-2 right-2 w-5 h-5 border-b-4 border-r-4 border-amber-500 rounded-br pointer-events-none" />

                    {/* Dark Inset Inner Target Container if dark_inset selected */}
                    <div className={`w-full h-full flex items-center justify-center ${calibrationBgTone === 'dark_inset' ? 'bg-white p-4 rounded-2xl shadow-xl' : ''}`}>
                      {calibrationSvg ? (
                        <div
                          className="w-full h-full flex items-center justify-center select-none [&>svg]:w-full [&>svg]:h-full [&>svg]:block"
                          dangerouslySetInnerHTML={{ __html: calibrationSvg }}
                        />
                      ) : (
                        <div className="text-slate-400 font-mono text-xs">Generating Test Pattern...</div>
                      )}
                    </div>

                    {/* Live Dimension Badge */}
                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-slate-900 border border-amber-500/60 text-amber-300 font-mono text-[10px] font-bold shadow-md whitespace-nowrap">
                      {Math.min(460, Math.max(240, Math.round(340 * (qrScale / 100))))}px • 100% CONTRAST
                    </div>
                  </div>

                  {/* Optical Grayscale Contrast & Brightness Calibration Wedge */}
                  <div className="w-full max-w-sm mt-5 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-300">
                      <span className="flex items-center gap-1">
                        <Sun className="w-3.5 h-3.5 text-amber-400" />
                        <span>{lang === 'fa' ? 'طیف کالیبراسیون روشنایی / کنتراست:' : 'Grayscale Brightness Wedge:'}</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">0% → 100%</span>
                    </div>

                    {/* 9-step Grayscale Ramp */}
                    <div className="flex items-center h-6 w-full rounded-lg overflow-hidden border border-slate-700 shadow-inner">
                      {[
                        { pct: '0%', bg: '#000000', text: '#ffffff' },
                        { pct: '12%', bg: '#1f1f1f', text: '#ffffff' },
                        { pct: '25%', bg: '#3f3f3f', text: '#ffffff' },
                        { pct: '38%', bg: '#5f5f5f', text: '#ffffff' },
                        { pct: '50%', bg: '#7f7f7f', text: '#000000' },
                        { pct: '62%', bg: '#9e9e9e', text: '#000000' },
                        { pct: '75%', bg: '#bebebe', text: '#000000' },
                        { pct: '88%', bg: '#dedede', text: '#000000' },
                        { pct: '100%', bg: '#ffffff', text: '#000000' },
                      ].map((step, idx) => (
                        <div
                          key={idx}
                          style={{ backgroundColor: step.bg, color: step.text }}
                          className="flex-1 h-full flex items-center justify-center text-[8px] font-mono font-bold select-none"
                          title={`Grayscale ${step.pct}`}
                        >
                          {idx % 2 === 0 ? step.pct : ''}
                        </div>
                      ))}
                    </div>

                    <p className="text-[10px] text-slate-400 leading-relaxed text-center">
                      {lang === 'fa'
                        ? '💡 نکته: اگر پله‌های ۸۸٪ و ۱۰۰٪ در دوربین یکی دیده می‌شوند، روشنایی مانیتور را کم کنید تا خیرگی لنز حذف شود.'
                        : '💡 Tip: If 88% and 100% blend together in camera view, lower your screen brightness to eliminate optical glare.'}
                    </p>
                  </div>
                </div>

                {/* Right: Live Tuning Controls & Diagnostics */}
                <div className="flex flex-col justify-between flex-1 w-full max-w-md bg-slate-900/90 border border-slate-800 p-4 sm:p-5 rounded-2xl space-y-4">
                  <div>
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <Target className="w-5 h-5 text-amber-400" />
                        <div>
                          <h4 className="text-sm font-bold text-white">
                            {lang === 'fa' ? 'تنظیمات اپتیکال برای دوربین' : 'Camera Optical Tuning'}
                          </h4>
                          <p className="text-[11px] text-slate-400">
                            {lang === 'fa' ? 'تنظیم اندازه و پس‌زمینه برای خوانش بی‌نقص' : 'Fine-tune scale & tone for instant lock'}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                        CALIBRATION
                      </span>
                    </div>

                    {/* 1. Zoom / Scale Slider */}
                    <div className="mt-3 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <label className="font-semibold text-slate-300">
                          {lang === 'fa' ? 'بزرگ‌نمایی و مقیاس فریم (Zoom):' : 'QR Code Scale (Zoom):'}
                        </label>
                        <span className="font-mono text-amber-400 font-bold">{qrScale}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setQrScale((prev) => Math.max(60, prev - 10))}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs cursor-pointer border border-slate-700"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="range"
                          min={60}
                          max={220}
                          step={5}
                          value={qrScale}
                          onChange={(e) => setQrScale(Number(e.target.value))}
                          className="flex-1 accent-amber-400 cursor-pointer"
                        />
                        <button
                          onClick={() => setQrScale((prev) => Math.min(220, prev + 10))}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs cursor-pointer border border-slate-700"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* 2. Density / Module Complexity */}
                    <div className="mt-3 space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300 block">
                        {lang === 'fa' ? 'تراکم خانه‌ها برای تست خوانش:' : 'Test Pattern Density:'}
                      </label>
                      <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                        <button
                          onClick={() => setCalibrationDensity('low')}
                          className={`py-1.5 px-2 rounded-lg font-bold transition cursor-pointer text-center ${
                            calibrationDensity === 'low'
                              ? 'bg-amber-500 text-slate-950 shadow-xs'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {lang === 'fa' ? 'درشت (V1)' : 'Large (V1)'}
                        </button>
                        <button
                          onClick={() => setCalibrationDensity('medium')}
                          className={`py-1.5 px-2 rounded-lg font-bold transition cursor-pointer text-center ${
                            calibrationDensity === 'medium'
                              ? 'bg-amber-500 text-slate-950 shadow-xs'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {lang === 'fa' ? 'متوسط (V4)' : 'Med (V4)'}
                        </button>
                        <button
                          onClick={() => setCalibrationDensity('high')}
                          className={`py-1.5 px-2 rounded-lg font-bold transition cursor-pointer text-center ${
                            calibrationDensity === 'high'
                              ? 'bg-amber-500 text-slate-950 shadow-xs'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {lang === 'fa' ? 'ریز (V7)' : 'Dense (V7)'}
                        </button>
                      </div>
                    </div>

                    {/* 3. Screen Tone / Anti-Glare Options */}
                    <div className="mt-3 space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300 block">
                        {lang === 'fa' ? 'تنظیم پس‌زمینه (حذف بازتاب نور):' : 'Anti-Glare Background Tone:'}
                      </label>
                      <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                        <button
                          onClick={() => setCalibrationBgTone('pure_white')}
                          className={`py-1.5 px-2 rounded-lg font-bold transition cursor-pointer text-center ${
                            calibrationBgTone === 'pure_white'
                              ? 'bg-slate-200 text-slate-950 shadow-xs'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {lang === 'fa' ? 'سفید خالص' : 'Pure White'}
                        </button>
                        <button
                          onClick={() => setCalibrationBgTone('anti_glare')}
                          className={`py-1.5 px-2 rounded-lg font-bold transition cursor-pointer text-center ${
                            calibrationBgTone === 'anti_glare'
                              ? 'bg-cyan-600 text-white shadow-xs'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {lang === 'fa' ? 'ضد خیرگی' : 'Anti-Glare'}
                        </button>
                        <button
                          onClick={() => setCalibrationBgTone('dark_inset')}
                          className={`py-1.5 px-2 rounded-lg font-bold transition cursor-pointer text-center ${
                            calibrationBgTone === 'dark_inset'
                              ? 'bg-purple-600 text-white shadow-xs'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {lang === 'fa' ? 'کادر تاریک' : 'Dark Frame'}
                        </button>
                      </div>
                    </div>

                    {/* 4. Practical Checklist */}
                    <div className="mt-3.5 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                      <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                        <Check className="w-3.5 h-3.5 shrink-0" />
                        <span>{lang === 'fa' ? 'فاصله مطلوب دوربین: ۲۰ تا ۴۰ سانتی‌متر' : 'Optimal distance: 20–40 cm'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                        <Check className="w-3.5 h-3.5 shrink-0" />
                        <span>{lang === 'fa' ? 'روشنایی صفحه نمایش: بین ۵۰٪ تا ۷۰٪' : 'Monitor brightness: 50%–70%'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                        <Check className="w-3.5 h-3.5 shrink-0" />
                        <span>{lang === 'fa' ? 'زاویه دوربین: روبرو و مستقیم به مانیتور' : 'Camera angle: Direct perpendicular'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Close & Return Button */}
                  <div className="pt-2">
                    <button
                      onClick={() => setIsCalibrationOpen(false)}
                      className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-emerald-600 to-teal-600 hover:from-amber-400 hover:to-emerald-500 text-slate-950 hover:text-white font-extrabold text-xs transition cursor-pointer shadow-lg shadow-emerald-950/30 flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{lang === 'fa' ? 'تایید کالیبراسیون و شروع انتقال' : 'Confirm Calibration & Resume Transfer'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : chunks.length === 0 ? (
              /* Fullscreen Standby State */
              <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 flex flex-col items-center justify-center text-center space-y-4 my-auto select-none animate-in fade-in">
                <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shadow-inner">
                  <Inbox className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white">
                    {lang === 'fa' ? 'صف ارسال در حال حاضر خالی است' : 'Transmission Queue is Empty'}
                  </h3>
                  <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                    {lang === 'fa'
                      ? 'هیچ فایلی برای پخش در تمام‌صفحه وجود ندارد. می‌توانید داده نمونه تستی را بارگذاری کنید یا تست کالیبراسیون را اجرا نمایید.'
                      : 'No payload in queue. You can load demo sample data or run camera calibration test.'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  <button
                    onClick={handleLoadDemoData}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer shadow-md transition"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>{lang === 'fa' ? 'بارگذاری داده نمونه (Demo)' : 'Load Demo Data'}</span>
                  </button>
                  <button
                    onClick={() => setIsCalibrationOpen(true)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/40 font-bold text-xs cursor-pointer transition"
                  >
                    <Target className="w-4 h-4" />
                    <span>{lang === 'fa' ? 'تست کالیبراسیون' : 'Calibration Test'}</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Standard Aspect-Ratio CSS Grid */
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: fullscreenGrid.gridTemplateColumns,
                  gridTemplateRows: fullscreenGrid.gridTemplateRows,
                  gap: `${fullscreenGrid.gap}px`,
                  width: `${fullscreenGrid.gridWidth}px`,
                  height: `${fullscreenGrid.gridHeight}px`,
                  maxWidth: '100%',
                  maxHeight: '100%',
                }}
                className="items-center justify-center transition-all duration-150 mx-auto"
              >
                {slots.map((slot) => (
                  slot.hasChunk ? (
                    <div
                      key={slot.chunkIndex}
                      onClick={() => setFocusedChunkIndex(slot.chunkIndex)}
                      className={`relative w-full h-full aspect-square ${
                        displayCount === 1 
                          ? 'p-4 sm:p-8 rounded-3xl bg-white shadow-[0_0_120px_rgba(16,185,129,0.35)] border-4 border-slate-700' 
                          : 'p-1.5 sm:p-2.5 rounded-2xl bg-white shadow-2xl border-2 border-slate-700'
                      } flex flex-col items-center justify-between transition-all hover:border-emerald-500 cursor-pointer select-none group overflow-hidden`}
                      title={lang === 'fa' ? `فریم #${slot.chunkIndex + 1} (کلیک برای فوکوس)` : `Frame #${slot.chunkIndex + 1} (Click to focus)`}
                    >
                      {displayCount > 1 && (
                        <div className="w-full shrink-0 flex items-center justify-between pb-0.5 px-1 text-[10px] sm:text-xs font-mono text-slate-700 border-b border-slate-100 select-none">
                          <span className="font-bold bg-slate-100 border border-slate-200 px-1.5 py-0.2 rounded text-slate-900 shadow-2xs">
                            #{slot.chunkIndex + 1}
                          </span>
                          <span className="text-[9px] text-slate-500 font-sans font-medium">
                            {slot.chunkIndex + 1}/{chunks.length}
                          </span>
                        </div>
                      )}
                      <div className="w-full flex-1 min-h-0 min-w-0 flex items-center justify-center p-1 sm:p-1.5 overflow-hidden select-none">
                        {chunkSvgs[slot.chunkIndex] && (
                          <div
                            className="w-full h-full min-h-0 min-w-0 flex items-center justify-center select-none [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:w-auto [&>svg]:h-auto [&>svg]:aspect-square [&>svg]:object-contain [&>svg]:block [&>svg]:m-auto"
                            dangerouslySetInnerHTML={{ __html: chunkSvgs[slot.chunkIndex] }}
                          />
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Empty Slot Box Placeholder (e.g. 7 out of 16 used, remaining 9 are empty dashed boxes) */
                    <div
                      key={`fs-empty-${slot.slotIndex}`}
                      className="relative w-full h-full aspect-square p-2 rounded-2xl border-2 border-dashed border-slate-700/80 bg-slate-900/50 flex flex-col items-center justify-center text-slate-400 select-none"
                    >
                      <span className="text-xs sm:text-sm font-mono font-bold text-slate-400">
                        {lang === 'fa' ? 'خالی' : 'Empty'}
                      </span>
                      <span className="text-[10px] font-mono opacity-50">
                        ({slot.slotIndex + 1})
                      </span>
                    </div>
                  )
                ))}
              </div>
            )}
          </div>

          {/* Bottom Playback Navigation & Downloads */}
          <div className="w-full max-w-xl flex flex-wrap items-center justify-center gap-3 sm:gap-4 flex-shrink-0">
            <button
              onClick={() => setCurrentPage((prev) => (prev + 1) % totalPages)}
              className="fs-btn-dark p-3 rounded-xl border cursor-pointer shadow-md flex items-center justify-center"
              title={lang === 'fa' ? 'صفحه بعدی' : 'Next Page'}
            >
              <SkipForward className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`px-8 py-3 rounded-2xl font-black text-sm cursor-pointer shadow-xl transition flex items-center gap-2 ${
                isPlaying
                  ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-950/40'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/40'
              }`}
            >
              {isPlaying ? (lang === 'fa' ? 'توقف' : 'Pause') : (lang === 'fa' ? 'پخش' : 'Play')}
            </button>
            <button
              onClick={() => setCurrentPage((prev) => (prev > 0 ? prev - 1 : totalPages - 1))}
              className="fs-btn-dark p-3 rounded-xl border cursor-pointer shadow-md flex items-center justify-center"
              title={lang === 'fa' ? 'صفحه قبلی' : 'Previous Page'}
            >
              <SkipBack className="w-5 h-5 text-white" />
            </button>

            <button
              onClick={handleDownloadQrPng}
              className="fs-btn-dark flex items-center gap-1.5 px-4 py-2.5 rounded-xl border text-white text-xs font-bold transition cursor-pointer shadow-md"
              title={lang === 'fa' ? 'دانلود فایل PNG' : 'Download PNG'}
            >
              <Download className="w-4 h-4 text-cyan-400" />
              <span className="text-white font-bold">PNG</span>
            </button>

            <button
              onClick={handleDownloadQrSvg}
              className="fs-btn-dark flex items-center gap-1.5 px-4 py-2.5 rounded-xl border text-white text-xs font-bold transition cursor-pointer shadow-md"
              title={lang === 'fa' ? 'دانلود فایل برداری SVG' : 'Download SVG'}
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span className="text-white font-bold">SVG</span>
            </button>
          </div>
        </div>
      )}

      {/* Optical Focus / Single QR Inspection Modal (بزرگ‌نمایی آنی فریم برای خواندن دوربین) */}
      {focusedChunkIndex !== null && chunks[focusedChunkIndex] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border-2 border-emerald-500 shadow-2xl p-6 space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <Focus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{lang === 'fa' ? `نمای فوکوس بزرگ فریم #${focusedChunkIndex + 1}` : `High-Visibility Frame #${focusedChunkIndex + 1}`}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-mono font-bold">
                      {focusedChunkIndex + 1} / {chunks.length}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {lang === 'fa' 
                      ? 'ابعاد حداکثری و کنتراست مطلق برای خوانده شدن قطعی توسط هر نوع دوربین' 
                      : 'Maximized dimension & contrast for immediate camera lock-on'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setFocusedChunkIndex(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Giant High-Contrast Pure White QR Canvas */}
            <div className="w-full flex items-center justify-center p-4 sm:p-6 bg-white rounded-2xl shadow-inner border-2 border-slate-200 aspect-square overflow-hidden">
              <div className="w-full h-full max-w-[320px] max-h-[320px] aspect-square flex items-center justify-center overflow-hidden">
                {chunkSvgs[focusedChunkIndex] && (
                  <div
                    className="w-full h-full min-h-0 min-w-0 flex items-center justify-center select-none [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:w-auto [&>svg]:h-auto [&>svg]:aspect-square [&>svg]:object-contain [&>svg]:block [&>svg]:m-auto"
                    dangerouslySetInnerHTML={{ __html: chunkSvgs[focusedChunkIndex] }}
                  />
                )}
              </div>
            </div>

            {/* Navigation & Controls */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setFocusedChunkIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : chunks.length - 1))}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer border border-slate-200 dark:border-slate-700"
              >
                <SkipBack className="w-3.5 h-3.5" />
                <span>{lang === 'fa' ? 'فریم قبلی' : 'Previous'}</span>
              </button>

              <button
                onClick={() => setFocusedChunkIndex(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold hover:bg-slate-300 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                {lang === 'fa' ? 'بستن' : 'Close'}
              </button>

              <button
                onClick={() => setFocusedChunkIndex((prev) => (prev !== null && prev < chunks.length - 1 ? prev + 1 : 0))}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer shadow-md"
              >
                <span>{lang === 'fa' ? 'فریم بعدی' : 'Next'}</span>
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
