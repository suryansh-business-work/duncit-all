import { useEffect, useMemo } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stack } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { usePortalT } from '../../../../shared/i18n';
import { FormDialog } from '../../../components/FormDialog';
import { RhfSwitch } from '../../../components/RhfSwitch';
import type { LiteAdminCity } from '../../../graphql/catalogue';
import { cityValuesFrom, emptyCityValues, makeCitySchema, type CityFormValues } from './city.types';

interface Props {
  open: boolean;
  initial: LiteAdminCity | null;
  busy: boolean;
  onClose: () => void;
  onSubmit: (values: CityFormValues) => Promise<void>;
}

export function CityForm({ open, initial, busy, onClose, onSubmit }: Readonly<Props>) {
  const { t } = usePortalT();
  const schema = useMemo(() => makeCitySchema(t), [t]);
  const { control, handleSubmit, reset } = useForm<CityFormValues, unknown, CityFormValues>({
    defaultValues: emptyCityValues(),
    resolver: zodResolver(schema) as Resolver<CityFormValues, unknown, CityFormValues>,
    mode: 'onBlur',
  });

  useEffect(() => {
    if (open) reset(initial ? cityValuesFrom(initial) : emptyCityValues());
  }, [open, initial, reset]);

  const title = initial ? t('litePortal.cities.editTitle', { vars: { name: initial.name } }) : t('litePortal.cities.newTitle');

  return (
    <FormDialog open={open} title={title} onSubmit={handleSubmit(onSubmit)} onClose={onClose} busy={busy} testId="city-dialog">
      <Stack spacing={1.5}>
        <RhfTextField control={control} name="name" label={t('litePortal.common.name')} required disabled={busy} slotProps={{ htmlInput: { 'data-testid': 'city-name' } }} />
        <RhfTextField control={control} name="slug" label={t('litePortal.common.slug')} hint={t('litePortal.common.slugHint')} disabled={busy} slotProps={{ htmlInput: { 'data-testid': 'city-slug' } }} />
        <RhfTextField control={control} name="country" label={t('litePortal.cities.country')} hint={t('litePortal.cities.countryHint')} disabled={busy} slotProps={{ htmlInput: { 'data-testid': 'city-country' } }} />
        <RhfTextField
          control={control}
          name="cover_url"
          type="url"
          label={t('litePortal.cities.coverUrl')}
          hint={t('litePortal.cities.coverUrlHint')}
          disabled={busy}
          slotProps={{ htmlInput: { 'data-testid': 'city-cover-url' } }}
        />
        <RhfTextField
          control={control}
          name="sort_order"
          label={t('litePortal.common.sortOrder')}
          hint={t('litePortal.common.sortOrderHint')}
          disabled={busy}
          slotProps={{ htmlInput: { inputMode: 'numeric', 'data-testid': 'city-sort-order' } }}
        />
        <RhfSwitch control={control} name="featured" label={t('litePortal.common.featured')} hint={t('litePortal.cities.featuredHint')} disabled={busy} testId="city-featured" />
        <RhfSwitch control={control} name="is_active" label={t('litePortal.common.active')} hint={t('litePortal.common.activeHint')} disabled={busy} testId="city-active" />
      </Stack>
    </FormDialog>
  );
}
