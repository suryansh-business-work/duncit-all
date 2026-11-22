import { createContext, useContext } from 'react';
import type { CallLead } from './callSession.types';

export interface CallSessionApi {
  /** Open the call window for this lead (or bring the live call forward). */
  openCall: (lead: CallLead) => void;
  /** A call is live right now. */
  live: boolean;
}

export const CallSessionContext = createContext<CallSessionApi | null>(null);

/** The app's call window, from any lead page; null outside <CallSessionProvider> (calling is then unavailable). */
export function useCallWindow(): CallSessionApi | null {
  return useContext(CallSessionContext);
}
