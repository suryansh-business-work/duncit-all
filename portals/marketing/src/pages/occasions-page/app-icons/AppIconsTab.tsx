import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, LinearProgress } from '@mui/material';
import { notify } from '@duncit/dialogs';
import { SectionCard } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import { OCCASION_ICONS, SAVE_OCCASION_ICONS, type OccasionIconsData } from './queries';
import { OccasionIconsForm, type OccasionIconsFormProps } from './occasion-icons-form';

const REFRESH = ['MarketingOccasionIcons'];

/**
 * Occasions → App icons: festive windows that swap the native app's icons by
 * date (moved here from Admin → Branding so every festive change is made in
 * one place). Which window is on is decided by the application clock, so a
 * custom test time in Settings previews an upcoming one.
 */
export default function AppIconsTab() {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<OccasionIconsData>(OCCASION_ICONS, { fetchPolicy: 'cache-and-network' });
  const [saveMut] = useMutation(SAVE_OCCASION_ICONS, { refetchQueries: REFRESH, awaitRefetchQueries: true });
  const icons = data?.branding.occasional_icons;

  const save: OccasionIconsFormProps['onSubmit'] = async (input) => {
    try {
      await saveMut({ variables: { input } });
      notify(t('marketing.occasionIcons.saved'), 'success');
    } catch (err) {
      notify(parseApiError(err), 'error');
    }
  };

  return (
    <SectionCard title={t('marketing.occasionIcons.title')} subtitle={t('marketing.occasionIcons.subtitle')}>
      {loading && !icons && <LinearProgress />}
      {error && <Alert severity="error">{parseApiError(error)}</Alert>}
      {icons && (
        // A fresh form for each saved list, so it starts clean from what the server kept.
        <OccasionIconsForm key={JSON.stringify(icons)} icons={icons} onSubmit={save} />
      )}
    </SectionCard>
  );
}
