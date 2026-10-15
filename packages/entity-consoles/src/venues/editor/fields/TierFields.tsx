import type { ReactNode } from 'react';
import { MenuItem, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useFieldArray, type Control } from 'react-hook-form';
import { useTranslation } from '@duncit/shell';
import type { VenueFormValues } from '../types';

/**
 * The venue's two cancellation ladders.
 *
 * They read alike and mean OPPOSITE things: a CHARGE band is what the venue
 * keeps when a booking is cancelled late (tightest window wins), and a REFUND
 * band is what an attendee gets back when Duncit auto-cancels a loss-making pod
 * (widest window wins). Mixing them up is a money bug, so each says which way it
 * reads — while the list chrome they share (the hint, the rows, the remove and
 * the add) is written once as `TierList`.
 */

function TierList({
  hint,
  addLabel,
  onAdd,
  disabled = false,
  addTestId,
  children,
}: Readonly<{ hint: string; addLabel: string; onAdd: () => void; disabled?: boolean; addTestId: string; children: ReactNode }>) {
  return (
    <Stack spacing={1}>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {hint}
      </Typography>
      {children}
      <DuncitButton startIcon={<AddIcon />} sx={{ alignSelf: 'flex-start' }} onClick={onAdd} disabled={disabled} data-testid={addTestId}>
        {addLabel}
      </DuncitButton>
    </Stack>
  );
}

function TierRow({
  onRemove,
  disabled = false,
  children,
}: Readonly<{ onRemove: () => void; disabled?: boolean; children: ReactNode }>) {
  const { t } = useTranslation();
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
      {children}
      <DuncitIconButton
        aria-label={t('directory.venueEditor.removeBand')}
        onClick={onRemove}
        disabled={disabled}
        sx={{ mt: 0.5 }}
      >
        <DeleteOutlineIcon fontSize="small" />
      </DuncitIconButton>
    </Stack>
  );
}

export function ChargeTiersField({ control }: Readonly<{ control: Control<VenueFormValues> }>) {
  const { t } = useTranslation();
  const { fields, append, remove } = useFieldArray({ control, name: 'settings.charge_tiers' });

  return (
    <TierList
      hint={t('directory.venueEditor.chargeTiersHint')}
      addLabel={t('directory.venueEditor.addChargeBand')}
      onAdd={() => append({ hours_before: 24, charge_type: 'PERCENT', value: 0 })}
      addTestId="venue-editor-add-charge-band"
    >
      {fields.map((row, index) => (
        <TierRow key={row.id} onRemove={() => remove(index)}>
          <RhfTextField
            control={control}
            name={`settings.charge_tiers.${index}.hours_before`}
            label={t('directory.venueEditor.withinHours')}
            size="small"
            type="number"
          />
          <RhfTextField
            control={control}
            name={`settings.charge_tiers.${index}.charge_type`}
            label={t('directory.venueEditor.chargeType')}
            size="small"
            select
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="PERCENT">{t('directory.venueEditor.chargePercent')}</MenuItem>
            <MenuItem value="AMOUNT">{t('directory.venueEditor.chargeAmount')}</MenuItem>
          </RhfTextField>
          <RhfTextField
            control={control}
            name={`settings.charge_tiers.${index}.value`}
            label={t('directory.venueEditor.chargeValue')}
            size="small"
            type="number"
            data-testid={`venue-editor-charge-${index}-value`}
          />
        </TierRow>
      ))}
    </TierList>
  );
}

/** `disabled` for a console editor without the finance role: the ladder is
 * Onboarding's / Finance's, and the server refuses anyone else moving it. */
export function RefundTiersField({
  control,
  disabled = false,
}: Readonly<{ control: Control<VenueFormValues>; disabled?: boolean }>) {
  const { t } = useTranslation();
  const { fields, append, remove } = useFieldArray({ control, name: 'settings.refund_tiers' });

  return (
    <TierList
      hint={t('directory.venueEditor.refundTiersHint')}
      addLabel={t('directory.venueEditor.addRefundBand')}
      onAdd={() => append({ hours_before: 24, refund_pct: 100 })}
      addTestId="venue-editor-add-refund-band"
      disabled={disabled}
    >
      {fields.map((row, index) => (
        <TierRow key={row.id} onRemove={() => remove(index)} disabled={disabled}>
          <RhfTextField
            control={control}
            name={`settings.refund_tiers.${index}.hours_before`}
            label={t('directory.venueEditor.moreThanHours')}
            size="small"
            type="number"
            disabled={disabled}
          />
          <RhfTextField
            control={control}
            name={`settings.refund_tiers.${index}.refund_pct`}
            label={t('directory.venueEditor.refundPct')}
            size="small"
            type="number"
            data-testid={`venue-editor-refund-${index}-pct`}
            disabled={disabled}
          />
        </TierRow>
      ))}
    </TierList>
  );
}
