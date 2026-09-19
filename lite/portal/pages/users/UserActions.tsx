import { Stack, Tooltip } from '@mui/material';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import PersonIcon from '@mui/icons-material/Person';
import BlockIcon from '@mui/icons-material/Block';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import { DuncitIconButton } from '@duncit/buttons';
import { usePortalT } from '../../../shared/i18n';
import type { LiteAdminUserRow } from '../../graphql/users';
import type { UserFlag } from './user-flags';

interface Props {
  row: LiteAdminUserRow;
  /** The signed-in admin cannot change their own flags. */
  isSelf: boolean;
  onChange: (row: LiteAdminUserRow, flag: UserFlag) => void;
}

/** Admin on/off and block on/off for one user row. */
export function UserActions({ row, isSelf, onChange }: Readonly<Props>) {
  const { t } = usePortalT();
  const vars = { vars: { name: row.name } };
  const self = t('litePortal.users.yourself');
  const adminAction = row.is_admin ? t('litePortal.users.removeAdmin', vars) : t('litePortal.users.makeAdmin', vars);
  const blockAction = row.is_blocked ? t('litePortal.users.unblock', vars) : t('litePortal.users.block', vars);
  const adminLabel = isSelf ? self : adminAction;
  const blockLabel = isSelf ? self : blockAction;

  return (
    <Stack direction="row" spacing={0.5} component="span" sx={{ justifyContent: 'flex-end' }}>
      <Tooltip title={adminLabel}>
        <span>
          <DuncitIconButton size="small" disabled={isSelf} aria-label={adminLabel} aria-pressed={row.is_admin} onClick={() => onChange(row, 'is_admin')} data-testid={`user-admin-${row.id}`}>
            {row.is_admin ? <AdminPanelSettingsIcon fontSize="small" color="primary" /> : <PersonIcon fontSize="small" />}
          </DuncitIconButton>
        </span>
      </Tooltip>
      <Tooltip title={blockLabel}>
        <span>
          <DuncitIconButton size="small" color="error" disabled={isSelf} aria-label={blockLabel} aria-pressed={row.is_blocked} onClick={() => onChange(row, 'is_blocked')} data-testid={`user-block-${row.id}`}>
            {row.is_blocked ? <LockOpenIcon fontSize="small" /> : <BlockIcon fontSize="small" />}
          </DuncitIconButton>
        </span>
      </Tooltip>
    </Stack>
  );
}
