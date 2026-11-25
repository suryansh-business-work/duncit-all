import { keyframes } from '@mui/material';
import { waExtractionView } from '@duncit/utils';
import type { WaExtraction } from '../../whatsappQueries';

export const spin = keyframes`from { transform: rotate(0deg); } to { transform: rotate(360deg); }`;

/** The job's title (a copy key) — the shared words the Duncit CRM app shows too. */
export const statusTitleKey = (status: WaExtraction['status']): string => waExtractionView(status).labelKey;

/** The job's chip colour, from the same shared status view. */
export const statusColor = (status: WaExtraction['status']) => waExtractionView(status).tone;

export function barColorFor(status: WaExtraction['status']): 'warning' | 'success' | 'error' | 'inherit' {
  if (status === 'RUNNING') return 'warning';
  if (status === 'DONE') return 'success';
  if (status === 'FAILED') return 'error';
  return 'inherit';
}
