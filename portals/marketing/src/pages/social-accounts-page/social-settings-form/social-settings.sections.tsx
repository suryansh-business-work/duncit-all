import { useState } from 'react';
import { useController, type Control } from 'react-hook-form';
import { Grid, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RhfSwitch, RhfTextField } from '@duncit/forms';
import { SectionCard } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import LeadOwnerDialog from '../../leads-page/drawer/LeadOwnerDialog';
import type { SocialSettingsFormValues } from './social-settings.types';

type FormControl = Control<SocialSettingsFormValues, unknown, SocialSettingsFormValues>;

interface SectionProps {
  control: FormControl;
  disabled: boolean;
}

/** How often accounts are read when a webhook is missed, how far back DMs go on connect, and when a token's owner is warned. */
export function SyncSection({ control, disabled }: Readonly<SectionProps>) {
  const { t } = useTranslation();
  const number = (name: 'sync_every_hours' | 'backfill_days' | 'expiry_alert_days', label: string, hint: string) => (
    <Grid size={{ xs: 12, sm: 4 }}>
      <RhfTextField control={control} name={name} label={label} hint={hint} type="number" required disabled={disabled} />
    </Grid>
  );
  return (
    <SectionCard title={t('marketing.socialSettings.sectionSync')} subtitle={t('marketing.socialSettings.sectionSyncBody')}>
      <Grid container spacing={2}>
        {number('sync_every_hours', t('marketing.socialSettings.syncEveryHours'), t('marketing.socialSettings.syncEveryHoursHint'))}
        {number('backfill_days', t('marketing.socialSettings.backfillDays'), t('marketing.socialSettings.backfillDaysHint'))}
        {number('expiry_alert_days', t('marketing.socialSettings.expiryAlertDays'), t('marketing.socialSettings.expiryAlertDaysHint'))}
      </Grid>
    </SectionCard>
  );
}

/** The AI's read of what comes in, and the team's own voice for the drafts it writes. */
export function AiSection({ control, disabled }: Readonly<SectionProps>) {
  const { t } = useTranslation();
  return (
    <SectionCard title={t('marketing.socialSettings.sectionAi')} subtitle={t('marketing.socialSettings.sectionAiBody')}>
      <Stack spacing={2}>
        <RhfSwitch control={control} name="auto_triage" label={t('marketing.socialSettings.autoTriage')} hint={t('marketing.socialSettings.autoTriageHint')} disabled={disabled} />
        <RhfTextField
          control={control}
          name="ai_reply_guidelines"
          label={t('marketing.socialSettings.aiReplyGuidelines')}
          hint={t('marketing.socialSettings.aiReplyGuidelinesHint')}
          multiline
          minRows={3}
          disabled={disabled}
        />
      </Stack>
    </SectionCard>
  );
}

interface AssigneeProps extends SectionProps {
  savedId: string | null;
  savedName: string | null;
  canPick: boolean;
}

/** Who new DM conversations go to: the saved person by name, a newly picked one until it is saved, or nobody. */
function AssigneeField({ control, disabled, savedId, savedName, canPick }: Readonly<AssigneeProps>) {
  const { t } = useTranslation();
  const { field } = useController({ control, name: 'default_assignee_user_id' });
  const [picking, setPicking] = useState(false);
  let shown = t('marketing.socialSettings.assigneeNone');
  if (field.value) shown = field.value === savedId && savedName ? savedName : t('marketing.socialSettings.assigneePicked');
  return (
    <Stack spacing={0.5}>
      <Typography variant="subtitle2">{t('marketing.socialSettings.defaultAssignee')}</Typography>
      <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography variant="body2" data-testid="settings-assignee">
          {shown}
        </Typography>
        {canPick && !disabled && (
          <DuncitButton size="small" onClick={() => setPicking(true)} data-testid="settings-assignee-change">
            {t('marketing.socialSettings.assigneeChange')}
          </DuncitButton>
        )}
        {field.value && !disabled && (
          <DuncitButton size="small" onClick={() => field.onChange(null)} data-testid="settings-assignee-clear">
            {t('marketing.socialSettings.assigneeClear')}
          </DuncitButton>
        )}
      </Stack>
      <Typography variant="caption" color="text.secondary">
        {t('marketing.socialSettings.defaultAssigneeHint')}
      </Typography>
      {picking && (
        <LeadOwnerDialog
          ownerUserId={field.value}
          title={t('marketing.socialSettings.assigneeTitle')}
          busy={false}
          onClose={() => setPicking(false)}
          onSave={async (userId) => {
            field.onChange(userId);
            return true;
          }}
        />
      )}
    </Stack>
  );
}

/** A DM from a lead's handle closes the loop with the lead, and who a new conversation lands with. */
export function LeadsSection(props: Readonly<AssigneeProps>) {
  const { t } = useTranslation();
  return (
    <SectionCard title={t('marketing.socialSettings.sectionLeads')} subtitle={t('marketing.socialSettings.sectionLeadsBody')}>
      <Stack spacing={2}>
        <RhfSwitch
          control={props.control}
          name="link_dms_to_leads"
          label={t('marketing.socialSettings.linkDmsToLeads')}
          hint={t('marketing.socialSettings.linkDmsToLeadsHint')}
          disabled={props.disabled}
        />
        <AssigneeField {...props} />
      </Stack>
    </SectionCard>
  );
}

/** The words that switch a person's automated messages off and back on. */
export function OptOutSection({ control, disabled }: Readonly<SectionProps>) {
  const { t } = useTranslation();
  return (
    <SectionCard title={t('marketing.socialSettings.sectionOptOut')} subtitle={t('marketing.socialSettings.sectionOptOutBody')}>
      <Stack spacing={2}>
        <RhfTextField control={control} name="opt_out_keywords" label={t('marketing.socialSettings.optOutKeywords')} hint={t('marketing.socialSettings.optOutKeywordsHint')} disabled={disabled} />
        <RhfTextField control={control} name="opt_in_keywords" label={t('marketing.socialSettings.optInKeywords')} hint={t('marketing.socialSettings.optInKeywordsHint')} disabled={disabled} />
      </Stack>
    </SectionCard>
  );
}

/** Auto-replies: the master switch, the daily cap per account, and whether each waits for a person's yes. */
export function AutoReplySection({ control, disabled }: Readonly<SectionProps>) {
  const { t } = useTranslation();
  return (
    <SectionCard title={t('marketing.socialSettings.sectionAutoReply')} subtitle={t('marketing.socialSettings.sectionAutoReplyBody')}>
      <Stack spacing={2}>
        <RhfSwitch control={control} name="auto_reply_enabled" label={t('marketing.socialSettings.autoReplyEnabled')} hint={t('marketing.socialSettings.autoReplyEnabledHint')} disabled={disabled} />
        <RhfTextField
          control={control}
          name="auto_reply_daily_cap"
          label={t('marketing.socialSettings.autoReplyDailyCap')}
          hint={t('marketing.socialSettings.autoReplyDailyCapHint')}
          type="number"
          required
          disabled={disabled}
        />
        <RhfSwitch
          control={control}
          name="auto_reply_requires_approval"
          label={t('marketing.socialSettings.autoReplyRequiresApproval')}
          hint={t('marketing.socialSettings.autoReplyRequiresApprovalHint')}
          disabled={disabled}
        />
      </Stack>
    </SectionCard>
  );
}
