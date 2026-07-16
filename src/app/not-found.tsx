"use client";

import Link from 'next/link';
import { Home } from 'lucide-react';
import { useTranslationStore } from '@/store/translationStore';
import { useTranslation } from '@/lib/localization';

export default function NotFound() {
  const { settings } = useTranslationStore();
  const t = useTranslation(settings?.uiLanguage || 'ko');
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] p-6">
      <div className="bg-[var(--color-surface)] p-8 rounded-2xl shadow-xl text-center max-w-md w-full border border-[var(--color-border)]">
        <h1 className="text-6xl font-black text-gray-200 mb-4">404</h1>
        <h2 className="text-2xl font-bold text-[var(--color-text-main)] mb-2">{t('notFound.title')}</h2>
        <p className="text-[var(--color-text-sub)] mb-8 leading-relaxed">
          {t('notFound.desc1')}
          <br />
          {t('notFound.desc2')}
        </p>
        
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all hover:shadow-md hover:shadow-blue-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-primary)]"
        >
          <Home className="w-5 h-5" />
          {t('notFound.btnHome')}
        </Link>
      </div>
    </div>
  );
}
