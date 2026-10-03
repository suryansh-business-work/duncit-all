import { useEffect, useRef, useState } from 'react';
import { Controller, useWatch, type Control, type UseFormSetValue } from 'react-hook-form';
import { Alert, Divider, FormControlLabel, Grid, Switch, Typography } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { SingleImageUploadField } from '@duncit/media-picker';
import { useTranslation } from '@duncit/app-settings';
import LinkPreviewCard from './LinkPreviewCard';
import { useDestinationMeta } from './useDestinationMeta';
import { META_DESCRIPTION_MAX, META_TITLE_MAX } from './short-link-meta';
import type { ShortLinkFormValues } from './short-link.types';

type Setter = UseFormSetValue<ShortLinkFormValues>;
type OverrideField = 'meta_title' | 'meta_description' | 'meta_image_url';

const OVERRIDE_FIELDS: OverrideField[] = ['meta_title', 'meta_description', 'meta_image_url'];

interface Props {
  control: Control<ShortLinkFormValues>;
  setValue: Setter;
  external: boolean;
}

/** A forced value when one was typed, else the destination's own. */
const orLive = (forced: string, live?: string | null) => (forced.length > 0 ? forced : (live ?? null));

/**
 * A card forced for one destination must never describe another, so moving
 * the destination switches the override off and empties it — the same rule
 * the server applies on save. Returns whether that just happened, to say so.
 */
function useClearOverrideOnMove(destination: string, enabled: boolean, setValue: Setter): boolean {
  const previous = useRef(destination);
  const [cleared, setCleared] = useState(false);
  useEffect(() => {
    if (destination === previous.current) return;
    previous.current = destination;
    if (!enabled) return;
    setValue('meta_override_enabled', false, { shouldValidate: true });
    for (const name of OVERRIDE_FIELDS) setValue(name, '', { shouldValidate: true });
    setCleared(true);
  }, [destination, enabled, setValue]);
  return cleared && !enabled;
}

/** The link-preview card: read live from the destination, optionally forced. */
export default function LinkPreviewSection({ control, setValue, external }: Readonly<Props>) {
  const { t } = useTranslation();
  const [destination, enabled, title, description, image] = useWatch({
    control,
    name: ['destination_url', 'meta_override_enabled', 'meta_title', 'meta_description', 'meta_image_url'],
  });
  const live = useDestinationMeta(destination, external);
  const cleared = useClearOverrideOnMove(destination, enabled, setValue);

  const forcedTitle = enabled && title.length > 0;
  const card = enabled
    ? {
        title: orLive(title, live.meta?.title),
        description: orLive(description, live.meta?.description),
        image_url: orLive(image, live.meta?.image_url),
        site_name: live.meta?.site_name ?? null,
      }
    : live.meta;

  // Start from what the destination says, so the marketer edits rather than retypes.
  const prefill = () => {
    const values: Record<OverrideField, string | null | undefined> = {
      meta_title: live.meta?.title,
      meta_description: live.meta?.description,
      meta_image_url: live.meta?.image_url,
    };
    const current: Record<OverrideField, string> = { meta_title: title, meta_description: description, meta_image_url: image };
    for (const name of OVERRIDE_FIELDS) {
      const value = values[name];
      if (!current[name] && value) setValue(name, value, { shouldValidate: true });
    }
  };

  return (
    <>
      <Grid size={12}>
        <Divider />
        <Typography variant="overline" component="h3" sx={{ color: 'text.secondary' }}>
          {t('marketing.shortLinks.linkPreview')}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
          {t('marketing.shortLinks.linkPreviewHint')}
        </Typography>
        <LinkPreviewCard
          card={card}
          ready={live.ready || forcedTitle}
          loading={live.loading && !forcedTitle}
          error={forcedTitle ? null : live.error}
        />
      </Grid>

      <Grid size={12}>
        <Controller
          control={control}
          name="meta_override_enabled"
          render={({ field }) => (
            <FormControlLabel
              control={
                <Switch
                  checked={field.value}
                  onChange={(_event, checked) => {
                    field.onChange(checked);
                    if (checked) prefill();
                  }}
                  slotProps={{ input: { 'aria-describedby': 'short-link-override-hint' } }}
                  data-testid="short-link-override-switch"
                />
              }
              label={t('marketing.shortLinks.overridePreview')}
            />
          )}
        />
        <Typography id="short-link-override-hint" variant="caption" component="p" sx={{ color: 'text.secondary' }}>
          {t('marketing.shortLinks.overridePreviewHint')}
        </Typography>
        {cleared && (
          <Alert severity="info" sx={{ mt: 1 }}>
            {t('marketing.shortLinks.previewOverrideCleared')}
          </Alert>
        )}
      </Grid>

      {enabled && (
        <>
          <Grid size={12}>
            <RhfTextField
              control={control}
              name="meta_title"
              label={t('marketing.shortLinks.previewTitle')}
              required
              hint={t('marketing.shortLinks.previewTitleHint', { vars: { max: META_TITLE_MAX } })}
            />
          </Grid>
          <Grid size={12}>
            <RhfTextField
              control={control}
              name="meta_description"
              label={t('marketing.shortLinks.previewDescription')}
              multiline
              minRows={2}
              hint={t('marketing.shortLinks.previewDescriptionHint', { vars: { max: META_DESCRIPTION_MAX } })}
            />
          </Grid>
          <Grid size={12}>
            <Controller
              control={control}
              name="meta_image_url"
              render={({ field, fieldState }) => (
                <SingleImageUploadField
                  variant="url-adornment"
                  label={t('marketing.shortLinks.previewImage')}
                  value={field.value}
                  onChange={field.onChange}
                  folder="/short-links"
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message ?? t('marketing.shortLinks.previewImageHint')}
                  uploadTestId="upload-short-link-preview-image"
                />
              )}
            />
          </Grid>
        </>
      )}
    </>
  );
}
