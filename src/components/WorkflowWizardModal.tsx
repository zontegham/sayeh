import React, { useState } from 'react';
import { Language, EncryptedEnvelope } from '../types/index';
import { 
  FileUp, 
  Layers, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  Lock, 
  Radio, 
  Sliders, 
  Globe, 
  Server, 
  RefreshCw, 
  ShieldCheck, 
  Key, 
  Sparkles, 
  Database, 
  Cpu, 
  Building2, 
  Eye, 
  EyeOff, 
  Check, 
  Camera, 
  X,
  Play
} from 'lucide-react';
import { generateRandom256BitKey } from '../utils/crypto';

export type WizardFlow = 'manual_file' | 'system_integration';

export interface WizardConfig {
  flow: WizardFlow;
  // Manual file options
  inputMode: 'file' | 'text';
  textContent: string;
  selectedFile: { name: string; type: string; size: number; base64Data: string } | null;
  // Encryption
  encryptEnabled: boolean;
  passphrase: string;
  // QR & Shutter tuning
  qrCount: number; // chunks count goal or chunk size
  shutterFps: number; // frames per second matching camera shutter
  displayCount: 1 | 2 | 4; // Simultaneous QR display count (1, 2, or 4 grid)
  errorCorrection: 'L' | 'M' | 'Q' | 'H';
  // System integration options
  systemType: 'rest_poll' | 'webhook_receiver' | 'database_query' | 'mqtt_scada' | 'custom_api';
  inboundUrl: string;
  inboundMethod: 'GET' | 'POST';
  inboundHeaders: Record<string, string>;
  authType: 'none' | 'bearer' | 'basic' | 'apikey';
  authKeyName: string;
  authKeyValue: string;
  outboundOfflineUrl: string;
  autoForwardToOffline: boolean;
  verifiedPayload: string | null;
  connectionTested: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  onFinishWizard: (config: WizardConfig) => void;
}

export const WorkflowWizardModal: React.FC<Props> = ({
  isOpen,
  onClose,
  lang,
  onFinishWizard,
}) => {
  // Wizard Step: 1 = Choose Path, 2 = Data/System Configuration, 3 = Security & Key, 4 = QR Optical & Shutter, 5 = Ready/Preview
  const [step, setStep] = useState<number>(1);
  const [flow, setFlow] = useState<WizardFlow>('manual_file');

  // Manual File State
  const [inputMode, setInputMode] = useState<'file' | 'text'>('file');
  const [textContent, setTextContent] = useState<string>(
    JSON.stringify(
      {
        transfer_name: 'Secure-Manual-Dispatch',
        department: 'Cyber-Operations',
        priority: 'CRITICAL',
        data: 'Classified payload sample',
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

  // Security
  const [encryptEnabled, setEncryptEnabled] = useState<boolean>(true);
  const [passphrase, setPassphrase] = useState<string>('AirDiode#SecureKey2026!');
  const [showPassphrase, setShowPassphrase] = useState<boolean>(false);

  // Optical & Camera Shutter Tuning
  const [shutterFps, setShutterFps] = useState<number>(3); // 3 FPS default safe for most standard 30fps webcams
  const [displayCount, setDisplayCount] = useState<1 | 2 | 4>(1); // Number of QRs simultaneously displayed
  const [errorCorrection, setErrorCorrection] = useState<'L' | 'M' | 'Q' | 'H'>('L');
  const [targetChunkDensity, setTargetChunkDensity] = useState<number>(240); // Bytes per QR

  // System Integration States
  const [systemType, setSystemType] = useState<'rest_poll' | 'webhook_receiver' | 'database_query' | 'mqtt_scada' | 'custom_api'>('rest_poll');
  const [inboundUrl, setInboundUrl] = useState<string>('https://jsonplaceholder.typicode.com/posts/1');
  const [inboundMethod, setInboundMethod] = useState<'GET' | 'POST'>('GET');
  const [authType, setAuthType] = useState<'none' | 'bearer' | 'basic' | 'apikey'>('none');
  const [authKeyName, setAuthKeyName] = useState<string>('Authorization');
  const [authKeyValue, setAuthKeyValue] = useState<string>('');
  const [outboundOfflineUrl, setOutboundOfflineUrl] = useState<string>('http://localhost:5000/api/airgap/ingest');
  const [autoForwardToOffline, setAutoForwardToOffline] = useState<boolean>(true);

  // Integration test state
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; sampleData?: string } | null>(null);

  if (!isOpen) return null;

  // Handle file select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedFile({
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        base64Data: reader.result as string,
      });
      setInputMode('file');
    };
    reader.readAsDataURL(file);
  };

  // Perform live API connection test for system integration
  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const headers: Record<string, string> = {
        'Accept': 'application/json',
      };
      if (authType === 'bearer' && authKeyValue) {
        headers['Authorization'] = `Bearer ${authKeyValue.replace(/^Bearer\s+/i, '')}`;
      } else if (authType === 'apikey' && authKeyName && authKeyValue) {
        headers[authKeyName] = authKeyValue;
      }

      const res = await fetch(inboundUrl, {
        method: inboundMethod,
        headers,
      });

      if (!res.ok) {
        throw new Error(`HTTP Error ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      const prettyJson = JSON.stringify(data, null, 2);

      setTestResult({
        success: true,
        message: lang === 'fa' 
          ? `اتصال با موفقیت برقرار شد! داده با موفقیت از سامانه آنلاین واکشی شد (کد پاسخ ${res.status}).`
          : `Connection successful! Fetched payload from online service (HTTP ${res.status}).`,
        sampleData: prettyJson,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown connection error';
      // If CORS or network error, provide informative feedback and fallback
      setTestResult({
        success: false,
        message: lang === 'fa'
          ? `خطا در برقراری ارتباط با سامانه: ${msg} (اگر سامانه محلی یا دارای محدودیت CORS است، نمونه دیتای تستی زیر اعمال شد)`
          : `Connection error: ${msg}. A fallback payload has been generated for demonstration.`,
        sampleData: JSON.stringify({
          source: 'Simulated-Enterprise-Core',
          status: 'CONNECTED',
          endpoint: inboundUrl,
          records: [
            { id: 101, amount: 50000000, currency: 'IRR', action: 'AUTHORIZED' },
            { id: 102, amount: 12000000, currency: 'IRR', action: 'SETTLED' }
          ],
          timestamp: new Date().toISOString()
        }, null, 2)
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Quick preset apply for system integration
  const handleApplyPreset = (type: 'bank' | 'scada' | 'custom') => {
    if (type === 'bank') {
      setSystemType('rest_poll');
      setInboundUrl('https://jsonplaceholder.typicode.com/posts/1');
      setInboundMethod('GET');
      setAuthType('bearer');
      setAuthKeyValue('sec_token_bank_rtgs_9824');
      setTestResult({
        success: true,
        message: lang === 'fa' ? 'قالب سامانه بانکی ست شد.' : 'Banking RTGS preset applied.',
        sampleData: JSON.stringify({
          system: 'CBI_SATNA_INTERBANK',
          batch_id: 'BATCH-2026-9901',
          total_transactions: 12,
          total_amount_irr: 12400000000,
          hash: 'a589cf8291048602b9e110c7e25',
          timestamp: new Date().toISOString(),
        }, null, 2),
      });
    } else if (type === 'scada') {
      setSystemType('mqtt_scada');
      setInboundUrl('https://jsonplaceholder.typicode.com/posts/2');
      setInboundMethod('GET');
      setAuthType('none');
      setTestResult({
        success: true,
        message: lang === 'fa' ? 'قالب سنسورهای صنعتی اسکادا ست شد.' : 'SCADA Telemetry preset applied.',
        sampleData: JSON.stringify({
          plant: 'POWER_SUBSTATION_03',
          telemetry: { frequency: 50.01, active_power_mw: 340.2, temperature_c: 41.5 },
          breaker_status: 'CLOSED_NORMAL',
          timestamp: new Date().toISOString(),
        }, null, 2),
      });
    }
  };

  // Complete and launch workflow
  const handleLaunch = () => {
    let finalVerifiedPayload: string | null = null;
    if (flow === 'system_integration') {
      finalVerifiedPayload = testResult?.sampleData || JSON.stringify({
        system_type: systemType,
        source_url: inboundUrl,
        forward_target: outboundOfflineUrl,
        payload_status: 'AUTO_FORWARDED',
        timestamp: new Date().toISOString()
      }, null, 2);
    }

    const config: WizardConfig = {
      flow,
      inputMode,
      textContent,
      selectedFile,
      encryptEnabled,
      passphrase,
      qrCount: 0,
      shutterFps,
      displayCount,
      errorCorrection,
      systemType,
      inboundUrl,
      inboundMethod,
      inboundHeaders: {},
      authType,
      authKeyName,
      authKeyValue,
      outboundOfflineUrl,
      autoForwardToOffline,
      verifiedPayload: finalVerifiedPayload,
      connectionTested: !!testResult?.success,
    };

    onFinishWizard(config);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4">
      <div className="w-full max-w-3xl rounded-3xl bg-slate-900 border border-slate-700/80 p-5 sm:p-7 shadow-2xl text-slate-200 flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Top Header & Step Progress Bar */}
        <div className="border-b border-slate-800 pb-4 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  {lang === 'fa' ? 'راهنمای گام‌به‌گام راه‌اندازی انتقال داده AirDiode' : 'AirDiode Step-by-Step Setup Wizard'}
                </h2>
                <p className="text-xs text-slate-400">
                  {lang === 'fa'
                    ? 'انتخاب مسیر انتقال (دستی یا خودکار بین سامانه‌ها) و تنظیمات نوری و شاتر دوربین'
                    : 'Choose transfer workflow (Manual file or System integration) and tune camera shutter'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stepper Dots & Labels */}
          <div className="grid grid-cols-4 gap-2 pt-1 text-center">
            {[
              { num: 1, fa: '۱. انتخاب مسیر', en: '1. Choose Path' },
              { num: 2, fa: '۲. داده و سامانه', en: '2. Data / System' },
              { num: 3, fa: '۳. امنیت و شاتر', en: '3. Security & Shutter' },
              { num: 4, fa: '۴. بازبینی و اجرا', en: '4. Ready & Launch' },
            ].map((s) => {
              const isActive = step === s.num;
              const isPast = step > s.num;
              return (
                <div key={s.num} className="flex flex-col items-center">
                  <div
                    className={`w-full h-1.5 rounded-full mb-1 transition-all ${
                      isActive
                        ? 'bg-emerald-400 shadow-[0_0_8px_#10b981]'
                        : isPast
                        ? 'bg-emerald-600'
                        : 'bg-slate-800'
                    }`}
                  />
                  <span className={`text-[11px] font-medium truncate ${isActive ? 'text-emerald-300 font-bold' : isPast ? 'text-slate-300' : 'text-slate-500'}`}>
                    {lang === 'fa' ? s.fa : s.en}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dynamic Step Content Area */}
        <div className="flex-1 overflow-y-auto py-5 pr-1 space-y-4">
          
          {/* STEP 1: Choose Workflow Path */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-xs text-slate-300">
                {lang === 'fa'
                  ? 'لطفاً مشخص نمایید هدف شما از این انتقال چیست:'
                  : 'Please select your desired data transmission pathway:'}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Option 1: Manual File / Text */}
                <div
                  onClick={() => setFlow('manual_file')}
                  className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                    flow === 'manual_file'
                      ? 'bg-emerald-950/30 border-emerald-500 shadow-lg shadow-emerald-950/40'
                      : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-3">
                      <FileUp className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-bold text-white mb-1.5">
                      {lang === 'fa' ? 'مسیر اول: انتقال دستی فایل یا متن' : 'Option 1: Manual File / Text Transfer'}
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {lang === 'fa'
                        ? 'انتقال موردی یک فایل (PDF، فشرده ZIP، تصویر، داده یا متن دلخواه) از سیستم مبدا به سیستم مقصد از طریق تولید فریم‌های کیوآرکد و اسکن با وب‌کم.'
                        : 'Select or drag any file or custom text payload to packetize into animated QR codes for one-off manual transmission.'}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-medium">
                    <span className="text-emerald-400 flex items-center gap-1 font-mono">
                      <CheckCircle2 className={`w-4 h-4 ${flow === 'manual_file' ? 'opacity-100' : 'opacity-0'}`} />
                      {flow === 'manual_file' ? (lang === 'fa' ? 'انتخاب شده' : 'Selected') : ''}
                    </span>
                    <span className="text-slate-400">{lang === 'fa' ? 'ساده و مستقل' : 'Standalone'}</span>
                  </div>
                </div>

                {/* Option 2: System Integration Hub */}
                <div
                  onClick={() => setFlow('system_integration')}
                  className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                    flow === 'system_integration'
                      ? 'bg-cyan-950/30 border-cyan-500 shadow-lg shadow-cyan-950/40'
                      : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 mb-3">
                      <Layers className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-bold text-white mb-1.5">
                      {lang === 'fa' ? 'مسیر دوم: اتصال سامانه به سامانه (خودکار)' : 'Option 2: System-to-System Air-Bridge'}
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {lang === 'fa'
                        ? 'اتصال سامانه آنلاین مبدا (API، وب‌سرویس، اتوماسیون یا وب‌هوک) به فرستنده نوری، و سپس تحویل خودکار داده‌ها در سیستم مقصد به سامانه آفلاین محلی.'
                        : 'Connect an online REST/Webhook system to the optical transmitter, scan with camera, and auto-dispatch to your local offline backend database.'}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-medium">
                    <span className="text-cyan-400 flex items-center gap-1 font-mono">
                      <CheckCircle2 className={`w-4 h-4 ${flow === 'system_integration' ? 'opacity-100' : 'opacity-0'}`} />
                      {flow === 'system_integration' ? (lang === 'fa' ? 'انتخاب شده' : 'Selected') : ''}
                    </span>
                    <span className="text-slate-400">{lang === 'fa' ? 'اتوماسیون سازمانی' : 'Enterprise Bridge'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Data Configuration depending on Flow */}
          {step === 2 && flow === 'manual_file' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">
                  {lang === 'fa' ? 'نوع ورودی داده برای انتقال دستی:' : 'Select manual input format:'}
                </span>
                <div className="flex items-center p-1 rounded-lg bg-slate-800 text-xs">
                  <button
                    onClick={() => setInputMode('file')}
                    className={`px-3 py-1 rounded transition cursor-pointer ${inputMode === 'file' ? 'bg-emerald-600 text-white font-medium' : 'text-slate-400'}`}
                  >
                    {lang === 'fa' ? 'فایل / سند' : 'File Upload'}
                  </button>
                  <button
                    onClick={() => setInputMode('text')}
                    className={`px-3 py-1 rounded transition cursor-pointer ${inputMode === 'text' ? 'bg-emerald-600 text-white font-medium' : 'text-slate-400'}`}
                  >
                    {lang === 'fa' ? 'متن / JSON' : 'Text / JSON'}
                  </button>
                </div>
              </div>

              {inputMode === 'file' ? (
                <div className="space-y-3">
                  <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-2xl cursor-pointer bg-slate-950/60 hover:bg-slate-900/60 transition group">
                    <FileUp className="w-8 h-8 text-slate-400 group-hover:text-emerald-400 mb-2 transition" />
                    <p className="text-xs font-medium text-slate-200">
                      {lang === 'fa' ? 'کلیک کنید یا فایل را اینجا رها کنید' : 'Click to browse or drop file here'}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      PDF, ZIP, DOCX, JSON, PNG, CSV, BIN
                    </p>
                    <input type="file" className="hidden" onChange={handleFileChange} />
                  </label>

                  {selectedFile ? (
                    <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/40 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-emerald-300 block">{selectedFile.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type || 'binary'}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        READY
                      </span>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400">
                      {lang === 'fa' ? 'می‌توانید هر نوع فایلی را برای انتقال آفلاین انتخاب نمایید.' : 'You can select any file for secure air-gapped optical transfer.'}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <textarea
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    rows={6}
                    dir="ltr"
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-500"
                    placeholder="Enter text or JSON data..."
                  />
                  <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                    <span>{textContent.length} {lang === 'fa' ? 'کاراکتر' : 'chars'}</span>
                    <span>~{new TextEncoder().encode(textContent).byteLength} {lang === 'fa' ? 'بایت' : 'bytes'}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: System Integration Configuration */}
          {step === 2 && flow === 'system_integration' && (
            <div className="space-y-4">
              {/* Presets Bar */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">
                  {lang === 'fa' ? 'قالب‌های سریع اتصال سازمانی:' : 'Quick Enterprise Presets:'}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleApplyPreset('bank')}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-emerald-300 border border-slate-700 cursor-pointer"
                  >
                    {lang === 'fa' ? 'سامانه بانکی ساتنا' : 'Banking API'}
                  </button>
                  <button
                    onClick={() => handleApplyPreset('scada')}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-amber-300 border border-slate-700 cursor-pointer"
                  >
                    {lang === 'fa' ? 'اسکادا و سنسورها' : 'SCADA Sensors'}
                  </button>
                </div>
              </div>

              {/* Endpoint Input */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">
                    {lang === 'fa' ? 'آدرس وب‌سرویس سامانه آنلاین (ورودی فرستنده):' : 'Online Source System API Endpoint:'}
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={inboundMethod}
                      onChange={(e) => setInboundMethod(e.target.value as 'GET' | 'POST')}
                      className="rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none"
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                    </select>
                    <input
                      type="text"
                      value={inboundUrl}
                      onChange={(e) => setInboundUrl(e.target.value)}
                      dir="ltr"
                      placeholder="https://api.company.com/v1/export-records"
                      className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                {/* Authentication selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">
                      {lang === 'fa' ? 'روش احراز هویت (Authentication):' : 'Authentication Method:'}
                    </label>
                    <select
                      value={authType}
                      onChange={(e) => setAuthType(e.target.value as any)}
                      className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs text-slate-200"
                    >
                      <option value="none">{lang === 'fa' ? 'بدون احراز هویت (عمومی)' : 'None (Public)'}</option>
                      <option value="bearer">Bearer Token (JWT)</option>
                      <option value="apikey">API Key Header</option>
                    </select>
                  </div>

                  {authType !== 'none' && (
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">
                        {authType === 'bearer' ? 'Token Value:' : 'Header Value:'}
                      </label>
                      <input
                        type="text"
                        value={authKeyValue}
                        onChange={(e) => setAuthKeyValue(e.target.value)}
                        placeholder="eyJh..."
                        dir="ltr"
                        className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs font-mono text-cyan-300 focus:outline-none"
                      />
                    </div>
                  )}
                </div>

                {/* Test Connection Button */}
                <div className="pt-2 flex items-center justify-between border-t border-slate-800">
                  <span className="text-[11px] text-slate-400">
                    {lang === 'fa' ? 'قبل از انتقال، از صحت اتصال مطمئن شوید:' : 'Test connectivity before proceeding:'}
                  </span>
                  <button
                    onClick={handleTestConnection}
                    disabled={isTesting}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold cursor-pointer transition disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                    <span>{isTesting ? (lang === 'fa' ? 'در حال آزمون...' : 'Testing...') : (lang === 'fa' ? 'آزمون اتصال و دریافت نمونه' : 'Test Connection')}</span>
                  </button>
                </div>

                {/* Test Result Display */}
                {testResult && (
                  <div className={`p-3 rounded-xl text-xs space-y-2 font-mono ${testResult.success ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-300' : 'bg-slate-900 border border-amber-500/40 text-amber-300'}`}>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                      <span className="font-semibold">{testResult.message}</span>
                    </div>
                    {testResult.sampleData && (
                      <pre className="p-2.5 rounded-lg bg-black/60 max-h-28 overflow-y-auto text-[10px] text-slate-300" dir="ltr">
                        {testResult.sampleData}
                      </pre>
                    )}
                  </div>
                )}
              </div>

              {/* Destination Offline Ingest Address */}
              <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-800/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Server className="w-4 h-4 text-purple-400" />
                    {lang === 'fa' ? 'آدرس تحویل در سامانه آفلاین مقصد (سیستم دوم):' : 'Destination Offline Ingest Endpoint (System 2):'}
                  </span>
                  <label className="flex items-center gap-1.5 text-xs text-purple-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoForwardToOffline}
                      onChange={(e) => setAutoForwardToOffline(e.target.checked)}
                      className="accent-purple-500"
                    />
                    <span>{lang === 'fa' ? 'ارسال خودکار پس از اسکن' : 'Auto Dispatch'}</span>
                  </label>
                </div>
                <input
                  type="text"
                  value={outboundOfflineUrl}
                  onChange={(e) => setOutboundOfflineUrl(e.target.value)}
                  dir="ltr"
                  placeholder="http://localhost:5000/api/airgap/ingest"
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs font-mono text-purple-300 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
          )}

          {/* STEP 3: Cryptography & Shutter Tuning */}
          {step === 3 && (
            <div className="space-y-5">
              {/* Security & Password */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <Lock className="w-4 h-4 text-emerald-400" />
                    {lang === 'fa' ? 'رمزنگاری AES-256-GCM درجه نظامی' : 'Military-Grade AES-256 Encryption'}
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
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300">
                        {lang === 'fa' ? 'کلید یا پسورد رمزنگاری (مشترک بین دو سیستم):' : 'Pre-shared encryption passphrase:'}
                      </span>
                      <button
                        onClick={() => setPassphrase(generateRandom256BitKey())}
                        className="text-[11px] text-cyan-400 hover:text-cyan-300 font-mono cursor-pointer flex items-center gap-1"
                      >
                        <Key className="w-3 h-3" />
                        <span>{lang === 'fa' ? 'تولید کلید ۲۵۶ بیت تصادفی' : 'Gen 256-bit Key'}</span>
                      </button>
                    </div>

                    <div className="relative">
                      <input
                        type={showPassphrase ? 'text' : 'password'}
                        value={passphrase}
                        onChange={(e) => setPassphrase(e.target.value)}
                        className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2 text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-500"
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
                )}
              </div>

              {/* Shutter Speed & Optical Display Count Tuning */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
                <span className="text-xs font-bold text-white flex items-center gap-2 border-b border-slate-800/80 pb-2.5">
                  <Camera className="w-4 h-4 text-cyan-400" />
                  {lang === 'fa' ? 'تنظیمات شاتر دوربین و تعداد نمایش کیوآرکدها' : 'Camera Shutter & Multi-QR Display Tuning'}
                </span>

                {/* 1. Camera Shutter FPS */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-300 font-semibold">
                      {lang === 'fa' ? 'سرعت شاتر دوربین / نرخ نمایش فریم در ثانیه (FPS):' : 'Camera Shutter Speed / FPS:'}
                    </span>
                    <span className="font-mono text-emerald-400 font-bold bg-slate-900 px-2.5 py-0.5 rounded-lg border border-slate-800">
                      {shutterFps} {lang === 'fa' ? 'فریم در ثانیه' : 'FPS'} ({Math.round(1000 / shutterFps)}ms per QR)
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    step={1}
                    value={shutterFps}
                    onChange={(e) => setShutterFps(parseInt(e.target.value, 10))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                    <span>1 FPS ({lang === 'fa' ? 'بسیار آهسته و پایدار' : 'Ultra Slow'})</span>
                    <span className="text-emerald-400 font-semibold">3 FPS ({lang === 'fa' ? 'بهینه استاندارد وب‌کم' : 'Webcam Sweet Spot'})</span>
                    <span>10 FPS ({lang === 'fa' ? 'شاتر دوربین سریع' : 'High-Speed Shutter'})</span>
                  </div>
                </div>

                {/* 2. Number of QRs to display at once (Single vs Multi-grid) */}
                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1.5">
                    {lang === 'fa' ? 'تعداد نمایش همزمان QR Code روی صفحه:' : 'Simultaneous QR Codes on Screen:'}
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { count: 1, labelFa: 'تک کیوآر (پیش‌فرض بزرگ)', labelEn: '1 QR (Large Single)', descFa: 'بهترین دقت اسکن برای وب‌کم', descEn: 'Best optical clarity' },
                      { count: 2, labelFa: 'دو کیوآر همزمان (دوقلو)', labelEn: '2 QRs (Dual Grid)', descFa: 'افزایش سرعت ۲ برابری', descEn: '2x simultaneous scan' },
                      { count: 4, labelFa: 'چهار کیوآر (ماتریس ۴تایی)', labelEn: '4 QRs (Quad Grid)', descFa: 'حداکثر پهنای باند نوری', descEn: 'Maximum optical bitrate' },
                    ].map((opt) => (
                      <button
                        key={opt.count}
                        type="button"
                        onClick={() => setDisplayCount(opt.count as 1 | 2 | 4)}
                        className={`p-2.5 rounded-xl border text-start transition cursor-pointer ${
                          displayCount === opt.count
                            ? 'bg-cyan-500/20 border-cyan-500/70 text-cyan-300 shadow-md shadow-cyan-950/30'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <span className="text-xs font-bold block">{lang === 'fa' ? opt.labelFa : opt.labelEn}</span>
                        <span className="text-[10px] opacity-75 mt-0.5 block">{lang === 'fa' ? opt.descFa : opt.descEn}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Review and Launch Ready */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-emerald-950/20 border border-emerald-500/40 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {lang === 'fa' ? 'تمامی تنظیمات با موفقیت پیکربندی شد' : 'Configuration Ready for Execution'}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {lang === 'fa'
                        ? 'فرآیند انتقال نوری به همراه جدول ماتریس قطعات و تنظیمات شاتر آماده اجراست.'
                        : 'Optical transmission loop, packet chunk matrix, and shutter rate are tuned.'}
                    </p>
                  </div>
                </div>

                {/* Summary Table */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs font-mono">
                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">{lang === 'fa' ? 'مسیر انتقال:' : 'Workflow:'}</span>
                    <span className="text-emerald-400 font-bold">
                      {flow === 'manual_file' ? (lang === 'fa' ? 'دستی (فایل/متن)' : 'Manual File') : (lang === 'fa' ? 'اتصال سامانه‌ها' : 'System Hub')}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">{lang === 'fa' ? 'سرعت شاتر:' : 'Shutter FPS:'}</span>
                    <span className="text-cyan-400 font-bold">{shutterFps} FPS</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">{lang === 'fa' ? 'تعداد نمایش:' : 'QR Display:'}</span>
                    <span className="text-purple-400 font-bold">
                      {displayCount === 1 ? (lang === 'fa' ? 'تک کیوآر' : 'Single 1x') : `${displayCount} QRs Grid`}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">{lang === 'fa' ? 'رمزنگاری:' : 'Security:'}</span>
                    <span className="text-amber-400 font-bold">{encryptEnabled ? 'AES-256-GCM' : 'PLAINTEXT'}</span>
                  </div>
                </div>

                {flow === 'system_integration' && (
                  <div className="p-2.5 rounded-xl bg-cyan-950/30 border border-cyan-800/40 text-[11px] font-mono text-cyan-300">
                    <div><strong>Source Inbound:</strong> {inboundMethod} {inboundUrl}</div>
                    <div><strong>Destination Offline:</strong> POST {outboundOfflineUrl}</div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Footer Navigation Buttons */}
        <div className="border-t border-slate-800 pt-4 flex items-center justify-between shrink-0">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer transition"
            >
              <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
              <span>{lang === 'fa' ? 'مرحله قبل' : 'Back'}</span>
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold cursor-pointer shadow-lg shadow-emerald-950/40 transition"
            >
              <span>{lang === 'fa' ? 'مرحله بعدی' : 'Next Step'}</span>
              <ArrowRight className="w-4 h-4 rtl:rotate-180" />
            </button>
          ) : (
            <button
              onClick={handleLaunch}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 text-xs font-extrabold cursor-pointer shadow-xl shadow-emerald-500/20 transition transform active:scale-95"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              <span>{lang === 'fa' ? 'شروع فرآیند و نمایش صفحه QR Code ها' : 'Start Transmission & Show QRs'}</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
