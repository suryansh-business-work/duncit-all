import { keyframes } from '@mui/material';
import type { WaExtraction } from '../../whatsappQueries';

export const spin = keyframes`from { transform: rotate(0deg); } to { transform: rotate(360deg); }`;

export const STATUS_COLOR = { RUNNING: 'warning', DONE: 'success', FAILED: 'error', CANCELLED: 'default' } as const;
export const STATUS_TITLE = {
  RUNNING: 'Extracting data…',
  DONE: 'Extraction finished',
  FAILED: 'Extraction failed',
  CANCELLED: 'Extraction cancelled',
} as const;

export function barColorFor(status: WaExtraction['status']): 'warning' | 'success' | 'error' | 'inherit' {
  if (status === 'RUNNING') return 'warning';
  if (status === 'DONE') return 'success';
  if (status === 'FAILED') return 'error';
  return 'inherit';
}
