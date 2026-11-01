import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Divider, Grid, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { BANNER_KIT_LIMITS, makeBannerKitSchema, type BannerKitValues } from '@duncit/forms/schemas';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import { BannerKitIdentityFields } from './BannerKitIdentityFields';
import { BannerKitPhotosField } from './BannerKitPhotosField';
import { BannerKitPreview } from './BannerKitPreview';
import type { BannerKitData, BannerKitEntity, BannerKitFormProps } from './banner-kit.types';

/** The kit as the form edits it: what the API answered, minus what it only suggests. */
export function toBannerKitValues(kit: BannerKitData): BannerKitValues {
  const copy = (photos: BannerKitValues['photos']) => photos.map(({ url, caption }) => ({ url, caption }));
  return {
    logo_url: kit.logo_url,
    instagram_handle: kit.instagram_handle,
    collab_opt_in: kit.collab_opt_in,
    photos: copy(kit.photos),
    event_photos: copy(kit.event_photos),
    tagline: kit.tagline,
    bio: kit.bio,
    brand_color: kit.brand_color,
  };
}

/** Where a kit's uploads are filed — the venue's own folder, or the host's. */
const UPLOAD_FOLDER: Record<BannerKitEntity, string> = { VENUE: '/venues', HOST: '/hosts/photo' };

/**
 * A venue's or a host's banner kit, with a live look at its slide beside it.
 * A venue's photos are its space; a host's are portraits, and a host also has
 * past-event photos. The server checks every rule again on save.
 */
export function BannerKitForm({ entity, entityId, name, kit, onSave }: Readonly<BannerKitFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeBannerKitSchema(t), [t]);
  const [error, setError] = useState<string | null>(null);
  const { control, handleSubmit, reset, formState } = useForm<BannerKitValues>({
    defaultValues: toBannerKitValues(kit),
    resolver: zodResolver(schema),
    mode: 'onTouched',
  });
  const folder = UPLOAD_FOLDER[entity];

  // A saved or refreshed kit comes back from the server: show what is stored.
  useEffect(() => {
    reset(toBannerKitValues(kit));
  }, [kit, reset]);

  const submit = handleSubmit(async (next) => {
    setError(null);
    try {
      await onSave(next);
    } catch (err) {
      setError(parseApiError(err));
    }
  });

  return (
    <form noValidate onSubmit={submit} data-testid="banner-kit-form">
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Stack spacing={2.5}>
            <BannerKitIdentityFields control={control} folder={folder} />
            <Divider />
            <BannerKitPhotosField
              control={control}
              name="photos"
              label={entity === 'VENUE' ? t('shell.bannerKit.venuePhotos') : t('shell.bannerKit.hostPhotos')}
              hint={entity === 'VENUE' ? t('shell.bannerKit.venuePhotosHint') : t('shell.bannerKit.hostPhotosHint')}
              max={BANNER_KIT_LIMITS.photos}
              folder={folder}
              entityId={entityId}
              suggested={kit.suggested_photos}
            />
            {entity === 'HOST' && (
              <BannerKitPhotosField
                control={control}
                name="event_photos"
                label={t('shell.bannerKit.eventPhotos')}
                hint={t('shell.bannerKit.eventPhotosHint')}
                max={BANNER_KIT_LIMITS.eventPhotos}
                folder={folder}
                entityId={entityId}
              />
            )}
            {error && (
              <Alert severity="error" data-testid="banner-kit-error">
                {error}
              </Alert>
            )}
            <Stack direction="row">
              <DuncitButton type="submit" variant="contained" disabled={formState.isSubmitting} data-testid="banner-kit-save">
                {formState.isSubmitting ? t('shell.common.saving') : t('shell.common.save')}
              </DuncitButton>
            </Stack>
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <BannerKitPreview entity={entity} name={name} control={control} />
        </Grid>
      </Grid>
    </form>
  );
}
