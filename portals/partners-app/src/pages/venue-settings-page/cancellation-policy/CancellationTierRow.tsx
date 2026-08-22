import type { Control } from 'react-hook-form';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { RhfTextField } from '@duncit/forms';
import type { CancellationPolicyValues } from './cancellation-policy.types';

export interface CancellationTierRowProps {
  control: Control<CancellationPolicyValues>;
  index: number;
  disabled: boolean;
  onRemove: () => void;
  t: (key: string) => string;
}

/**
 * One band of the policy: the window it covers, whether the charge is a percent
 * or a flat amount, and how much. Hoisted to its own file so the form stays a
 * list plus its actions (CLAUDE.md rule 9).
 */
export default function CancellationTierRow({
  control,
  index,
  disabled,
  onRemove,
  t,
}: Readonly<CancellationTierRowProps>) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="flex-start">
      <RhfTextField
        control={control}
        name={`tiers.${index}.hours_before`}
        label={t('partners.venueSettingsPage.tierHours')}
        type="number"
        disabled={disabled}
      />
      <RhfTextField
        control={control}
        name={`tiers.${index}.charge_type`}
        label={t('partners.venueSettingsPage.tierChargeType')}
        select
        disabled={disabled}
      >
        <MenuItem value="PERCENT">{t('partners.venueSettingsPage.chargePercent')}</MenuItem>
        <MenuItem value="AMOUNT">{t('partners.venueSettingsPage.chargeAmount')}</MenuItem>
      </RhfTextField>
      <RhfTextField
        control={control}
        name={`tiers.${index}.value`}
        label={t('partners.venueSettingsPage.tierValue')}
        type="number"
        disabled={disabled}
      />
      <Tooltip title={t('partners.venueSettingsPage.removeTier')}>
        <span>
          <IconButton
            aria-label={t('partners.venueSettingsPage.removeTier')}
            onClick={onRemove}
            disabled={disabled}
            sx={{ mt: 1 }}
          >
            <DeleteOutlineIcon />
          </IconButton>
        </span>
      </Tooltip>
    </Stack>
  );
}
