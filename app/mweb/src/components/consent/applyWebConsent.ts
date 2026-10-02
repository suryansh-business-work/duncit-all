import { clearWithdrawnStorage, writeWebConsent, type ConsentChoice } from '@duncit/utils';

/**
 * Save a tracking choice on this device, and delete whatever a withdrawn
 * category had stored here. The one write path for the banner, the Privacy &
 * data screen and the sign-in sync.
 */
export function applyWebConsent(choice: ConsentChoice): void {
  writeWebConsent(choice);
  clearWithdrawnStorage(choice);
}
