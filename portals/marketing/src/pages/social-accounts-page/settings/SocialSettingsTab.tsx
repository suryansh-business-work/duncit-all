import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, LinearProgress, Stack } from '@mui/material';
import { notify } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import { useUserData } from '@duncit/user-context';
import { canPickOwner } from '../../leads-page/roles';
import WebhookUrlCard from '../../settings-page/WebhookUrlCard';
import { SocialSettingsForm } from '../social-settings-form';
import { SOCIAL_SETTINGS, UPDATE_SOCIAL_SETTINGS, type SocialSettings, type SocialSettingsInput } from './settings.queries';

/** Changing Settings is a manager's call — the same roles the server allows (social.conversation.resolver.ts). */
const SETTINGS_MANAGERS = new Set(['SUPER_ADMIN', 'MARKETING_MANAGER']);

/**
 * Marketing → Social → Settings: the module's own settings form, and the
 * webhook address Meta delivers DMs and comments to. Everyone who works the
 * Inbox reads it; only a manager saves it — the server refuses anyone else.
 */
export default function SocialSettingsTab() {
  const { t } = useTranslation();
  const { user } = useUserData();
  const { data, loading, error } = useQuery<{ socialSettings: SocialSettings }>(SOCIAL_SETTINGS, { fetchPolicy: 'cache-and-network' });
  const [saveMut] = useMutation<{ updateSocialSettings: SocialSettings }>(UPDATE_SOCIAL_SETTINGS);
  const settings = data?.socialSettings;
  const canEdit = (user?.roles ?? []).some((role) => SETTINGS_MANAGERS.has(role));

  const save = async (input: SocialSettingsInput) => {
    try {
      await saveMut({ variables: { input }, refetchQueries: ['SocialSettings'], awaitRefetchQueries: true });
      notify(t('marketing.socialSettings.saved'), 'success');
    } catch (err) {
      notify(parseApiError(err), 'error');
    }
  };

  return (
    <Stack spacing={2} data-testid="social-settings-tab">
      {loading && !settings && <LinearProgress />}
      {error && <Alert severity="error">{parseApiError(error)}</Alert>}
      {settings && (
        <SocialSettingsForm
          // Saved values come back through the refetch; a fresh form starts clean from them.
          key={JSON.stringify(settings)}
          settings={settings}
          canEdit={canEdit}
          canPickAssignee={canPickOwner(user?.roles)}
          onSubmit={save}
        />
      )}
      <WebhookUrlCard />
    </Stack>
  );
}
