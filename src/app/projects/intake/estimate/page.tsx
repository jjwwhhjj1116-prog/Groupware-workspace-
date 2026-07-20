'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { LoaderCircle } from 'lucide-react';
import { EstimateSheetWorkbench } from '@/components/intake/EstimateSheetWorkbench';
import { useTranslation } from '@/lib/localization';
import { useTranslationStore } from '@/store/translationStore';

function EstimateEditorPageContent() {
  const searchParams = useSearchParams();
  return <EstimateSheetWorkbench requestId={searchParams.get('requestId') || ''} />;
}

export default function EstimateEditorPage() {
  const { settings } = useTranslationStore();
  const t = useTranslation(settings.uiLanguage);
  return <Suspense fallback={<div role="status" className="flex justify-center p-8"><LoaderCircle aria-hidden="true" className="size-5 animate-spin" /><span className="sr-only">{t('estimateSheet.loading')}</span></div>}><EstimateEditorPageContent /></Suspense>;
}
