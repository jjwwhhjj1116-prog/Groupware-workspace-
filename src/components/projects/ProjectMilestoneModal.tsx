'use client';

import { useState } from 'react';
import { CalendarClock, X } from 'lucide-react';
import { Project } from '@/types/models';
import { useProjectStore } from '@/store/projectStore';
import { useAuthStore } from '@/store/authStore';
import { useAuditStore } from '@/store/auditStore';

export function ProjectMilestoneModal({ project, onClose }: { project: Project; onClose: () => void }) {
  const { currentUser } = useAuthStore();
  const [deliveryDate, setDeliveryDate] = useState(project.deliveryDate || project.dueDate || '');
  const [reason, setReason] = useState(project.deliveryDateChangeReason || '');
  const [error, setError] = useState('');

  const save = () => {
    if (!deliveryDate) {
      setError('납품 예정일을 선택해 주세요.');
      return;
    }
    if (project.startDate && deliveryDate < project.startDate) {
      setError('납품 예정일은 착수일보다 빠를 수 없습니다.');
      return;
    }
    const store = useProjectStore.getState();
    store.updateProjectField(project.id, 'deliveryDate', deliveryDate);
    store.updateProjectField(project.id, 'dueDate', deliveryDate);
    store.updateProjectField(project.id, 'deliveryDateStatus', project.deliveryDate && project.deliveryDate !== deliveryDate ? 'CHANGED' : 'SCHEDULED');
    store.updateProjectField(project.id, 'deliveryDateUpdatedAt', new Date().toISOString());
    store.updateProjectField(project.id, 'deliveryDateUpdatedBy', currentUser?.id || 'SYSTEM');
    store.updateProjectField(project.id, 'deliveryDateChangeReason', reason.trim());
    useAuditStore.getState().addLog({
      actorId: currentUser?.id || 'SYSTEM',
      action: 'DELIVERY_DATE_UPDATED',
      entityType: 'PROJECT',
      entityId: project.id,
      message: `Delivery schedule updated to ${deliveryDate}${reason.trim() ? ` (${reason.trim()})` : ''}`,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <section className="w-full max-w-lg overflow-hidden rounded-[24px] border border-white/70 bg-[var(--color-surface)] shadow-[0_30px_90px_rgba(15,23,42,.28)]" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="milestone-title">
        <header className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] bg-[linear-gradient(135deg,#fff7e8,#f4fbf8)] p-5">
          <div className="flex gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-100 text-amber-700 shadow-sm"><CalendarClock className="h-5 w-5" /></span><div><h2 id="milestone-title" className="font-black text-[var(--color-text-main)]">납품 예정일 설정</h2><p className="mt-1 text-xs font-semibold text-[var(--color-text-sub)]">{project.title}</p></div></div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-[var(--color-text-sub)] hover:bg-white" aria-label="닫기"><X className="h-5 w-5" /></button>
        </header>
        <div className="space-y-5 p-5">
          <div className="grid grid-cols-2 gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--cc-surface-2)] p-4 text-xs"><div><span className="font-bold text-[var(--color-text-sub)]">착수일</span><strong className="mt-1 block text-[var(--color-text-main)]">{project.startDate || '미정'}</strong></div><div><span className="font-bold text-[var(--color-text-sub)]">현재 납품일</span><strong className="mt-1 block text-[var(--color-text-main)]">{project.deliveryDate || project.dueDate || '미정'}</strong></div></div>
          <label className="block"><span className="mb-2 block text-xs font-black text-[var(--color-text-main)]">변경할 납품 예정일</span><input type="date" value={deliveryDate} onChange={(event) => { setDeliveryDate(event.target.value); setError(''); }} className="w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-3 text-sm font-bold outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200" /></label>
          <label className="block"><span className="mb-2 block text-xs font-black text-[var(--color-text-main)]">변경 사유</span><textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} placeholder="발주처 협의, 작업 범위 변경 등" className="w-full resize-none rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-3 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200" /></label>
          {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{error}</p>}
        </div>
        <footer className="flex justify-end gap-2 border-t border-[var(--color-border)] bg-[var(--cc-surface-2)] p-4"><button type="button" onClick={onClose} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-xs font-black text-[var(--color-text-sub)]">취소</button><button type="button" onClick={save} className="rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-black text-white shadow-[0_8px_18px_rgba(245,158,11,.25)] hover:bg-amber-600">일정 저장</button></footer>
      </section>
    </div>
  );
}
