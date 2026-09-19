import { Controller, type Control } from 'react-hook-form';
import { Chip, FormControl, FormControlLabel, FormHelperText, FormLabel, Radio, RadioGroup, Stack, Typography } from '@mui/material';
import { priceLabel } from '../../../shared/format';
import type { LiteTicketType } from '../../../shared/graphql/documents';
import { useWebT } from '../../../shared/i18n';
import { RhfSelect } from '../RhfSelect';
import { MAX_QUANTITY, type RegisterValues } from './register.types';

interface TicketStepProps {
  control: Control<RegisterValues>;
  tickets: readonly LiteTicketType[];
}

export const isSoldOut = (ticket: LiteTicketType): boolean => ticket.quantity !== null && ticket.sold >= ticket.quantity;

const QUANTITIES = Array.from({ length: MAX_QUANTITY }, (_, index) => String(index + 1)).map((value) => ({ value, label: value }));

/** Pick a ticket type and how many. */
export function TicketStep({ control, tickets }: Readonly<TicketStepProps>) {
  const { t } = useWebT();
  return (
    <Stack spacing={2}>
      <Controller
        control={control}
        name="ticket_id"
        render={({ field, fieldState }) => (
          <FormControl component="fieldset" error={Boolean(fieldState.error)} fullWidth>
            <FormLabel component="legend">{t('liteWeb.register.ticket')}</FormLabel>
            <RadioGroup {...field} value={field.value ?? ''} data-testid="register-ticket-group">
              {tickets.map((ticket) => {
                const soldOut = isSoldOut(ticket);
                return (
                  <FormControlLabel
                    key={ticket.id}
                    value={ticket.id}
                    disabled={soldOut}
                    control={<Radio inputProps={{ 'data-testid': `register-ticket-${ticket.id}` } as Record<string, string>} />}
                    sx={{ alignItems: 'flex-start', my: 0.5, mr: 0 }}
                    label={
                      <Stack sx={{ pt: 1 }}>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                          <Typography sx={{ fontWeight: 700 }}>{ticket.name}</Typography>
                          <Typography sx={{ fontWeight: 800, color: 'primary.main' }}>{priceLabel(ticket.price, t('lite.common.free'))}</Typography>
                          {soldOut ? <Chip size="small" label={t('liteWeb.register.soldOut')} /> : null}
                        </Stack>
                        {ticket.description ? (
                          <Typography variant="body2" color="text.secondary">
                            {ticket.description}
                          </Typography>
                        ) : null}
                      </Stack>
                    }
                  />
                );
              })}
            </RadioGroup>
            <FormHelperText>{fieldState.error?.message ?? ' '}</FormHelperText>
          </FormControl>
        )}
      />
      <RhfSelect control={control} name="quantity" label={t('liteWeb.register.quantity')} options={QUANTITIES} testId="register-quantity" />
    </Stack>
  );
}
