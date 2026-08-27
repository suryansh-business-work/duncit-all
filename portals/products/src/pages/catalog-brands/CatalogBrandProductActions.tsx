import { Stack, Tooltip } from '@mui/material';
import ArchiveIcon from '@mui/icons-material/Archive';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import EditIcon from '@mui/icons-material/Edit';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutlined';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutlined';
import UnarchiveIcon from '@mui/icons-material/Unarchive';
import { DuncitIconButton } from '@duncit/buttons';
import type { CatalogBrandProductRow } from './queries';
import { useTranslation } from '@duncit/shell';

interface Props {
  product: CatalogBrandProductRow;
  onEdit: (p: CatalogBrandProductRow) => void;
  /** Archive an active product, restore an archived one. */
  onLifecycle: (p: CatalogBrandProductRow) => void;
  /** Temporarily deactivate an active product, reactivate a paused one. */
  onToggleActive: (p: CatalogBrandProductRow) => void;
  onDuplicate: (p: CatalogBrandProductRow) => void;
}

/**
 * Row actions for a brand's product. Every handler stops propagation so the
 * table's row-click (which opens the editor) does not also fire.
 */
export default function CatalogBrandProductActions({
  product,
  onEdit,
  onLifecycle,
  onToggleActive,
  onDuplicate,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const archived = product.status === 'ARCHIVED';
  const paused = product.is_active === false;
  const lifecycleLabel = archived ? 'Restore' : 'Archive';
  const lifecycleIcon = archived ? (
    <UnarchiveIcon fontSize="small" />
  ) : (
    <ArchiveIcon fontSize="small" />
  );
  const pauseLabel = paused ? 'Reactivate' : 'Temporarily deactivate';

  return (
    <Stack direction="row" component="span" sx={{
      justifyContent: "flex-end"
    }}>
      <Tooltip title={t('shell.common.edit')}>
        <DuncitIconButton
          size="small"
          aria-label={t('shell.common.edit')}
          onClick={(event) => {
            event.stopPropagation();
            onEdit(product);
          }}
        >
          <EditIcon fontSize="small" />
        </DuncitIconButton>
      </Tooltip>
      {!archived && (
        <Tooltip title={pauseLabel}>
          <DuncitIconButton
            size="small"
            aria-label={pauseLabel}
            color={paused ? 'success' : 'warning'}
            onClick={(event) => {
              event.stopPropagation();
              onToggleActive(product);
            }}
          >
            {paused ? <PlayCircleOutlineIcon fontSize="small" /> : <PauseCircleOutlineIcon fontSize="small" />}
          </DuncitIconButton>
        </Tooltip>
      )}
      <Tooltip title={lifecycleLabel}>
        <DuncitIconButton
          size="small"
          aria-label={lifecycleLabel}
          onClick={(event) => {
            event.stopPropagation();
            onLifecycle(product);
          }}
        >
          {lifecycleIcon}
        </DuncitIconButton>
      </Tooltip>
      <Tooltip title={t('products.brandProducts.duplicate')}>
        <DuncitIconButton
          size="small"
          aria-label={t('products.brandProducts.duplicate')}
          onClick={(event) => {
            event.stopPropagation();
            onDuplicate(product);
          }}
        >
          <ContentCopyIcon fontSize="small" />
        </DuncitIconButton>
      </Tooltip>
    </Stack>
  );
}
