import { useMemo } from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { InputBase, Stack, Typography } from '@mui/material';
import NotesOutlinedIcon from '@mui/icons-material/NotesOutlined';
import { RhfTextField } from '@duncit/forms';
import { useWebT } from '../../../../shared/i18n';
import { CoverUploader } from '../../../components/CoverUploader';
import { RhfSelect, type SelectOption } from '../../../components/RhfSelect';
import { VISIBILITIES, type EventFormValues } from '../event.types';
import { FieldPanel } from './FieldPanel';

/** The calendar it is filed under and who can find it, as two small selects above the title. */
export function CalendarAndVisibility({ calendars }: Readonly<{ calendars: readonly SelectOption[] }>) {
  const { t } = useWebT();
  const { control } = useFormContext<EventFormValues>();
  const visibilities = useMemo(() => VISIBILITIES.map((value) => ({ value, label: t(`lite.visibility.${value}`) })), [t]);
  return (
    <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'space-between' }}>
      <Stack sx={{ minWidth: 0, flexGrow: 1, maxWidth: 260 }}>
        <RhfSelect control={control} name="calendar_id" label={t('liteWeb.eventForm.calendar')} options={calendars} emptyLabel={t('liteWeb.eventForm.personalCalendar')} testId="event-calendar" />
      </Stack>
      <Stack sx={{ minWidth: 140 }}>
        <RhfSelect control={control} name="visibility" label={t('liteWeb.eventForm.visibility')} options={visibilities} testId="event-visibility" />
      </Stack>
    </Stack>
  );
}

/** The event's name as a large, borderless line, the way it will read on the page. */
export function TitleInput() {
  const { t } = useWebT();
  const { control } = useFormContext<EventFormValues>();
  return (
    <Controller
      control={control}
      name="title"
      render={({ field, fieldState }) => (
        <Stack spacing={0.5}>
          <InputBase
            {...field}
            placeholder={t('liteWeb.eventForm.titlePlaceholder')}
            multiline
            fullWidth
            error={Boolean(fieldState.error)}
            inputProps={{ maxLength: 120, 'aria-label': t('liteWeb.eventForm.title'), 'aria-invalid': Boolean(fieldState.error), 'aria-describedby': fieldState.error ? 'event-title-error' : undefined, 'data-testid': 'event-title' }}
            sx={{ fontSize: { xs: '2rem', md: '2.6rem' }, fontWeight: 800, lineHeight: 1.15, '& textarea::placeholder': { opacity: 0.5 } }}
          />
          {fieldState.error ? (
            <Typography id="event-title-error" variant="caption" color="error" role="alert">
              {fieldState.error.message}
            </Typography>
          ) : null}
        </Stack>
      )}
    />
  );
}

/** What the event is about, as plain paragraphs. */
export function DescriptionField() {
  const { t } = useWebT();
  const { control } = useFormContext<EventFormValues>();
  return (
    <FieldPanel icon={<NotesOutlinedIcon fontSize="small" />} title={t('liteWeb.eventForm.description')} testId="event-description-panel">
      <RhfTextField control={control} name="description" label={t('liteWeb.eventForm.description')} hint={t('liteWeb.eventForm.descriptionHint')} multiline minRows={3} slotProps={{ htmlInput: { maxLength: 10_000, 'data-testid': 'event-description' } }} />
    </FieldPanel>
  );
}

/** The square cover, watched on its own so a new picture does not re-render the whole form. */
export function CoverField() {
  const { t } = useWebT();
  const { control, setValue, formState } = useFormContext<EventFormValues>();
  const cover = useWatch({ control, name: 'cover_url' });
  return (
    <CoverUploader
      label={t('liteWeb.eventForm.cover')}
      value={cover}
      onChange={(url) => setValue('cover_url', url, { shouldDirty: true, shouldValidate: true })}
      shape="square"
      hint={t('liteWeb.eventForm.coverHint')}
      error={formState.errors.cover_url?.message}
      testId="event-cover"
    />
  );
}
