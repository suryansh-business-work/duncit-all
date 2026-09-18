import { Divider, List, ListItem, ListItemText, Typography } from '@mui/material';
import { useDateFormat } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import { SectionCard } from '@duncit/ui';
import type { StoreOrder } from '../queries';
import OrderNoteForm from './order-note';
import type { OrderActions } from './useOrderActions';

/** The team's private notes on an order, newest first, and the box to add one. */
export default function OrderNotesCard({ order, actions }: Readonly<{ order: StoreOrder; actions: OrderActions }>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const notes = [...order.notes].reverse();
  return (
    <SectionCard title={t('ecommPortal.orders.notes')} subtitle={t('ecommPortal.orders.notesHint')}>
      {notes.length === 0 ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('ecommPortal.orders.noNotes')}
        </Typography>
      ) : (
        <List dense disablePadding aria-label={t('ecommPortal.orders.notes')}>
          {notes.map((note) => (
            <ListItem key={note.id} divider disableGutters>
              <ListItemText
                primary={note.text}
                secondary={[note.by_name, formatDateTime(note.at)].filter(Boolean).join(' · ')}
                slotProps={{ primary: { sx: { whiteSpace: 'pre-line' } } }}
              />
            </ListItem>
          ))}
        </List>
      )}
      <Divider sx={{ my: 2 }} />
      <OrderNoteForm busy={actions.noteBusy} onSubmit={actions.addNote} />
    </SectionCard>
  );
}
