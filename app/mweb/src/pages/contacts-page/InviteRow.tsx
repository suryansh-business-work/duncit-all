import { memo } from 'react';
import { Avatar, Checkbox, Chip, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { invitableName, isInvited, type InvitableContact } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  row: InvitableContact;
  selected: boolean;
  busy: boolean;
  onToggleSelect: (key: string) => void;
  onInvite: (key: string) => void;
}

/** One contact who is not on Duncit: the name it is saved under, a tick box for
 * a bulk invite and its own Invite button. An already-invited row keeps its
 * badge and neither tick nor button — one invite per number, for good.
 * Memoised: it is one row of a windowed list thousands long. Twin of native
 * `InviteRow` (rule 27). */
export default memo(function InviteRow({ row, selected, busy, onToggleSelect, onInvite }: Readonly<Props>) {
  const { t } = useTranslation();
  const name = invitableName(row);
  const invited = isInvited(row);

  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', px: 1.5, py: 1.25 }}>
      <Checkbox
        checked={selected}
        disabled={invited}
        onChange={() => onToggleSelect(row.phone_key)}
        slotProps={{ input: { 'aria-label': t('mweb.contacts.selectFor', { vars: { name } }) } }}
        sx={{ p: 0.5 }}
      />
      <Avatar sx={{ width: 44, height: 44, bgcolor: 'action.hover', color: 'text.primary', fontWeight: 600 }}>
        {name[0]?.toUpperCase()}
      </Avatar>
      <Stack sx={{ minWidth: 0, flex: 1 }}>
        <Typography noWrap sx={{ fontSize: 15, fontWeight: 600 }}>
          {name}
        </Typography>
        <Typography variant="caption" noWrap sx={{ color: 'text.secondary' }}>
          {t('mweb.contacts.notOnDuncitYet')}
        </Typography>
      </Stack>
      {invited ? (
        <Chip size="small" color="success" variant="outlined" label={t('mweb.contacts.invited')} />
      ) : (
        <DuncitButton
          size="small"
          variant="contained"
          loading={busy}
          onClick={() => onInvite(row.phone_key)}
          data-testid={`contact-invite-${row.phone_key}`}
          sx={{ minHeight: 36, px: 2 }}
        >
          {t('mweb.contacts.invite')}
        </DuncitButton>
      )}
    </Stack>
  );
});
