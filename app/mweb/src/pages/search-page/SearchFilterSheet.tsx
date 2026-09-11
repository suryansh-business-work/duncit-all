import { Box, Chip, Dialog, DialogTitle, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { renderSuperCategoryMark } from '../../components/app-header/superCategoryIcon';
import type { SearchCategory } from './useSearchDiscovery';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  open: boolean;
  categories: SearchCategory[];
  categoryId: string;
  onClose: () => void;
  onSelect: (categoryId: string) => void;
}

/** Pill chips on the sheet: soft at rest, green when chosen. */
const CHIP_SX = { height: 36, minHeight: 36, fontWeight: 600, px: 0.5 } as const;

export default function SearchFilterSheet({ open, categories, categoryId, onClose, onSelect }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          justifyContent: "space-between",
          pr: 1.5
        }}>
        <DialogTitle sx={{ fontSize: '1.0625rem', fontWeight: 600 }}>{t('mweb.search.filterByCategory')}</DialogTitle>
        <DuncitIconButton
          aria-label={t('mweb.search.closeFilter')}
          onClick={onClose}
          sx={{ width: 40, height: 40, minHeight: 40, bgcolor: 'action.hover' }}
        >
          <CloseIcon />
        </DuncitIconButton>
      </Stack>
      <Box sx={{ px: 3, pb: 2 }}>
        {categories.length === 0 ? (
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            No categories available yet.
          </Typography>
        ) : (
          <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 1 }}>
            <Chip
              label={t('mweb.common.all')}
              color={categoryId === '' ? 'primary' : 'default'}
              onClick={() => onSelect('')}
              sx={CHIP_SX}
            />
            {categories.map((category) => (
              <Chip
                key={category.id}
                icon={renderSuperCategoryMark(category.icon) ?? undefined}
                label={category.name}
                color={categoryId === category.id ? 'primary' : 'default'}
                onClick={() => onSelect(category.id)}
                sx={CHIP_SX}
              />
            ))}
          </Stack>
        )}
      </Box>
      <Box sx={{ px: 3, pb: 3 }}>
        <DuncitButton fullWidth variant="contained" size="large" onClick={onClose}>
          Apply
        </DuncitButton>
      </Box>
    </Dialog>
  );
}
