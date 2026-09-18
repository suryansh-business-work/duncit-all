import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router';

import type { AddressValues } from '../../components/address-form';
import type { StoreCheckoutMethod } from '../../graphql/cart';

export interface CheckoutContact {
  name: string;
  email: string;
  phone: string;
}

export interface CheckoutState {
  step: number;
  contact: CheckoutContact | null;
  address: AddressValues | null;
  method: StoreCheckoutMethod;
  useCoins: boolean;
  /** The verified COD phone challenge, and the number it proved. */
  codChallenge: { id: string; phone: string } | null;
}

export const STEPS = ['contact', 'address', 'payment', 'review'] as const;

const INITIAL: CheckoutState = {
  step: 0,
  contact: null,
  address: null,
  method: 'ONLINE',
  useCoins: false,
  codChallenge: null,
};

/** Everything the four checkout steps collect, and the moves between them. */
export function useCheckoutState() {
  const [params] = useSearchParams();
  const [state, setState] = useState<CheckoutState>(INITIAL);
  const patch = useCallback((changes: Partial<CheckoutState>) => setState((s) => ({ ...s, ...changes })), []);
  return {
    state,
    /** Set when checkout came from an Autoship "Order now". */
    autoshipId: params.get('autoship') ?? undefined,
    setContact: (contact: CheckoutContact) => patch({ contact, step: 1 }),
    setAddress: (address: AddressValues) => patch({ address, step: 2 }),
    setMethod: (method: StoreCheckoutMethod) => patch({ method }),
    setUseCoins: (useCoins: boolean) => patch({ useCoins }),
    setCodChallenge: (id: string, phone: string) => patch({ codChallenge: { id, phone } }),
    toReview: () => patch({ step: 3 }),
    goTo: (step: number) => setState((s) => (step < s.step ? { ...s, step } : s)),
  };
}

export type CheckoutControls = ReturnType<typeof useCheckoutState>;
