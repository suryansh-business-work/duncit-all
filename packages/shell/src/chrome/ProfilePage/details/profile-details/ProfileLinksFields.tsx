import { useFieldArray, type Control } from 'react-hook-form';
import { Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { PROFILE_LINKS_MAX } from '@duncit/forms/schemas';
import { useTranslation } from '../../../../i18n/useTranslation';
import type { ProfileDetailsValues } from './profile-details.types';

/**
 * Websites and social accounts — up to the server's five, each a label and a
 * URL. Generic label + URL rather than a fixed list of networks, so a new
 * platform never needs a release.
 */
export function ProfileLinksFields({ control }: Readonly<{ control: Control<ProfileDetailsValues> }>) {
  const { t } = useTranslation();
  const { fields, append, remove } = useFieldArray({ control, name: 'profile_links' });

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
        {t('shell.profile.details.linksTitle')}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('shell.profile.details.linksHint', { vars: { max: PROFILE_LINKS_MAX } })}
      </Typography>
      {fields.map((field, index) => (
        <Stack key={field.id} direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: 'flex-start' }}>
          <RhfTextField
            control={control}
            name={`profile_links.${index}.label`}
            label={t('shell.profile.details.linkLabel')}
            placeholder={t('shell.profile.details.linkLabelPlaceholder')}
            size="small"
            sx={{ flex: 1 }}
          />
          <RhfTextField
            control={control}
            name={`profile_links.${index}.url`}
            label={t('shell.profile.details.linkUrl')}
            placeholder={t('shell.profile.details.linkUrlPlaceholder')}
            type="url"
            size="small"
            sx={{ flex: 2 }}
          />
          <DuncitIconButton
            onClick={() => remove(index)}
            aria-label={t('shell.profile.details.removeLink', { vars: { n: index + 1 } })}
            data-testid={`profile-link-remove-${index}`}
            sx={{ mt: 0.5 }}
          >
            <DeleteOutlineIcon fontSize="small" />
          </DuncitIconButton>
        </Stack>
      ))}
      {fields.length < PROFILE_LINKS_MAX && (
        <DuncitButton
          size="small"
          startIcon={<AddIcon />}
          onClick={() => append({ label: '', url: '' })}
          data-testid="profile-link-add"
          sx={{ alignSelf: 'flex-start' }}
        >
          {t('shell.profile.details.addLink')}
        </DuncitButton>
      )}
    </Stack>
  );
}
