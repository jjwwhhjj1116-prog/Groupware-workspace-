"use client";

import { useEffect, useState } from 'react';

const messages = {
  ko: {
    title: '시스템 치명적 오류',
    desc: '애플리케이션 최상단에서 심각한 오류가 발생했습니다. 브라우저를 새로고침하거나 관리자에게 문의해주세요.',
    retry: '다시 시도'
  },
  vi: {
    title: 'Lỗi hệ thống nghiêm trọng',
    desc: 'Đã xảy ra lỗi nghiêm trọng ở cấp độ cao nhất của ứng dụng. Vui lòng làm mới trình duyệt hoặc liên hệ với quản trị viên.',
    retry: 'Thử lại'
  }
};

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [lang, setLang] = useState<'ko' | 'vi'>('ko');

  useEffect(() => {
    console.error('Fatal global error:', error);
    try {
      const storage = localStorage.getItem('workspace-translation-storage');
      if (storage) {
        const parsed = JSON.parse(storage);
        if (parsed?.state?.settings?.uiLanguage === 'vi') {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setLang('vi');
        }
      }
    } catch {
      // fallback to ko on error
    }
  }, [error]);

  return (
    <html lang={lang}>
      <head>
        <style>{`button:focus-visible { outline: 2px solid #2563eb; outline-offset: 2px; }`}</style>
      </head>
      <body>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'sans-serif', padding: '2rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#dc2626', marginBottom: '1rem' }}>{messages[lang].title}</h1>
          <p style={{ color: '#4b5563', marginBottom: '2rem' }}>
            {messages[lang].desc}
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{ padding: '0.75rem 1.5rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 'bold' }}
          >
            {messages[lang].retry}
          </button>
        </div>
      </body>
    </html>
  );
}
