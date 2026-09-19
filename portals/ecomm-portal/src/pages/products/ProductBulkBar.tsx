import { Paper, Stack, Typography } from '@mui/material';
import PublishIcon from '@mui/icons-material/Publish';
import EditNoteIcon from '@mui/icons-material/EditNote';
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import CategoryIcon from '@mui/icons-material/Category';
import StraightenIcon from '@mui/icons-material/Straighten';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import type { ProductStatus } from '../../lib/status';

interface ProductBulkBarProps {
  count: number;
  busy: boolean;
  onStatus: (status: ProductStatus) => void;
  onFile: () => void;
  onPackaging: () => void;
}

/** What can be done to every ticked product at once: publish, move to draft, archive, file, or set packaging. */
export default function ProductBulkBar({ count, busy, onStatus, onFile, onPackaging }: Readonly<ProductBulkBarProps>) {
  const { t } = useTranslation();
  return (
    <Paper variant="outlined" sx={{ p: 1.5 }} role="region" aria-label={t('ecommPortal.products.bulkActions')} data-testid="products-bulk-bar">
      <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography variant="body2" role="status" sx={{ fontWeight: 700, mr: 1 }} data-testid="products-bulk-count">
          {t('ecommPortal.products.selected', { count })}
        </Typography>
        <DuncitButton
          size="small"
          variant="contained"
          startIcon={<PublishIcon />}
          disabled={busy}
          onClick={() => onStatus('PUBLISHED')}
          data-testid="products-bulk-publish"
        >
          {t('ecommPortal.products.publish')}
        </DuncitButton>
        <DuncitButton
          size="small"
          variant="outlined"
          startIcon={<EditNoteIcon />}
          disabled={busy}
          onClick={() => onStatus('DRAFT')}
          data-testid="products-bulk-draft"
        >
          {t('ecommPortal.products.moveToDraft')}
        </DuncitButton>
        <DuncitButton
          size="small"
          variant="outlined"
          startIcon={<ArchiveOutlinedIcon />}
          disabled={busy}
          onClick={() => onStatus('ARCHIVED')}
          data-testid="products-bulk-archive"
        >
          {t('ecommPortal.products.archive')}
        </DuncitButton>
        <DuncitButton
          size="small"
          variant="outlined"
          startIcon={<CategoryIcon />}
          disabled={busy}
          onClick={onFile}
          data-testid="products-bulk-file"
        >
          {t('ecommPortal.products.fileUnder')}
        </DuncitButton>
        <DuncitButton
          size="small"
          variant="outlined"
          startIcon={<StraightenIcon />}
          disabled={busy}
          onClick={onPackaging}
          data-testid="products-bulk-packaging"
        >
          {t('ecommPortal.products.setPackaging')}
        </DuncitButton>
      </Stack>
    </Paper>
  );
}
