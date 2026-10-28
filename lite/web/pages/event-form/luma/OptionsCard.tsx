import { useMemo } from 'react';
import type { FieldErrors } from 'react-hook-form';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { Box, Stack, Switch, Typography } from '@mui/material';
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import HelpOutlineOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { RhfTextField } from '@duncit/forms';
import { fromPriceLabel } from '../../../../shared/format';
import { useWebT } from '../../../../shared/i18n';
import { RhfSelect, type SelectOption } from '../../../components/RhfSelect';
import type { EventFormValues } from '../event.types';
import { PaymentSection } from '../sections/PaymentSection';
import { QuestionsSection } from '../sections/QuestionsSection';
import { TicketsSection } from '../sections/TicketsSection';
import { OptionRow } from './OptionRow';
import { SectionDialog } from './SectionDialog';

export type OptionsEditor = 'tickets' | 'capacity' | 'questions' | null;

/** The dialog holding the first field a failed submit flagged, so the host sees the message. */
export function editorFor(errors: FieldErrors<EventFormValues>): OptionsEditor {
  if (errors.tickets || errors.upi_id || errors.upi_name) return 'tickets';
  if (errors.capacity) return 'capacity';
  if (errors.questions) return 'questions';
  return null;
}

interface OptionsCardProps {
  categories: readonly SelectOption[];
  cities: readonly SelectOption[];
  editor: OptionsEditor;
  setEditor: (editor: OptionsEditor) => void;
}

/** "Event options": ticket price, approval, capacity, questions, category and city. */
export function OptionsCard({ categories, cities, editor, setEditor }: Readonly<OptionsCardProps>) {
  const { t } = useWebT();
  const { control } = useFormContext<EventFormValues>();
  const [tickets, capacity, questions] = useWatch({ control, name: ['tickets', 'capacity', 'questions'] });
  const close = () => setEditor(null);
  const price = useMemo(
    () =>
      fromPriceLabel(
        tickets.map((ticket) => ({ price: Number.parseInt(ticket.price, 10) || 0, is_active: ticket.is_active })),
        t('lite.common.free'),
        (value) => t('liteWeb.events.from', { vars: { price: value } }),
      ),
    [tickets, t],
  );
  return (
    <Stack spacing={1.25}>
      <Typography variant="body2" component="h2" sx={{ fontWeight: 700 }}>
        {t('liteWeb.eventForm.options')}
      </Typography>
      <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1.5, overflow: 'hidden' }}>
        <OptionRow icon={<ConfirmationNumberOutlinedIcon fontSize="small" />} label={t('liteWeb.eventForm.ticketPriceRow')} value={price} onEdit={() => setEditor('tickets')} editLabel={t('liteWeb.eventForm.editTickets')} testId="option-tickets" />
        <OptionRow
          icon={<LockOutlinedIcon fontSize="small" />}
          label={t('liteWeb.eventForm.requireApprovalRow')}
          control={
            <Controller
              control={control}
              name="require_approval"
              render={({ field }) => (
                <Switch checked={field.value} onChange={(event) => field.onChange(event.target.checked)} slotProps={{ input: { 'aria-label': t('liteWeb.eventForm.requireApproval'), 'data-testid': 'event-require-approval' } as Record<string, string> }} />
              )}
            />
          }
          testId="option-approval"
        />
        <OptionRow
          icon={<GroupsOutlinedIcon fontSize="small" />}
          label={t('liteWeb.eventForm.capacity')}
          value={capacity.trim() === '' ? t('liteWeb.eventForm.unlimited') : capacity}
          onEdit={() => setEditor('capacity')}
          editLabel={t('liteWeb.eventForm.editCapacity')}
          testId="option-capacity"
        />
        <OptionRow
          icon={<HelpOutlineOutlinedIcon fontSize="small" />}
          label={t('liteWeb.eventForm.questions')}
          value={t('liteWeb.eventForm.questionsCount', { count: questions.length })}
          onEdit={() => setEditor('questions')}
          editLabel={t('liteWeb.eventForm.editQuestions')}
          testId="option-questions"
        />
      </Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <RhfSelect control={control} name="category_id" label={t('liteWeb.eventForm.category')} options={categories} emptyLabel={t('liteWeb.eventForm.noCategory')} testId="event-category" />
        <RhfSelect control={control} name="city_slug" label={t('liteWeb.eventForm.city')} options={cities} emptyLabel={t('liteWeb.eventForm.noCity')} testId="event-city" />
      </Stack>
      <SectionDialog open={editor === 'tickets'} onClose={close} title={t('liteWeb.eventForm.tickets')} fields={['tickets', 'upi_id', 'upi_name']} testId="tickets-dialog">
        <Stack spacing={2}>
          <TicketsSection control={control} />
          <PaymentSection control={control} />
        </Stack>
      </SectionDialog>
      <SectionDialog open={editor === 'capacity'} onClose={close} title={t('liteWeb.eventForm.capacity')} fields={['capacity']} testId="capacity-dialog">
        <RhfTextField control={control} name="capacity" label={t('liteWeb.eventForm.capacity')} hint={t('liteWeb.eventForm.capacityHint')} slotProps={{ htmlInput: { inputMode: 'numeric', 'data-testid': 'event-capacity' } }} />
      </SectionDialog>
      <SectionDialog open={editor === 'questions'} onClose={close} title={t('liteWeb.eventForm.questions')} fields={['questions']} testId="questions-dialog">
        <QuestionsSection control={control} />
      </SectionDialog>
    </Stack>
  );
}
