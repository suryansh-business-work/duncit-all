import { Controller, useFieldArray, type Control } from 'react-hook-form';
import { Box, Checkbox, FormControlLabel, FormHelperText, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { SectionCard } from '@duncit/ui';
import { useWebT } from '../../../../shared/i18n';
import { emptyTicket, type EventFormValues } from '../event.types';

interface TicketRowProps {
  control: Control<EventFormValues>;
  index: number;
  canRemove: boolean;
  onRemove: () => void;
}

function TicketRow({ control, index, canRemove, onRemove }: Readonly<TicketRowProps>) {
  const { t } = useWebT();
  return (
    <Box component="li" sx={{ border: 1, borderColor: 'divider', borderRadius: 3, p: 2 }} data-testid={`ticket-row-${index}`}>
      <Stack spacing={1.5}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <RhfTextField control={control} name={`tickets.${index}.name`} label={t('liteWeb.eventForm.ticketName')} slotProps={{ htmlInput: { maxLength: 80, 'data-testid': `ticket-name-${index}` } }} />
          <RhfTextField
            control={control}
            name={`tickets.${index}.price`}
            label={t('liteWeb.eventForm.ticketPrice')}
            hint={t('liteWeb.eventForm.ticketPriceHint')}
            slotProps={{ htmlInput: { inputMode: 'numeric', 'data-testid': `ticket-price-${index}` } }}
          />
          <RhfTextField
            control={control}
            name={`tickets.${index}.quantity`}
            label={t('liteWeb.eventForm.ticketQuantity')}
            hint={t('liteWeb.eventForm.ticketQuantityHint')}
            slotProps={{ htmlInput: { inputMode: 'numeric', 'data-testid': `ticket-quantity-${index}` } }}
          />
        </Stack>
        <RhfTextField control={control} name={`tickets.${index}.description`} label={t('liteWeb.eventForm.ticketDescription')} hint={t('lite.common.optional')} slotProps={{ htmlInput: { maxLength: 200, 'data-testid': `ticket-description-${index}` } }} />
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Controller
            control={control}
            name={`tickets.${index}.is_active`}
            render={({ field }) => (
              <FormControlLabel
                control={<Checkbox checked={field.value} onChange={(event) => field.onChange(event.target.checked)} slotProps={{ input: { 'data-testid': `ticket-active-${index}` } as Record<string, string> }} />}
                label={t('liteWeb.eventForm.ticketActive')}
              />
            )}
          />
          {canRemove ? (
            <DuncitIconButton aria-label={t('liteWeb.eventForm.removeTicket')} onClick={onRemove} data-testid={`ticket-remove-${index}`}>
              <DeleteOutlineIcon />
            </DuncitIconButton>
          ) : null}
        </Stack>
      </Stack>
    </Box>
  );
}

/** The ticket types on sale: at least one; price 0 is free, blank quantity is unlimited. */
export function TicketsSection({ control }: Readonly<{ control: Control<EventFormValues> }>) {
  const { t } = useWebT();
  const { fields, append, remove } = useFieldArray({ control, name: 'tickets' });
  return (
    <SectionCard
      title={t('liteWeb.eventForm.tickets')}
      subtitle={t('liteWeb.eventForm.ticketsHint')}
      action={
        <DuncitButton size="small" startIcon={<AddIcon />} onClick={() => append(emptyTicket(''))} data-testid="ticket-add">
          {t('liteWeb.eventForm.addTicket')}
        </DuncitButton>
      }
    >
      <Stack component="ul" spacing={2} sx={{ listStyle: 'none', p: 0, m: 0 }}>
        {fields.map((field, index) => (
          <TicketRow key={field.id} control={control} index={index} canRemove={fields.length > 1} onRemove={() => remove(index)} />
        ))}
      </Stack>
      <Controller control={control} name="tickets" render={({ fieldState }) => <FormHelperText error>{fieldState.error?.root?.message ?? fieldState.error?.message ?? ' '}</FormHelperText>} />
    </SectionCard>
  );
}
