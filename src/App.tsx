/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { AppMode, Language, AuditLog, EncryptedEnvelope } from './types/index';
import { Navbar } from './components/Navbar';
import { Transmitter } from './components/Transmitter';
import { Receiver } from './components/Receiver';
import { IntegrationHub } from './components/IntegrationHub';
import { KeyVault } from './components/KeyVault';
import { TransferHistory } from './components/TransferHistory';
import { OfflinePwaExportModal } from './components/OfflinePwaExportModal';
import { WorkflowWizardModal, WizardConfig } from './components/WorkflowWizardModal';
import { useTheme } from './context/ThemeContext';
import { 
  ShieldCheck, 
  HelpCircle, 
  Radio, 
  WifiOff, 
  Lock, 
  Sparkles,
  ExternalLink 
} from 'lucide-react';

export default function App() {
  const { theme } = useTheme();
  const [lang, setLang] = useState<Language>('fa');
  const [mode, setMode] = useState<AppMode>('transmitter');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  // Step-by-Step Workflow Wizard (Opens automatically upon entry as requested)
  const [isWizardOpen, setIsWizardOpen] = useState<boolean>(true);
  const [wizardConfig, setWizardConfig] = useState<WizardConfig | null>(null);

  // Cross-component state
  const [injectedPayload, setInjectedPayload] = useState<string | null>(null);
  const [activeKey, setActiveKey] = useState<string>('Sayeh#SecureKey2026!');
  const [offlineForwardEndpoint, setOfflineForwardEndpoint] = useState<string>(
    'http://localhost:5000/api/airgap/ingest'
  );
  const [simulatedEnvelope, setSimulatedEnvelope] = useState<EncryptedEnvelope | null>(null);

  // Guide modal state
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);

  // Audit Logs
  const [logs, setLogs] = useState<AuditLog[]>(() => {
    try {
      const saved = localStorage.getItem('sayeh_audit_logs') || localStorage.getItem('airdiode_audit_logs');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync HTML lang and dir attribute
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
  }, [lang]);

  // Save audit logs to localStorage
  const handleAddAuditLog = useCallback((newLog: AuditLog) => {
    setLogs((prev) => {
      const updated = [newLog, ...prev].slice(0, 100);
      try {
        localStorage.setItem('airdiode_audit_logs', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  const handleClearLogs = () => {
    setLogs([]);
    try {
      localStorage.removeItem('airdiode_audit_logs');
    } catch {}
  };

  const handleSendToTransmitter = (payload: string) => {
    setInjectedPayload(payload);
    setMode('transmitter');
  };

  const handleFinishWizard = (config: WizardConfig) => {
    setWizardConfig(config);
    setMode('transmitter');
    if (config.outboundOfflineUrl) {
      setOfflineForwardEndpoint(config.outboundOfflineUrl);
    }
    if (config.passphrase) {
      setActiveKey(config.passphrase);
    }
    setIsWizardOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 dark:bg-[#090d16] text-slate-800 dark:text-slate-100 antialiased selection:bg-emerald-500/30 selection:text-emerald-800 dark:selection:text-emerald-200 transition-colors duration-200">
      {/* Top Navigation */}
      <Navbar
        mode={mode}
        setMode={setMode}
        lang={lang}
        setLang={setLang}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        isOnline={isOnline}
        onOpenWizard={() => setIsWizardOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {mode === 'transmitter' && (
          <Transmitter
            lang={lang}
            onLogAudit={handleAddAuditLog}
            injectedPayload={injectedPayload}
            onClearInjectedPayload={() => setInjectedPayload(null)}
            onSimulateInReceiver={(env) => {
              setSimulatedEnvelope(env);
              setMode('receiver');
            }}
            wizardConfig={wizardConfig}
            onOpenWizard={() => setIsWizardOpen(true)}
          />
        )}

        {mode === 'receiver' && (
          <Receiver
            lang={lang}
            onLogAudit={handleAddAuditLog}
            savedPassphrase={activeKey}
            offlineForwardEndpoint={offlineForwardEndpoint}
            simulatedEnvelope={simulatedEnvelope}
            onClearSimulatedEnvelope={() => setSimulatedEnvelope(null)}
          />
        )}

        {mode === 'integrations' && (
          <IntegrationHub
            lang={lang}
            onSendToTransmitter={handleSendToTransmitter}
            offlineForwardUrl={offlineForwardEndpoint}
            setOfflineForwardUrl={setOfflineForwardEndpoint}
          />
        )}

        {mode === 'keys' && (
          <KeyVault
            lang={lang}
            onSelectKey={(k) => {
              setActiveKey(k);
              setMode('transmitter');
            }}
            activeKeyHex={activeKey}
          />
        )}

        {mode === 'history' && (
          <TransferHistory
            lang={lang}
            logs={logs}
            onClearLogs={handleClearLogs}
          />
        )}
      </main>

      {/* Bottom Status / Footer Bar */}
      <footer className="border-t border-slate-200 dark:border-slate-800/80 bg-white/95 dark:bg-slate-950/80 py-4 px-4 sm:px-6 text-xs text-slate-800 dark:text-slate-200 transition-colors">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 font-mono text-[11px] text-emerald-900 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-500/40 px-2 py-0.5 rounded font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              {lang === 'fa' ? 'سامانه سایه | انتقال نوری ایزوله فعال' : 'SAYEH | OPTICAL DIODE ACTIVE'}
            </span>
            <span className="text-[11px] text-slate-700 dark:text-slate-300 hidden md:inline font-mono">
              | AES-256-GCM + Fountain QR Carousel
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <button
              onClick={() => setIsGuideOpen(true)}
              className="flex items-center gap-1 text-slate-800 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-cyan-300 font-semibold transition cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{lang === 'fa' ? 'راهنمای راه‌اندازی در ویندوز و سیستم آفلاین' : 'Windows & Air-Gap Guide'}</span>
            </button>

            <span className="text-slate-600 dark:text-slate-400 font-mono font-bold">v2.5.0</span>
          </div>
        </div>
      </footer>

      {/* Offline Deployment Guide Modal */}
      <OfflinePwaExportModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        lang={lang}
      />

      {/* Step-by-Step Workflow Onboarding Wizard Modal */}
      <WorkflowWizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        lang={lang}
        onFinishWizard={handleFinishWizard}
      />
    </div>
  );
}
