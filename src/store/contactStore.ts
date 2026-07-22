import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BusinessCardFields } from '@/lib/businessCardOcr';

export type BusinessContact = BusinessCardFields & {
  id: string;
  source: 'BUSINESS_CARD_OCR' | 'MANUAL';
  confidence: number;
  imageName?: string;
  createdAt: string;
  updatedAt: string;
};

type ContactState = {
  contacts: BusinessContact[];
  upsertContact: (input: BusinessCardFields & { confidence?: number; imageName?: string }) => string;
  removeContact: (id: string) => void;
};

export const useContactStore = create<ContactState>()(persist((set) => ({
  contacts: [],
  upsertContact: (input) => {
    const now = new Date().toISOString();
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `contact_${Date.now()}`;
    set((state) => {
      const duplicate = state.contacts.find((contact) => (input.email && contact.email.toLowerCase() === input.email.toLowerCase()) || (input.mobile && contact.mobile.replace(/\D/g, '') === input.mobile.replace(/\D/g, '')));
      if (duplicate) return { contacts: state.contacts.map((contact) => contact.id === duplicate.id ? { ...contact, ...input, source: 'BUSINESS_CARD_OCR', confidence: input.confidence || contact.confidence, updatedAt: now } : contact) };
      return { contacts: [{ ...input, id, source: 'BUSINESS_CARD_OCR', confidence: input.confidence || 0, createdAt: now, updatedAt: now }, ...state.contacts] };
    });
    return id;
  },
  removeContact: (id) => set((state) => ({ contacts: state.contacts.filter((contact) => contact.id !== id) })),
}), { name: 'erp-contact-storage-v1' }));
