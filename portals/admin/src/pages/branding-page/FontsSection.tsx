import { useEffect, useState } from 'react';
import { Autocomplete, Box, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import type { BrandingFormState } from './queries';
import { GOOGLE_FONTS, googleFontCssUrl } from './googleFonts';

type FontField = 'mobile_font_family' | 'mweb_font_family' | 'portals_font_family';

const PLATFORMS: { field: FontField; label: string; hint: string }[] = [
  { field: 'mobile_font_family', label: 'Mobile App', hint: 'Native app (Tamagui) text.' },
  { field: 'mweb_font_family', label: 'mWeb', hint: 'The consumer PWA (MUI theme).' },
  { field: 'portals_font_family', label: 'Portals', hint: 'All 17 admin consoles (shared shell).' },
];

/** Loads the picked family into the ADMIN page so the preview below renders
 * with the real font. */
function useFontPreview(family: string) {
  useEffect(() => {
    if (!family) return undefined;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = googleFontCssUrl(family);
    document.head.appendChild(link);
    return () => {
      link.remove();
    };
  }, [family]);
}

interface Props {
  form: BrandingFormState;
  setForm: (next: BrandingFormState) => void;
}

/** Branding → Fonts: a Google Font per platform (Mobile / mWeb / Portals tabs).
 * Empty = the platform's built-in default (Quicksand). */
export default function FontsSection({ form, setForm }: Readonly<Props>) {
  const [tab, setTab] = useState(0);
  const platform = PLATFORMS[tab] ?? PLATFORMS[0];
  const value = form[platform.field];
  useFontPreview(value);

  return (
    <Stack spacing={2}>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth">
        {PLATFORMS.map((p) => (
          <Tab key={p.field} label={p.label} />
        ))}
      </Tabs>
      <Typography variant="caption" color="text.secondary">
        {platform.hint} Leave empty for the default font (Quicksand).
      </Typography>
      <Autocomplete
        options={[...GOOGLE_FONTS]}
        value={value || null}
        onChange={(_, v) => setForm({ ...form, [platform.field]: v ?? '' })}
        renderInput={(params) => (
          <TextField {...params} label={`${platform.label} font (Google Fonts)`} size="small" />
        )}
      />
      <Box
        sx={{
          p: 2,
          borderRadius: 2,
          border: 1,
          borderColor: 'divider',
          fontFamily: value ? `'${value}', sans-serif` : undefined,
        }}
      >
        <Typography sx={{ fontFamily: 'inherit', fontWeight: 900, fontSize: 22 }}>
          It All Starts Here!
        </Typography>
        <Typography sx={{ fontFamily: 'inherit' }}>
          The quick brown fox jumps over the lazy dog — 0123456789
        </Typography>
      </Box>
    </Stack>
  );
}
