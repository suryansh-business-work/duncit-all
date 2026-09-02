import { useMemo } from 'react';
import { useFieldArray, useForm, useWatch, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { companionEntriesToInput, type CompanionEntry } from '@duncit/utils';
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
 */
export default function CompanionsForm({
  podId,
  membershipId,
  seats,
  required,
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
  const entries = useWatch({ control, name: 'companions' }) as CompanionEntry[];
  const otp = useCompanionOtp(podId, membershipId, labels);

  // A proof names ONE number. Retyping the name or the number makes it a
  // different person, so the challenge it earned no longer describes this row.
  const dropProof = (index: number) => {
    if (entries?.[index]?.otp_challenge_id) {
      setValue(`companions.${index}.otp_challenge_id`, '', { shouldDirty: true });
    }
  };

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
          entry={entries?.[index] ?? field}
          labels={labels}
          otp={otp}
          onEdit={dropProof}
          onVerified={keepProof}
        />
      ))}

      {formState.isSubmitted && !formState.isValid && (
        <Alert severity="warning">{labels.companionsIncomplete}</Alert>
      )}

      <DuncitButton type="submit" variant="contained" disabled={busy}>
        {labels.companionsSubmit}
      </DuncitButton>
    </Stack>
  );
}
