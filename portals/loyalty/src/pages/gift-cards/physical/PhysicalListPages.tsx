import { Link as RouterLink, useNavigate } from 'react-router';
import { Stack } from '@mui/material';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import HistoryIcon from '@mui/icons-material/History';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import TablePageHeader from '../../../components/TablePageHeader';
import { useTableRows } from '../../../lib/useTableRows';
import { useCanWrite } from '../../../lib/roles';
import PhysicalCardsTable from './tables/PhysicalCardsTable';
import PhysicalBatchesTable from './tables/PhysicalBatchesTable';
import PhysicalEventsTable from './tables/PhysicalEventsTable';
import {
  PHYSICAL_BATCHES_TABLE,
  PHYSICAL_CARDS_TABLE,
  PHYSICAL_EVENTS_TABLE,
  type PhysicalBatchRow,
  type PhysicalCardRow,
  type PhysicalEventRow,
} from './queries';

export const physicalCardPath = (id: string) => `/gift-cards/physical/cards/${id}`;
export const physicalBatchPath = (id: string) => `/gift-cards/physical/batches/${id}`;

/** The way to mint more cards, offered wherever the cards are listed — to the seats that may. */
export function GenerateCardsButton() {
  const { t } = useTranslation();
  const canWrite = useCanWrite();
  if (!canWrite) return null;
  return (
    <DuncitButton component={RouterLink} to="/gift-cards/physical/generate" variant="contained">
      {t('loyalty.physical.generateCta')}
    </DuncitButton>
  );
}

/** Loyalty > Physical Gift Cards > All Cards — every printed card; a row opens its own page. */
export function PhysicalCardsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { total, fetchRows } = useTableRows<PhysicalCardRow>(PHYSICAL_CARDS_TABLE, 'physicalGiftCardsTable');
  return (
    <Stack spacing={2.5}>
      <TablePageHeader
        icon={<ConfirmationNumberIcon color="primary" />}
        title={t('loyalty.physical.cardsTitle')}
        total={total}
        actions={<GenerateCardsButton />}
      />
      <PhysicalCardsTable
        tableId="loyalty-physical-cards"
        fetchRows={fetchRows}
        onRowClick={(row) => navigate(physicalCardPath(row.id))}
      />
    </Stack>
  );
}

/** Loyalty > Physical Gift Cards > Batches — every generation run; a row opens the batch and its print file. */
export function PhysicalBatchesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { total, fetchRows } = useTableRows<PhysicalBatchRow>(PHYSICAL_BATCHES_TABLE, 'physicalGiftCardBatchesTable');
  return (
    <Stack spacing={2.5}>
      <TablePageHeader
        icon={<Inventory2Icon color="primary" />}
        title={t('loyalty.physical.batchesTitle')}
        total={total}
        actions={<GenerateCardsButton />}
      />
      <PhysicalBatchesTable fetchRows={fetchRows} onRowClick={(row) => navigate(physicalBatchPath(row.id))} />
    </Stack>
  );
}

/** Loyalty > Physical Gift Cards > History — every event on every card, newest first. */
export function PhysicalHistoryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { total, fetchRows } = useTableRows<PhysicalEventRow>(PHYSICAL_EVENTS_TABLE, 'physicalGiftCardEventsTable');
  const open = (row: PhysicalEventRow) => {
    if (row.card_id) navigate(physicalCardPath(row.card_id));
    else if (row.batch_id) navigate(physicalBatchPath(row.batch_id));
  };
  return (
    <Stack spacing={2.5}>
      <TablePageHeader icon={<HistoryIcon color="primary" />} title={t('loyalty.physical.historyTitle')} total={total} />
      <PhysicalEventsTable fetchRows={fetchRows} onRowClick={open} />
    </Stack>
  );
}
