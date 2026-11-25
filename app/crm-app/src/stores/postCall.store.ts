import { create } from 'zustand';
import { CrmTelephony, type PendingPostCall } from 'crm-telephony';

interface PostCallState {
  /** The call that just ended with a CRM contact, waiting for its note. */
  pending: PendingPostCall | null;
  /** Move what the Android call receiver left behind into the app; true when there was a call. */
  collect: () => boolean;
  dismiss: () => void;
}

/**
 * The hand-off from the phone side to the post-call screen. The receiver keeps
 * one record (it survives the app being closed); collecting it here clears it
 * there, so the same call never asks for a note twice.
 */
export const usePostCallStore = create<PostCallState>((set, get) => ({
  pending: null,
  collect: () => {
    const taken = CrmTelephony?.takePendingPostCall() ?? null;
    if (taken) set({ pending: taken });
    return get().pending !== null;
  },
  dismiss: () => set({ pending: null }),
}));
