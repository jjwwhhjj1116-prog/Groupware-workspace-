'use client';
import React from 'react';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';
import { User, Shield, Briefcase, Mail } from 'lucide-react';
import { useTranslationStore } from '@/store/translationStore';
import { getUserDisplayName, useTranslation } from '@/lib/localization';

export default function SettingsPage() {
  const { currentUser } = useAuthStore();
  const { isDarkMode, toggleDarkMode } = useUiStore();
  const { settings } = useTranslationStore();
  const t = useTranslation(settings.uiLanguage);

  if (!currentUser) return <div className="py-10 text-center text-[var(--color-text-sub)]">{t('settings.loginRequired')}</div>;

  return (
    <div className="w-full px-6 mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-500">
      <h1 className="text-2xl font-bold text-[var(--color-text-main)]">{t('settings.title')}</h1>
      
      <div className="bg-[var(--color-surface)] p-6 rounded-xl shadow-sm border space-y-6">
        <h2 className="text-lg font-bold border-b pb-2">{t('settings.section.basicInfo')}</h2>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm text-[var(--color-text-sub)] mb-1 flex items-center"><User className="w-4 h-4 mr-1" />{t('settings.field.name')}</label>
            <div className="font-medium text-[var(--color-text-main)]">{getUserDisplayName(currentUser)}</div>
          </div>
          <div>
            <label className="block text-sm text-[var(--color-text-sub)] mb-1 flex items-center"><Shield className="w-4 h-4 mr-1" />{t('settings.field.role')}</label>
            <div className="font-medium text-[var(--color-text-main)]">{currentUser.role}</div>
          </div>
          <div>
            <label className="block text-sm text-[var(--color-text-sub)] mb-1 flex items-center"><Briefcase className="w-4 h-4 mr-1" />{t('settings.field.department')}</label>
            <div className="font-medium text-[var(--color-text-main)]">{currentUser.departmentName}</div>
          </div>
          <div>
            <label className="block text-sm text-[var(--color-text-sub)] mb-1 flex items-center"><Mail className="w-4 h-4 mr-1" />{t('settings.field.emailMock')}</label>
            <div className="font-medium text-[var(--color-text-main)]">{currentUser.id}@con-cost.com</div>
          </div>
        </div>
      </div>

      <div className="bg-[var(--color-surface)] p-6 rounded-xl shadow-sm border space-y-6">
        <h2 className="text-lg font-bold border-b pb-2">{t('settings.section.appSettings')}</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[var(--color-text-main)]">{t('settings.theme.dark')}</span>
            <input 
              type="checkbox" 
              className="w-5 h-5 cursor-pointer accent-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] rounded"
              checked={isDarkMode}
              onChange={toggleDarkMode}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[var(--color-text-main)]">{t('settings.emailAlerts')}</span>
            <input type="checkbox" className="w-5 h-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] rounded" defaultChecked />
          </div>
          <p className="text-xs text-[var(--color-text-sub)] mt-4">{t('settings.note.backend')}</p>
        </div>
      </div>
    </div>
  );
}
