import {
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Controller, type Control, type FieldErrors } from 'react-hook-form';
import { useTranslation } from '@duncit/shell';
import {
  TICKET_TYPE_OPTIONS,
  type MailAutomationRuleValues,
} from './mail-automation-rule/mail-automation-rule.types';

interface Props {
  control: Control<MailAutomationRuleValues>;
  errors: FieldErrors<MailAutomationRuleValues>;
  /** The window as the reply will word it, so the operator reads the sentence
   * rather than two numbers and imagines it. */
  slaLabel: string;
}

/** Step 3: which queue an email opens, and how long the reply promises. */
export default function TicketTypeStep({ control, errors, slaLabel }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <Stack spacing={3}>
      <Controller
        name="ticket_type"
        control={control}
        render={({ field }) => (
          <FormControl>
            <FormLabel id="mail-automation-ticket-type">
              {t('support.mailAutomation.ticketLabel')}
            </FormLabel>
            <RadioGroup
              aria-labelledby="mail-automation-ticket-type"
              value={field.value}
              onChange={(event) => field.onChange(event.target.value)}
            >
              {TICKET_TYPE_OPTIONS.map((option) => (
                <FormControlLabel
                  key={option.value}
                  value={option.value}
                  control={<Radio />}
                  label={
                    <Stack sx={{ py: 0.5 }}>
                      <Typography sx={{
                        fontWeight: 700
                      }}>{t(option.labelKey)}</Typography>
                      <Typography variant="body2" sx={{
                        color: "text.secondary"
                      }}>
                        {t(option.hintKey)}
                      </Typography>
                    </Stack>
                  }
                />
              ))}
            </RadioGroup>
          </FormControl>
        )}
      />

      <Stack spacing={1}>
        <FormLabel>{t('support.mailAutomation.slaLabel')}</FormLabel>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Controller
            name="sla_min_hours"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                type="number"
                label={t('support.mailAutomation.slaMin')}
                error={Boolean(errors.sla_min_hours)}
                helperText={errors.sla_min_hours?.message ?? ' '}
                slotProps={{
                  htmlInput: { min: 1, max: 720 }
                }}
              />
            )}
          />
          <Controller
            name="sla_max_hours"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                type="number"
                label={t('support.mailAutomation.slaMax')}
                error={Boolean(errors.sla_max_hours)}
                helperText={errors.sla_max_hours?.message ?? ' '}
                slotProps={{
                  htmlInput: { min: 1, max: 720 }
                }}
              />
            )}
          />
        </Stack>
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          {t('support.mailAutomation.slaHint', { vars: { label: slaLabel } })}
        </Typography>
      </Stack>
    </Stack>
  );
}
