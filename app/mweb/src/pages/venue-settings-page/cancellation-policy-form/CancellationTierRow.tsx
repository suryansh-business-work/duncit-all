import type { Control } from 'react-hook-form';
import { MenuItem, Stack } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitIconButton } from '@duncit/buttons';
import RhfTextField from '../../../forms/components/RhfTextField';
import type { CancellationPolicyValues } from './cancellation-policy.types';
import { useTranslation } from '../../../i18n/useTranslation';

interface Props {
  control: Control<CancellationPolicyValues>;
  index: number;
  disabled: boolean;
  onRemove: () => void;
}

/**
 * One band of the policy: the window it covers, whether the charge is a share
 * of the slot price or a flat amount, and how much. Stacked for a phone —
 * three fields side by side do not fit a 360px screen.
 */
export default function CancellationTierRow({ control, index, disabled, onRemove }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack
      spacing={1}
      sx={{ p: 1.25, borderRadius: '16px', border: 1, borderColor: 'divider', bgcolor: 'background.paper' }}
    >
      <RhfTextField
        control={control}
        name={`tiers.${index}.hours_before`}
        label={t('venueSettings.tierHours')}
        type="number"
        size="small"
        disabled={disabled}
      />
      <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
        <RhfTextField
          control={control}
          name={`tiers.${index}.charge_type`}
          label={t('venueSettings.tierChargeType')}
          select
          size="small"
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
          size="small"
          disabled={disabled}
        />
        <DuncitIconButton
          aria-label={t('venueSettings.removeTier')}
          onClick={onRemove}
          disabled={disabled}
          size="small"
          sx={{ mt: 0.5 }}
        >
          <DeleteOutlineIcon fontSize="small" />
        </DuncitIconButton>
      </Stack>
    </Stack>
  );
}
