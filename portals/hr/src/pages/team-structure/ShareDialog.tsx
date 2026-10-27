import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  Alert, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, List, ListItem, ListItemText, Stack, Switch, TextField,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { copyToClipboard, parseApiError } from '@duncit/utils';
import { formatDateTime, useTranslation } from '@duncit/app-settings';
import { CREATE_SHARE, REVOKE_SHARE, TEAM_SHARES } from './queries';

interface Share {
  id: string;
  token: string;
  label?: string | null;
  show_salary: boolean;
  expires_at?: string | null;
  revoked_at?: string | null;
}

/** Where a link opens — the portal's own public route, so no other site is involved. */
const linkOf = (token: string) => `${window.location.origin}/shared/${token}`;

export default function ShareDialog({ structureId, open, onClose }: Readonly<{ structureId: string; open: boolean; onClose: () => void }>) {
  const { t } = useTranslation();
  const { data, refetch } = useQuery<{ teamStructureShares: Share[] }>(TEAM_SHARES, { variables: { structure_id: structureId }, skip: !open });
  const [create, { loading: creating }] = useMutation(CREATE_SHARE);
  const [revoke] = useMutation(REVOKE_SHARE);
  const [label, setLabel] = useState('');
  const [showSalary, setShowSalary] = useState(false);
  const [expires, setExpires] = useState<Date | null>(null);

  const guarded = async (work: () => Promise<unknown>) => {
    try {
      await work();
      await refetch();
    } catch (err) {
      notifyError(parseApiError(err));
    }
  };

  const onCreate = () =>
    guarded(async () => {
      await create({ variables: { structure_id: structureId, label: label || null, show_salary: showSalary, expires_at: expires?.toISOString() ?? null } });
      setLabel('');
      setShowSalary(false);
      setExpires(null);
    });

  const onCopy = async (token: string) => {
    if (await copyToClipboard(linkOf(token))) notifySuccess(t('hr.teamStructure.share.copied'));
    else notifyError(t('hr.teamStructure.share.copyFailed'));
  };

  const shares = data?.teamStructureShares ?? [];

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="team-share-title">
      <DialogTitle id="team-share-title">{t('hr.teamStructure.share.title')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField size="small" label={t('hr.teamStructure.share.label')} value={label} onChange={(e) => setLabel(e.target.value)} />
          <DatePicker label={t('hr.teamStructure.share.expires')} value={expires} onChange={setExpires} disablePast slotProps={{ textField: { size: 'small' }, field: { clearable: true } }} />
          <FormControlLabel
            control={<Switch checked={showSalary} onChange={(e) => setShowSalary(e.target.checked)} />}
            label={t('hr.teamStructure.share.showSalary')}
          />
          {showSalary && <Alert severity="warning">{t('hr.teamStructure.share.salaryWarning')}</Alert>}
          <DuncitButton variant="contained" disabled={creating} onClick={onCreate}>{t('hr.teamStructure.share.create')}</DuncitButton>
          {shares.length === 0 && <Alert severity="info">{t('hr.teamStructure.share.none')}</Alert>}
          <List dense>
            {shares.map((s) => {
              const dead = Boolean(s.revoked_at) || (s.expires_at ? new Date(s.expires_at) <= new Date() : false);
              return (
                <ListItem
                  key={s.id}
                  disableGutters
                  secondaryAction={
                    <Stack direction="row" spacing={0.5}>
                      <DuncitIconButton aria-label={t('hr.teamStructure.share.copy')} disabled={dead} onClick={() => onCopy(s.token)}>
                        <ContentCopyIcon fontSize="small" />
                      </DuncitIconButton>
                      <DuncitButton size="small" color="error" disabled={dead} onClick={() => guarded(() => revoke({ variables: { id: s.id } }))}>
                        {t('hr.teamStructure.share.revoke')}
                      </DuncitButton>
                    </Stack>
                  }
                >
                  <ListItemText
                    primary={s.label || t('hr.teamStructure.share.unlabelled')}
                    secondary={s.expires_at ? t('hr.teamStructure.share.expiresOn', { vars: { date: formatDateTime(s.expires_at) } }) : t('hr.teamStructure.share.noExpiry')}
                  />
                  <Chip size="small" sx={{ mr: 12 }} color={s.show_salary ? 'warning' : 'default'} label={t(s.show_salary ? 'hr.teamStructure.share.withSalary' : 'hr.teamStructure.share.structureOnly')} />
                  {dead && <Chip size="small" label={t('hr.teamStructure.share.inactive')} />}
                </ListItem>
              );
            })}
          </List>
        </Stack>
      </DialogContent>
      <DialogActions><DuncitButton onClick={onClose}>{t('hr.teamStructure.share.close')}</DuncitButton></DialogActions>
    </Dialog>
  );
}
