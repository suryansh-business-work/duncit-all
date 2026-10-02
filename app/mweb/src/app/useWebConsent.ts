import { useEffect, useState } from 'react';
import { onWebConsentChange, readWebConsent, type ConsentChoice } from '@duncit/utils';

/**
 * This browser's tracking choice, kept current as the visitor answers the
 * banner or changes it on Privacy & data. Null while they have not answered —
 * which, like a refusal, allows nothing optional (@duncit/utils consent.ts).
 */
export function useWebConsent(): ConsentChoice | null {
  const [choice, setChoice] = useState<ConsentChoice | null>(() => readWebConsent());
  useEffect(() => onWebConsentChange(setChoice), []);
  return choice;
}
