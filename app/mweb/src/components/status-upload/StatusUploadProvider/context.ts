import { createContext, useContext } from 'react';
import type { StatusUploadContextValue } from './types';

export const StatusUploadContext = createContext<StatusUploadContextValue | null>(null);

export function useStatusUpload() {
  const context = useContext(StatusUploadContext);
  if (!context) throw new Error('useStatusUpload must be used inside StatusUploadProvider');
  return context;
}
