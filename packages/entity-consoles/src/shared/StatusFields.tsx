import type { ReactNode } from 'react';
import { Alert, FormControlLabel, Grid, MenuItem, Stack, Switch } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';

/**
 * A record's review state and its live switch.
 *
 * Venues and hosts share one lifecycle — DRAFT, SUBMITTED, APPROVED, REJECTED —
 * and one separate is-it-live flag, because REJECTED is a review outcome while
 * `is_active: false` is a switch an admin can flip back. Both editors render
 * them identically, so they are written once (rule 34); the money fields that
 * sit beside the status differ per entity and arrive as `extraFields`.
 *
 * The warning under an off switch is not decoration: `setVenueActive` and
 * `setHostActive` both notify the partner, so it says so before it is saved.
 */
export interface StatusFieldsProps<T extends FieldValues> {
  control: Control<T>;
  statusName: Path<T>;
  activeName: Path<T>;
  statusLabel: string;
  options: readonly { value: string; label: string }[];
  activeLabel: string;
  deactivateWarning: string;
  /** Entity-specific fields shown beside the status (shares, commission). */
  extraFields?: ReactNode;
  /**
   * False for a viewer holding only the console's access role: the values are
   * still shown, because knowing a venue's commission is part of reading the
   * record, but they cannot be moved from here.
   */
  canGovern: boolean;
  /** Says who can change them, so a disabled row is not a dead end. */
  governedByNote: string;
}

export default function StatusFields<T extends FieldValues>({
  control,
  statusName,
  activeName,
  statusLabel,
  options,
  activeLabel,
  deactivateWarning,
  extraFields,
  canGovern,
  governedByNote,
}: Readonly<StatusFieldsProps<T>>) {
  return (
    <Stack spacing={1.5}>
      {!canGovern && (
        <Alert severity="info" variant="outlined">
          {governedByNote}
        </Alert>
      )}
      <Grid container spacing={1.5}>
        <Grid size={{ xs: 12, md: 4 }}>
          <RhfTextField
            control={control}
            name={statusName}
            label={statusLabel}
            size="small"
            select
            disabled={!canGovern}
          >
            {options.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </RhfTextField>
        </Grid>
        {extraFields}
      </Grid>

      <Controller
        control={control}
        name={activeName}
        render={({ field }) => (
          <Stack spacing={0.5}>
            <FormControlLabel
              control={
                <Switch checked={!!field.value} onChange={field.onChange} disabled={!canGovern} />
              }
              label={activeLabel}
            />
            {!field.value && canGovern && (
              <Alert severity="warning" variant="outlined">
                {deactivateWarning}
              </Alert>
            )}
          </Stack>
        )}
      />
    </Stack>
  );
}
