import { useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, Button, Stack, TextField, Typography } from '@mui/material';
import { useTranslation } from '../../../i18n/useTranslation';

/** Same rule the server enforces on a companion's number (6-15 digits). */
const PHONE = /^\d{6,15}$/;

/**
 * Built per render rather than at module scope so the messages come from the
 * bundle. A module-level schema cannot reach `t`, which is how the first
 * version ended up with two shipped keys nothing rendered — caught by
 * verify-translation-keys, not by tsc.
 */
const buildSchema = (t: (key: string) => string) =>
  z.object({
    companions: z
      .array(
        z.object({
          name: z.string().trim().min(2, t('mweb.hostScan.nameInvalid')).max(120),
          phone_number: z.string().trim().regex(PHONE, t('mweb.hostScan.phoneInvalid')),
        }),
      )
      .min(1),
  });

export type CompanionValues = z.infer<ReturnType<typeof buildSchema>>;

interface Props {
  /** People this ticket admits, including the buyer. */
  seats: number;
  /** How many still need a name and a phone number. */
  required: number;
  busy?: boolean;
  onSubmit: (companions: CompanionValues['companions']) => void;
}

/**
 * The rest of the group, collected at the door.
 *
 * A multi-seat ticket is a number until someone writes down who it covers, and
 * the scan is the one moment they are all standing there. The ticket does not
 * check in until every one of them has a name and a phone number — the server
 * enforces the same count, so a half-filled form cannot mark a group present.
 */
export default function CompanionsForm({ seats, required, busy, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(() => buildSchema(t), [t]);
  const { control, register, handleSubmit, formState } = useForm<CompanionValues>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: {
      companions: Array.from({ length: required }, () => ({ name: '', phone_number: '' })),
    },
  });
  const { fields } = useFieldArray({ control, name: 'companions' });

  return (
    <Stack
      component="form"
      spacing={1.5}
      onSubmit={handleSubmit((values) => onSubmit(values.companions))}
    >
      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
        {t('mweb.hostScan.companionsTitle')}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {t('mweb.hostScan.companionsBody', { vars: { seats, count: required } })}
      </Typography>

      {fields.map((field, index) => (
        <Stack key={field.id} spacing={1}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
            {t('mweb.hostScan.companionsHeading', { vars: { index: index + 1 } })}
          </Typography>
          {/* `required` on both: the ticket cannot check in without them, and
              the asterisk says so before a failed submit rather than after. */}
          <TextField
            size="small"
            required
            label={t('mweb.hostScan.companionName')}
            error={!!formState.errors.companions?.[index]?.name}
            helperText={
              formState.errors.companions?.[index]?.name?.message ?? t('mweb.hostScan.fieldRequired')
            }
            {...register(`companions.${index}.name` as const)}
          />
          <TextField
            size="small"
            required
            label={t('mweb.hostScan.companionPhone')}
            inputMode="numeric"
            error={!!formState.errors.companions?.[index]?.phone_number}
            helperText={
              formState.errors.companions?.[index]?.phone_number?.message ??
              t('mweb.hostScan.fieldRequired')
            }
            {...register(`companions.${index}.phone_number` as const)}
          />
        </Stack>
      ))}

      {formState.isSubmitted && !formState.isValid && (
        <Alert severity="warning">{t('mweb.hostScan.companionsIncomplete')}</Alert>
      )}

      <Button type="submit" variant="contained" disabled={busy}>
        {t('mweb.hostScan.companionsSubmit')}
      </Button>
    </Stack>
  );
}
