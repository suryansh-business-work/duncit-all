import { Controller, useFieldArray, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@apollo/client/react';
import { Alert, Box, Stack, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { UPDATE_MY_PROFILE } from './queries';
import { ProfileAboutValues, profileSchema } from './profileAbout.schema';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  bio: string;
  links: Array<{ label: string; url: string }>;
  onCancel: () => void;
  onSaved: () => void;
}

export default function ProfileAboutEditForm({ bio, links, onCancel, onSaved }: Readonly<Props>) {
  const { t } = useTranslation();
  const [updateProfile, { loading, error }] = useMutation<any>(UPDATE_MY_PROFILE);
  const { control, handleSubmit, watch } = useForm<ProfileAboutValues, any, ProfileAboutValues>({
    resolver: zodResolver(profileSchema) as unknown as Resolver<ProfileAboutValues, any, ProfileAboutValues>,
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
    <form data-testid="profile-about-edit-form" onSubmit={submit}>
      <Stack spacing={2}>
        <Controller
          control={control}
          name="bio"
          render={({ field, fieldState }) => (
            <TextField
              {...field}
              data-testid="profile-about-edit-form-bio"
              fullWidth
              label={t('mweb.profile.profileDescription')}
              multiline
              minRows={3}
              error={!!fieldState.error}
              helperText={fieldState.error?.message}
              slotProps={{ htmlInput: { 'data-testid': 'profile-about-edit-form-bio-input' } }}
            />
          )}
        />
        <Stack spacing={1}>
          <Typography variant="subtitle2">{t('mweb.profile.links')}</Typography>
          {fields.map((item, index) => (
            <Stack
              key={item.id}
              data-testid={`profile-about-edit-form-link-${item.id}`}
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
            >
              <Controller
                control={control}
                name={`profile_links.${index}.label`}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    data-testid={`profile-about-edit-form-link-label-${item.id}`}
                    label={t('mweb.profile.label')}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    slotProps={{
                      htmlInput: { 'data-testid': `profile-about-edit-form-link-label-${item.id}-input` },
                    }}
                  />
                )}
              />
              <Controller
                control={control}
                name={`profile_links.${index}.url`}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    data-testid={`profile-about-edit-form-link-url-${item.id}`}
                    fullWidth
                    label="URL"
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    slotProps={{
                      htmlInput: { 'data-testid': `profile-about-edit-form-link-url-${item.id}-input` },
                    }}
                  />
                )}
              />
              <DuncitIconButton
                data-testid={`profile-about-edit-form-remove-link-${item.id}`}
                aria-label={t('mweb.profile.removeLink')}
                onClick={() => remove(index)}
              >
                <DeleteIcon />
              </DuncitIconButton>
            </Stack>
          ))}
          <Box>
            <DuncitButton
              data-testid="profile-about-edit-form-add-link"
              size="small"
              startIcon={<AddIcon />}
              disabled={linkCount >= 5}
              onClick={() => append({ label: '', url: '' })}
            >
              Add link
            </DuncitButton>
          </Box>
        </Stack>
        {error && (
          <Alert data-testid="profile-about-edit-form-error" severity="error">
            {error.message}
          </Alert>
        )}
        <Stack direction="row" spacing={1} sx={{
          justifyContent: "flex-end"
        }}>
          <DuncitButton data-testid="profile-about-edit-form-cancel" onClick={onCancel} disabled={loading}>
            Cancel
          </DuncitButton>
          <DuncitButton
            data-testid="profile-about-edit-form-save"
            type="submit"
            variant="contained"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save'}
          </DuncitButton>
        </Stack>
      </Stack>
    </form>
  );
}
