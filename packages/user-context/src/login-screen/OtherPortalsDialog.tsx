import { useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardActionArea,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { glass } from './glass';
import {
  PORTALS,
  PORTAL_CATEGORIES,
  resolvePortalUrl,
  type PortalCategory,
} from './portals';
import { sessionT, type SessionTranslate } from '../i18n';

interface Props {
  open: boolean;
  onClose: () => void;
  /** The mounting surface's translator; the shipped English when omitted. */
  t?: SessionTranslate;
}

export default function OtherPortalsDialog({ open, onClose, t = sessionT }: Readonly<Props>) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<PortalCategory | 'All'>('All');

  // Searched against the words on screen, so a reader can type what they see —
  // which means the filter has to re-run when the language changes.
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PORTALS.filter((p) => {
      const matchesCat = category === 'All' || p.category === category;
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        t(p.descriptionKey).toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });
  }, [query, category, t]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" scroll="paper">
      <DialogTitle sx={{ pb: 0.5 }}>
        <Typography component="span" variant="h6" sx={{
          fontWeight: 800
        }}>
          {t('session.portals.title')}
        </Typography>
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          {t('session.portals.subtitle')}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <TextField
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('session.portals.search')}
          fullWidth
          size="small"
          sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 999 } }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            }
          }}
        />
        <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
          <Chip
            label={t('session.portals.all')}
            size="small"
            color={category === 'All' ? 'primary' : 'default'}
            variant={category === 'All' ? 'filled' : 'outlined'}
            onClick={() => setCategory('All')}
            sx={{ fontWeight: 700 }}
          />
          {PORTAL_CATEGORIES.map((option) => (
            <Chip
              key={option.key}
              label={t(option.labelKey)}
              size="small"
              color={category === option.key ? 'primary' : 'default'}
              variant={category === option.key ? 'filled' : 'outlined'}
              onClick={() => setCategory(option.key)}
              sx={{ fontWeight: 700 }}
            />
          ))}
        </Stack>
        <Box
          sx={{
            display: 'grid',
            gap: 1.5,
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          }}
        >
          {results.map((p) => (
            <Card key={p.key} variant="outlined" sx={(theme) => ({ ...glass(theme), borderRadius: 3 })}>
              <CardActionArea onClick={() => window.open(resolvePortalUrl(p), '_self')} sx={{ p: 1.5 }}>
                <Stack direction="row" spacing={1.5} sx={{
                  alignItems: "center"
                }}>
                  <Box
                    component="img"
                    src={p.image}
                    alt={p.name}
                    loading="lazy"
                    sx={{ width: 56, height: 56, flexShrink: 0, borderRadius: 2, objectFit: 'cover', bgcolor: 'action.hover' }}
                  />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle2" noWrap sx={{
                      fontWeight: 800
                    }}>
                      {p.name}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: "text.secondary",
                        display: 'block'
                      }}>
                      {t(p.descriptionKey)}
                    </Typography>
                  </Box>
                </Stack>
              </CardActionArea>
            </Card>
          ))}
          {!results.length && (
            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
                p: 2
              }}>
              {t('session.portals.noMatch', { vars: { query } })}
            </Typography>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}
