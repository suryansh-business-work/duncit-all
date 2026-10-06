import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, Dialog, DialogContent, DialogTitle, InputAdornment, LinearProgress, List, MenuItem, Stack, TextField, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useDebouncedValue } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import type { CmsGoogleFont } from '@duncit/gql-types';
import { CMS_GOOGLE_FONTS, type CmsGoogleFontsData } from '../../queries/sites';
import type { FontValues } from '../design-form/design.types';
import GoogleFontResult from './GoogleFontResult';
import { GoogleFontForm, toGoogleFont } from './google-font-form';

interface Props {
  open: boolean;
  onClose: () => void;
  onAdd: (font: FontValues) => void;
}

const PAGE = 40;

/** Browse the whole Google Fonts catalogue — search, filter, see each family in itself — then pick weights. */
export default function GoogleFontDialog({ open, onClose, onAdd }: Readonly<Props>) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [chosen, setChosen] = useState<CmsGoogleFont | null>(null);
  const debounced = useDebouncedValue(search, 300);
  const { data, loading, error } = useQuery<CmsGoogleFontsData>(CMS_GOOGLE_FONTS, {
    variables: { search: debounced || null, category: category || null, offset: 0, limit: PAGE },
    skip: !open,
  });
  const page = data?.cmsGoogleFonts;

  const close = () => {
    setChosen(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="md">
      <DialogTitle>{t('websiteApp.cms.fonts.addGoogle')}</DialogTitle>
      <DialogContent dividers sx={{ minHeight: 480 }}>
        {chosen ? (
          <GoogleFontForm
            family={chosen.family}
            weights={chosen.weights}
            hasItalic={chosen.italic}
            onBack={() => setChosen(null)}
            onSubmit={(values) => {
              onAdd(toGoogleFont(chosen.family, chosen.category, values));
              close();
            }}
          />
        ) : (
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                autoFocus
                fullWidth
                size="small"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                label={t('websiteApp.cms.fonts.search')}
                slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
              />
              <TextField select size="small" value={category} onChange={(event) => setCategory(event.target.value)} label={t('websiteApp.cms.fonts.category')} sx={{ minWidth: 200 }}>
                <MenuItem value="">{t('websiteApp.cms.fonts.allCategories')}</MenuItem>
                {(page?.categories ?? []).map((name) => (
                  <MenuItem key={name} value={name}>
                    {name}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
            {loading && <LinearProgress />}
            {error && <Alert severity="error">{t('websiteApp.cms.fonts.loadFailed')}</Alert>}
            {page && (
              <Typography variant="caption" color="text.secondary" role="status">
                {t('websiteApp.cms.fonts.results', { vars: { count: page.total } })}
              </Typography>
            )}
            {page?.fonts.length === 0 && <Typography color="text.secondary">{t('websiteApp.cms.fonts.noResults')}</Typography>}
            <List dense disablePadding>
              {page?.fonts.map((font) => (
                <GoogleFontResult key={font.family} font={font} onChoose={() => setChosen(font)} />
              ))}
            </List>
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}
