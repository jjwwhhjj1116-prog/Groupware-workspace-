"use client";

import { useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useTranslationStore } from '@/store/translationStore';
import { useTranslation } from '@/lib/localization';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { settings } = useTranslationStore();
  const t = useTranslation(settings?.uiLanguage || 'ko');

  useEffect(() => {
    console.error('Unhandled runtime error:', error);
  }, [error]);

  return (
    <div className="min-h-[400px] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
        <AlertCircle className="w-8 h-8 text-red-600" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('error.title')}</h2>
      <p className="text-gray-500 max-w-md mb-8">
        {t('error.desc')}
      </p>
      
      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => window.location.href = '/'}
          className="px-6 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-primary)]"
        >
          {t('error.btnHome')}
        </button>
        <button
          type="button"
          onClick={() => reset()}
          className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-primary)]"
        >
          <RefreshCw className="w-4 h-4" /> {t('error.btnRetry')}
        </button>
      </div>
      
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-12 p-4 bg-gray-50 rounded-lg max-w-2xl w-full text-left overflow-auto border border-gray-200">
          <p className="text-sm font-mono text-red-600 font-bold mb-2">{error.name}: {error.message}</p>
          <pre className="text-xs font-mono text-gray-600 whitespace-pre-wrap">{error.stack}</pre>
        </div>
      )}
    </div>
  );
}
