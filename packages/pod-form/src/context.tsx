import { createContext, useContext, type ReactNode } from 'react';
import type { PodFormData } from './types';

const PodFormDataContext = createContext<PodFormData | null>(null);

interface ProviderProps {
  value: PodFormData;
  children: ReactNode;
}

export function PodFormDataProvider({ value, children }: Readonly<ProviderProps>) {
  return <PodFormDataContext.Provider value={value}>{children}</PodFormDataContext.Provider>;
}

/** Access the injected data + behaviours shared with every pod-form section. */
export function usePodFormData(): PodFormData {
  const value = useContext(PodFormDataContext);
  if (!value) {
    throw new Error('usePodFormData must be used within <PodForm>');
  }
  return value;
}
