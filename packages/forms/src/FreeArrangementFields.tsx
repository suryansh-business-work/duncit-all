import { useState } from 'react';
import { Controller, useWatch, type Control, type FieldValues, type Path } from 'react-hook-form';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormHelperText,
  FormLabel,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from '@mui/material';
import { FREE_DETAILS_LIMITS, FREE_POLICY_KEYS, FREE_REASONS, FREE_REASON_KEY } from '@duncit/utils';

import FreePolicyDialog from './FreePolicyDialog';
import RhfTextField from './RhfTextField';
import type { Translate } from './schemas/translate';

/** `TOut` is whatever the form's resolver transforms the values into — the fields only read and write `T`. */
export interface FreeArrangementFieldsProps<T extends FieldValues, TOut = T> {
  control: Control<T, unknown, TOut>;
  /** Where the form holds the reason, its details and the acceptance (`freeJustificationFields`). */
  names: { reason: Path<T>; details: Path<T>; accepted: Path<T> };
  t: Translate;
  /** Prefixes the test ids, and keeps two forms on one page apart. */
  idPrefix: string;
  disabled?: boolean;
}

/**
 * What a host sees once they pick "Free" for the pod or the venue: Duncit's
 * free policy (with "More details"), why it is free — an initiative, a
 * promotion, an approved campaign or another reason they explain — the warning
 * on misuse, and their acceptance. The rules are `addFreeJustificationIssues`
 * (`@duncit/forms/schemas`); the native app draws its own Tamagui twin.
 */
export default function FreeArrangementFields<T extends FieldValues, TOut = T>({
  control,
  names,
  t,
  idPrefix,
  disabled = false,
}: Readonly<FreeArrangementFieldsProps<T, TOut>>) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const reason = useWatch({ control, name: names.reason });
  const labelId = `${idPrefix}-free-reason-label`;
  return (
    <Stack spacing={2} data-testid={`${idPrefix}-free-arrangement`}>
      <Alert severity="info" data-testid={`${idPrefix}-free-policy`}>
        <AlertTitle>{t(FREE_POLICY_KEYS.title)}</AlertTitle>
        {FREE_POLICY_KEYS.paragraphs.map((key) => (
          <Typography key={key} variant="body2" sx={{ mb: 1 }}>
            {t(key)}
          </Typography>
        ))}
        <Button size="small" onClick={() => setDetailsOpen(true)} data-testid={`${idPrefix}-free-more-details`}>
          {t(FREE_POLICY_KEYS.moreDetails)}
        </Button>
      </Alert>
      <Controller
        control={control}
        name={names.reason}
        render={({ field, fieldState }) => (
          <FormControl error={!!fieldState.error} disabled={disabled} required>
            <FormLabel id={labelId}>{t(FREE_POLICY_KEYS.reasonLabel)}</FormLabel>
            <RadioGroup
              aria-labelledby={labelId}
              name={field.name}
              value={field.value}
              onChange={(event) => field.onChange(event.target.value)}
              onBlur={field.onBlur}
              data-testid={`${idPrefix}-free-reason`}
            >
              {FREE_REASONS.map((value) => (
                <FormControlLabel key={value} value={value} control={<Radio />} label={t(FREE_REASON_KEY[value])} />
              ))}
            </RadioGroup>
            {fieldState.error ? <FormHelperText>{fieldState.error.message}</FormHelperText> : null}
          </FormControl>
        )}
      />
      {reason === 'OTHER' ? (
        <RhfTextField
          control={control}
          name={names.details}
          label={t(FREE_POLICY_KEYS.detailsLabel)}
          hint={t(FREE_POLICY_KEYS.detailsHelp, { vars: { max: FREE_DETAILS_LIMITS.max } })}
          required
          disabled={disabled}
          multiline
          minRows={2}
          data-testid={`${idPrefix}-free-details`}
          slotProps={{ htmlInput: { maxLength: FREE_DETAILS_LIMITS.max } }}
        />
      ) : null}
      <Alert severity="warning" data-testid={`${idPrefix}-free-warning`}>
        {t(FREE_POLICY_KEYS.warning)}
      </Alert>
      <Controller
        control={control}
        name={names.accepted}
        render={({ field, fieldState }) => (
          <Box>
            <FormControlLabel
              disabled={disabled}
              control={
                <Checkbox
                  checked={field.value === true}
                  onChange={(event) => field.onChange(event.target.checked)}
                  onBlur={field.onBlur}
                  data-testid={`${idPrefix}-free-accept`}
                />
              }
              label={t(FREE_POLICY_KEYS.accept)}
            />
            {fieldState.error ? <FormHelperText error>{fieldState.error.message}</FormHelperText> : null}
          </Box>
        )}
      />
      <FreePolicyDialog open={detailsOpen} onClose={() => setDetailsOpen(false)} t={t} idPrefix={idPrefix} />
    </Stack>
  );
}
