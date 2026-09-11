import { useState } from 'react';
import { Chip, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { format, isValid } from 'date-fns';
import { DuncitButton } from '@duncit/buttons';
import { Controller, type Control } from 'react-hook-form';
import { useTranslation } from '@duncit/shell';
import type { VenueFormValues } from '../types';

/**
 * The dates the venue is closed.
 *
 * Stored as 'yyyy-MM-dd' because a holiday is a DAY, not an instant — the slot
 * generator compares it against the venue's local calendar, so a timestamp with
 * a zone in it would move the closure across midnight for half the country.
 * The picker itself is MUI X (rule 11), so the admin's configured pattern is
 * what they type in.
 */
const DAY = 'yyyy-MM-dd';

export default function HolidaysField({
  control,
}: Readonly<{ control: Control<VenueFormValues> }>) {
  const { t } = useTranslation();
  const [pending, setPending] = useState<Date | null>(null);

  return (
    <Controller
      control={control}
      name="settings.holidays"
      render={({ field }) => {
        const days = field.value ?? [];
        const add = () => {
          if (!pending || !isValid(pending)) return;
          const day = format(pending, DAY);
          if (!days.includes(day)) field.onChange([...days, day].sort((a, b) => a.localeCompare(b)));
          setPending(null);
        };
        return (
          <Stack spacing={1}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <DatePicker
                label={t('directory.venueEditor.holidayDate')}
                value={pending}
                onChange={setPending}
                slotProps={{ textField: { size: 'small' } }}
              />
              <DuncitButton startIcon={<AddIcon />} onClick={add} disabled={!pending}>
                {t('directory.venueEditor.addHoliday')}
              </DuncitButton>
            </Stack>
            {days.length === 0 ? (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {t('directory.venueEditor.noHolidays')}
              </Typography>
            ) : (
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                {days.map((day) => (
                  <Chip
                    key={day}
                    size="small"
                    label={day}
                    onDelete={() => field.onChange(days.filter((d) => d !== day))}
                  />
                ))}
              </Stack>
            )}
          </Stack>
        );
      }}
    />
  );
}
