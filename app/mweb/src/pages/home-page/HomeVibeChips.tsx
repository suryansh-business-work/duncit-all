import { Box, Chip, Stack, Typography } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

interface HomeVibeChipsProps {
  categories: any[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export default function HomeVibeChips({ categories, selectedId, onSelect }: Readonly<HomeVibeChipsProps>) {
  if (categories.length === 0) return null;

  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ px: 0.25 }}>
        <AutoAwesomeIcon color="primary" sx={{ fontSize: 18 }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 900, lineHeight: 1.15 }}>
          What's your vibe today?
        </Typography>
      </Stack>
      <Box
        sx={{
          mx: { xs: -1.25, sm: -2 },
          px: { xs: 1.25, sm: 2 },
          overflowX: 'auto',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        <Stack direction="row" spacing={1} sx={{ width: 'max-content', pb: 0.25 }}>
          {categories.slice(0, 16).map((category: any) => {
            const selected = selectedId === category.id;
            return (
              <Chip
                key={category.id}
                label={category.name}
                clickable
                color={selected ? 'primary' : 'default'}
                variant={selected ? 'filled' : 'outlined'}
                onClick={() => onSelect(selected ? '' : category.id)}
                sx={{
                  height: 42,
                  px: 0.75,
                  fontWeight: 900,
                  borderRadius: 3,
                  flex: '0 0 auto',
                }}
              />
            );
          })}
        </Stack>
      </Box>
    </Stack>
  );
}