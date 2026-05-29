import { useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardActionArea,
  Dialog,
  DialogContent,
  DialogTitle,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import Lottie from 'lottie-react';
import { glass } from './glass';
import { PORTALS, resolvePortalUrl } from './portals';
import portalAnim from '../../assets/portal-anim.json';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function OtherPortalsDialog({ open, onClose }: Props) {
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PORTALS;
    return PORTALS.filter(
      (p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" scroll="paper">
      <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>Other portals</DialogTitle>
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
                    sx={{
                      width: 56,
                      height: 56,
                      flexShrink: 0,
                      borderRadius: 2,
                      overflow: 'hidden',
                      bgcolor: 'action.hover',
                      display: 'grid',
                      placeItems: 'center',
                    }}
                  >
                    <Lottie animationData={portalAnim} loop style={{ width: 52, height: 52 }} />
                  </Box>
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
