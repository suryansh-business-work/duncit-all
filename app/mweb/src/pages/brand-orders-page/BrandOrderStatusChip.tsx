import { Chip } from '@mui/material';
import {
  FULFILMENT_TONE,
  statusLabel,
  TONE_CHIP_COLOR,
  type FulfilmentStatus,
} from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';

/** An order's fulfilment status as a chip — the tone the shared vocabulary
 * names; a status this app does not know yet reads neutral, never blank. */
export default function BrandOrderStatusChip({ status, testId }: Readonly<{ status: string; testId?: string }>) {
  const { t } = useTranslation();
  const tone = FULFILMENT_TONE[status as FulfilmentStatus] ?? 'neutral';
  return <Chip size="small" data-testid={testId} label={statusLabel(status, t)} color={TONE_CHIP_COLOR[tone]} />;
}
