import { Stack } from '@mui/material';
import { PageHeader } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import FormFieldsCard from './FormFieldsCard';
import SlackRoutingCard from './SlackRoutingCard';

/** Everything Support decides about Report a Problem: what the app asks, and
 * who gets told when someone answers. */
export default function ReportProblemSettingsPage() {
  const { t } = useTranslation();
  return (
    <Stack spacing={2}>
      <PageHeader
        title={t('support.problemSettings.title')}
        subtitle={t('support.problemSettings.subtitle')}
      />
      <FormFieldsCard />
      <SlackRoutingCard />
    </Stack>
  );
}
