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
  Radio,
  Sparkles,
  Sun,
  Moon
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { soundFx } from '../utils/audio';
import { useTheme } from '../context/ThemeContext';
import { SayehLogo } from './SayehLogo';

interface Props {
  mode: AppMode;
  setMode: (m: AppMode) => void;
  lang: Language;
  setLang: (l: Language) => void;
  soundEnabled: boolean;
  setSoundEnabled: (s: boolean) => void;
  isOnline: boolean;
  onOpenWizard?: () => void;
}

export const Navbar: React.FC<Props> = ({
  mode,
  setMode,
  lang,
  setLang,
  soundEnabled,
  setSoundEnabled,
  isOnline,
  onOpenWizard,
}) => {
  const { theme, toggleTheme } = useTheme();

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
      color: 'text-emerald-700 dark:text-emerald-400',
      activeBg: 'bg-emerald-100 border-emerald-300 text-emerald-950 font-bold dark:bg-emerald-500/20 dark:border-emerald-500/40 dark:text-emerald-300',
    },
    {
      id: 'receiver' as AppMode,
      labelFa: 'گیرنده (اسکنر دوربین)',
      labelEn: 'Receiver (Scanner)',
      icon: Camera,
      color: 'text-cyan-700 dark:text-cyan-400',
      activeBg: 'bg-cyan-100 border-cyan-300 text-cyan-950 font-bold dark:bg-cyan-500/20 dark:border-cyan-500/40 dark:text-cyan-300',
    },
    {
      id: 'integrations' as AppMode,
      labelFa: 'اتصال سامانه‌ها (Hub)',
      labelEn: 'System Integrations',
      icon: Layers,
      color: 'text-blue-700 dark:text-blue-400',
      activeBg: 'bg-blue-100 border-blue-300 text-blue-950 font-bold dark:bg-blue-500/20 dark:border-blue-500/40 dark:text-blue-300',
    },
    {
      id: 'keys' as AppMode,
      labelFa: 'کلیدهای AES-256',
      labelEn: 'Key Vault',
      icon: Key,
      color: 'text-amber-700 dark:text-amber-400',
      activeBg: 'bg-amber-100 border-amber-300 text-amber-950 font-bold dark:bg-amber-500/20 dark:border-amber-500/40 dark:text-amber-300',
    },
    {
      id: 'history' as AppMode,
      labelFa: 'لاگ و تاریخچه',
      labelEn: 'Audit Logs',
      icon: History,
      color: 'text-purple-700 dark:text-purple-400',
      activeBg: 'bg-purple-100 border-purple-300 text-purple-950 font-bold dark:bg-purple-500/20 dark:border-purple-500/40 dark:text-purple-300',
    },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800/80 bg-white/95 dark:bg-[#090d16]/90 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Logo & Identity with Clean Thumbnail Frame */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-white dark:bg-slate-900 border-2 border-emerald-500/30 shadow-sm p-1.5 transition-colors shrink-0">
              <img 
                src="/sayeh-logo.svg" 
                alt={lang === 'fa' ? 'بندانگشتی لوگوی سامانه سایه' : 'Sayeh Logo Thumbnail'}
                className="w-full h-full object-contain"
              />
              <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-wide text-slate-950 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-emerald-400 dark:via-teal-300 dark:to-cyan-400">
                  {lang === 'fa' ? 'سامانه سایه' : 'Sayeh (سایه)'}
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-500/40 text-emerald-900 dark:text-emerald-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                  AES-256
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium hidden md:block">
                {lang === 'fa' ? 'انتقال امن داده‌های Air-Gap از طریق کیوآرکد و دوربین' : 'Sayeh Air-Gap Secure Optical Data Transfer System'}
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 overflow-x-auto py-1 px-1 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = mode === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setMode(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer border ${
                    isActive
                      ? item.activeBg
                      : 'border-transparent text-slate-800 hover:text-black hover:bg-slate-200/70 dark:text-slate-200 dark:hover:text-white dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? item.color : 'text-slate-600 dark:text-slate-400'}`} />
                  <span>{lang === 'fa' ? item.labelFa : item.labelEn}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Controls: PWA, Sound, Theme, Language */}
          <div className="flex items-center gap-2">
            {/* Air-Gap / Network Status indicator */}
            <div
              className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border font-bold ${
                isOnline
                  ? 'bg-amber-100 border-amber-300 text-amber-900 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-300'
                  : 'bg-emerald-100 border-emerald-300 text-emerald-900 dark:bg-emerald-500/15 dark:border-emerald-500/40 dark:text-emerald-300'
              }`}
              title={
                isOnline
                  ? (lang === 'fa' ? 'سیستم به اینترنت دسترسی دارد (مناسب برای فرستنده)' : 'Online network detected (Suitable for transmitter)')
                  : (lang === 'fa' ? 'کاملاً ایزوله و بدون اینترنت (Air-Gap واقعی)' : 'Air-Gapped: 100% Offline isolated')
              }
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  isOnline ? 'bg-amber-500' : 'bg-emerald-500 shadow-[0_0_8px_#10b981]'
                }`}
              />
              <span>
                {isOnline
                  ? (lang === 'fa' ? 'شبکه آنلاین' : 'Online Link')
                  : (lang === 'fa' ? 'ایزوله (Air-Gap)' : 'Air-Gapped')}
              </span>
            </div>

            {/* Step-by-Step Wizard Launcher Button */}
            {onOpenWizard && (
              <button
                onClick={onOpenWizard}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white text-xs font-bold transition cursor-pointer shadow-md shadow-emerald-950/20 dark:shadow-emerald-950/50"
                title={lang === 'fa' ? 'شروع فرآیند انتقال با راهنمای گام‌به‌گام' : 'Start Transfer with Step-by-Step Wizard'}
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-200 dark:text-cyan-300" />
                <span className="hidden sm:inline text-white font-bold">{lang === 'fa' ? 'راهنمای گام‌به‌گام' : 'Setup Wizard'}</span>
              </button>
            )}

            {/* PWA Install Button */}
            <PWAInstallButton lang={lang} />

            {/* Sound Toggle */}
            <button
              onClick={toggleSound}
              className={`p-2 rounded-lg border text-xs transition cursor-pointer ${
                soundEnabled
                  ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-emerald-800 dark:bg-slate-800 dark:border-slate-700 dark:text-emerald-300 dark:hover:bg-slate-700'
                  : 'bg-slate-100/60 border-slate-300 text-slate-700 dark:bg-slate-800/80 dark:border-slate-700 dark:text-slate-300 dark:hover:text-white'
              }`}
              title={soundEnabled ? (lang === 'fa' ? 'قطع صدا' : 'Mute sound') : (lang === 'fa' ? 'فعال‌سازی صدا' : 'Enable sound')}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Theme Toggle (Dark / Light) */}
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center p-2 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 dark:text-white text-xs transition cursor-pointer"
              title={theme === 'dark' ? (lang === 'fa' ? 'تغییر به تم روشن' : 'Switch to Light theme') : (lang === 'fa' ? 'تغییر به تم تاریک' : 'Switch to Dark theme')}
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-300 hover:rotate-45 transition-transform" />
              ) : (
                <Moon className="w-4 h-4 text-slate-900 hover:-rotate-12 transition-transform" />
              )}
            </button>

            {/* Language Switcher */}
            <button
              onClick={() => setLang(lang === 'fa' ? 'en' : 'fa')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-900 font-bold dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 dark:text-white text-xs font-mono transition cursor-pointer"
              title={lang === 'fa' ? 'Switch to English' : 'تغییر زبان به فارسی'}
            >
              <Languages className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span className="font-bold">{lang === 'fa' ? 'EN' : 'فا'}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
