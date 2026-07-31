import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Paper, Stack, Typography } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { RhfTextField } from '@duncit/forms';
import {
  audienceListSchema,
  emptyAudienceList,
  type AudienceListFormValues,
} from './audience-list.types';

interface Props {
  /** Pre-fills the owner with whoever is signed in; still editable. */
  defaultOwner: string;
  saving: boolean;
  error: string | null;
  onBack: () => void;
  onSubmit: (values: AudienceListFormValues) => void;
}

/** Step 2 — name the audience that step 1 defined. */
export default function AudienceListForm({
  defaultOwner,
  saving,
  error,
  onBack,
  onSubmit,
}: Readonly<Props>) {
  const { control, handleSubmit } = useForm<AudienceListFormValues>({
    resolver: zodResolver(audienceListSchema),
    defaultValues: emptyAudienceList(defaultOwner),
    mode: 'onBlur',
  });

  return (
    <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, maxWidth: 640 }}>
      <Stack spacing={2} component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Stack spacing={0.25}>
          <Typography variant="subtitle1" fontWeight={800}>
            Name this list
          </Typography>
          <Typography variant="body2" color="text.secondary">
            The filters you chose in step 1 are saved with the list, so it keeps matching new
            signups after you save it.
          </Typography>
        </Stack>

        {error && <Alert severity="error">{error}</Alert>}

        <RhfTextField
          control={control}
          name="name"
          label="List name"
          required
          hint="Shown wherever this audience is picked."
        />
        <RhfTextField
          control={control}
          name="description"
          label="List description"
          multiline
          minRows={3}
          hint="What this audience is for."
        />
        <RhfTextField
          control={control}
          name="owner"
          label="List owner"
          required
          hint="Who to ask about this list."
        />

        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button onClick={onBack} disabled={saving}>
            Back
          </Button>
          <Button
            type="submit"
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save list'}
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
