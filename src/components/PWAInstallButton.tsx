import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Monitor, CheckCircle, HelpCircle } from 'lucide-react';
import { Language } from '../types/index';

interface Props {
  lang: Language;
}

export const PWAInstallButton: React.FC<Props> = ({ lang }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
        <span>{lang === 'fa' ? 'نصب شده (ویندوز/دسکتاپ)' : 'Installed (Desktop)'}</span>
      </div>
    );
  }

  return (
    <>
      {isInstallable ? (
        <button
          onClick={install}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-medium shadow-md shadow-emerald-950/40 transition-all cursor-pointer"
          title={lang === 'fa' ? 'نصب نرم‌افزار روی ویندوز / کامپیوتر' : 'Install App on Windows / Desktop'}
        >
          <Monitor className="w-4 h-4" />
          <span>{lang === 'fa' ? 'نصب نسخه ویندوز' : 'Install Windows App'}</span>
        </button>
      ) : (
        <button
          onClick={() => setShowGuide(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 dark:bg-slate-800/80 dark:hover:bg-slate-700 dark:border-slate-700 dark:text-slate-300 text-xs font-medium transition cursor-pointer"
          title={lang === 'fa' ? 'راهنمای نصب آفلاین در ویندوز' : 'Offline Windows install guide'}
        >
          <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>{lang === 'fa' ? 'نصب دسکتاپ' : 'Desktop Install'}</span>
        </button>
      )}

      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-6 shadow-2xl text-slate-800 dark:text-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Monitor className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {lang === 'fa' ? 'راهنمای اجرای نسخه ویندوزی و آفلاین' : 'Windows & Offline Desktop Guide'}
                </h3>
              </div>
              <button
                onClick={() => setShowGuide(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="text-xs space-y-3 leading-relaxed text-slate-300">
              <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/30">
                <p className="font-semibold text-emerald-300 mb-1">
                  {lang === 'fa' ? '۱. نصب به عنوان اپلیکیشن مستقل در ویندوز:' : '1. Install as Standalone Windows App:'}
                </p>
                <p>
                  {lang === 'fa'
                    ? 'در مرورگر کروم یا مایکروسافت اج، در نوار آدرس روی آیکون نصب (Install) کلیک کنید تا برنامه به صورت پنجره مستقل و بدون مرورگر روی دسکتاپ شما نصب شود.'
                    : 'In Chrome or Edge, click the Install App icon in the address bar to install as a standalone desktop window.'}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700">
                <p className="font-semibold text-cyan-300 mb-1">
                  {lang === 'fa' ? '۲. استفاده در سیستم ایزوله (Air-Gapped PC):' : '2. Running on Air-Gapped Isolated PC:'}
                </p>
                <p>
                  {lang === 'fa'
                    ? 'این برنامه به دلیل استاندارد PWA کاملاً کش شده و بدون هیچ نیازی به اینترنت کار می‌کند. همچنین می‌توانید صفحه را روی فلش‌مموری ذخیره و در سیستم آفلاین اجرا نمایید.'
                    : 'The app is fully offline-capable via Service Worker. You can also save the page to a USB drive and open it on an isolated computer.'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowGuide(false)}
              className="mt-5 w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition cursor-pointer"
            >
              {lang === 'fa' ? 'متوجه شدم' : 'Got it'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
