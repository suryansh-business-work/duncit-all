import type { Control } from 'react-hook-form';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitIconButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import type { CancellationPolicyValues } from '@duncit/forms/schemas';

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
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{
      alignItems: "flex-start"
    }}>
      <RhfTextField
        control={control}
        name={`tiers.${index}.hours_before`}
        label={t('venueSettings.tierHours')}
        type="number"
        disabled={disabled}
      />
      <RhfTextField
        control={control}
        name={`tiers.${index}.charge_type`}
        label={t('venueSettings.tierChargeType')}
        select
        disabled={disabled}
      >
        <MenuItem value="PERCENT">{t('venueSettings.chargePercent')}</MenuItem>
        <MenuItem value="AMOUNT">{t('venueSettings.chargeAmount')}</MenuItem>
      </RhfTextField>
      <RhfTextField
        control={control}
        name={`tiers.${index}.value`}
        label={t('venueSettings.tierValue')}
        type="number"
        disabled={disabled}
      />
      <Tooltip title={t('venueSettings.removeTier')}>
        <span>
          <DuncitIconButton
            aria-label={t('venueSettings.removeTier')}
            onClick={onRemove}
            disabled={disabled}
            sx={{ mt: 1 }}
          >
            <DeleteOutlineIcon />
          </DuncitIconButton>
        </span>
      </Tooltip>
    </Stack>
  );
}
