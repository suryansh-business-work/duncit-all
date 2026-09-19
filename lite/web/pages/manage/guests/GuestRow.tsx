import { useId, useState } from 'react';
import { Menu, MenuItem, TableCell, TableRow, Typography } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useDateFormat } from '@duncit/app-settings';
import { DuncitIconButton } from '@duncit/buttons';
import type { LiteRegistration } from '../../../../shared/graphql/documents';
import { useWebT } from '../../../../shared/i18n';
import { PaymentStatusChip, RegistrationStatusChip } from '../../../components/StatusChips';
import type { LiteRegistrationAction } from '../../../graphql/types';
import { actionsFor } from './rowActions';

interface GuestRowProps {
  guest: LiteRegistration;
  onAction: (guest: LiteRegistration, action: LiteRegistrationAction) => void;
}

/** One guest in the table, with the actions their state allows behind a menu. */
export function GuestRow({ guest, onAction }: Readonly<GuestRowProps>) {
  const { t } = useWebT();
  const { formatDateTime } = useDateFormat({ timeZoneAware: true });
  const menuId = useId();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const actions = actionsFor(guest.status, guest.checked_in_at !== null);
  const close = () => setAnchor(null);
  return (
    <TableRow hover data-testid="guest-row">
      <TableCell>
        <Typography sx={{ fontWeight: 700 }}>{guest.user.name}</Typography>
        <Typography variant="body2" color="text.secondary">
          {guest.user.email}
        </Typography>
      </TableCell>
      <TableCell>
        {guest.ticket.name} × {guest.quantity}
      </TableCell>
      <TableCell>
        <RegistrationStatusChip status={guest.status} />
      </TableCell>
      <TableCell>
        <PaymentStatusChip status={guest.payment_status} />
        {guest.payment_reference ? (
          <Typography variant="caption" component="div" color="text.secondary" sx={{ pt: 0.5 }}>
            {guest.payment_reference}
          </Typography>
        ) : null}
      </TableCell>
      <TableCell>
        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
          {guest.code}
        </Typography>
      </TableCell>
      <TableCell>
        {guest.checked_in_at ? (
          <Typography variant="body2" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
            <CheckCircleOutlineIcon color="success" fontSize="small" aria-hidden />
            {formatDateTime(guest.checked_in_at)}
          </Typography>
        ) : (
          <Typography variant="body2" color="text.secondary">
            —
          </Typography>
        )}
      </TableCell>
      <TableCell align="right">
        {actions.length > 0 ? (
          <>
            <DuncitIconButton
              aria-label={t('liteWeb.manage.guests.actionsFor', { vars: { name: guest.user.name } })}
              aria-haspopup="menu"
              aria-expanded={Boolean(anchor)}
              aria-controls={anchor ? menuId : undefined}
              onClick={(event) => setAnchor(event.currentTarget)}
              data-testid="guest-actions"
            >
              <MoreVertIcon />
            </DuncitIconButton>
            <Menu id={menuId} anchorEl={anchor} open={Boolean(anchor)} onClose={close}>
              {actions.map((action) => (
                <MenuItem
                  key={action}
                  onClick={() => {
                    close();
                    onAction(guest, action);
                  }}
                  data-testid={`guest-action-${action}`}
                >
                  {t(`liteWeb.manage.guests.actions.${action}`)}
                </MenuItem>
              ))}
            </Menu>
          </>
        ) : null}
      </TableCell>
    </TableRow>
  );
}
