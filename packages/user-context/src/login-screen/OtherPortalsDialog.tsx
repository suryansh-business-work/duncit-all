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
import { PORTALS, PORTAL_CATEGORIES, resolvePortalUrl } from './portals';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function OtherPortalsDialog({ open, onClose }: Readonly<Props>) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('All');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PORTALS.filter((p) => {
      const matchesCat = category === 'All' || p.category === category;
      const matchesQuery =
        !q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });
  }, [query, category]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" scroll="paper">
      <DialogTitle sx={{ pb: 0.5 }}>
        <Typography component="span" variant="h6" fontWeight={800}>
          Other portals
        </Typography>
        <Typography variant="body2" color="text.secondary">
          One Duncit account — jump to any console below.
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <TextField
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search portals…"
          fullWidth
          size="small"
          sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 999 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
        />
        <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
          {['All', ...PORTAL_CATEGORIES].map((cat) => (
            <Chip
              key={cat}
              label={cat}
              size="small"
              color={category === cat ? 'primary' : 'default'}
              variant={category === cat ? 'filled' : 'outlined'}
              onClick={() => setCategory(cat)}
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
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Box
                    component="img"
                    src={p.image}
                    alt={p.name}
                    loading="lazy"
                    sx={{ width: 56, height: 56, flexShrink: 0, borderRadius: 2, objectFit: 'cover', bgcolor: 'action.hover' }}
                  />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle2" fontWeight={800} noWrap>
                      {p.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      {p.description}
                    </Typography>
                  </Box>
                </Stack>
              </CardActionArea>
            </Card>
          ))}
          {!results.length && (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
              No portals match “{query}”.
            </Typography>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}
