'use client';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useSettingStore } from '@/store/settingStore';
import { useTranslationStore } from '@/store/translationStore';
import { useTranslation } from '@/lib/localization';

export const SessionManager = () => {
  const { currentUser, updateLastActivity, logout } = useAuthStore();
  const { settings } = useSettingStore();
  const { settings: translationSettings } = useTranslationStore();
  const t = useTranslation(translationSettings.uiLanguage);
  const sessionTimeoutSetting = settings.find(s => s.key === 'SESSION_TIMEOUT_MINUTES');
  const sessionTimeoutMs = (sessionTimeoutSetting ? Number(sessionTimeoutSetting.value) : 30) * 60 * 1000;

  useEffect(() => {
    if (!currentUser) return;

    // Use a throttle to prevent too many state updates
    let timeoutId: NodeJS.Timeout | null = null;
    const handleActivity = () => {
      if (!timeoutId) {
        updateLastActivity();
        timeoutId = setTimeout(() => {
          timeoutId = null;
        }, 5000); // Throttle updates to once every 5 seconds
      }
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);

    const interval = setInterval(() => {
      const state = useAuthStore.getState();
      if (state.currentUser && Date.now() - state.lastActivity > sessionTimeoutMs) {
        logout();
        alert(t('auth.sessionTimeout'));
      }
    }, 10000); // Check every 10 seconds

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      if (timeoutId) clearTimeout(timeoutId);
      clearInterval(interval);
    };
  }, [currentUser, sessionTimeoutMs, updateLastActivity, logout, t]);

  return null;
};
