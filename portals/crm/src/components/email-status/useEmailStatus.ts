import { useCallback, useEffect, useSyncExternalStore } from 'react';
import type { CrmEmailVerification } from '../../api/emailVerification.gql';
import { useEmailStatusStore } from './EmailStatusProvider';
import type { EmailStatusEntry } from './emailStatusStore';

const noopSubscribe = () => () => undefined;

/** The latest status of one address, fetched together with every other badge on screen. */
export function useEmailStatus(email: string | null | undefined): {
  entry: EmailStatusEntry | undefined;
  verify: () => Promise<CrmEmailVerification | null>;
} {
  const store = useEmailStatusStore();
  const address = email?.trim() ?? '';
  const entry = useSyncExternalStore(store ? store.subscribe : noopSubscribe, () =>
    store && address ? store.get(address) : undefined
  );
  useEffect(() => {
    if (store && address && !entry) store.request(address);
  }, [store, address, entry]);
  const verify = useCallback(
    () => (store ? store.verify(address) : Promise.resolve(null)),
    [store, address]
  );
  return { entry, verify };
}
