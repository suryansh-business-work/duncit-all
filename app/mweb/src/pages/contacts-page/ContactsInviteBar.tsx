import { Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  selectedCount: number;
  busy: boolean;
  onInviteSelected: () => void;
}

/** Above the invite list: what an invite does, and the button that sends the
 * ticked ones. Each row carries its own Invite; what a press did is said in a
 * toast. Twin of native `ContactsInviteBar` (rule 27). */
export default function ContactsInviteBar({ selectedCount, busy, onInviteSelected }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={1} data-testid="contacts-invite-bar">
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('mweb.contacts.inviteBody')}
      </Typography>
      <DuncitButton
        variant="contained"
        size="large"
        fullWidth
        disabled={selectedCount === 0}
        loading={busy}
        onClick={onInviteSelected}
        data-testid="contacts-invite-selected"
      >
        {t('mweb.contacts.inviteSelected', { vars: { count: selectedCount } })}
      </DuncitButton>
    </Stack>
  );
}
