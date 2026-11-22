import { Chip, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import type { CrmStaffUser } from '../../api/crm.types';
import { LeadDetailRow } from '../LeadDetailCard';

interface Props {
  /** The person to show; the dialog is closed while null. */
  user: CrmStaffUser | null;
  onClose: () => void;
}

/**
 * A CRM user's details, opened from their name (a manual log's author, an
 * assignee). Email and roles are shown only for active CRM staff — the server
 * withholds them for anyone else.
 */
export default function UserDetailsDialog({ user, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Dialog open={Boolean(user)} onClose={onClose} fullWidth maxWidth="xs" aria-labelledby="crm-user-details-title">
      <DialogTitle id="crm-user-details-title">{user?.name || t('crm.people.unknown')}</DialogTitle>
      <DialogContent>
        <LeadDetailRow label={t('shell.common.email')} value={user?.email || '—'} />
        <LeadDetailRow
          label={t('crm.people.roles')}
          value={
            user?.roles.length ? (
              <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', rowGap: 0.5 }}>
                {user.roles.map((role) => (
                  <Chip key={role} size="small" variant="outlined" label={role} />
                ))}
              </Stack>
            ) : (
              '—'
            )
          }
        />
        {user && !user.is_staff ? (
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1.5 }}>
            {t('crm.people.notStaff')}
          </Typography>
        ) : null}
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose}>{t('shell.common.close')}</DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
