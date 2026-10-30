import { useForm, useWatch, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stack, Typography } from '@mui/material';
import { z } from 'zod';
import { AVAILABILITY_BUNDLE, flattenCatalogue } from '@duncit/i18n';
import { FreeArrangementFields } from '@duncit/forms';
import { addFreeJustificationIssues, freeJustificationFields, type FreeJustificationValues } from '@duncit/forms/schemas';
import { freeJustificationInput } from '@duncit/utils';
import { defineDemo } from '../../types';

const AVAILABILITY_TEXT = flattenCatalogue(AVAILABILITY_BUNDLE);

/** The shipped English, with {placeholders} filled — what a surface's t() answers. */
const freeT = (key: string, options?: { vars?: Record<string, string | number> }) =>
  Object.entries(options?.vars ?? {}).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    AVAILABILITY_TEXT[key] ?? key,
  );

/** The form of a pod (or venue) that is free, as Create Pod's is once "Free" is picked. */
const schema = z.object(freeJustificationFields).superRefine((values, ctx) => addFreeJustificationIssues(values, ctx, freeT));

/** A real form around the block, validating as the host answers; the input it would send underneath. */
function FreeArrangementDemo({ mock }: Readonly<{ mock: FreeJustificationValues }>) {
  const { control } = useForm<FreeJustificationValues>({
    values: mock,
    mode: 'all',
    resolver: zodResolver(schema) as unknown as Resolver<FreeJustificationValues>,
  });
  const [reason, details, accepted] = useWatch({ control, name: ['free_reason', 'free_details', 'free_accepted'] });
  return (
    <Stack spacing={1.5}>
      <FreeArrangementFields
        control={control}
        names={{ reason: 'free_reason', details: 'free_details', accepted: 'free_accepted' }}
        t={freeT}
        idPrefix="demo"
      />
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {JSON.stringify(freeJustificationInput({ reason, details, accepted }))}
      </Typography>
    </Stack>
  );
}

export const freeArrangementDemo = defineDemo<FreeJustificationValues>({
  id: 'free-arrangement',
  title: 'Free pods and free venues — why it is free, and the policy accepted',
  note:
    'Pick "Other" and the details box appears; untick the acceptance and the block refuses. The line underneath is the free_justification Create Pod would send — null until it is complete. "More details" opens the full policy. mWeb, the Partners pod form and the resubmit dialog draw this block; the native app draws a Tamagui twin over the same schema.',
  mock: { free_reason: 'PROMOTIONAL', free_details: '', free_accepted: true },
  render: (mock) => <FreeArrangementDemo mock={mock} />,
});
