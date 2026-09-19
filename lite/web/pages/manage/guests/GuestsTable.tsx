import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import type { LiteRegistration } from '../../../../shared/graphql/documents';
import { useWebT } from '../../../../shared/i18n';
import type { LiteRegistrationAction } from '../../../graphql/types';
import { GuestRow } from './GuestRow';

interface GuestsTableProps {
  guests: readonly LiteRegistration[];
  onAction: (guest: LiteRegistration, action: LiteRegistrationAction) => void;
}

const HEADERS = ['guest', 'ticket', 'status', 'payment', 'code', 'checkedIn'] as const;

/** The guest list as a plain MUI table that scrolls sideways on a phone. */
export function GuestsTable({ guests, onAction }: Readonly<GuestsTableProps>) {
  const { t } = useWebT();
  return (
    <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: 3, bgcolor: 'background.paper' }}>
      <Table size="small" aria-label={t('liteWeb.manage.guests.tableLabel')} data-testid="guests-table">
        <TableHead>
          <TableRow>
            {HEADERS.map((header) => (
              <TableCell key={header} sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}>
                {t(`liteWeb.manage.guests.columns.${header}`)}
              </TableCell>
            ))}
            <TableCell align="right" sx={{ fontWeight: 800 }}>
              {t('liteWeb.manage.guests.columns.actions')}
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {guests.map((guest) => (
            <GuestRow key={guest.id} guest={guest} onAction={onAction} />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
