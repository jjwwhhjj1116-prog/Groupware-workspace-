import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import { Bell, CheckCircle2, AlertCircle, CalendarClock, Briefcase, FileText } from 'lucide-react';
import { Notification } from '@/types/models';
import { useTranslationStore } from '@/store/translationStore';
import { useTranslation } from '@/lib/localization';

export const NotificationPopover = () => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  
  const { currentUser } = useAuthStore();
  const { notifications, markAsRead, markAllAsRead } = useNotificationStore();
  const { settings } = useTranslationStore();
  const t = useTranslation(settings.uiLanguage);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!currentUser) return null;

  const myNotifications = notifications.filter(n => n.userId === currentUser.id);
  const unreadCount = myNotifications.filter(n => !n.isRead).length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'APPROVAL_REQUEST': return <CalendarClock className="w-5 h-5 text-blue-500" />;
      case 'CONFLICT_ALERT': return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'PROJECT_ASSIGNMENT': return <Briefcase className="w-5 h-5 text-purple-500" />;
      default: return <FileText className="w-5 h-5 text-[var(--color-text-sub)]" />;
    }
  };

  const getLink = (n: Notification) => {
    if (n.type === 'APPROVAL_REQUEST') return '/approvals';
    if (n.type === 'CONFLICT_ALERT') return '/conflicts';
    if (n.type === 'PROJECT_ASSIGNMENT') return '/projects/intake';
    return '/notifications';
  };

  return (
    <div className="relative" ref={popoverRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-[var(--color-text-sub)] hover:bg-gray-100 rounded-full relative transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-[var(--color-surface)] rounded-xl shadow-xl border border-[var(--color-border)] z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
          <div className="p-4 border-b flex justify-between items-center bg-[var(--color-bg)]/50">
            <h3 className="font-bold text-[var(--color-text-main)]">{t('notification.title')}</h3>
            {unreadCount > 0 && (
              <button 
                onClick={() => markAllAsRead(currentUser.id)}
                className="text-xs text-blue-600 font-medium hover:underline flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] rounded px-1"
              >
                <CheckCircle2 className="w-3 h-3" /> {t('notification.readAll')}
              </button>
            )}
          </div>
          
          <div className="max-h-96 overflow-y-auto custom-scrollbar">
            {myNotifications.length === 0 ? (
              <div className="p-8 text-center text-[var(--color-text-sub)] text-sm">
                {t('notification.empty')}
              </div>
            ) : (
              myNotifications.map(n => (
                <Link 
                  key={n.id} 
                  href={getLink(n)}
                  onClick={() => {
                    markAsRead(n.id);
                    setIsOpen(false);
                  }}
                  className={`block p-4 border-b last:border-0 hover:bg-[var(--color-bg)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:inset-ring-2 ${!n.isRead ? 'bg-blue-50/30' : ''}`}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getIcon(n.type)}
                    </div>
                    <div>
                      <div className="flex justify-between items-start mb-1">
                        <span className={`text-sm ${!n.isRead ? 'font-bold text-[var(--color-text-main)]' : 'font-medium text-[var(--color-text-main)]'}`}>
                          {n.title}
                        </span>
                        <span className="text-xs text-[var(--color-text-sub)] whitespace-nowrap ml-2">
                          {new Date(n.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className={`text-xs ${!n.isRead ? 'text-[var(--color-text-main)] font-medium' : 'text-[var(--color-text-sub)]'}`}>
                        {n.message}
                      </p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
          
          <div className="p-3 border-t bg-[var(--color-bg)] text-center">
            <Link 
              href="/notifications" 
              onClick={() => setIsOpen(false)}
              className="text-sm font-medium text-blue-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] rounded px-1"
            >
              {t('notification.viewAll')}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
