import React, { useState } from 'react';
import { Language, AuditLog } from '../types/index';
import { 
  History, 
  Download, 
  Trash2, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ShieldCheck, 
  AlertTriangle,
  FileText
} from 'lucide-react';

interface Props {
  lang: Language;
  logs: AuditLog[];
  onClearLogs: () => void;
}

export const TransferHistory: React.FC<Props> = ({
  lang,
  logs,
  onClearLogs,
}) => {
  const [filter, setFilter] = useState<'all' | 'sent' | 'received'>('all');

  const filteredLogs = logs.filter((log) => {
    if (filter === 'all') return true;
    return log.type === filter;
  });

  const exportAsJson = () => {
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `airdiode-audit-logs-${new Date().toISOString().substring(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900/90 via-slate-900/50 to-purple-950/20 p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
              <History className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                {lang === 'fa' ? 'لاگ و گزارش بازرسی امنیتی (Audit Logs)' : 'Security Audit Logs'}
                <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  SHA-256 LEDGER
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                {lang === 'fa'
                  ? 'ثبت تمام انتقالات نوری انجام شده با هش رمزنگاری، وضعیت اصالت و جزئیات بایت‌ها برای بازرسی‌های امنیتی و پدافند غیرعامل.'
                  : 'Immutable record of all optical transmissions, cryptographic hashes, verification integrity, and payload bytes.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {logs.length > 0 && (
              <>
                <button
                  onClick={exportAsJson}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-300 transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-purple-400" />
                  <span>{lang === 'fa' ? 'خروجی گزارش JSON' : 'Export Logs'}</span>
                </button>

                <button
                  onClick={onClearLogs}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/40 border border-slate-700 hover:border-rose-800/60 text-xs text-slate-400 hover:text-rose-300 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{lang === 'fa' ? 'پاکسازی' : 'Clear'}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        {(['all', 'sent', 'received'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              filter === t
                ? 'bg-purple-600 text-white font-semibold'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            {t === 'all'
              ? (lang === 'fa' ? `همه (${logs.length})` : `All (${logs.length})`)
              : t === 'sent'
              ? (lang === 'fa' ? 'ارسال شده (فرستنده)' : 'Transmitted')
              : (lang === 'fa' ? 'دریافت شده (گیرنده)' : 'Received')}
          </button>
        ))}
      </div>

      {/* Table / List */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 backdrop-blur-xs overflow-hidden shadow-lg">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">
              {lang === 'fa' ? 'هنوز تراکنش یا انتقالی ثبت نشده است' : 'No optical transmissions recorded yet'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3 text-start">{lang === 'fa' ? 'نوع' : 'Type'}</th>
                  <th className="p-3 text-start">{lang === 'fa' ? 'شناسه انتقال' : 'Transfer ID'}</th>
                  <th className="p-3 text-start">{lang === 'fa' ? 'نام محتوا / فایل' : 'Payload'}</th>
                  <th className="p-3 text-start">{lang === 'fa' ? 'حجم' : 'Bytes'}</th>
                  <th className="p-3 text-start">SHA-256 Checksum</th>
                  <th className="p-3 text-start">{lang === 'fa' ? 'زمان' : 'Timestamp'}</th>
                  <th className="p-3 text-start">{lang === 'fa' ? 'وضعیت' : 'Status'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredLogs.map((log) => {
                  const isSent = log.type === 'sent';
                  return (
                    <tr key={log.id} className="hover:bg-slate-800/30 transition">
                      <td className="p-3 text-start">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                            isSent
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                          }`}
                        >
                          {isSent ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}
                          {isSent ? (lang === 'fa' ? 'ارسال' : 'TX') : (lang === 'fa' ? 'دریافت' : 'RX')}
                        </span>
                      </td>

                      <td className="p-3 text-start font-semibold text-slate-200">
                        {log.transferId}
                      </td>

                      <td className="p-3 text-start text-slate-400">
                        {log.fileName || 'data.json'}
                      </td>

                      <td className="p-3 text-start text-slate-300">
                        {(log.totalBytes / 1024).toFixed(2)} KB
                      </td>

                      <td className="p-3 text-start text-slate-400 truncate max-w-[140px]" title={log.sha256}>
                        {log.sha256.substring(0, 16)}...
                      </td>

                      <td className="p-3 text-start text-slate-500">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </td>

                      <td className="p-3 text-start">
                        {log.status === 'success' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>VERIFIED</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-400">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>TAMPERED</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
