import { Chip, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { InfoRow } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import { PIPELINE_LABEL, SOURCE_LABEL } from '../copy';
import type { MarketingLeadDetail } from '../queries';

const LABEL_WIDTH = 110;

interface Props {
  lead: MarketingLeadDetail;
  /** Whether the owner picker is offered — its list is a manager's to read. */
  canChangeOwner: boolean;
  onChangeOwner: () => void;
}

/** What the lead is: which pipeline, where it came from, how well it fits, who has it. */
export default function LeadDetails({ lead, canChangeOwner, onChangeOwner }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={0.75} data-testid="lead-details">
      {lead.company && <InfoRow variant="inline" labelWidth={LABEL_WIDTH} label={t('marketing.leads.company')} value={lead.company} />}
      <InfoRow variant="inline" labelWidth={LABEL_WIDTH} label={t('marketing.leads.pipeline')} value={t(PIPELINE_LABEL[lead.pipeline])} />
      <InfoRow variant="inline" labelWidth={LABEL_WIDTH} label={t('marketing.leads.source')} value={t(SOURCE_LABEL[lead.source])} />
      {lead.city && <InfoRow variant="inline" labelWidth={LABEL_WIDTH} label={t('marketing.leads.city')} value={lead.city} />}
      <InfoRow
        variant="inline"
        labelWidth={LABEL_WIDTH}
        label={t('marketing.leads.score')}
        value={
          lead.score === null ? (
            t('marketing.leads.notScored')
          ) : (
            <>
              {t('marketing.leads.scoreValue', { vars: { score: lead.score } })}
              {lead.score_reason && (
                <Typography variant="caption" component="div" sx={{ color: 'text.secondary' }}>
                  {lead.score_reason}
                </Typography>
              )}
            </>
          )
        }
      />
      <InfoRow
        variant="inline"
        labelWidth={LABEL_WIDTH}
        label={t('marketing.leads.owner')}
        testId="lead-owner"
        value={
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <span>{lead.owner_name || t('marketing.leads.unassigned')}</span>
            {canChangeOwner && (
              <DuncitButton size="small" variant="text" onClick={onChangeOwner} data-testid="lead-change-owner">
                {t('marketing.leads.changeOwner')}
              </DuncitButton>
            )}
          </Stack>
        }
      />
      {lead.tags.length > 0 && (
        <InfoRow
          variant="inline"
          labelWidth={LABEL_WIDTH}
          label={t('marketing.leads.tags')}
          value={
            <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
              {lead.tags.map((tag) => (
                <Chip key={tag} size="small" label={tag} />
              ))}
            </Stack>
          }
        />
      )}
    </Stack>
  );
}
