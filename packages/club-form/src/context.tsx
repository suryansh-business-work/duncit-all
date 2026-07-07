import { createContext, useContext, type ReactNode } from 'react';
import type { ClubFormData } from './types';

const ClubFormDataContext = createContext<ClubFormData | null>(null);

interface ProviderProps {
  value: ClubFormData;
  children: ReactNode;
}

export function ClubFormDataProvider({ value, children }: Readonly<ProviderProps>) {
  return <ClubFormDataContext.Provider value={value}>{children}</ClubFormDataContext.Provider>;
}

/** Access the injected data + behaviours shared with every club-form section. */
export function useClubFormData(): ClubFormData {
  const value = useContext(ClubFormDataContext);
  if (!value) {
    throw new Error('useClubFormData must be used within <ClubForm>');
  }
  return value;
}
