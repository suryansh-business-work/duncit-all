import { FormField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';

/** 4. Website — Instagram and other social profiles live in the Social step (both kinds). */
export default function ProspectPresenceSection() {
  const { t } = useTranslation();
  return <FormField name="website" label={t('crm.common.website')} size="small" placeholder="https://example.com" />;
}
