import { createContext, useContext } from 'react';
import type { DuncitUser } from '../types';
import type { UserDataContextValue } from './types';

export const UserDataContext = createContext<UserDataContextValue | null>(null);

export function useUserData<T = DuncitUser>(): UserDataContextValue<T> {
  const ctx = useContext(UserDataContext);
  if (!ctx) {
    throw new Error('useUserData must be used inside a <UserProvider>');
  }
  return ctx as UserDataContextValue<T>;
}
