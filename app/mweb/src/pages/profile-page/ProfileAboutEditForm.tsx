import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@apollo/client';
import { Alert, Box, Button, IconButton, Stack, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { UPDATE_MY_PROFILE } from './queries';
import { ProfileAboutValues, profileSchema } from './profileAbout.schema';

interface Props {
  bio: string;
  links: Array<{ label: string; url: string }>;
  onCancel: () => void;
  onSaved: () => void;
}

export default function ProfileAboutEditForm({ bio, links, onCancel, onSaved }: Readonly<Props>) {
  const [updateProfile, { loading, error }] = useMutation(UPDATE_MY_PROFILE);
  const { control, handleSubmit, watch } = useForm<ProfileAboutValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      bio,
      profile_links: links.length ? links : [{ label: '', url: '' }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'profile_links' });
  const linkCount = watch('profile_links').length;

  const submit = handleSubmit(async (values) => {
    const profile_links = values.profile_links.filter((link) => link.label || link.url);
    await updateProfile({ variables: { input: { bio: values.bio || '', profile_links } } });
    onSaved();
  });

  return (
    <form onSubmit={submit}>
      <Stack spacing={2}>
        <Controller
          control={control}
          name="bio"
          render={({ field, fieldState }) => (
            <TextField
              {...field}
              fullWidth
              label="Profile description"
              multiline
              minRows={3}
              error={!!fieldState.error}
              helperText={fieldState.error?.message}
            />
          )}
        />
        <Stack spacing={1}>
          <Typography variant="subtitle2">Links</Typography>
          {fields.map((item, index) => (
            <Stack key={item.id} direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Controller
                control={control}
                name={`profile_links.${index}.label`}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="Label"
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                  />
                )}
              />
              <Controller
                control={control}
                name={`profile_links.${index}.url`}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="URL"
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                  />
                )}
              />
              <IconButton aria-label="remove link" onClick={() => remove(index)}>
                <DeleteIcon />
              </IconButton>
            </Stack>
          ))}
          <Box>
            <Button
              size="small"
              startIcon={<AddIcon />}
              disabled={linkCount >= 5}
              onClick={() => append({ label: '', url: '' })}
            >
              Add link
            </Button>
          </Box>
        </Stack>
        {error && <Alert severity="error">{error.message}</Alert>}
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </Stack>
      </Stack>
    </form>
  );
}
