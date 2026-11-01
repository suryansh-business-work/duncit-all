import { useState } from 'react';
import { Link, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import { CRM_KIND_FOR_PIPELINE, CRM_KIND_LABEL, STAGES, STAGE_LABEL } from '../copy';
import { crmLeadUrl } from '../crmLink';
import type { MarketingLeadDetail, MarketingLeadStage } from '../queries';
import LostNoteDialog from './LostNoteDialog';

interface Props {
  lead: MarketingLeadDetail;
  busy: boolean;
  /** Whether Promote is offered — a manager's call. */
  canPromote: boolean;
  onMove: (stage: MarketingLeadStage, note?: string) => Promise<boolean>;
  onPromote: () => void;
}

/**
 * Where the lead goes next: one button per other stage, LOST asking why
 * first. Below it, the hand-over to the CRM: the button while it can still
 * happen, the link to the record once it has.
 */
export default function LeadStageButtons({ lead, busy, canPromote, onMove, onPromote }: Readonly<Props>) {
  const { t } = useTranslation();
  const [losing, setLosing] = useState(false);
  const promotable = CRM_KIND_FOR_PIPELINE[lead.pipeline] !== undefined;

  /** LOST asks why first; any other stage moves at once (the button spins until the move settles). */
  const move = (stage: MarketingLeadStage): Promise<boolean> | undefined => {
    if (stage === 'LOST') {
      setLosing(true);
      return undefined;
    }
    return onMove(stage);
  };

  return (
    <Stack spacing={1} data-testid="lead-stage-buttons">
      <Typography variant="subtitle2">{t('marketing.leads.stageTitle')}</Typography>
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
        {STAGES.filter((stage) => stage !== lead.stage).map((stage) => (
          <DuncitButton
            key={stage}
            size="small"
            variant="outlined"
            color={stage === 'LOST' ? 'error' : 'primary'}
            disabled={busy}
            onClick={() => move(stage)}
            data-testid={`lead-move-${stage}`}
          >
            {t('marketing.leads.moveTo', { vars: { stage: t(STAGE_LABEL[stage]) } })}
          </DuncitButton>
        ))}
      </Stack>
      {lead.crm_ref ? (
        <Typography variant="body2" data-testid="lead-promoted">
          {t('marketing.leads.promoted', { vars: { kind: t(CRM_KIND_LABEL[lead.crm_ref.kind]) } })}{' '}
          <Link href={crmLeadUrl(lead.crm_ref.kind, lead.crm_ref.id)} target="_blank" rel="noopener noreferrer">
            {t('marketing.leads.openInCrm')}
          </Link>
        </Typography>
      ) : (
        canPromote && (
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <DuncitButton variant="contained" size="small" disabled={busy || !promotable} onClick={onPromote} data-testid="lead-promote">
              {t('marketing.leads.promote')}
            </DuncitButton>
            {!promotable && (
              <Typography variant="caption" color="text.secondary">
                {t('marketing.leads.promoteNotFit')}
              </Typography>
            )}
          </Stack>
        )
      )}
      <LostNoteDialog open={losing} busy={busy} onClose={() => setLosing(false)} onConfirm={(note) => onMove('LOST', note)} />
    </Stack>
  );
}
