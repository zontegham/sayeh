import React from 'react';
import { 
  AppMode, 
  Language 
} from '../types/index';
import { 
  QrCode, 
  Camera, 
  Layers, 
  Key, 
  History, 
  ShieldCheck, 
  Volume2, 
  VolumeX, 
  Languages, 
  Radio
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { soundFx } from '../utils/audio';

interface Props {
  mode: AppMode;
  setMode: (m: AppMode) => void;
  lang: Language;
  setLang: (l: Language) => void;
  soundEnabled: boolean;
  setSoundEnabled: (s: boolean) => void;
  isOnline: boolean;
}

export const Navbar: React.FC<Props> = ({
  mode,
  setMode,
  lang,
  setLang,
  soundEnabled,
  setSoundEnabled,
  isOnline,
}) => {
  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundFx.setEnabled(next);
  };

  const navItems = [
    {
      id: 'transmitter' as AppMode,
      labelFa: 'فرستنده (تولید QR)',
      labelEn: 'Transmitter (QR Gen)',
      icon: QrCode,
      color: 'text-emerald-400',
      activeBg: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300',
    },
    {
      id: 'receiver' as AppMode,
      labelFa: 'گیرنده (اسکنر دوربین)',
      labelEn: 'Receiver (Scanner)',
      icon: Camera,
      color: 'text-cyan-400',
      activeBg: 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300',
    },
    {
      id: 'integrations' as AppMode,
      labelFa: 'اتصال سامانه‌ها (Hub)',
      labelEn: 'System Integrations',
      icon: Layers,
      color: 'text-blue-400',
      activeBg: 'bg-blue-500/15 border-blue-500/40 text-blue-300',
    },
    {
      id: 'keys' as AppMode,
      labelFa: 'کلیدهای AES-256',
      labelEn: 'Key Vault',
      icon: Key,
      color: 'text-amber-400',
      activeBg: 'bg-amber-500/15 border-amber-500/40 text-amber-300',
    },
    {
      id: 'history' as AppMode,
      labelFa: 'لاگ و تاریخچه',
      labelEn: 'Audit Logs',
      icon: History,
      color: 'text-purple-400',
      activeBg: 'bg-purple-500/15 border-purple-500/40 text-purple-300',
    },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#090d16]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Logo & Identity */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 via-cyan-500/10 to-blue-500/20 border border-emerald-500/40 shadow-lg shadow-emerald-950/50">
              <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-extrabold text-lg tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                  AirDiode
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-emerald-950/80 border border-emerald-500/30 text-emerald-400">
                  <ShieldCheck className="w-3 h-3" />
                  AES-256
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-sans hidden md:block">
                {lang === 'fa' ? 'انتقال امن داده‌های Air-Gap از طریق کیوآرکد و دوربین' : 'Air-Gap Secure Optical Data Transfer System'}
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 overflow-x-auto py-1 px-1 rounded-xl bg-slate-900/80 border border-slate-800">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = mode === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setMode(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer border ${
                    isActive
                      ? item.activeBg
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? item.color : 'text-slate-400'}`} />
                  <span>{lang === 'fa' ? item.labelFa : item.labelEn}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Controls: PWA, Sound, Language */}
          <div className="flex items-center gap-2">
            {/* Air-Gap / Network Status indicator */}
            <div
              className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border ${
                isOnline
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
              }`}
              title={
                isOnline
                  ? (lang === 'fa' ? 'سیستم به اینترنت دسترسی دارد (مناسب برای فرستنده)' : 'Online network detected (Suitable for transmitter)')
                  : (lang === 'fa' ? 'کاملاً ایزوله و بدون اینترنت (Air-Gap واقعی)' : 'Air-Gapped: 100% Offline isolated')
              }
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  isOnline ? 'bg-amber-400' : 'bg-emerald-400 shadow-[0_0_8px_#10b981]'
                }`}
              />
              <span>
                {isOnline
                  ? (lang === 'fa' ? 'شبکه آنلاین' : 'Online Link')
                  : (lang === 'fa' ? 'ایزوله (Air-Gap)' : 'Air-Gapped')}
              </span>
            </div>

            {/* PWA Install Button */}
            <PWAInstallButton lang={lang} />

            {/* Sound Toggle */}
            <button
              onClick={toggleSound}
              className={`p-2 rounded-lg border text-xs transition cursor-pointer ${
                soundEnabled
                  ? 'bg-slate-800 border-slate-700 text-emerald-400 hover:bg-slate-700'
                  : 'bg-slate-800/40 border-slate-800 text-slate-500 hover:text-slate-300'
              }`}
              title={soundEnabled ? (lang === 'fa' ? 'قطع صدا' : 'Mute sound') : (lang === 'fa' ? 'فعال‌سازی صدا' : 'Enable sound')}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Language Switcher */}
            <button
              onClick={() => setLang(lang === 'fa' ? 'en' : 'fa')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-mono transition cursor-pointer"
              title={lang === 'fa' ? 'Switch to English' : 'تغییر زبان به فارسی'}
            >
              <Languages className="w-3.5 h-3.5 text-cyan-400" />
              <span>{lang === 'fa' ? 'EN' : 'فا'}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
