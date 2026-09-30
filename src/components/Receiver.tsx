import React, { useState, useEffect, useRef, useCallback } from 'react';
import jsQR from 'jsqr';
import { 
  Language, 
  AssemblyProgress, 
  EncryptedEnvelope, 
  DecryptedPayload,
  AuditLog,
  ChunkPacket 
} from '../types/index';
import { 
  parseScannedChunk, 
  accumulateChunk,
  packetizeEnvelope
} from '../utils/packetizer';
import { 
  decryptPayload, 
  calculateSha256 
} from '../utils/crypto';
import { soundFx } from '../utils/audio';
import { 
  Camera, 
  CameraOff, 
  ShieldCheck, 
  Lock, 
  Unlock, 
  Download, 
  Copy, 
  Check, 
  RefreshCw, 
  Send, 
  FileCheck, 
  AlertOctagon, 
  CheckCircle2, 
  Scan,
  Maximize,
  ArrowRight,
  Sparkles,
  Server,
  FileCode,
  Image as ImageIcon,
  UploadCloud,
  Play
} from 'lucide-react';

interface Props {
  lang: Language;
  onLogAudit: (log: AuditLog) => void;
  savedPassphrase?: string;
  offlineForwardEndpoint?: string;
  simulatedEnvelope?: EncryptedEnvelope | null;
  onClearSimulatedEnvelope?: () => void;
}

export const Receiver: React.FC<Props> = ({
  lang,
  onLogAudit,
  savedPassphrase = 'AirDiode#SecureKey2026!',
  offlineForwardEndpoint = 'http://localhost:5000/api/airgap/ingest',
  simulatedEnvelope,
  onClearSimulatedEnvelope,
}) => {
  // Input source mode: 'camera' or 'file'
  const [sourceMode, setSourceMode] = useState<'camera' | 'file'>('camera');

  // Camera & Stream states
  const [isScanning, setIsScanning] = useState<boolean>(true);
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [cameraRetryTrigger, setCameraRetryTrigger] = useState<number>(0);
  const [cameraErrorMessage, setCameraErrorMessage] = useState<'permission_denied' | 'not_found' | 'insecure_context' | 'unavailable' | null>(null);
  const [lastScannedChunkTime, setLastScannedChunkTime] = useState<number>(0);

  // Packet Assembly states
  const [progress, setProgress] = useState<AssemblyProgress | null>(null);
  const [assembledEnvelope, setAssembledEnvelope] = useState<EncryptedEnvelope | null>(null);
  const [isComplete, setIsComplete] = useState<boolean>(false);

  // Decryption states
  const [passphrase, setPassphrase] = useState<string>(savedPassphrase);
  const [isDecrypting, setIsDecrypting] = useState<boolean>(false);
  const [decryptionError, setDecryptionError] = useState<string | null>(null);
  const [decryptedData, setDecryptedData] = useState<DecryptedPayload | null>(null);

  // Forwarding to Local Offline System
  const [forwardUrl, setForwardUrl] = useState<string>(offlineForwardEndpoint);
  const [forwardAuthHeader, setForwardAuthHeader] = useState<string>('');
  const [isForwarding, setIsForwarding] = useState<boolean>(false);
  const [forwardStatus, setForwardStatus] = useState<{ success: boolean; message: string } | null>(null);

  // Copy indicator
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // File scan error/status
  const [fileScanStatus, setFileScanStatus] = useState<string | null>(null);

  // Optical Calibration detection
  const [calibrationDetected, setCalibrationDetected] = useState<boolean>(false);

  // Simulation state
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const progressRef = useRef<AssemblyProgress | null>(null);
  const isProcessingRef = useRef<boolean>(false);
  const barcodeDetectorRef = useRef<any>(null);
  progressRef.current = progress;

  // Enumerate cameras
  useEffect(() => {
    async function listCameras() {
      try {
        if (!navigator.mediaDevices?.enumerateDevices) return;
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        setCameraDevices(videoInputs);
        if (videoInputs.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(videoInputs[0].deviceId);
        }
      } catch (e) {
        console.warn('Notice querying camera devices:', e);
      }
    }
    listCameras();
  }, [selectedDeviceId]);

  // Start / Stop Video Stream
  useEffect(() => {
    let currentStream: MediaStream | null = null;
    let isCancelled = false;

    async function startCamera() {
      if (!isScanning || sourceMode !== 'camera') return;

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setHasCameraPermission(false);
        setCameraErrorMessage('insecure_context');
        return;
      }

      try {
        const constraints: MediaStreamConstraints = {
          video: {
            deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
            facingMode: selectedDeviceId ? undefined : 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (isCancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        currentStream = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          await videoRef.current.play().catch(() => {});
          setHasCameraPermission(true);
          setCameraErrorMessage(null);
        }
      } catch (err: any) {
        const errName = err?.name || '';
        const errMsg = err?.message || '';
        console.warn('Camera stream notice:', errName || errMsg);

        setHasCameraPermission(false);
        if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError' || errMsg.includes('Permission denied')) {
          setCameraErrorMessage('permission_denied');
        } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError' || errMsg.includes('not found')) {
          setCameraErrorMessage('not_found');
        } else {
          setCameraErrorMessage('unavailable');
        }
      }
    }

    startCamera();

    return () => {
      isCancelled = true;
      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isScanning, selectedDeviceId, sourceMode, cameraRetryTrigger]);

  // Process a raw scanned QR text
  const handleIngestQrString = useCallback((rawText: string) => {
    // Check if scanned QR is an Optical Calibration Pattern
    if (rawText.includes('SAYEH-TEST-PASS') || rawText.includes('SAYEH-CALIBRATION')) {
      soundFx.playSuccessChime();
      setCalibrationDetected(true);
      setTimeout(() => setCalibrationDetected(false), 4000);
      return true;
    }

    const packet = parseScannedChunk(rawText);
    if (!packet) return false;

    const currentProg = progressRef.current;
    const isAlreadyReceived = currentProg && currentProg.transferId === packet.transferId && currentProg.receivedIndices.has(packet.index);

    if (!isAlreadyReceived) {
      soundFx.playChunkBeep();
      setLastScannedChunkTime(Date.now());
    }

    const { progress: nextProg, isComplete: complete, envelope } = accumulateChunk(currentProg, packet);
    setProgress(nextProg);

    if (complete && envelope) {
      soundFx.playSuccessChime();
      setAssembledEnvelope(envelope);
      setIsComplete(true);
      setIsScanning(false);
    }

    return true;
  }, []);

  // Real-time Frame Scanning Loop (Hardware BarcodeDetector with jsQR Fallback)
  const scanFrame = useCallback(async () => {
    if (!isScanning || sourceMode !== 'camera' || !videoRef.current || !canvasRef.current) {
      animationFrameRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    if (isProcessingRef.current) {
      animationFrameRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const overlay = overlayCanvasRef.current;

    if (video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth > 0) {
      isProcessingRef.current = true;
      try {
        let detectedMulti = false;

        // 1. Native Hardware BarcodeDetector: Decodes ALL QRs in the frame simultaneously
        if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
          try {
            if (!barcodeDetectorRef.current) {
              barcodeDetectorRef.current = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
            }
            const barcodes = await barcodeDetectorRef.current.detect(video);
            if (barcodes && barcodes.length > 0) {
              detectedMulti = true;
              if (overlay) {
                overlay.width = video.videoWidth;
                overlay.height = video.videoHeight;
                const oCtx = overlay.getContext('2d');
                if (oCtx) {
                  oCtx.clearRect(0, 0, overlay.width, overlay.height);
                  oCtx.lineWidth = 4;
                  oCtx.strokeStyle = '#10b981';
                  barcodes.forEach((bc: any) => {
                    if (bc.cornerPoints && bc.cornerPoints.length >= 4) {
                      oCtx.beginPath();
                      oCtx.moveTo(bc.cornerPoints[0].x, bc.cornerPoints[0].y);
                      for (let i = 1; i < bc.cornerPoints.length; i++) {
                        oCtx.lineTo(bc.cornerPoints[i].x, bc.cornerPoints[i].y);
                      }
                      oCtx.closePath();
                      oCtx.stroke();
                    }
                  });
                }
              }
              for (const bc of barcodes) {
                if (bc.rawValue) {
                  handleIngestQrString(bc.rawValue);
                }
              }
            }
          } catch {
            // Hardware detector fallback to jsQR
          }
        }

        // 2. High-speed jsQR fallback if BarcodeDetector not supported or found nothing
        if (!detectedMulti) {
          const maxWidth = 640;
          const scale = Math.min(1, maxWidth / video.videoWidth);
          const procW = Math.round(video.videoWidth * scale);
          const procH = Math.round(video.videoHeight * scale);

          canvas.width = procW;
          canvas.height = procH;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });

          if (ctx) {
            ctx.drawImage(video, 0, 0, procW, procH);
            const imageData = ctx.getImageData(0, 0, procW, procH);

            // Run jsQR
            const code = jsQR(imageData.data, procW, procH, {
              inversionAttempts: 'dontInvert',
            });

            // Overlay drawing for bounding box
            if (overlay) {
              overlay.width = video.videoWidth;
              overlay.height = video.videoHeight;
              const oCtx = overlay.getContext('2d');
              if (oCtx) {
                oCtx.clearRect(0, 0, overlay.width, overlay.height);

                if (code) {
                  const invScale = 1 / scale;
                  oCtx.beginPath();
                  oCtx.moveTo(code.location.topLeftCorner.x * invScale, code.location.topLeftCorner.y * invScale);
                  oCtx.lineTo(code.location.topRightCorner.x * invScale, code.location.topRightCorner.y * invScale);
                  oCtx.lineTo(code.location.bottomRightCorner.x * invScale, code.location.bottomRightCorner.y * invScale);
                  oCtx.lineTo(code.location.bottomLeftCorner.x * invScale, code.location.bottomLeftCorner.y * invScale);
                  oCtx.closePath();
                  oCtx.lineWidth = 5;
                  oCtx.strokeStyle = '#10b981'; // Emerald
                  oCtx.stroke();
                }
              }
            }

            if (code && code.data) {
              handleIngestQrString(code.data);
            }
          }
        }
      } catch (e) {
        console.error('Scan error:', e);
      } finally {
        isProcessingRef.current = false;
      }
    }

    animationFrameRef.current = requestAnimationFrame(scanFrame);
  }, [isScanning, sourceMode, handleIngestQrString]);

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(scanFrame);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [scanFrame]);

  // Scan QR code from an uploaded image file
  const handleImageUpload = (file: File) => {
    setFileScanStatus(null);
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const testCanvas = document.createElement('canvas');
        testCanvas.width = img.width;
        testCanvas.height = img.height;
        const ctx = testCanvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, img.width, img.height);
        const code = jsQR(imgData.data, img.width, img.height, {
          inversionAttempts: 'attemptBoth',
        });
        if (code && code.data) {
          const success = handleIngestQrString(code.data);
          if (success) {
            setFileScanStatus(lang === 'fa' ? 'فریم کیوآرکد با موفقیت اسکن و دریافت شد.' : 'QR Code frame successfully scanned!');
          } else {
            setFileScanStatus(lang === 'fa' ? 'کیوآرکد شناسایی شد اما قالب آن مربوط به AirDiode نیست.' : 'QR code detected but not an AirDiode packet format.');
          }
        } else {
          setFileScanStatus(lang === 'fa' ? 'هیچ کیوآرکدی در این تصویر یافت نشد. لطفاً از کیفیت و کنتراست تصویر مطمئن شوید.' : 'No QR code found in this image. Please check contrast/sharpness.');
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Run simulation of receiving chunks from an envelope
  const runSimulatedTransfer = useCallback((env: EncryptedEnvelope) => {
    setIsSimulating(true);
    setProgress(null);
    setAssembledEnvelope(null);
    setIsComplete(false);
    setDecryptedData(null);
    setDecryptionError(null);

    const { chunks } = packetizeEnvelope(env, 240);
    let i = 0;

    const interval = setInterval(() => {
      if (i < chunks.length) {
        handleIngestQrString(chunks[i]);
        i++;
      } else {
        clearInterval(interval);
        setIsSimulating(false);
      }
    }, 180);
  }, [handleIngestQrString]);

  // Check if simulated envelope passed from transmitter
  useEffect(() => {
    if (simulatedEnvelope) {
      runSimulatedTransfer(simulatedEnvelope);
      if (onClearSimulatedEnvelope) onClearSimulatedEnvelope();
    }
  }, [simulatedEnvelope, onClearSimulatedEnvelope, runSimulatedTransfer]);

  // Attempt Decryption
  const handleDecrypt = useCallback(async (targetEnvelope: EncryptedEnvelope, pass: string) => {
    setIsDecrypting(true);
    setDecryptionError(null);
    try {
      if (targetEnvelope.transferId.startsWith('AIR-PLAIN-')) {
        // Plain unencrypted payload
        const raw = decodeURIComponent(escape(atob(targetEnvelope.ciphertext)));
        const hash = await calculateSha256(raw);
        setDecryptedData({
          transferId: targetEnvelope.transferId,
          fileName: targetEnvelope.fileName,
          fileType: targetEnvelope.fileType || 'text/plain',
          content: raw,
          isBinary: targetEnvelope.fileType !== 'application/json' && !raw.startsWith('{'),
          totalBytes: targetEnvelope.totalBytes,
          timestamp: targetEnvelope.timestamp,
          verified: hash.toLowerCase() === targetEnvelope.hash.toLowerCase(),
          sha256: hash,
        });
      } else {
        const { content, verified, sha256 } = await decryptPayload(targetEnvelope, pass);
        const isBin = targetEnvelope.fileType !== 'application/json' && content.startsWith('data:');

        setDecryptedData({
          transferId: targetEnvelope.transferId,
          fileName: targetEnvelope.fileName,
          fileType: targetEnvelope.fileType || 'text/plain',
          content,
          isBinary: isBin,
          totalBytes: targetEnvelope.totalBytes,
          timestamp: targetEnvelope.timestamp,
          verified,
          sha256,
        });

        // Record to audit log
        onLogAudit({
          id: 'rx-' + Date.now(),
          type: 'received',
          fileName: targetEnvelope.fileName,
          fileType: targetEnvelope.fileType || 'text/plain',
          totalBytes: targetEnvelope.totalBytes,
          transferId: targetEnvelope.transferId,
          sha256,
          timestamp: Date.now(),
          status: verified ? 'success' : 'tampered',
        });
      }
    } catch (err: unknown) {
      soundFx.playErrorBuzz();
      const message = err instanceof Error ? err.message : 'رمزگشایی ناموفق بود. گذرواژه اشتباه است!';
      setDecryptionError(message);
    } finally {
      setIsDecrypting(false);
    }
  }, [onLogAudit]);

  // Auto-decrypt if passphrase matches when complete
  useEffect(() => {
    if (isComplete && assembledEnvelope && passphrase && !decryptedData && !decryptionError) {
      handleDecrypt(assembledEnvelope, passphrase);
    }
  }, [isComplete, assembledEnvelope, passphrase, decryptedData, decryptionError, handleDecrypt]);

  // Download Decrypted File
  const handleDownload = () => {
    if (!decryptedData) return;

    if (decryptedData.isBinary && decryptedData.content.startsWith('data:')) {
      const a = document.createElement('a');
      a.href = decryptedData.content;
      a.download = decryptedData.fileName || 'downloaded-file.bin';
      a.click();
    } else {
      const blob = new Blob([decryptedData.content], { type: decryptedData.fileType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = decryptedData.fileName || 'data.json';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // Copy text to clipboard
  const handleCopy = () => {
    if (!decryptedData) return;
    navigator.clipboard.writeText(decryptedData.content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Dispatch / Forward payload to Local Offline System
  const handleForwardToOfflineSystem = async () => {
    if (!decryptedData || !forwardUrl) return;
    setIsForwarding(true);
    setForwardStatus(null);
    try {
      const headers: Record<string, string> = {
        'Content-Type': decryptedData.fileType.includes('json') ? 'application/json' : 'text/plain',
      };
      if (forwardAuthHeader) {
        headers['Authorization'] = forwardAuthHeader;
      }

      let bodyData = decryptedData.content;
      if (decryptedData.isBinary) {
        bodyData = JSON.stringify({
          transferId: decryptedData.transferId,
          fileName: decryptedData.fileName,
          fileType: decryptedData.fileType,
          payloadBase64: decryptedData.content,
          sha256: decryptedData.sha256,
        });
        headers['Content-Type'] = 'application/json';
      }

      const res = await fetch(forwardUrl, {
        method: 'POST',
        headers,
        body: bodyData,
      });

      if (res.ok) {
        setForwardStatus({
          success: true,
          message: lang === 'fa' 
            ? `با موفقیت به سامانه آفلاین منتقل شد (کد پاسخ: ${res.status})` 
            : `Successfully forwarded to offline service (HTTP ${res.status})`,
        });
      } else {
        setForwardStatus({
          success: false,
          message: lang === 'fa' 
            ? `خطا در اتصال به سامانه محلی (کد ${res.status}: ${res.statusText})` 
            : `Failed with status ${res.status}: ${res.statusText}`,
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown network error';
      setForwardStatus({
        success: false,
        message: lang === 'fa' 
          ? `امکان ارسال به پورت محلی فراهم نشد: ${message}` 
          : `Connection to local port failed: ${message}`,
      });
    } finally {
      setIsForwarding(false);
    }
  };

  // Reset scanner for next transfer
  const handleReset = () => {
    setProgress(null);
    setAssembledEnvelope(null);
    setIsComplete(false);
    setDecryptedData(null);
    setDecryptionError(null);
    setForwardStatus(null);
    setFileScanStatus(null);
    setIsScanning(true);
  };

  const totalChunks = progress?.totalChunks || 0;
  const receivedCount = progress?.receivedIndices.size || 0;
  const percent = totalChunks > 0 ? Math.round((receivedCount / totalChunks) * 100) : 0;

  // Calculate missing chunks
  const missingIndices: number[] = [];
  if (totalChunks > 0 && progress) {
    for (let i = 1; i <= totalChunks; i++) {
      if (!progress.receivedIndices.has(i)) {
        missingIndices.push(i);
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-gradient-to-r dark:from-slate-900/90 dark:via-slate-900/50 dark:to-cyan-950/20 p-5 shadow-sm dark:shadow-xl transition-colors">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400">
              <Camera className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {lang === 'fa' ? 'گیرنده نوری دوربین (سیستم آفلاین / مقصد)' : 'Optical Camera Receiver (Destination System)'}
                <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/40">
                  {lang === 'fa' ? 'سایه RX' : 'SAYEH RX'}
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
                {lang === 'fa'
                  ? 'اسکن با وب‌کم، استخراج فریم‌های کیوآر، بازسازی ماتریس پکت‌ها و رمزگشایی بی‌درنگ AES-256 با امکان ارسال به پورت محلی.'
                  : 'Fast optical scan via webcam or image, real-time packet reassembly, authenticated AES-256 decryption, and offline forwarding.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsScanning(!isScanning)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition cursor-pointer ${
                isScanning
                  ? 'bg-amber-100 dark:bg-amber-500/20 border-amber-300 dark:border-amber-500/40 text-amber-800 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-500/30'
                  : 'bg-emerald-100 dark:bg-emerald-500/20 border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-500/30'
              }`}
            >
              {isScanning ? (
                <>
                  <CameraOff className="w-3.5 h-3.5" />
                  <span>{lang === 'fa' ? 'توقف اسکن' : 'Pause Camera'}</span>
                </>
              ) : (
                <>
                  <Camera className="w-3.5 h-3.5" />
                  <span>{lang === 'fa' ? 'شروع اسکن' : 'Resume Camera'}</span>
                </>
              )}
            </button>

            {(progress || decryptedData) && (
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 dark:text-slate-300 text-xs transition cursor-pointer"
                title={lang === 'fa' ? 'پاکسازی و اسکن جدید' : 'Clear & Scan New'}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{lang === 'fa' ? 'اسکن جدید' : 'New Scan'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Viewfinder & Input Mode (Cols 7) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 backdrop-blur-xs p-5 shadow-sm dark:shadow-lg transition-colors">
            {/* Mode selection: Live Camera vs Image File */}
            <div className="flex items-center justify-between mb-4 border-b border-slate-200 dark:border-slate-800/80 pb-3">
              <div className="flex items-center p-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                <button
                  onClick={() => setSourceMode('camera')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition cursor-pointer ${
                    sourceMode === 'camera'
                      ? 'bg-cyan-600 text-white font-medium shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>{lang === 'fa' ? 'دوربین زنده' : 'Live Camera'}</span>
                </button>
                <button
                  onClick={() => setSourceMode('file')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition cursor-pointer ${
                    sourceMode === 'file'
                      ? 'bg-cyan-600 text-white font-medium shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>{lang === 'fa' ? 'اسکن از تصویر / فایل' : 'Scan Image / File'}</span>
                </button>
              </div>

              {sourceMode === 'camera' && cameraDevices.length > 1 && (
                <select
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                  className="rounded-lg bg-slate-950 border border-slate-700 px-2 py-1 text-xs text-slate-300 focus:outline-none"
                >
                  {cameraDevices.map((d, i) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Camera ${i + 1}`}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Viewfinder Container */}
            {sourceMode === 'camera' ? (
              <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-950 border-2 border-slate-800 flex items-center justify-center">
                {/* Optical Calibration Verified Toast */}
                {calibrationDetected && (
                  <div className="absolute top-3 left-3 right-3 z-30 p-2.5 sm:p-3 rounded-xl bg-emerald-600/95 text-white shadow-2xl backdrop-blur-md flex items-center justify-between border border-emerald-400 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-200 animate-bounce" />
                      <div>
                        <div className="text-xs font-bold font-sans">
                          {lang === 'fa' ? '🎯 الگوی کالیبراسیون اپتیکال با موفقیت خوانده شد!' : '🎯 Optical Calibration Pattern Verified!'}
                        </div>
                        <div className="text-[11px] opacity-90">
                          {lang === 'fa' ? 'روشنایی، کنتراست و فاصله دوربین کاملاً ایده‌آل و آماده انتقال است.' : 'Screen brightness, contrast & camera distance are optimal.'}
                        </div>
                      </div>
                    </div>
                    <span className="hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 rounded-full bg-black/30 font-bold border border-emerald-300/40">
                      CALIB PASS
                    </span>
                  </div>
                )}

                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  muted
                  playsInline
                />

                {/* Hidden canvas for jsQR raw pixel processing */}
                <canvas ref={canvasRef} className="hidden" />

                {/* Overlay canvas for detection polygon */}
                <canvas
                  ref={overlayCanvasRef}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                />

                {/* Scanning Target Reticle & Laser */}
                {isScanning && (
                  <>
                    {/* Laser Beam Animation */}
                    <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#06b6d4] animate-scan-beam pointer-events-none" />

                    {/* Corner Target Brackets */}
                    <div className="absolute top-6 left-6 w-8 h-8 border-t-2 border-l-2 border-cyan-400 pointer-events-none" />
                    <div className="absolute top-6 right-6 w-8 h-8 border-t-2 border-r-2 border-cyan-400 pointer-events-none" />
                    <div className="absolute bottom-6 left-6 w-8 h-8 border-b-2 border-l-2 border-cyan-400 pointer-events-none" />
                    <div className="absolute bottom-6 right-6 w-8 h-8 border-b-2 border-r-2 border-cyan-400 pointer-events-none" />

                    {/* Aim Helper */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-48 h-48 border border-cyan-500/20 rounded-2xl flex items-center justify-center">
                        <div className="w-3 h-3 border-t border-l border-cyan-400/40" />
                      </div>
                    </div>
                  </>
                )}

                {/* Camera Permission Error Overlay */}
                {hasCameraPermission === false && (
                  <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center z-20">
                    <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 mb-3 shadow-lg">
                      <AlertOctagon className="w-7 h-7" />
                    </div>
                    <p className="text-sm sm:text-base font-bold text-white mb-1">
                      {cameraErrorMessage === 'not_found'
                        ? (lang === 'fa' ? 'هیچ وب‌کم یا دوربینی شناسایی نشد' : 'No Camera Detected')
                        : cameraErrorMessage === 'insecure_context'
                        ? (lang === 'fa' ? 'محیط مرورگر اجازه وب‌کم مستقیم را نمی‌دهد' : 'Camera API Restricted in this Context')
                        : (lang === 'fa' ? 'دسترسی به دوربین توسط مرورگر داده نشد' : 'Camera Access Permission Required')}
                    </p>
                    <p className="text-xs text-slate-300 max-w-md mb-4 leading-relaxed">
                      {cameraErrorMessage === 'permission_denied'
                        ? (lang === 'fa'
                            ? 'برای اسکن زنده، در نوار آدرس مرورگر روی علامت قفل 🔒 کلیک کرده و Camera را روی «Allow» قرار دهید، یا از دکمه تلاش مجدد استفاده فرمایید.'
                            : 'To scan live QR streams, click the lock 🔒 icon in the browser address bar and set Camera to Allow.')
                        : (lang === 'fa'
                            ? 'می‌توانید به سادگی از طریق بارگذاری اسکرین‌شات یا حالت شبیه‌سازی، پکت‌ها را دریافت کنید.'
                            : 'You can alternatively scan an image file or test with simulated Air-Gap transmission.')}
                    </p>

                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <button
                        onClick={() => {
                          setHasCameraPermission(null);
                          setCameraErrorMessage(null);
                          setIsScanning(true);
                          setCameraRetryTrigger((c) => c + 1);
                        }}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition cursor-pointer shadow-md"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>{lang === 'fa' ? 'تلاش مجدد و فعال‌سازی' : 'Retry Permission'}</span>
                      </button>

                      <button
                        onClick={() => setSourceMode('file')}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition cursor-pointer shadow-md"
                      >
                        <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{lang === 'fa' ? 'تغییر به اسکن از تصویر' : 'Switch to Image Upload'}</span>
                      </button>

                      <button
                        onClick={() => {
                          runSimulatedTransfer({
                            version: 1,
                            transferId: 'AIR-SIM-' + Date.now().toString(36),
                            totalBytes: 520,
                            fileName: 'AirDiode_Security_Policy.pdf',
                            fileType: 'application/pdf',
                            ciphertext: btoa('AirDiode optical air-gap simulation demonstration payload successfully transmitted through optical diode simulation.'),
                            iv: '1234567890abcdef',
                            salt: 'fedcba0987654321',
                            hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
                            timestamp: Date.now(),
                          });
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 text-xs font-semibold transition cursor-pointer"
                        title={lang === 'fa' ? 'تست جریان دریافت بدون نیاز به دوربین' : 'Test receiver workflow without physical camera'}
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>{lang === 'fa' ? 'تست با شبیه‌سازی' : 'Test Simulation'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Image Upload Area */
              <div className="aspect-video w-full rounded-xl overflow-hidden bg-slate-950/80 border-2 border-dashed border-slate-700 hover:border-cyan-500/60 transition flex flex-col items-center justify-center p-6 text-center">
                <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full">
                  <UploadCloud className="w-10 h-10 text-cyan-400 mb-2" />
                  <p className="text-xs font-semibold text-white">
                    {lang === 'fa' ? 'انتخاب یا رها کردن تصویر کیوآرکد (اسکرین‌شات)' : 'Drop or select QR code image screenshot'}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    PNG, JPG, WEBP, GIF
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file);
                    }}
                  />
                </label>

                {fileScanStatus && (
                  <div className="mt-3 p-2 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-cyan-300">
                    {fileScanStatus}
                  </div>
                )}
              </div>
            )}

            {/* Quick Status Bar */}
            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isScanning ? 'bg-cyan-400 animate-ping' : 'bg-slate-500'}`} />
                {isScanning 
                  ? (lang === 'fa' ? 'پویش نوری فوق‌سریع فعال است' : 'Ultra-fast optical scanning active')
                  : (lang === 'fa' ? 'اسکن متوقف شد' : 'Scanning paused')}
              </span>
              <span>
                {lang === 'fa' ? 'دوربین را مقابل مانیتور سیستم اول قرار دهید' : 'Point camera at transmitter screen'}
              </span>
            </div>
          </div>

          {/* Packet Matrix / Chunks Visualizer */}
          {progress && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 backdrop-blur-xs p-5 shadow-lg space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                <span className="text-xs font-mono font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  {lang === 'fa' ? 'ماتریس دریافت پکت‌ها (Fountain Assembly)' : 'Packet Reception Matrix'}
                </span>
                <span className="text-xs font-mono text-emerald-400 font-bold">
                  {receivedCount} / {totalChunks} ({percent}%)
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 transition-all duration-150"
                  style={{ width: `${percent}%` }}
                />
              </div>

              {/* Visual Matrix of Chunks */}
              <div className="max-h-36 overflow-y-auto p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
                <div className="grid grid-cols-8 sm:grid-cols-12 md:grid-cols-16 gap-1.5">
                  {Array.from({ length: totalChunks }).map((_, idx) => {
                    const chunkNumber = idx + 1;
                    const isReceived = progress.receivedIndices.has(chunkNumber);
                    return (
                      <div
                        key={chunkNumber}
                        className={`aspect-square rounded flex items-center justify-center text-[10px] font-mono transition-all duration-200 ${
                          isReceived
                            ? 'bg-emerald-500 text-slate-950 font-bold shadow-[0_0_6px_#10b981]'
                            : 'bg-slate-800/80 text-slate-500 border border-slate-700/40'
                        }`}
                        title={`Chunk ${chunkNumber}`}
                      >
                        {chunkNumber}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Missing Chunks Notification */}
              {missingIndices.length > 0 && !isComplete && (
                <div className="text-[11px] text-amber-400/90 font-mono flex items-center justify-between">
                  <span>{lang === 'fa' ? 'در انتظار فریم‌های:' : 'Waiting for chunks:'}</span>
                  <span className="truncate max-w-[280px]">
                    [{missingIndices.slice(0, 10).join(', ')}{missingIndices.length > 10 ? '...' : ''}]
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Decryption & Offline Dispatcher (Cols 5) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Completion Status & Decryption Prompt */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 backdrop-blur-xs p-5 shadow-sm dark:shadow-lg space-y-4 transition-colors">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-3">
              <span className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                {lang === 'fa' ? 'رمزگشایی و اصالت‌سنجی' : 'Decryption & Integrity'}
              </span>

              {isComplete ? (
                <span className="px-2.5 py-0.5 rounded text-[11px] font-mono bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30">
                  100% CAPTURED
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded text-[11px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {lang === 'fa' ? 'در انتظار فریم‌ها' : 'WAITING'}
                </span>
              )}
            </div>

            {/* Passphrase Input */}
            <div>
              <label className="text-xs text-slate-700 dark:text-slate-300 font-medium block mb-1.5">
                {lang === 'fa' ? 'کلید گذرواژه جهت رمزگشایی AES-256:' : 'AES-256 Decryption Key:'}
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder={lang === 'fa' ? 'کلید یا پسورد را وارد کنید...' : 'Enter decryption key...'}
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-800 px-3 py-2 text-xs font-mono text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                />
                {assembledEnvelope && (
                  <button
                    onClick={() => handleDecrypt(assembledEnvelope, passphrase)}
                    disabled={isDecrypting}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    {isDecrypting ? '...' : (lang === 'fa' ? 'رمزگشایی' : 'Decrypt')}
                  </button>
                )}
              </div>
            </div>

            {/* Error Message if Decryption Fails */}
            {decryptionError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{decryptionError}</span>
              </div>
            )}

            {/* Integrity Verified Badge */}
            {decryptedData && decryptedData.verified && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>
                    {lang === 'fa' ? 'اصالت داده تایید شد (SHA-256 Match)' : 'Integrity verified (SHA-256 Valid)'}
                  </span>
                </div>
                <span className="font-mono text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">GCM-AUTH-OK</span>
              </div>
            )}
          </div>

          {/* Decrypted Payload Result Card */}
          {decryptedData && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 backdrop-blur-xs p-5 shadow-sm dark:shadow-lg space-y-4 transition-colors">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-3">
                <span className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  {decryptedData.fileName || (lang === 'fa' ? 'محتوای دریافتی' : 'Received Content')}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleCopy}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 dark:text-slate-300 text-xs transition cursor-pointer"
                    title={lang === 'fa' ? 'کپی در کلیپ‌بورد' : 'Copy Content'}
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition cursor-pointer"
                    title={lang === 'fa' ? 'دانلود فایل روی دیسک' : 'Download File'}
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{lang === 'fa' ? 'دانلود' : 'Download'}</span>
                  </button>
                </div>
              </div>

              {/* Content Preview */}
              {decryptedData.isBinary ? (
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-center space-y-2">
                  <FileCheck className="w-10 h-10 text-emerald-400 mx-auto" />
                  <p className="text-xs font-semibold text-white">{decryptedData.fileName}</p>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {(decryptedData.totalBytes / 1024).toFixed(1)} KB • {decryptedData.fileType}
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="max-h-52 overflow-y-auto p-3 rounded-xl bg-slate-950/90 border border-slate-800 font-mono text-xs text-emerald-300 leading-relaxed whitespace-pre-wrap select-all" dir="ltr">
                    {decryptedData.content}
                  </div>
                </div>
              )}

              {/* Direct Forward to Offline System */}
              <div className="pt-3 border-t border-slate-800/80 space-y-3">
                <span className="text-xs font-semibold text-white flex items-center gap-2">
                  <Server className="w-3.5 h-3.5 text-purple-400" />
                  {lang === 'fa' ? 'ارسال به سامانه محلی آفلاین:' : 'Dispatch to Local Offline System:'}
                </span>

                <div className="space-y-2">
                  <input
                    type="text"
                    value={forwardUrl}
                    onChange={(e) => setForwardUrl(e.target.value)}
                    placeholder="http://localhost:5000/api/receive-airgap"
                    dir="ltr"
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-1.5 text-xs font-mono text-purple-300 focus:outline-none focus:border-purple-500"
                  />

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={forwardAuthHeader}
                      onChange={(e) => setForwardAuthHeader(e.target.value)}
                      placeholder="Bearer token (optional)"
                      dir="ltr"
                      className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-1.5 text-[11px] font-mono text-slate-300 focus:outline-none focus:border-purple-500"
                    />

                    <button
                      onClick={handleForwardToOfflineSystem}
                      disabled={isForwarding}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition cursor-pointer shrink-0 disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isForwarding ? '...' : (lang === 'fa' ? 'ارسال به سامانه' : 'Dispatch')}</span>
                    </button>
                  </div>
                </div>

                {/* Dispatch Status */}
                {forwardStatus && (
                  <div
                    className={`p-2.5 rounded-lg text-xs font-mono flex items-center gap-2 ${
                      forwardStatus.success
                        ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
                    }`}
                  >
                    <span>{forwardStatus.message}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
