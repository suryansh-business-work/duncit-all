import { useFieldArray, useFormContext } from 'react-hook-form';
import { Box, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { FormField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { SOCIAL_LINK_MAX, emptySocialLink } from '../validation/socialLinks';

interface Props {
  name?: string;
}

/**
 * "Other social links" on every lead form: each row is a name the operator
 * chooses ("YouTube", "Facebook page", "Linktree") and its link. The "+" button
 * adds a row; the main Instagram link stays its own field above this list.
 */
export default function SocialLinksField({ name = 'social_links' }: Readonly<Props>) {
  const { t } = useTranslation();
  const { control } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name });

  return (
    <Stack spacing={1}>
      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 0.4 }}>
        {t('crm.forms.otherSocialLinks')}
      </Typography>
      {fields.length === 0 && (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('crm.forms.noOtherSocialLinks')}
        </Typography>
      )}
      {fields.map((field, index) => (
        <Stack
          key={field.id}
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          sx={{ alignItems: { sm: 'flex-start' } }}
          data-testid={`social-link-row-${index}`}
        >
          <Box sx={{ flex: { sm: '0 0 220px' } }}>
            <FormField
              name={`${name}.${index}.name`}
              label={t('crm.forms.socialLinkName')}
              placeholder={t('crm.forms.socialLinkNameHint')}
              size="small"
            />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <FormField
              name={`${name}.${index}.url`}
              label={t('crm.forms.socialLinkUrl')}
              placeholder="https://"
              size="small"
              slotProps={{ htmlInput: { inputMode: 'url' } }}
            />
          </Box>
          <DuncitIconButton
            aria-label={t('crm.forms.removeSocialLink', { vars: { index: index + 1 } })}
            onClick={() => remove(index)}
            sx={{ mt: { sm: 0.25 }, alignSelf: { xs: 'flex-end', sm: 'flex-start' } }}
          >
            <DeleteIcon fontSize="small" />
          </DuncitIconButton>
        </Stack>
      ))}
      <Box>
        <DuncitButton
          size="small"
          startIcon={<AddIcon />}
          onClick={() => append({ ...emptySocialLink })}
          disabled={fields.length >= SOCIAL_LINK_MAX}
        >
          {t('crm.forms.addSocialLink')}
        </DuncitButton>
      </Box>
    </Stack>
  );
}
