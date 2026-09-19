import { Controller, type Control } from 'react-hook-form';
import { Stack } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { SectionCard } from '@duncit/ui';
import { useWebT } from '../../../../shared/i18n';
import { CoverUploader } from '../../../components/CoverUploader';
import type { EventFormValues } from '../event.types';

/** Title, description and the cover picture. */
export function BasicsSection({ control }: Readonly<{ control: Control<EventFormValues> }>) {
  const { t } = useWebT();
  return (
    <SectionCard title={t('liteWeb.eventForm.basics')} subtitle={t('liteWeb.eventForm.basicsHint')}>
      <Stack spacing={2}>
        <RhfTextField control={control} name="title" label={t('liteWeb.eventForm.title')} hint={t('liteWeb.eventForm.titleHint')} slotProps={{ htmlInput: { maxLength: 120, 'data-testid': 'event-title' } }} />
        <RhfTextField
          control={control}
          name="description"
          label={t('liteWeb.eventForm.description')}
          hint={t('liteWeb.eventForm.descriptionHint')}
          multiline
          minRows={5}
          slotProps={{ htmlInput: { maxLength: 10_000, 'data-testid': 'event-description' } }}
        />
        <Controller
          control={control}
          name="cover_url"
          render={({ field, fieldState }) => (
            <CoverUploader label={t('liteWeb.eventForm.cover')} value={field.value} onChange={field.onChange} error={fieldState.error?.message} hint={t('liteWeb.eventForm.coverHint')} testId="event-cover" />
          )}
        />
      </Stack>
    </SectionCard>
  );
}
