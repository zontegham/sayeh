import React, { useState } from 'react';
import { Language, SystemIntegrationConfig } from '../types/index';
import { 
  Layers, 
  Globe, 
  Server, 
  ArrowLeftRight, 
  Send, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Code2, 
  Database, 
  Building2, 
  Cpu, 
  ShieldAlert,
  Play,
  Pause,
  ExternalLink,
  Plus
} from 'lucide-react';

interface Props {
  lang: Language;
  onSendToTransmitter: (payload: string) => void;
  offlineForwardUrl: string;
  setOfflineForwardUrl: (url: string) => void;
}

export const IntegrationHub: React.FC<Props> = ({
  lang,
  onSendToTransmitter,
  offlineForwardUrl,
  setOfflineForwardUrl,
}) => {
  // Preset scenarios to showcase connecting to real enterprise systems
  const presets = [
    {
      id: 'banking',
      nameFa: 'سامانه بانکی و انتقال وجه ساتنا',
      nameEn: 'Interbank Financial Transfer (RTGS)',
      icon: Building2,
      color: 'text-emerald-400',
      payload: JSON.stringify(
        {
          transaction_ref: 'TRX-IRR-' + Math.floor(10000000 + Math.random() * 90000000),
          source_account: 'IR120170000000109988221001',
          destination_account: 'IR540120000000004512983002',
          amount: 850000000,
          currency: 'IRR',
          settlement_type: 'SATNA_INSTANT',
          authorized_by: 'SysAdmin_SecOps',
          security_hash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
          timestamp: new Date().toISOString(),
        },
        null,
        2
      ),
    },
    {
      id: 'classified',
      nameFa: 'اتوماسیون اداری و مکاتبات فوق‌محرمانه',
      nameEn: 'Classified Defense Document Dispatch',
      icon: ShieldAlert,
      color: 'text-rose-400',
      payload: JSON.stringify(
        {
          document_id: 'SEC-DOC-2026-X99',
          classification_level: 'TOP_SECRET',
          subject: 'دستورالعمل امن‌سازی زیرساخت‌های حیاتی در برابر تهدیدات سایبری',
          author: 'مرکز امنیت سایبری و پدافند غیرعامل',
          approved_signatories: ['DIRECTOR_SEC', 'CHIEF_AUDITOR'],
          body_summary: 'انتقال صرفاً از طریق مجرای داده نوری یک‌طرفه (AirDiode Optical Data Diode) مجاز است.',
          checksum_sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          dispatch_date: new Date().toISOString(),
        },
        null,
        2
      ),
    },
    {
      id: 'scada',
      nameFa: 'پایش صنعتی اسکادا، سنسورها و رجیسترهای PLC',
      nameEn: 'Industrial SCADA & PLC Registers',
      icon: Cpu,
      color: 'text-amber-400',
      payload: JSON.stringify(
        {
          station_id: 'SUBSTATION_CENTRAL_04',
          plc_id: 'SIEMENS_S7_1500_SEC',
          grid_frequency_hz: 50.02,
          bus_voltage_kv: 230.4,
          power_factor: 0.98,
          valve_status: [
            { id: 'V1', state: 'OPEN', pressure_psi: 142.3 },
            { id: 'V2', state: 'CLOSED', pressure_psi: 0.0 },
          ],
          telemetry_status: 'NORMAL',
          timestamp: new Date().toISOString(),
        },
        null,
        2
      ),
    },
    {
      id: 'database',
      nameFa: 'پایگاه‌داده سلامت و سوابق بیماران',
      nameEn: 'Healthcare Hospital Patient Record',
      icon: Database,
      color: 'text-cyan-400',
      payload: JSON.stringify(
        {
          record_id: 'MED-PAC-44021',
          national_id: '0019283741',
          department: 'ICU_CARDIO',
          triage_code: 'RED_URGENT',
          diagnostics: {
            heart_rate_bpm: 88,
            oxygen_saturation: 98,
            blood_pressure: '120/80',
          },
          attending_physician: 'Dr. Karimi',
          last_update: new Date().toISOString(),
        },
        null,
        2
      ),
    },
  ];

  // Inbound API polling simulator
  const [inboundUrl, setInboundUrl] = useState<string>('https://jsonplaceholder.typicode.com/posts/1');
  const [inboundMethod, setInboundMethod] = useState<'GET' | 'POST'>('GET');
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [fetchedPayload, setFetchedPayload] = useState<string>('');
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Test Outbound Connection
  const [isTestingOutbound, setIsTestingOutbound] = useState<boolean>(false);
  const [outboundTestResult, setOutboundTestResult] = useState<string | null>(null);

  // Execute Fetch from online system
  const handleFetchOnline = async () => {
    setIsFetching(true);
    setFetchError(null);
    try {
      const res = await fetch(inboundUrl, { method: inboundMethod });
      if (!res.ok) {
        throw new Error(`HTTP Error ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      const formatted = JSON.stringify(data, null, 2);
      setFetchedPayload(formatted);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch online data';
      setFetchError(message);
    } finally {
      setIsFetching(false);
    }
  };

  // Test local offline target
  const handleTestOutbound = async () => {
    setIsTestingOutbound(true);
    setOutboundTestResult(null);
    try {
      const res = await fetch(offlineForwardUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ping: 'test-airgap-ping', timestamp: Date.now() }),
      });
      setOutboundTestResult(
        lang === 'fa'
          ? `پاسخ سامانه محلی دریافت شد (کد ${res.status})`
          : `Connected to local service (HTTP ${res.status})`
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Connection failed';
      setOutboundTestResult(
        lang === 'fa'
          ? `سامانه محلی در دسترس نیست یا CORS فعال نشده: ${message}`
          : `Service unreachable or blocked: ${message}`
      );
    } finally {
      setIsTestingOutbound(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-gradient-to-r dark:from-slate-900/90 dark:via-slate-900/50 dark:to-blue-950/20 p-5 shadow-sm dark:shadow-xl transition-colors">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              {lang === 'fa' ? 'هاب اتصال سامانه‌ها (Integration Hub)' : 'System Integration Hub'}
              <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/40">
                AIR-BRIDGE
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
              {lang === 'fa'
                ? 'پل ارتباطی برای اتصال سامانه‌های آنلاین (بانکی، ERP، سنسورهای اینترنت‌اشیاء، پایگاه‌های داده) به فرستنده نوری و سپس تحویل خودکار به سامانه‌های محلی ایزوله در سیستم مقصد.'
                : 'Connect external online systems via REST/Webhooks to the optical transmitter, then dispatch scanned payloads to local offline enterprise databases.'}
            </p>
          </div>
        </div>
      </div>

      {/* Conceptual Diagram */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-mono transition-colors">
        <div className="flex items-center gap-2 text-cyan-700 dark:text-cyan-300">
          <Globe className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          <span>{lang === 'fa' ? 'سامانه آنلاین (ERP / API)' : 'Online External System'}</span>
        </div>

        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
          <ArrowLeftRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-emerald-700 dark:text-emerald-300">
            {lang === 'fa' ? 'رمزنگاری AES-256 و تولید QR متحرک' : 'AES-256 + Optical Animated QR'}
          </span>
        </div>

        <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
          <Server className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <span>{lang === 'fa' ? 'سامانه آفلاین (مقصد ایزوله)' : 'Offline Air-Gapped Database'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Inbound Online System Ingestion (Cols 6) */}
        <div className="lg:col-span-6 space-y-6">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 backdrop-blur-xs p-5 shadow-sm dark:shadow-lg space-y-4 transition-colors">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-3">
              <span className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                {lang === 'fa' ? '۱. اتصال به سامانه آنلاین (ورودی مبدا)' : '1. Inbound Connection (Online Source)'}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-100 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/30">
                REST / POLLING
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-700 dark:text-slate-300 font-medium block mb-1">
                  {lang === 'fa' ? 'آدرس وب‌سرویس یا API سامانه آنلاین:' : 'Online API / Webhook Endpoint:'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inboundUrl}
                    onChange={(e) => setInboundUrl(e.target.value)}
                    dir="ltr"
                    className="w-full rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-800 px-3 py-2 text-xs font-mono text-cyan-700 dark:text-cyan-300 focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    onClick={handleFetchOnline}
                    disabled={isFetching}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium transition cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                    <span>{isFetching ? '...' : (lang === 'fa' ? 'فراخوانی داده' : 'Fetch')}</span>
                  </button>
                </div>
              </div>

              {fetchError && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{fetchError}</span>
                </div>
              )}

              {fetchedPayload && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{lang === 'fa' ? 'داده‌های دریافتی از سامانه:' : 'Fetched payload:'}</span>
                    <button
                      onClick={() => onSendToTransmitter(fetchedPayload)}
                      className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-medium cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{lang === 'fa' ? 'ارسال به فرستنده کیوآر' : 'Send to Transmitter'}</span>
                    </button>
                  </div>
                  <pre className="max-h-40 overflow-y-auto p-3 rounded-xl bg-slate-950/90 border border-slate-800 font-mono text-xs text-emerald-300" dir="ltr">
                    {fetchedPayload}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* Preset Enterprise Integration Templates */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 backdrop-blur-xs p-5 shadow-lg space-y-4">
            <span className="text-sm font-semibold text-white flex items-center gap-2 border-b border-slate-800/80 pb-3">
              <Code2 className="w-4 h-4 text-emerald-400" />
              {lang === 'fa' ? 'قالب‌های نمونه سامانه‌های سازمانی' : 'Enterprise Preset Scenarios'}
            </span>

            <div className="space-y-2.5">
              {presets.map((preset) => {
                const Icon = preset.icon;
                return (
                  <div
                    key={preset.id}
                    className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 flex items-center justify-between transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <Icon className={`w-4 h-4 ${preset.color}`} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-white">
                          {lang === 'fa' ? preset.nameFa : preset.nameEn}
                        </p>
                        <p className="text-[10px] text-slate-500 font-mono">
                          JSON • Encrypted AirDiode Packet
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => onSendToTransmitter(preset.payload)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-medium transition cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{lang === 'fa' ? 'انتخاب و ارسال' : 'Use & Transmit'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Outbound Offline System Ingestion (Cols 6) */}
        <div className="lg:col-span-6 space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 backdrop-blur-xs p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <span className="text-sm font-semibold text-white flex items-center gap-2">
                <Server className="w-4 h-4 text-purple-400" />
                {lang === 'fa' ? '۲. اتصال به سامانه محلی آفلاین (مقصد نهایی)' : '2. Outbound Connection (Offline Target)'}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/30">
                LOCAL DISPATCH
              </span>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-slate-400 leading-relaxed">
                {lang === 'fa'
                  ? 'هنگامی که داده‌ها توسط دوربین اسکن و رمزگشایی شدند، سیستم می‌تواند آنها را بدون نیاز به ذخیره دستی مستقیماً به آدرس سامانه محلی آفلاین شما (مثلاً پورت لوکال‌هاست یک پایگاه‌داده، ERP داخلی یا وب‌سرویس آفلاین) POST کند.'
                  : 'Once data is scanned and decrypted by the optical camera receiver, AirDiode can automatically dispatch it via HTTP POST directly to your local offline backend or database port.'}
              </p>

              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">
                  {lang === 'fa' ? 'آدرس وب‌سرویس سامانه آفلاین (Localhost / LAN):' : 'Offline Service Ingest URL (Localhost / LAN):'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={offlineForwardUrl}
                    onChange={(e) => setOfflineForwardUrl(e.target.value)}
                    dir="ltr"
                    placeholder="http://localhost:5000/api/airgap/ingest"
                    className="w-full rounded-xl bg-slate-950/80 border border-slate-800 px-3 py-2 text-xs font-mono text-purple-300 focus:outline-none focus:border-purple-500"
                  />
                  <button
                    onClick={handleTestOutbound}
                    disabled={isTestingOutbound}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    <span>{isTestingOutbound ? '...' : (lang === 'fa' ? 'تست اتصال' : 'Test')}</span>
                  </button>
                </div>
              </div>

              {outboundTestResult && (
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono text-slate-300">
                  {outboundTestResult}
                </div>
              )}

              {/* Sample API Code for offline system */}
              <div className="space-y-2 pt-2">
                <span className="text-xs text-slate-400 font-medium">
                  {lang === 'fa' ? 'نمونه کد پایتون/نود برای سامانه آفلاین شما:' : 'Sample receiver endpoint code (Node.js/Python):'}
                </span>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 font-mono text-[11px] text-slate-300 leading-relaxed overflow-x-auto" dir="ltr">
                  <code>
                    {`// Express.js Offline Ingest Endpoint:
app.post('/api/airgap/ingest', (req, res) => {
  const verifiedData = req.body;
  console.log('Received Air-Gap Payload:', verifiedData);
  // Store into local isolated database
  res.status(200).json({ status: 'ACKNOWLEDGED' });
});`}
                  </code>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
