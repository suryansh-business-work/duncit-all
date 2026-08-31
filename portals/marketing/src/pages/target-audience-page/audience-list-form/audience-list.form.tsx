import { useForm , type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Paper, Stack, Typography } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import OwnerField from './OwnerField';
import {
  audienceListSchema,
  emptyAudienceList,
  type AudienceListFormValues,
  type OwnerOption,
} from './audience-list.types';
import { useTranslation } from '@duncit/app-settings';

/** The page's top action bar submits this by id, so Save can live up there. */
export const AUDIENCE_LIST_FORM_ID = 'audience-list-form';

interface Props {
  /** Everyone who can open this portal; the owner is picked from these. */
  owners: OwnerOption[];
  loadingOwners: boolean;
  /** Pre-selects whoever is signed in, when they can open this portal. */
  defaultOwnerId: string;
  error: string | null;
  onSubmit: (values: AudienceListFormValues) => void;
}

/** Step 2 — name the audience that step 1 defined. */
export default function AudienceListForm({
  owners,
  loadingOwners,
  defaultOwnerId,
  error,
  onSubmit,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { control, handleSubmit } = useForm<AudienceListFormValues, any, AudienceListFormValues>({
    resolver: zodResolver(audienceListSchema) as unknown as Resolver<AudienceListFormValues, any, AudienceListFormValues>,
    defaultValues: emptyAudienceList(defaultOwnerId),
    mode: 'onBlur',
  });

  return (
    <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, maxWidth: 640 }}>
      <Stack
        spacing={2}
        component="form"
        id={AUDIENCE_LIST_FORM_ID}
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <Stack spacing={0.25}>
          <Typography variant="subtitle1" sx={{
            fontWeight: 800
          }}>
            Name this list
          </Typography>
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            The filters you chose in step 1 are saved with the list, so it keeps matching new
            signups after you save it.
          </Typography>
        </Stack>

        {error && <Alert severity="error">{error}</Alert>}

        <RhfTextField
          control={control}
          name="name"
          label={t('marketing.targetAudience.listName')}
          required
          hint="Shown wherever this audience is picked."
        />
        <RhfTextField
          control={control}
          name="description"
          label={t('marketing.targetAudience.listDescription')}
          multiline
          minRows={3}
          hint="What this audience is for."
        />
        <OwnerField control={control} options={owners} loading={loadingOwners} />
      </Stack>
    </Paper>
  );
}
