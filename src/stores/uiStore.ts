/**
 * Messages of the segmentation page: what it is busy with, short notices and
 * errors
 */

import { create } from 'zustand';

export interface UiState {
  /** Blocks the page while set, e.g. 'Train AI...' */
  busy: string | null;
  /** Short message that goes away by itself */
  notice: { text: string; id: number } | null;
  errorModal: { isOpen: boolean; title: string; message: string };
  /** Image to open once the user answered the questions about the mask */
  leavingTo: string | null;

  setBusy: (busy: string | null) => void;
  /** Show a notice, for duration milliseconds */
  notify: (text: string, duration?: number) => void;
  showErrorModal: (message: string, title?: string) => void;
  hideErrorModal: () => void;
  setLeavingTo: (imageId: string | null) => void;
}

let noticeId = 0;
let noticeTimer: ReturnType<typeof setTimeout> | null = null;

export const useUiStore = create<UiState>((set) => ({
  busy: null,
  notice: null,
  errorModal: { isOpen: false, title: 'Error', message: '' },
  leavingTo: null,

  setBusy: (busy) => set({ busy }),

  notify: (text, duration = 2000) => {
    const id = ++noticeId;
    set({ notice: { text, id } });
    if (noticeTimer) clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => {
      set((state) => (state.notice?.id === id ? { notice: null } : {}));
    }, duration);
  },

  showErrorModal: (message, title = 'Error') => {
    set({ busy: null, errorModal: { isOpen: true, title, message } });
  },

  hideErrorModal: () => set({ errorModal: { isOpen: false, title: 'Error', message: '' } }),
  setLeavingTo: (leavingTo) => set({ leavingTo }),
}));
