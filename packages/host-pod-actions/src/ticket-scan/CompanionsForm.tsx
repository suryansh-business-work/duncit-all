import { useMemo } from 'react';
import { useFieldArray, useForm, useWatch, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import {
  companionEntriesToInput,
  duplicateCompanionIndexes,
  type CompanionEntry,
} from '@duncit/utils';
import CompanionRow from './CompanionRow';
import { useCompanionOtp } from './useCompanionOtp';
import {
  buildCompanionsSchema,
  companionsInitialValues,
  type CompanionValues,
} from './companions.form';
import { useHostPodActionsConfig } from '../HostPodActionsProvider';
import type { PodCompanionInput } from '../types';

interface Props {
  /** The pod being checked into — what a companion's code is raised against. */
  podId: string;
  /** The booking these people are coming in on. */
  membershipId: string;
  /** People this ticket admits, including the buyer. */
  seats: number;
  /** How many still need a name and a phone number. */
  required: number;
  /**
   * Numbers this booking has already spoken for — the buyer's own phone and
   * WhatsApp, plus anyone already recorded against the ticket. A companion
   * may not repeat one: a single WhatsApp answering a single code must never
   * tick two seats.
   */
  reserved: readonly string[];
  busy?: boolean;
  onSubmit: (companions: PodCompanionInput[]) => void;
}

/**
 * The rest of the group, collected at the door.
 *
 * A multi-seat ticket is a number until someone writes down who it covers, and
 * the scan is the one moment they are all standing there. The ticket does not
 * check in until every one of them has a name and a phone number — the server
 * enforces the same count, so a half-filled form cannot mark a group present.
 *
 * Each row can also send that number a WhatsApp code, one person at a time.
 * That part is OPTIONAL and deliberately so: a dead phone or a number abroad
 * must never hold a group at the door, so the code records who was actually
 * proved rather than deciding who gets in.
 *
 * Optional, but never loose: one number is one person, so a row repeating
 * another row's number or the buyer's own can neither be verified nor
 * submitted, and a row that HAS answered a code is read-only from then on.
 */
export default function CompanionsForm({
  podId,
  membershipId,
  seats,
  required,
  reserved,
  busy,
  onSubmit,
}: Readonly<Props>) {
  const { labels } = useHostPodActionsConfig();
  const schema = useMemo(() => buildCompanionsSchema(labels), [labels]);
  const { control, handleSubmit, setValue, formState } = useForm<CompanionValues, any, CompanionValues>({
    resolver: zodResolver(schema) as unknown as Resolver<CompanionValues, any, CompanionValues>,
    mode: 'onTouched',
    defaultValues: companionsInitialValues(required),
  });
  const { fields } = useFieldArray({ control, name: 'companions' });
  // An explicit defaultValue rather than a guard at every read: useWatch
  // answers with this until the form has a value, so a row is never missing.
  const entries = useWatch({
    control,
    name: 'companions',
    defaultValue: companionsInitialValues(required).companions,
  }) as CompanionEntry[];
  const otp = useCompanionOtp(podId, membershipId, labels);

  // One number is one person. The rows that repeat one cannot be verified and
  // cannot be submitted — a group of eight is eight phones, and the same
  // WhatsApp standing in for two of them is a seat nobody accounted for.
  const duplicates = duplicateCompanionIndexes(entries, reserved);

  const keepProof = (index: number, challengeId: string) => {
    setValue(`companions.${index}.otp_challenge_id`, challengeId, { shouldDirty: true });
  };

  return (
    <Stack
      component="form"
      spacing={1.5}
      onSubmit={handleSubmit((values) => onSubmit(companionEntriesToInput(values.companions)))}
    >
      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
        {labels.companionsTitle}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {labels.companionsBody(seats, required)}
      </Typography>

      {fields.map((field, index) => (
        <CompanionRow
          key={field.id}
          index={index}
          control={control}
          entry={entries[index]}
          duplicate={duplicates.has(index)}
          labels={labels}
          otp={otp}
          onVerified={keepProof}
        />
      ))}

      {formState.isSubmitted && !formState.isValid && (
        <Alert severity="warning">{labels.companionsIncomplete}</Alert>
      )}

      <DuncitButton type="submit" variant="contained" disabled={busy || duplicates.size > 0}>
        {labels.companionsSubmit}
      </DuncitButton>
    </Stack>
  );
}
