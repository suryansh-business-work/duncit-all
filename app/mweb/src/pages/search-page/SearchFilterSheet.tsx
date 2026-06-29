import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { renderSuperCategoryMark } from '../../components/app-header/superCategoryIcon';
import type { SearchCategory } from './useSearchDiscovery';

interface Props {
  open: boolean;
  categories: SearchCategory[];
  categoryId: string;
  onClose: () => void;
  onSelect: (categoryId: string) => void;
}

export default function SearchFilterSheet({ open, categories, categoryId, onClose, onSelect }: Readonly<Props>) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: 3 } }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ pr: 1 }}>
        <DialogTitle sx={{ fontWeight: 900 }}>Filter by Category</DialogTitle>
        <IconButton aria-label="Close filter" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Stack>
      <Box sx={{ px: 3, pb: 2 }}>
        {categories.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No categories available yet.
          </Typography>
        ) : (
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
            <Chip
              label="All"
              color={categoryId === '' ? 'primary' : 'default'}
              onClick={() => onSelect('')}
              sx={{ fontWeight: 800 }}
            />
            {categories.map((category) => (
              <Chip
                key={category.id}
                icon={renderSuperCategoryMark(category.icon) ?? undefined}
                label={category.name}
                color={categoryId === category.id ? 'primary' : 'default'}
                onClick={() => onSelect(category.id)}
                sx={{ fontWeight: 800 }}
              />
            ))}
          </Stack>
        )}
      </Box>
      <Box sx={{ px: 3, pb: 3 }}>
        <Button fullWidth variant="contained" onClick={onClose} sx={{ fontWeight: 900, borderRadius: 999 }}>
          Apply
        </Button>
      </Box>
    </Dialog>
  );
}
