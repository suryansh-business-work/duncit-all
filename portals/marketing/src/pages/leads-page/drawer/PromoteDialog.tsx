import { useId, useState } from 'react';
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, MenuItem, TextField } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import { CRM_KIND_FOR_PIPELINE, CRM_KIND_LABEL, PIPELINE_LABEL } from '../copy';
import type { MarketingLeadCrmKind, MarketingLeadDetail } from '../queries';

const KINDS: readonly MarketingLeadCrmKind[] = ['VENUE', 'HOST', 'ECOMM'];

interface Props {
  lead: MarketingLeadDetail;
  busy: boolean;
  onClose: () => void;
  /** True when the CRM record was made — the drawer then shows the link to it. */
  onPromote: (kind: MarketingLeadCrmKind) => Promise<boolean>;
}

/**
 * Hand the lead to sales. The kind the pipeline fits is picked already; the
 * others are offered but refused by the server, so a wrong pick is told
 * why rather than silently corrected.
 */
export default function PromoteDialog({ lead, busy, onClose, onPromote }: Readonly<Props>) {
  const { t } = useTranslation();
  const titleId = useId();
  const [kind, setKind] = useState<MarketingLeadCrmKind>(CRM_KIND_FOR_PIPELINE[lead.pipeline] ?? 'VENUE');

  const promote = async () => {
    if (await onPromote(kind)) onClose();
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" aria-labelledby={titleId} data-testid="lead-promote-dialog">
      <DialogTitle id={titleId}>{t('marketing.leads.promoteTitle')}</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          {t('marketing.leads.promoteBody', { vars: { kind: t(CRM_KIND_LABEL[kind]), pipeline: t(PIPELINE_LABEL[lead.pipeline]) } })}
        </DialogContentText>
        <TextField
          select
          fullWidth
          label={t('marketing.leads.promoteKind')}
          value={kind}
          onChange={(event) => setKind(event.target.value as MarketingLeadCrmKind)}
          slotProps={{ htmlInput: { 'data-testid': 'lead-promote-kind' } }}
        >
          {KINDS.map((option) => (
            <MenuItem key={option} value={option}>
              {t(CRM_KIND_LABEL[option])}
            </MenuItem>
          ))}
        </TextField>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose} disabled={busy}>
          {t('shell.common.cancel')}
        </DuncitButton>
        <DuncitButton variant="contained" onClick={promote} loading={busy} data-testid="lead-promote-confirm">
          {t('marketing.leads.promote')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
