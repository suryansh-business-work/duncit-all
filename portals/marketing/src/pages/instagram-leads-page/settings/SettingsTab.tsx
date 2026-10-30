import { useMutation } from '@apollo/client/react';
import { Stack } from '@mui/material';
import { notify } from '@duncit/dialogs';
import { SectionCard } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import EnvVariablesTab from '../../../../../tech/src/pages/environment/EnvVariablesTab';
import EnvAccessGate from '../../../../../tech/src/pages/environment/access-gate';
import { UPDATE_IG_LEAD_SETTINGS, type IgLeadSettings } from '../queries';
import { LeadSettingsForm, type LeadSettingsFormValues } from '../lead-settings-form';

const REFRESH = ['IgLeadSettings'];

/**
 * The follow-up schedule and the offer every DM is written around — and the
 * serper.dev key the lead search runs on. The key is the Tech console's own
 * SERPER entry, edited here with the same drawer and behind the same emailed
 * root-admin code; the server lets a marketing manager reach that category
 * and no other.
 */
export default function SettingsTab({ settings }: Readonly<{ settings: IgLeadSettings }>) {
  const { t } = useTranslation();
  const [saveMut] = useMutation<{ updateIgLeadSettings: IgLeadSettings }>(UPDATE_IG_LEAD_SETTINGS, { refetchQueries: REFRESH });

  const save = async (values: LeadSettingsFormValues) => {
    try {
      await saveMut({ variables: { input: values } });
      notify(t('marketing.igLeads.settingsSaved'), 'success');
    } catch (err) {
      notify(parseApiError(err), 'error');
    }
  };

  return (
    <Stack spacing={2} data-testid="ig-leads-settings">
      <SectionCard title={t('marketing.igLeads.settingsTitle')} subtitle={t('marketing.igLeads.settingsSubtitle')}>
        <LeadSettingsForm
          // Saved values come back through the refetch; a fresh form starts clean from them.
          key={`${settings.max_follow_ups}:${settings.follow_up_gap_days}:${settings.daily_send_limit}:${settings.pitch}`}
          settings={settings}
          onSubmit={save}
        />
      </SectionCard>
      <SectionCard title={t('marketing.igLeads.serperTitle')} subtitle={t('marketing.igLeads.serperSubtitle')}>
        <EnvAccessGate>
          <EnvVariablesTab category="SERPER" />
        </EnvAccessGate>
      </SectionCard>
    </Stack>
  );
}
