import { Box, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import MediaPickerField from '../../components/MediaPickerField';
import type { BrandingFormState, PlatformPrefix } from './queries';

interface SizeGuide {
  favicon: string;
  logo: string;
  splashImage: string;
  splashVideo: string;
  note?: string;
}

interface Props {
  prefix: PlatformPrefix;
  sizes: SizeGuide;
  form: BrandingFormState;
  setForm: (next: BrandingFormState) => void;
}

/**
 * One platform's asset set (favicon · logo · splash) for the Branding
 * accordions — reused for mWeb (1A), Mobile App (1B) and Portals (1C). The
 * splash supports an image or a video; recommended sizes are spelled out per
 * field so uploads are consistent.
 */
export default function PlatformAssetsSection({ prefix, sizes, form, setForm }: Readonly<Props>) {
  const faviconKey = `${prefix}_favicon_url` as const;
  const logoKey = `${prefix}_logo_url` as const;
  const splashKey = `${prefix}_splash_url` as const;
  const splashTypeKey = `${prefix}_splash_type` as const;
  const splashType = form[splashTypeKey] || 'IMAGE';
  const isVideo = splashType === 'VIDEO';

  const update = (key: keyof BrandingFormState, value: string) =>
    setForm({ ...form, [key]: value });

  return (
    <Stack spacing={2.5}>
      {sizes.note && (
        <Typography variant="caption" color="text.secondary">
          {sizes.note}
        </Typography>
      )}

      <MediaPickerField
        label="Favicon"
        value={form[faviconKey]}
        onChange={(url) => update(faviconKey, url)}
        folder={`/branding/${prefix}`}
        accept="image/*"
        helperText={sizes.favicon}
      />

      <MediaPickerField
        label="Logo"
        value={form[logoKey]}
        onChange={(url) => update(logoKey, url)}
        folder={`/branding/${prefix}`}
        accept="image/*"
        helperText={sizes.logo}
      />

      <Stack spacing={1}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="subtitle2">Splash screen</Typography>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={splashType}
            onChange={(_e, next) => {
              if (next) update(splashTypeKey, next);
            }}
          >
            <ToggleButton value="IMAGE">Image</ToggleButton>
            <ToggleButton value="VIDEO">Video</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
        <MediaPickerField
          label={isVideo ? 'Splash video' : 'Splash image'}
          value={form[splashKey]}
          onChange={(url) => update(splashKey, url)}
          folder={`/branding/${prefix}`}
          accept={isVideo ? 'video/*' : 'image/*'}
          showPreview={!isVideo}
          helperText={isVideo ? sizes.splashVideo : sizes.splashImage}
        />
        {isVideo && form[splashKey] && (
          <Box
            component="video"
            src={form[splashKey]}
            muted
            loop
            autoPlay
            playsInline
            sx={{
              width: 132,
              height: 234,
              objectFit: 'cover',
              borderRadius: 1.5,
              border: 1,
              borderColor: 'divider',
              bgcolor: 'action.hover',
            }}
          />
        )}
      </Stack>
    </Stack>
  );
}
