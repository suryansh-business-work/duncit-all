import { Stack } from '@mui/material';
import { FormField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import SocialLinksField from './SocialLinksField';

/**
 * The Social step every venue, host, creator and community lead form shares:
 * the main Instagram link, then any other social profiles (YouTube, Facebook…).
 */
export default function LeadSocialSection() {
  const { t } = useTranslation();
  return (
    <Stack spacing={1.5}>
      <FormField
        name="instagram_link"
        label={t('crm.common.instagram')}
        size="small"
        placeholder={t('crm.forms.instagramPlaceholder')}
      />
      <SocialLinksField />
    </Stack>
  );
}
