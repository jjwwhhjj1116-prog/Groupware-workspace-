'use client';
import React, { useState, useEffect } from 'react';
import { useTranslationStore } from '@/store/translationStore';
import { checkHealthMyMemory, checkHealthLibreTranslate } from '@/lib/translation/providers';
import { TranslationProviderHealth } from '@/types/models';
import { Activity, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { useTranslation } from '@/lib/localization';

export default function TranslationSettingsPage() {
  const { settings, updateSettings, translationCache, clearCache } = useTranslationStore();
  const t = useTranslation(settings.uiLanguage);
  const [healthStatus, setHealthStatus] = useState<TranslationProviderHealth | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const handleCheckHealth = async () => {
    setIsChecking(true);
    try {
      let status: TranslationProviderHealth;
      if (settings.activeProvider === 'MYMEMORY_PUBLIC_NO_KEY') {
        status = await checkHealthMyMemory(settings.myMemoryContactEmail);
      } else if (settings.activeProvider === 'LIBRETRANSLATE_PUBLIC_NO_KEY') {
        status = await checkHealthLibreTranslate(settings.libreTranslateEndpoint || '');
      } else {
        status = { provider: settings.activeProvider, status: 'UNAVAILABLE', koToViOk: false, viToKoOk: false, requiresApiKey: false, corsOk: true, lastCheckedAt: new Date().toISOString() };
      }
      setHealthStatus(status);
    } catch (e) {
      console.error(e);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    if (settings.activeProvider !== 'DISABLED' && settings.activeProvider !== 'MANUAL_ONLY') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      handleCheckHealth();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.activeProvider]);

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in">
      <h1 className="text-2xl font-bold text-[var(--color-text-main)]">{t('translationSettings')}</h1>
      
      <div className="bg-[var(--color-surface)] p-6 rounded-xl shadow-sm border border-[var(--color-border)] space-y-6">
        <h2 className="text-lg font-bold border-b pb-2">{t('settings.translation.basicEnv')}</h2>
        
        <div>
          <label className="block text-sm font-bold text-[var(--color-text-sub)] mb-2">{t('settings.translation.uiLanguage')}</label>
          <div className="flex gap-4">
            <button
              onClick={() => updateSettings({ uiLanguage: 'ko' })}
              className={`px-4 py-2 border rounded-md transition-colors ${settings.uiLanguage === 'ko' ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-sm' : 'bg-white hover:bg-gray-50 text-gray-600'} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]`}
            >
              {t('settings.translation.langKorean')}
            </button>
            <button
              onClick={() => updateSettings({ uiLanguage: 'vi' })}
              className={`px-4 py-2 border rounded-md transition-colors ${settings.uiLanguage === 'vi' ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-sm' : 'bg-white hover:bg-gray-50 text-gray-600'} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]`}
            >
              {t('settings.translation.langVietnamese')}
            </button>
          </div>
        </div>

        <div>
          <label className="flex items-center gap-2 cursor-pointer mt-4">
            <input 
              type="checkbox" 
              checked={settings.autoTranslateEnabled}
              onChange={(e) => updateSettings({ autoTranslateEnabled: e.target.checked })}
              className="w-5 h-5 accent-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
            />
            <span className="font-bold text-[var(--color-text-main)]">{t('settings.translation.autoTranslateLabel')}</span>
          </label>
          <p className="text-sm text-[var(--color-text-sub)] mt-1 ml-7">{t('settings.translation.autoTranslateDesc')}</p>
        </div>
      </div>

      <div className="bg-[var(--color-surface)] p-6 rounded-xl shadow-sm border border-[var(--color-border)] space-y-6">
        <div className="flex justify-between items-center border-b pb-2">
          <h2 className="text-lg font-bold">{t('settings.translation.providerTitle')}</h2>
          <span className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded font-bold border border-red-100">{t('settings.translation.noApiKey')}</span>
        </div>

        <div className="bg-orange-50/50 border border-orange-200 p-4 rounded-md text-sm text-orange-800 flex gap-3 shadow-sm">
          <AlertTriangle className="w-5 h-5 shrink-0 text-orange-500" />
          <p className="font-medium leading-relaxed">{t('apiWarning')}</p>
        </div>

        <div>
          <label className="block text-sm font-bold text-[var(--color-text-sub)] mb-2">{t('settings.translation.activeProvider')}</label>
          <select 
            value={settings.activeProvider}
            onChange={(e) => updateSettings({ activeProvider: e.target.value as 'MYMEMORY_PUBLIC_NO_KEY' | 'LIBRETRANSLATE_PUBLIC_NO_KEY' | 'MANUAL_ONLY' | 'DISABLED' })}
            className="w-full md:w-1/2 p-2 border rounded-md bg-[var(--color-bg)] focus:ring-2 focus:ring-blue-100 outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
          >
            <option value="MYMEMORY_PUBLIC_NO_KEY">{t('settings.translation.providerMyMemory')}</option>
            <option value="LIBRETRANSLATE_PUBLIC_NO_KEY">{t('settings.translation.providerLibre')}</option>
            <option value="MANUAL_ONLY">{t('settings.translation.providerManual')}</option>
            <option value="DISABLED">{t('settings.translation.providerDisabled')}</option>
          </select>
        </div>

        {settings.activeProvider === 'MYMEMORY_PUBLIC_NO_KEY' && (
          <div className="animate-in fade-in slide-in-from-top-2">
            <label className="block text-sm font-bold text-[var(--color-text-sub)] mb-2">{t('settings.translation.contactEmail')}</label>
            <input 
              type="email" 
              value={settings.myMemoryContactEmail || ''}
              onChange={(e) => updateSettings({ myMemoryContactEmail: e.target.value })}
              placeholder="user@example.com"
              className="w-full md:w-1/2 p-2 border rounded-md focus:ring-2 focus:ring-blue-100 outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
            />
            <p className="text-xs text-gray-500 mt-1">{t('settings.translation.contactEmailDesc')}</p>
          </div>
        )}

        {settings.activeProvider === 'LIBRETRANSLATE_PUBLIC_NO_KEY' && (
          <div className="animate-in fade-in slide-in-from-top-2">
            <label className="block text-sm font-bold text-[var(--color-text-sub)] mb-2">{t('settings.translation.endpointUrl')}</label>
            <input 
              type="text" 
              value={settings.libreTranslateEndpoint || ''}
              onChange={(e) => updateSettings({ libreTranslateEndpoint: e.target.value })}
              placeholder="https://translate.terraprint.co"
              className="w-full md:w-1/2 p-2 border rounded-md focus:ring-2 focus:ring-blue-100 outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
            />
            <p className="text-xs text-gray-500 mt-1">{t('settings.translation.endpointUrlDesc')}</p>
          </div>
        )}

        {(settings.activeProvider === 'MYMEMORY_PUBLIC_NO_KEY' || settings.activeProvider === 'LIBRETRANSLATE_PUBLIC_NO_KEY') && (
          <div className="bg-[var(--color-bg)]/50 p-4 rounded-md border mt-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold flex items-center gap-2"><Activity className="w-4 h-4 text-blue-500" /> {t('settings.translation.healthCheckTitle')}</h3>
              <button 
                onClick={handleCheckHealth}
                disabled={isChecking}
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] text-xs bg-[var(--color-surface)] border px-3 py-1.5 rounded hover:bg-gray-50 disabled:opacity-50 font-bold shadow-sm transition-colors"
              >
                {isChecking ? t('settings.translation.btnChecking') : t('settings.translation.btnCheckNow')}
              </button>
            </div>
            
            {healthStatus ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm bg-[var(--color-surface)] p-3 rounded border">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">{t('settings.translation.statusLabel')}</span>
                  {healthStatus.status === 'AVAILABLE' ? <span className="text-green-600 flex gap-1 items-center font-bold"><CheckCircle className="w-4 h-4" /> {t('settings.translation.statusNormal')}</span> :
                   healthStatus.status === 'LIMITED' ? <span className="text-orange-500 flex gap-1 items-center font-bold"><AlertTriangle className="w-4 h-4" /> {t('settings.translation.statusLimited')}</span> :
                   <span className="text-red-500 flex gap-1 items-center font-bold"><XCircle className="w-4 h-4" /> {t('settings.translation.statusUnavailable')}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">KO-VI:</span>
                  {healthStatus.koToViOk ? <span className="text-green-600 font-bold">OK</span> : <span className="text-red-500 font-bold">FAIL</span>}
                </div>
                <div className="col-span-2 text-xs text-gray-400 flex items-center justify-end">
                  {t('settings.translation.lastCheckedPrefix')}{new Date(healthStatus.lastCheckedAt).toLocaleString()}
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500">{t('settings.translation.noResult')}</div>
            )}
          </div>
        )}
      </div>

      <div className="bg-[var(--color-surface)] p-6 rounded-xl shadow-sm border border-[var(--color-border)] space-y-4">
        <h2 className="text-lg font-bold border-b pb-2">{t('settings.translation.cacheTitle')}</h2>
        <div className="flex justify-between items-center">
          <p className="text-sm text-[var(--color-text-sub)]">
            {t('settings.translation.cacheCount1')}<strong className="text-[var(--color-text-main)] text-lg">{translationCache.length}</strong>{t('settings.translation.cacheCountSuffix')}
          </p>
          <button 
            onClick={() => {
              if (window.confirm(t('settings.translation.cacheConfirm'))) {
                clearCache();
              }
            }}
            className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-md text-sm font-bold hover:bg-red-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
          >
            {t('settings.translation.btnClearCache')}
          </button>
        </div>
      </div>
    </div>
  );
}
